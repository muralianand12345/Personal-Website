import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// @ts-ignore: Ignore missing type declarations for side-effect CSS import
import 'katex/dist/katex.min.css';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ShareButtons from '@/components/share-buttons';
import ReadingProgress from '@/components/reading-progress';
import TableOfContents from '@/components/table-of-contents';
import { renderMarkdown } from '@/components/markdown-content';
import { getMdPage, getMdSlugs } from '@/lib/md-pages';

/**
 * One static page per file in /md_pages: `name.md` is built at /md/name.
 * Anything not in the folder is a 404 rather than a render attempt.
 */
export const dynamicParams = false;

export const generateStaticParams = () => getMdSlugs().map((slug) => ({ slug }));

const SITE_URL = 'https://www.muralianand.in';

type Props = { params: Promise<{ slug: string }> };

const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const page = getMdPage(slug);
    if (!page) return { title: 'Page not found' };

    const url = `${SITE_URL}/md/${encodeURIComponent(slug)}`;
    const description = page.description || undefined;

    return {
        title: page.title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title: page.title,
            description,
            url,
            type: 'article',
            siteName: 'Murali Anand',
            publishedTime: page.date,
        },
        twitter: { card: 'summary_large_image', title: page.title, description },
    };
};

export default async function MarkdownPage({ params }: Props) {
    const { slug } = await params;
    const page = getMdPage(slug);
    if (!page) notFound();

    const { content, headings } = renderMarkdown(page.body);
    const url = `${SITE_URL}/md/${encodeURIComponent(slug)}`;

    return (
        <>
            <Header />
            <ReadingProgress />

            <main className="min-h-screen pt-16 bg-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <Link
                        href="/md"
                        className="inline-block mb-10 text-sm text-white/50 hover:text-white transition-colors"
                    >
                        ← All pages
                    </Link>

                    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
                        <article className="min-w-0 max-w-3xl">
                            <header className="mb-12">
                                <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] text-balance mb-6">
                                    {page.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/45">
                                    {page.date && (
                                        <>
                                            <time dateTime={page.date}>
                                                {formatDate(page.date)}
                                            </time>
                                            <span aria-hidden>·</span>
                                        </>
                                    )}
                                    <span>{page.readingTime} min read</span>
                                </div>

                                {page.excerpt && (
                                    <p className="text-lg text-white/65 mt-7 leading-relaxed border-l-2 border-white/15 pl-5">
                                        {page.excerpt}
                                    </p>
                                )}
                            </header>

                            <TableOfContents headings={headings} variant="inline" />

                            {content}

                            <div className="mt-16 pt-8 border-t border-white/10">
                                <ShareButtons title={page.title} url={url} />
                            </div>
                        </article>

                        <aside className="hidden lg:block">
                            <TableOfContents headings={headings} variant="sidebar" />
                        </aside>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
