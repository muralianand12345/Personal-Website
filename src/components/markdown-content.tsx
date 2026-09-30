import type { ReactNode } from 'react';
import type { Element, ElementContent } from 'hast';
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { Info, Lightbulb, MessageSquareWarning, OctagonAlert, TriangleAlert } from 'lucide-react';

import CodeBlock from '@/components/code-block';
import { headingClasses } from '@/components/portable-text-content';
import { resolveMdUrl } from '@/lib/md-pages';
import type { Heading } from '@/lib/portable-text';
import { rehypeMdPage, textContent } from '@/lib/rehype-md-page';

/**
 * Renders a page from md_pages with the same typography as blog posts, which
 * in turn follow the homepage: white on black, muted body copy, hairline
 * borders and rounded-xl frames.
 */

const HEADING_CLASSES: Record<number, string> = {
    ...headingClasses,
    5: 'text-base font-semibold mt-6 mb-2 text-white/90',
    6: 'text-sm font-semibold uppercase tracking-wider mt-6 mb-2 text-white/60',
};

const ALERTS: Record<string, { label: string; Icon: typeof Info }> = {
    note: { label: 'Note', Icon: Info },
    tip: { label: 'Tip', Icon: Lightbulb },
    important: { label: 'Important', Icon: MessageSquareWarning },
    warning: { label: 'Warning', Icon: TriangleAlert },
    caution: { label: 'Caution', Icon: OctagonAlert },
};

const LINK_CLASS =
    'text-white underline decoration-white/30 underline-offset-2 hover:decoration-white break-words transition-colors';

const classList = (className: unknown) => String(className ?? '').split(/\s+/);

const dataProp = (props: object, name: string) => (props as Record<string, unknown>)[name];

const isBlank = (node: ElementContent) => node.type === 'text' && !node.value.trim();

const heading = (level: number) => {
    const Tag = `h${level}` as 'h1';

    const MarkdownHeading = ({ id, children }: { id?: string; children?: ReactNode }) =>
        id?.endsWith('footnote-label') ? (
            <Tag id={id} className="text-xs uppercase tracking-widest text-white/40 mb-4">
                {children}
            </Tag>
        ) : (
            <Tag id={id} className={`group scroll-mt-24 ${HEADING_CLASSES[level]}`}>
                {children}
                {id && (
                    <a
                        href={`#${id}`}
                        aria-label="Link to this section"
                        className="ml-2 align-middle text-white/25 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[0.7em] no-underline"
                    >
                        #
                    </a>
                )}
            </Tag>
        );

    return MarkdownHeading;
};

const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),

    p: ({ node, className, children, ...props }) => {
        // An image alone in its paragraph is a figure, captioned by its title or alt text.
        const content = node?.children.filter((child) => !isBlank(child)) ?? [];
        const image = content.length === 1 ? (content[0] as Element) : null;
        if (image?.type === 'element' && image.tagName === 'img') {
            const caption = String(image.properties.title || image.properties.alt || '');
            return (
                <figure className="my-10 [&_img]:block [&_img]:mx-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10">
                    {children}
                    {caption && (
                        <figcaption className="text-sm text-white/45 text-center mt-3">
                            {caption}
                        </figcaption>
                    )}
                </figure>
            );
        }

        if (classList(className).includes('reference-item')) {
            return (
                <p
                    {...props}
                    className="reference-item scroll-mt-28 my-3 text-sm leading-[1.7] text-white/60 rounded-sm"
                >
                    {children}
                </p>
            );
        }

        return (
            <p {...props} className="leading-[1.8] text-white/75 my-5">
                {children}
            </p>
        );
    },

    img: ({ node, alt, ...props }) => (
        <img
            {...props}
            alt={alt ?? ''}
            loading="lazy"
            decoding="async"
            className="inline-block max-w-full h-auto align-middle"
        />
    ),

    a: ({ node, href = '', className, children, ...props }) => {
        if (dataProp(props, 'data-footnote-ref') !== undefined) {
            return (
                <a
                    {...props}
                    href={href}
                    className="px-0.5 font-medium text-white/60 hover:text-white no-underline transition-colors"
                >
                    {children}
                </a>
            );
        }

        if (dataProp(props, 'data-footnote-backref') !== undefined) {
            return (
                <a
                    {...props}
                    href={href}
                    className="ml-1 text-white/40 hover:text-white no-underline transition-colors"
                >
                    {children}
                </a>
            );
        }

        if (classList(className).includes('citation')) {
            return (
                <a
                    href={href}
                    aria-label={`Jump to reference ${href.replace('#ref-', '')}`}
                    className="text-white/90 no-underline hover:text-white hover:bg-white/15 rounded px-0.5 transition-colors font-medium"
                >
                    {children}
                </a>
            );
        }

        const external = /^(?:https?:)?\/\//i.test(href);
        return (
            <a
                {...props}
                href={href}
                className={LINK_CLASS}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {children}
            </a>
        );
    },

    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-white/85">{children}</em>,
    del: ({ children }) => <del className="text-white/50">{children}</del>,
    mark: ({ children }) => (
        <mark className="bg-white/15 text-white rounded px-0.5">{children}</mark>
    ),
    kbd: ({ children }) => (
        <kbd className="rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.8em] text-white/85">
            {children}
        </kbd>
    ),

    code: ({ children }) => (
        <code className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-[0.875em] font-mono text-white/90">
            {children}
        </code>
    ),

    pre: ({ node }) => {
        const code = node?.children.find(
            (child): child is Element => child.type === 'element' && child.tagName === 'code'
        );
        const language = classList(code?.properties.className)
            .find((name) => name.startsWith('language-'))
            ?.slice('language-'.length);
        const text = code ? textContent(code) : node ? textContent(node) : '';
        return <CodeBlock code={text.replace(/\n$/, '')} language={language} />;
    },

    blockquote: ({ node, children, ...props }) => {
        const alert = ALERTS[String(dataProp(props, 'data-alert') ?? '')];
        if (alert) {
            return (
                <div
                    role="note"
                    className="my-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 [&_p]:my-2 [&_p]:text-white/70 [&>p:last-child]:mb-0"
                >
                    <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-white/50">
                        <alert.Icon className="w-3.5 h-3.5" aria-hidden />
                        {alert.label}
                    </div>
                    {children}
                </div>
            );
        }

        return (
            <blockquote className="border-l-2 border-white/30 pl-5 my-8 italic [&_p]:text-white/65 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                {children}
            </blockquote>
        );
    },

    ul: ({ node, className, children, ...props }) => {
        const classes = classList(className);
        const style = classes.includes('contains-task-list')
            ? 'list-none pl-1 my-5 space-y-2 text-white/75'
            : classes.includes('references')
            ? 'list-none my-6 space-y-4 text-sm text-white/60'
            : 'list-disc list-outside pl-6 my-5 space-y-2 text-white/75 marker:text-white/30';
        return (
            <ul {...props} className={style}>
                {children}
            </ul>
        );
    },

    ol: ({ node, className, children, ...props }) => (
        <ol
            {...props}
            className={
                classList(className).includes('references')
                    ? 'list-decimal list-outside pl-7 my-6 space-y-4 text-sm text-white/60 marker:text-white/40'
                    : 'list-decimal list-outside pl-6 my-5 space-y-2 text-white/75 marker:text-white/30'
            }
        >
            {children}
        </ol>
    ),

    li: ({ node, className, children, ...props }) => {
        const classes = classList(className);
        // Lists nested in an item sit closer than top-level ones.
        const nested = '[&_ul]:my-2 [&_ol]:my-2 [&>p]:my-2';
        if (classes.includes('reference-item')) {
            return (
                <li
                    {...props}
                    className={`reference-item scroll-mt-28 pl-1 leading-[1.7] rounded-sm ${nested}`}
                >
                    {children}
                </li>
            );
        }
        return (
            <li
                {...props}
                className={`${
                    classes.includes('task-list-item') ? 'list-none' : 'pl-1'
                } leading-[1.75] ${nested}`}
            >
                {children}
            </li>
        );
    },

    input: ({ node, ...props }) => (
        <input {...props} readOnly className="mr-2.5 align-middle accent-white" />
    ),

    hr: () => <hr className="my-12 border-white/10" />,

    table: ({ node, children, ...props }) => (
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10">
            <table {...props} className="w-full border-collapse text-sm">
                {children}
            </table>
        </div>
    ),
    thead: ({ node, ...props }) => <thead {...props} className="bg-white/[0.04]" />,
    th: ({ node, ...props }) => (
        <th
            {...props}
            className="px-4 py-3 text-left font-semibold text-white border-b border-white/10 whitespace-nowrap"
        />
    ),
    td: ({ node, ...props }) => (
        <td {...props} className="px-4 py-3 align-top text-white/70 border-t border-white/10" />
    ),

    section: ({ node, className, children, ...props }) =>
        dataProp(props, 'data-footnotes') !== undefined ? (
            <section
                {...props}
                className="mt-16 pt-8 border-t border-white/10 text-sm [&_p]:my-2 [&_p]:text-white/60 [&_li]:text-white/60"
            >
                {children}
            </section>
        ) : (
            <section {...props} className={className}>
                {children}
            </section>
        ),

    details: ({ node, children, ...props }) => (
        <details
            {...props}
            className="my-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 [&[open]>summary]:mb-3"
        >
            {children}
        </details>
    ),
    summary: ({ node, children, ...props }) => (
        <summary
            {...props}
            className="cursor-pointer select-none text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
            {children}
        </summary>
    ),

    iframe: ({ node, ...props }) => (
        <iframe
            {...props}
            className="my-8 block w-full h-auto aspect-video rounded-xl border border-white/10"
        />
    ),
    video: ({ node, ...props }) => (
        <video {...props} className="my-8 block w-full h-auto rounded-xl border border-white/10" />
    ),
};

// Relative links and images resolve into md_pages; inline `data:` images are allowed.
const urlTransform = (url: string, key: string) =>
    key === 'src' && /^data:image\//i.test(url) ? url : defaultUrlTransform(resolveMdUrl(url));

/**
 * Markdown renders synchronously, so once it returns the plugin has already
 * collected the headings, and the table of contents can never disagree with
 * the ids in the page.
 */
export const renderMarkdown = (markdown: string) => {
    const headings: Heading[] = [];

    const content = Markdown({
        children: markdown,
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeRaw, [rehypeMdPage, { headings }], rehypeKatex],
        components,
        urlTransform,
    });

    return {
        headings,
        content: (
            <div className="text-[1.0625rem] [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2">
                {content}
            </div>
        ),
    };
};
