export type Heading = { id: string; text: string; level: number };

export type EnrichedPost = {
    blocks: any[];
    headings: Heading[];
    wordCount: number;
    readingTime: number;
    referenceCount: number;
};

const CITATION_ONLY = /\[\d+(?:\s*,\s*\d+)*\]/g;

export const slugify = (text: string) =>
    text
        .replace(CITATION_ONLY, '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

export const blockToPlainText = (block: any): string =>
    (block?.children || [])
        .filter((child: any) => child?._type === 'span')
        .map((child: any) => child.text || '')
        .join('');

export const toPlainText = (blocks: any[]): string =>
    (Array.isArray(blocks) ? blocks : [])
        .filter((block) => block?._type === 'block')
        .map(blockToPlainText)
        .join('\n\n')
        .replace(/\s+/g, ' ')
        .trim();

type Segment = { text: string; marks: string[] };

// Ordered alternation. Earlier branches win, so `code` is protected from the
// emphasis rules and markdown links are consumed before bare URLs.
const INLINE = new RegExp(
    [
        '`([^`\\n]+)`', // 1 inline code
        '\\*\\*([^*\\n]+)\\*\\*', // 2 strong
        '\\*([^*\\n]+)\\*', // 3 emphasis
        '\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)', // 4 label, 5 href
        '\\[(\\d+(?:\\s*,\\s*\\d+)*)\\]', // 6 citation group
        '(https?:\\/\\/[^\\s<>\\[\\]()]+)', // 7 bare url
        '\\b(doi:\\s*10\\.[^\\s]+)', // 8 bare doi
    ].join('|'),
    'g'
);

const TRAILING_PUNCT = /[.,;:!?]+$/;

const splitUrl = (raw: string) => {
    const trailing = raw.match(TRAILING_PUNCT)?.[0] ?? '';
    return { url: trailing ? raw.slice(0, -trailing.length) : raw, trailing };
};

/**
 * Rewrites one span's plain text into a list of spans, hoisting any links or
 * citations it discovers into `markDefs`. Content authored as Markdown and
 * pasted into the Portable Text editor arrives here as inert text, so the
 * emphasis, URL and `[n]` markers only become real marks at this point.
 */
const enrichSpan = (
    span: any,
    markDefs: any[],
    keyPrefix: string,
    options: { linkCitations: boolean; referenceCount: number }
) => {
    const text: string = span.text || '';
    if (!text) return [span];

    const inherited: string[] = span.marks || [];
    const segments: Segment[] = [];
    const push = (value: string, marks: string[] = []) => {
        if (value) segments.push({ text: value, marks: [...inherited, ...marks] });
    };

    const addDef = (def: any) => {
        const key = `${keyPrefix}-d${markDefs.length}`;
        markDefs.push({ ...def, _key: key });
        return key;
    };

    let cursor = 0;
    INLINE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = INLINE.exec(text)) !== null) {
        const [full, code, strong, em, mdLabel, mdHref, citation, url, doi] = match;
        push(text.slice(cursor, match.index));
        cursor = match.index + full.length;

        if (code !== undefined) {
            push(code, ['code']);
        } else if (strong !== undefined) {
            push(strong, ['strong']);
        } else if (em !== undefined) {
            push(em, ['em']);
        } else if (mdLabel !== undefined) {
            push(mdLabel, [addDef({ _type: 'link', href: mdHref })]);
        } else if (citation !== undefined) {
            const numbers = citation.split(',').map((n) => Number(n.trim()));
            const resolvable =
                options.linkCitations &&
                numbers.every((n) => n >= 1 && n <= options.referenceCount);

            if (!resolvable) {
                push(full);
            } else {
                push('[');
                numbers.forEach((n, i) => {
                    if (i > 0) push(', ');
                    push(String(n), [addDef({ _type: 'citation', refNumber: n })]);
                });
                push(']');
            }
        } else if (url !== undefined) {
            const { url: href, trailing } = splitUrl(url);
            push(href, [addDef({ _type: 'link', href })]);
            push(trailing);
        } else if (doi !== undefined) {
            const { url: raw, trailing } = splitUrl(doi);
            const href = `https://doi.org/${raw.replace(/^doi:\s*/i, '')}`;
            push(raw, [addDef({ _type: 'link', href })]);
            push(trailing);
        }
    }

    push(text.slice(cursor));

    if (segments.length === 0) return [span];

    return segments.map((segment, i) => ({
        _type: 'span',
        _key: `${keyPrefix}-s${i}`,
        text: segment.text,
        marks: segment.marks,
    }));
};

const isReferenceHeading = (block: any) =>
    /^h[1-4]$/.test(block?.style || '') && /^references$/i.test(blockToPlainText(block).trim());

export const enrichPortableText = (input: any[]): EnrichedPost => {
    const blocks = Array.isArray(input) ? input : [];

    // Pass 1: locate the references list so citations know what they can link to.
    const referenceStart = blocks.findIndex(isReferenceHeading);
    let referenceCount = 0;
    if (referenceStart !== -1) {
        for (let i = referenceStart + 1; i < blocks.length; i++) {
            if (blocks[i]?.listItem === 'number') referenceCount++;
            else if (blocks[i]?._type === 'block' && /^h[1-4]$/.test(blocks[i].style || '')) break;
        }
    }

    // Pass 2: rewrite inline markers and collect headings for the table of contents.
    const headings: Heading[] = [];
    const usedIds = new Set<string>();
    let wordCount = 0;
    let refNumber = 0;

    const enriched = blocks.map((block, blockIndex) => {
        if (block?._type !== 'block') return block;

        const inReferences = referenceStart !== -1 && blockIndex > referenceStart;
        const plain = blockToPlainText(block);
        wordCount += plain.split(/\s+/).filter(Boolean).length;

        const markDefs = [...(block.markDefs || [])];
        const keyPrefix = block._key || `b${blockIndex}`;
        const children = (block.children || []).flatMap((child: any, childIndex: number) =>
            child?._type === 'span'
                ? enrichSpan(child, markDefs, `${keyPrefix}-${childIndex}`, {
                      linkCitations: !inReferences,
                      referenceCount,
                  })
                : [child]
        );

        // Portable Text keeps hard line breaks inside a single span. Trimming the
        // edges stops a stray leading newline from opening a blank line.
        if (children.length > 0) {
            const first = children[0];
            const last = children[children.length - 1];
            if (first?._type === 'span') first.text = first.text.replace(/^[\n\r]+/, '');
            if (last?._type === 'span') last.text = last.text.replace(/[\n\r]+$/, '');
        }

        const next: any = { ...block, children, markDefs };

        if (/^h[1-4]$/.test(block.style || '') && plain.trim()) {
            const level = Number(block.style.slice(1));
            let id = slugify(plain) || `section-${blockIndex}`;
            let suffix = 2;
            while (usedIds.has(id)) id = `${slugify(plain)}-${suffix++}`;
            usedIds.add(id);
            next._headingId = id;
            if (level <= 3) headings.push({ id, text: plain.trim(), level });
        }

        if (inReferences && block.listItem === 'number') next._refNumber = ++refNumber;

        return next;
    });

    return {
        blocks: enriched,
        headings,
        wordCount,
        readingTime: Math.max(1, Math.round(wordCount / 200)),
        referenceCount,
    };
};

// Block-level Markdown syntax that Portable Text would otherwise show literally.
const MARKDOWN_BLOCK = /^(#{1,6}\s|```|\|.*\|\s*$|>\s)/m;

/**
 * True when the body was written as Markdown and pasted into the Portable Text
 * editor as plain text, so headings, tables and code fences arrived as `##`,
 * `|` and ``` characters rather than as styled blocks.
 */
export const isMarkdownAuthored = (input: any[]): boolean =>
    (Array.isArray(input) ? input : []).some(
        (block) =>
            block?._type === 'block' &&
            (block.style || 'normal') === 'normal' &&
            !block.listItem &&
            MARKDOWN_BLOCK.test(blockToPlainText(block))
    );

const DECORATORS: Record<string, string> = {
    strong: '**',
    em: '*',
    code: '`',
    'strike-through': '~~',
};

const spanToMarkdown = (span: any, markDefs: any[]) => {
    let text: string = span.text || '';
    for (const mark of span.marks || []) {
        const def = markDefs.find((d) => d._key === mark);
        if (def?._type === 'link' && def.href) text = `[${text}](${def.href})`;
        else if (DECORATORS[mark]) text = `${DECORATORS[mark]}${text}${DECORATORS[mark]}`;
    }
    return text;
};

const blockToMarkdown = (block: any, imageUrl: (image: any) => string): string | null => {
    if (block?._type === 'code')
        return `\`\`\`${block.language || ''}\n${block.code || ''}\n\`\`\``;
    if (block?._type === 'image') return `![${block.alt || ''}](${imageUrl(block)})`;
    if (block?._type !== 'block') return null;

    const markDefs = block.markDefs || [];
    const text = (block.children || [])
        .filter((child: any) => child?._type === 'span')
        .map((child: any) => spanToMarkdown(child, markDefs))
        .join('');

    const heading = (block.style || '').match(/^h([1-6])$/);
    if (heading) return `${'#'.repeat(Number(heading[1]))} ${text}`;
    if (block.style === 'blockquote') return text.replace(/^/gm, '> ');
    if (block.listItem) {
        const indent = '  '.repeat(Math.max(0, (block.level || 1) - 1));
        return `${indent}${block.listItem === 'number' ? '1.' : '-'} ${text}`;
    }
    return text;
};

const FENCE = /^\s*```/;
const TABLE_ROW = /^\s*\|/;
const LIST_ITEM = /^\s*([-*+]|\d+\.)\s/;

/** Converts `\[ \]` and `\( \)` maths to the `$$`/`$` delimiters remark-math reads. */
const normaliseMathDelimiters = (markdown: string) =>
    markdown
        .split(/(^\s*```[\s\S]*?^\s*```)/m)
        .map((part, i) =>
            i % 2
                ? part
                : part
                      .split(/(`[^`\n]*`)/)
                      .map((piece, j) =>
                          j % 2
                              ? piece
                              : piece
                                    .replace(
                                        /\\\[([\s\S]*?)\\\]/g,
                                        (_, m) => `\n$$\n${m.trim()}\n$$\n`
                                    )
                                    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)
                      )
                      .join('')
        )
        .join('');

/**
 * Rebuilds the Markdown source of a body pasted into the Portable Text editor.
 * The editor keeps the line breaks but drops blank lines, sometimes putting
 * the whole paste in a single block, so every line is rejoined as its own
 * paragraph, except where a line break is structural: inside code fences,
 * between table rows and between list items.
 */
export const portableTextToMarkdown = (
    input: any[],
    options: { imageUrl: (image: any) => string; title?: string }
): string => {
    const lines: string[] = [];
    let inFence = false;
    let previous: string | null = null;

    for (const block of Array.isArray(input) ? input : []) {
        const markdown = blockToMarkdown(block, options.imageUrl);
        if (markdown === null) continue;

        for (const line of markdown.split('\n')) {
            if (!inFence && !line.trim()) continue;

            if (previous !== null) {
                const tight =
                    inFence ||
                    (TABLE_ROW.test(previous) && TABLE_ROW.test(line)) ||
                    (LIST_ITEM.test(previous) && LIST_ITEM.test(line));
                lines.push(tight ? '\n' : '\n\n');
            }
            lines.push(line);
            previous = line;

            if (FENCE.test(line)) inFence = !inFence;
        }
    }

    return prepareMarkdown(lines.join(''), options.title);
};

/**
 * Final touches for a Markdown post body: drops a leading `# Title` that
 * repeats the post title, which the page already shows as its h1, and
 * converts the maths delimiters.
 */
export const prepareMarkdown = (input: string, title?: string): string => {
    let markdown = input.replace(/\r\n?/g, '\n').trim();

    const wanted = title?.trim().toLowerCase();
    const leading = markdown.match(/^#\s+(.+)\n*/);
    if (wanted && leading && leading[1].trim().toLowerCase() === wanted) {
        markdown = markdown.slice(leading[0].length);
    }

    return normaliseMathDelimiters(markdown);
};
