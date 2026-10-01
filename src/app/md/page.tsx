import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { getMdPages } from '@/lib/md-pages';

const DESCRIPTION = 'Short reads that live outside the blog: stories, how-tos and explainers.';

export const metadata: Metadata = {
    title: 'Pages',
    description: DESCRIPTION,
    alternates: { canonical: '/md' },
    openGraph: { title: 'Pages', description: DESCRIPTION, url: '/md', siteName: 'Murali Anand' },
};

const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Index of every file in /md_pages, built at deploy like the pages themselves. */
const MdIndexPage = () => {
    const pages = getMdPages();

    return (
        <>
            <Header />

            <main className="min-h-screen pt-16 bg-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                    <header data-reveal="" className="max-w-2xl mb-12 sm:mb-16">
                        <p className="text-sm uppercase tracking-widest text-white/40 mb-4">
                            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                        </p>
                        <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] text-balance mb-5">
                            Pages
                        </h1>
                        <p className="text-lg text-white/60 leading-relaxed">{DESCRIPTION}</p>
                    </header>

                    {pages.length === 0 ? (
                        <p className="rounded-2xl border border-white/10 px-6 py-16 text-center text-white/50">
                            Nothing here yet.
                        </p>
                    ) : (
                        <ul className="grid gap-6 sm:gap-8 md:grid-cols-2">
                            {pages.map((page, index) => (
                                <li key={page.slug} data-reveal="">
                                    <Link
                                        href={`/md/${encodeURIComponent(page.slug)}`}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                    >
                                        {page.cover && (
                                            <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-white/[0.03]">
                                                {/* Decorative here: the title below names the page. */}
                                                <img
                                                    src={page.cover}
                                                    alt=""
                                                    loading={index < 2 ? 'eager' : 'lazy'}
                                                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                                />
                                            </div>
                                        )}

                                        <div className="flex flex-1 flex-col p-6 sm:p-7">
                                            <div className="mb-3 flex flex-wrap items-center gap-x-2 text-xs text-white/45">
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

                                            <h2 className="mb-3 text-2xl font-semibold leading-snug text-balance">
                                                {page.title}
                                            </h2>

                                            {page.description && (
                                                <p className="mb-6 text-white/60 leading-relaxed line-clamp-3">
                                                    {page.description}
                                                </p>
                                            )}

                                            <span className="mt-auto inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors group-hover:text-white">
                                                Read
                                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
};

export default MdIndexPage;
