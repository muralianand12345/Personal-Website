import Image from 'next/image';
import { PortableText } from '@portabletext/react';

import CodeBlock from '@/components/code-block';
import { urlFor } from '@/lib/sanity';

const headingClasses: Record<number, string> = {
    1: 'text-3xl sm:text-4xl font-bold mt-16 mb-5 pb-3 border-b border-white/10',
    2: 'text-2xl sm:text-3xl font-bold mt-14 mb-4',
    3: 'text-xl sm:text-2xl font-semibold mt-10 mb-3',
    4: 'text-lg font-semibold mt-8 mb-2 text-white/90',
};

const Heading = ({ level, value, children }: { level: number; value: any; children: any }) => {
    const Tag = `h${level}` as 'h1';
    const id = value?._headingId;

    return (
        <Tag id={id} className={`group scroll-mt-24 ${headingClasses[level]}`}>
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
};

export const portableTextComponents = {
    types: {
        image: ({ value }: any) => (
            <figure className="my-10">
                <div className="rounded-lg overflow-hidden border border-white/10">
                    <Image
                        src={urlFor(value).width(1200).url()}
                        alt={value.alt || ''}
                        width={1200}
                        height={675}
                        className="w-full h-auto"
                    />
                </div>
                {value.alt && (
                    <figcaption className="text-sm text-white/45 text-center mt-3">
                        {value.alt}
                    </figcaption>
                )}
            </figure>
        ),
        code: ({ value }: any) => <CodeBlock code={value.code || ''} language={value.language} />,
    },
    block: {
        h1: (props: any) => <Heading level={1} {...props} />,
        h2: (props: any) => <Heading level={2} {...props} />,
        h3: (props: any) => <Heading level={3} {...props} />,
        h4: (props: any) => <Heading level={4} {...props} />,
        normal: ({ children }: any) => (
            <p className="leading-[1.8] text-white/75 my-5 whitespace-pre-line">{children}</p>
        ),
        blockquote: ({ children }: any) => (
            <blockquote className="border-l-2 border-white/30 pl-5 my-8 text-white/65 italic">
                {children}
            </blockquote>
        ),
    },
    list: {
        // The references list is rendered tighter and smaller than body lists.
        bullet: ({ children }: any) => (
            <ul className="list-disc list-outside pl-6 my-5 space-y-2 text-white/75 marker:text-white/30">
                {children}
            </ul>
        ),
        number: ({ children, value }: any) => {
            const isReferences = value?.children?.[0]?._refNumber !== undefined;
            return (
                <ol
                    className={
                        isReferences
                            ? 'list-decimal list-outside pl-7 my-6 space-y-4 text-sm text-white/60 marker:text-white/40'
                            : 'list-decimal list-outside pl-6 my-5 space-y-2 text-white/75 marker:text-white/30'
                    }
                >
                    {children}
                </ol>
            );
        },
    },
    listItem: {
        bullet: ({ children }: any) => <li className="pl-1 leading-[1.75]">{children}</li>,
        number: ({ children, value }: any) =>
            value?._refNumber !== undefined ? (
                <li
                    id={`ref-${value._refNumber}`}
                    className="reference-item scroll-mt-28 pl-1 leading-[1.7] rounded-sm"
                >
                    {children}
                </li>
            ) : (
                <li className="pl-1 leading-[1.75]">{children}</li>
            ),
    },
    marks: {
        strong: ({ children }: any) => (
            <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }: any) => <em className="italic text-white/85">{children}</em>,
        underline: ({ children }: any) => <span className="underline">{children}</span>,
        'strike-through': ({ children }: any) => <s className="text-white/50">{children}</s>,
        code: ({ children }: any) => (
            <code className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-[0.875em] font-mono text-white/90">
                {children}
            </code>
        ),
        link: ({ children, value }: any) => (
            <a
                href={value?.href}
                className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white break-words transition-colors"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        ),
        citation: ({ children, value }: any) => (
            <a
                href={`#ref-${value?.refNumber}`}
                aria-label={`Jump to reference ${value?.refNumber}`}
                className="text-white/90 no-underline hover:text-white hover:bg-white/15 rounded px-0.5 transition-colors font-medium"
            >
                {children}
            </a>
        ),
    },
};

const PortableTextContent = ({ blocks }: { blocks: any[] }) => (
    <div className="text-[1.0625rem]">
        <PortableText value={blocks} components={portableTextComponents} />
    </div>
);

export default PortableTextContent;
