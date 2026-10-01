import fs from 'node:fs';
import path from 'node:path';

/**
 * Markdown pages live in /md_pages at the repo root: `name.md` is served at
 * /md/name. Every other file in the folder (images, PDFs, video) is served
 * from /md-assets/, so a page can point at it by a relative path, exactly as
 * it would in an editor preview or on GitHub.
 */
const MD_DIR = path.join(process.cwd(), 'md_pages');
const MD_EXTENSION = /\.md$/i;

export type MdPage = {
    slug: string;
    title: string;
    /** For search results and link previews: the frontmatter description, or the opening paragraph. */
    description: string;
    /** Only an explicit frontmatter description is shown on the page itself. */
    excerpt?: string;
    date?: string;
    /** The first image in the page, resolved to where the site serves it; used as the card cover on /md. */
    cover?: string;
    body: string;
    readingTime: number;
};

const isHidden = (name: string) => name.startsWith('.');

const mdFiles = (): Map<string, string> => {
    if (!fs.existsSync(MD_DIR)) return new Map();
    return new Map(
        fs
            .readdirSync(MD_DIR, { withFileTypes: true })
            .filter(
                (entry) => entry.isFile() && MD_EXTENSION.test(entry.name) && !isHidden(entry.name)
            )
            .map((entry) => [entry.name.replace(MD_EXTENSION, ''), entry.name])
    );
};

export const getMdSlugs = () => [...mdFiles().keys()].sort();

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** Flat `key: value` frontmatter; enough for title, description and date. */
const parseFrontmatter = (raw: string) => {
    const match = raw.match(FRONTMATTER);
    const data: Record<string, string> = {};
    if (!match) return { data, body: raw };

    for (const line of match[1].split(/\r?\n/)) {
        const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
        if (pair) data[pair[1].toLowerCase()] = pair[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
    return { data, body: raw.slice(match[0].length) };
};

// A leading `# Title` (or setext `Title` over `===`) is the page title, not a
// second heading under it.
const LEADING_H1 = /^\s*(?:#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*|([^\n]+)\r?\n=+[ \t]*)(?:\r?\n|$)/;

const humanize = (slug: string) => {
    const words = slug.replace(/[-_]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
};

const CODE_FENCE = /^(`{3,}|~{3,})[\s\S]*?^\1/gm;

const toDescription = (body: string) => {
    for (const block of body.replace(CODE_FENCE, '').split(/\r?\n\s*\r?\n/)) {
        const text = block.trim();
        // Skip anything that is not an ordinary paragraph.
        if (!text || /^(#|<|\||>|[-*+] |\d+\. |!\[|\$\$|---|\[\^?[^\]]+\]:)/.test(text)) continue;

        const plain = text
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/\[\^[^\]]+\]|\[\d+(?:\s*,\s*\d+)*\]/g, '')
            .replace(/[*`~]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (plain)
            return plain.length > 160 ? `${plain.slice(0, 157).replace(/\s+\S*$/, '')}…` : plain;
    }
    return '';
};

// The first Markdown image `![alt](src "title")` or HTML `<img src="...">` outside code.
const FIRST_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img\b[^>]*?\bsrc=["']([^"']+)["']/i;

export const getMdPage = (slug: string): MdPage | null => {
    // Resolving through the directory listing means a slug can never reach outside md_pages.
    const file = mdFiles().get(slug);
    if (!file) return null;

    const raw = fs.readFileSync(path.join(MD_DIR, file), 'utf8').replace(/^﻿/, '');
    const { data, body: content } = parseFrontmatter(raw);

    let body = content;
    let title = data.title;
    if (!title) {
        const heading = body.match(LEADING_H1);
        if (heading) {
            title = (heading[1] ?? heading[2]).trim();
            body = body.slice(heading[0].length);
        }
    }

    const words = body.replace(CODE_FENCE, '').split(/\s+/).filter(Boolean).length;
    const image = body.replace(CODE_FENCE, '').match(FIRST_IMAGE);

    return {
        slug,
        title: title || humanize(slug),
        description: data.description || toDescription(body),
        excerpt: data.description,
        date: data.date,
        cover: image ? resolveMdUrl(image[1] ?? image[2]) : undefined,
        body,
        readingTime: Math.max(1, Math.round(words / 200)),
    };
};

/** Every page for the /md index: newest first, undated pages last, then by title. */
export const getMdPages = (): MdPage[] =>
    getMdSlugs()
        .map((slug) => getMdPage(slug)!)
        .sort(
            (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title)
        );

const walkAssets = (dir: string, prefix = ''): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (isHidden(entry.name)) return [];
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) return walkAssets(path.join(dir, entry.name), relative);
        return entry.isFile() && !MD_EXTENSION.test(entry.name) ? [relative] : [];
    });

/** Every non-Markdown file in md_pages, as a forward-slash path relative to it. */
export const getMdAssets = () => (fs.existsSync(MD_DIR) ? walkAssets(MD_DIR) : []);

const MIME_TYPES: Record<string, string> = {
    '.apng': 'image/apng',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.csv': 'text/csv; charset=utf-8',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.zip': 'application/zip',
};

const safeDecode = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export const readMdAsset = (segments: string[]) => {
    const assets = getMdAssets();
    // Route params may arrive encoded or decoded; only a listed file is ever read.
    const relative = [segments.join('/'), segments.map(safeDecode).join('/')].find((candidate) =>
        assets.includes(candidate)
    );
    if (!relative) return null;

    return {
        data: fs.readFileSync(path.join(MD_DIR, relative)),
        type: MIME_TYPES[path.extname(relative).toLowerCase()] ?? 'application/octet-stream',
    };
};

// A scheme (https:, mailto:, data:), a root or protocol-relative path, or an in-page link.
const NOT_RELATIVE = /^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i;

/**
 * Rewrites a relative URL written in a page (`images/a.png`, `./other.md#setup`)
 * to where the site serves it. Anything else passes through untouched.
 */
export const resolveMdUrl = (url: string) => {
    if (!url || NOT_RELATIVE.test(url)) return url;

    const [, target, suffix] = url.match(/^([^?#]*)(.*)$/) ?? ['', url, ''];
    const clean = path.posix.normalize(safeDecode(target));
    if (clean === '.' || clean.startsWith('..')) return url;

    const encoded = clean.split('/').map(encodeURIComponent).join('/');
    return MD_EXTENSION.test(clean)
        ? `/md/${encoded.replace(MD_EXTENSION, '')}${suffix}`
        : `/md-assets/${encoded}${suffix}`;
};
