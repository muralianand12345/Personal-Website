import type { Element, ElementContent, Root, RootContent } from 'hast';

import { slugify, type Heading } from '@/lib/portable-text';

/**
 * The page-level extras a Markdown page gets on top of GFM, mirroring what the
 * blog does for Portable Text:
 *
 * - every heading gets a stable id, and h1-h3 are collected for the table of contents;
 * - under a "References" heading, each entry gets an `ref-n` anchor, and `[n]`
 *   citations elsewhere become links to it;
 * - bare `doi:10...` identifiers link to doi.org;
 * - GitHub callouts (`> [!NOTE]`) are marked with `data-alert`.
 *
 * Runs after rehype-raw, so headings and references written as HTML count too,
 * and before rehype-katex, while maths is still inside `code` and easy to skip.
 */

type Parent = Root | Element;

const HEADING = /^h([1-6])$/;
const REFERENCES = /^(references|bibliography|works cited)$/i;
const LEADING_REFERENCE = /^\s*\[(\d+)\]/;
const INLINE = /\[(\d+(?:\s*,\s*\d+)*)\]|\bdoi:\s*(10\.[^\s<>"]+)/gi;
const TRAILING_PUNCT = /[.,;:!?]+$/;
const ALERT = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n)?/i;

// Text inside these is literal: never linked, never read as a citation.
const LITERAL = new Set(['a', 'code', 'pre', 'kbd', 'script', 'style', 'svg', 'math']);

const isElement = (node: unknown, tagName?: string): node is Element =>
    (node as Element | undefined)?.type === 'element' &&
    (!tagName || (node as Element).tagName === tagName);

export const textContent = (node: Root | RootContent): string =>
    node.type === 'text'
        ? node.value
        : 'children' in node
        ? (node.children as RootContent[]).map(textContent).join('')
        : '';

const headingLevel = (node: unknown) => {
    const match = isElement(node) ? node.tagName.match(HEADING) : null;
    return match ? Number(match[1]) : 0;
};

const addClass = (element: Element, name: string) => {
    const current = element.properties.className;
    const list = Array.isArray(current) ? current : current ? String(current).split(/\s+/) : [];
    element.properties.className = [...list, name];
};

const isFootnotes = (node: unknown) =>
    isElement(node, 'section') && node.properties.dataFootnotes !== undefined;

const eachElement = (parent: Parent, visit: (element: Element) => void) => {
    for (const child of parent.children) {
        if (!isElement(child)) continue;
        visit(child);
        eachElement(child, visit);
    }
};

const assignHeadingIds = (tree: Root, headings: Heading[]) => {
    const used = new Set<string>();

    eachElement(tree, (element) => {
        const level = headingLevel(element);
        const text = level ? textContent(element).trim() : '';
        if (!text) return;

        // An id written in raw HTML is kept, so existing links to it still land.
        let id = element.properties.id ? String(element.properties.id) : '';
        if (!id) {
            const base = slugify(text) || 'section';
            id = base;
            for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
            element.properties.id = id;
        }
        used.add(id);

        // The footnotes section brings its own (visually hidden) heading.
        if (level <= 3 && !id.endsWith('footnote-label')) headings.push({ id, text, level });
    });
};

/** Anchors each reference entry; returns the numbers that exist and the span they occupy. */
const markReferences = (tree: Root) => {
    const numbers = new Set<number>();
    const start = tree.children.findIndex(
        (node) => headingLevel(node) > 0 && REFERENCES.test(textContent(node).trim())
    );
    if (start === -1) return { numbers, start, end: start };

    const mark = (element: Element, n: number) => {
        element.properties.id = `ref-${n}`;
        addClass(element, 'reference-item');
        numbers.add(n);
    };

    const level = headingLevel(tree.children[start]);
    let end = start + 1;
    for (; end < tree.children.length; end++) {
        const node = tree.children[end];
        const nodeLevel = headingLevel(node);
        if ((nodeLevel && nodeLevel <= level) || isFootnotes(node)) break;
        if (!isElement(node)) continue;

        if (node.tagName === 'ol' || node.tagName === 'ul') {
            const first = Number(node.properties.start ?? 1);
            node.children
                .filter((child) => isElement(child, 'li'))
                .forEach((item, index) => {
                    // `[3] Author...` sets the number; otherwise an ordered list counts.
                    const explicit = textContent(item).match(LEADING_REFERENCE);
                    const n = explicit
                        ? Number(explicit[1])
                        : node.tagName === 'ol'
                        ? first + index
                        : 0;
                    if (n) mark(item as Element, n);
                });
            addClass(node, 'references');
        } else if (node.tagName === 'p') {
            const explicit = textContent(node).match(LEADING_REFERENCE);
            if (explicit) mark(node, Number(explicit[1]));
        }
    }

    return { numbers, start, end };
};

const link = (href: string, label: string, className?: string): Element => ({
    type: 'element',
    tagName: 'a',
    properties: className ? { href, className: [className] } : { href },
    children: [{ type: 'text', value: label }],
});

// DOIs can contain parentheses, so a closing one is only dropped when it is unbalanced.
const splitTrailing = (doi: string) => {
    let value = doi;
    let trailing = '';
    for (;;) {
        const punct = value.match(TRAILING_PUNCT)?.[0];
        if (punct) {
            value = value.slice(0, -punct.length);
            trailing = punct + trailing;
        } else if (value.endsWith(')') && value.split('(').length < value.split(')').length) {
            value = value.slice(0, -1);
            trailing = `)${trailing}`;
        } else {
            return { value, trailing };
        }
    }
};

const linkifyText = (value: string, citable: Set<number>): ElementContent[] | null => {
    const out: ElementContent[] = [];
    const text = (part: string) => part && out.push({ type: 'text', value: part });
    let cursor = 0;

    for (const match of value.matchAll(INLINE)) {
        const [full, citation, doi] = match;
        const index = match.index ?? 0;

        if (citation) {
            const numbers = citation.split(',').map((n) => Number(n.trim()));
            // A number with no matching reference stays plain text.
            if (!numbers.every((n) => citable.has(n))) continue;
            text(value.slice(cursor, index));
            text('[');
            numbers.forEach((n, i) => {
                if (i > 0) text(', ');
                out.push(link(`#ref-${n}`, String(n), 'citation'));
            });
            text(']');
        } else {
            const { value: id, trailing } = splitTrailing(doi);
            text(value.slice(cursor, index));
            out.push(link(`https://doi.org/${id}`, full.slice(0, full.length - trailing.length)));
            text(trailing);
        }
        cursor = index + full.length;
    }

    if (cursor === 0) return null;
    text(value.slice(cursor));
    return out;
};

const linkify = (parent: Parent, citable: Set<number>) => {
    for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        if (isElement(child)) {
            if (!LITERAL.has(child.tagName)) linkify(child, citable);
        } else if (child.type === 'text') {
            const parts = linkifyText(child.value, citable);
            if (parts) {
                parent.children.splice(i, 1, ...(parts as RootContent[]));
                i += parts.length - 1;
            }
        }
    }
};

const markAlerts = (tree: Root) =>
    eachElement(tree, (element) => {
        if (element.tagName !== 'blockquote') return;
        const paragraph = element.children.find((child) => isElement(child));
        if (!isElement(paragraph, 'p')) return;

        const lead = paragraph.children[0];
        const match = lead?.type === 'text' ? lead.value.match(ALERT) : null;
        if (!match || lead?.type !== 'text') return;

        lead.value = lead.value.slice(match[0].length);
        if (!textContent(paragraph).trim()) {
            element.children.splice(element.children.indexOf(paragraph), 1);
        }
        element.properties.dataAlert = match[1].toLowerCase();
    });

export const rehypeMdPage =
    ({ headings }: { headings: Heading[] }) =>
    (tree: Root) => {
        assignHeadingIds(tree, headings);
        markAlerts(tree);

        const references = markReferences(tree);
        tree.children.forEach((node, index) => {
            if (!isElement(node)) return;
            const inReferences = index > references.start && index < references.end;
            // Entries in the list itself are not citations of each other.
            linkify(node, inReferences ? new Set() : references.numbers);
        });
    };
