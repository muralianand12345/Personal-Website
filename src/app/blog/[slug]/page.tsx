import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

import Header from '@/components/header';
import Footer from '@/components/footer';
import ShareButtons from '@/components/share-buttons';
import ReadingProgress from '@/components/reading-progress';
import TableOfContents from '@/components/table-of-contents';
import PortableTextContent from '@/components/portable-text-content';
import { enrichPortableText, toPlainText } from '@/lib/portable-text';
import { fetchPostBySlug, fetchPostSlugs, fetchRelatedPosts, urlFor } from '@/lib/sanity';

export const revalidate = 60;

export const generateStaticParams = async () =>
    (await fetchPostSlugs()).map((slug) => ({ slug }));

const SITE_URL = 'https://www.muralianand.in';

type Props = { params: Promise<{ slug: string }> };

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const post = await fetchPostBySlug(slug);

    if (!post)
        return {
            title: 'Post not found',
            description: 'The requested post was not found.',
        };

    const title = post.title;
    const description =
        post.seo?.metaDescription || post.excerpt || toPlainText(post.body).slice(0, 160);
    const image =
        post.coverImageUrl ||
        (post.coverImage ? urlFor(post.coverImage).width(1200).url() : undefined);
    const url = `${SITE_URL}/blog/${slug}`;

    return {
        title,
        description,
        keywords: post.seo?.metaKeywords,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            siteName: 'Murali Anand',
            publishedTime: post.publishedAt,
            authors: post.author?.name ? [post.author.name] : undefined,
            images: image ? [{ url: image, alt: title, width: 1200, height: 630 }] : [],
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : [],
        },
    };
};

const NotFound = () => (
    <>
        <Header />
        <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-3xl mx-auto text-center py-32">
                <h1 className="text-3xl font-semibold mb-4">Post not found</h1>
                <p className="text-white/60 mb-8">
                    The blog post you&apos;re looking for doesn&apos;t exist.
                </p>
                <Link
                    href="/blog"
                    className="inline-block bg-white text-black px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
                >
                    Back to blog
                </Link>
            </div>
        </main>
        <Footer />
    </>
);

export default async function PostPage({ params }: Props) {
    const { slug } = await params;
    const post = await fetchPostBySlug(slug);

    if (!post) return <NotFound />;

    const { blocks, headings, readingTime } = enrichPortableText(post.body);
    const related = await fetchRelatedPosts(slug, post.categories || []);
    const url = `${SITE_URL}/blog/${slug}`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt || toPlainText(post.body).slice(0, 160),
        image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
        datePublished: post.publishedAt,
        author: { '@type': 'Person', name: post.author?.name || 'Murali Anand', url: SITE_URL },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    };

    return (
        <>
            <Header />
            <ReadingProgress />

            <main className="min-h-screen pt-16 bg-black">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <Link
                        href="/blog"
                        className="inline-block mb-10 text-sm text-white/50 hover:text-white transition-colors"
                    >
                        ← All posts
                    </Link>

                    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
                        <article className="min-w-0 max-w-3xl">
                            <header className="mb-12">
                                {post.categories && post.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {post.categories.map((category: string) => (
                                            <span
                                                key={category}
                                                className="text-xs px-3 py-1 bg-white/10 text-white/70 rounded-full"
                                            >
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] text-balance mb-6">
                                    {post.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/45">
                                    {post.author?.name && <span>{post.author.name}</span>}
                                    {post.publishedAt && (
                                        <>
                                            {post.author?.name && <span aria-hidden>·</span>}
                                            <time dateTime={post.publishedAt}>
                                                {formatDate(post.publishedAt)}
                                            </time>
                                        </>
                                    )}
                                    <span aria-hidden>·</span>
                                    <span>{readingTime} min read</span>
                                </div>

                                {post.excerpt && (
                                    <p className="text-lg text-white/65 mt-7 leading-relaxed border-l-2 border-white/15 pl-5">
                                        {post.excerpt}
                                    </p>
                                )}
                            </header>

                            {post.coverImage && (
                                <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-white/10 mb-12">
                                    <Image
                                        src={urlFor(post.coverImage).width(1600).url()}
                                        alt={post.coverImage.alt || post.title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            )}

                            <TableOfContents headings={headings} variant="inline" />

                            <PortableTextContent blocks={blocks} />

                            <div className="mt-16 pt-8 border-t border-white/10">
                                <ShareButtons title={post.title} url={url} />
                            </div>

                            {post.author?.bio && (
                                <div className="mt-10 p-6 border border-white/10 rounded-lg bg-white/[0.03]">
                                    <div className="flex items-start gap-4">
                                        {post.author.image && (
                                            <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={urlFor(post.author.image)
                                                        .width(112)
                                                        .url()}
                                                    alt={post.author.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="font-semibold mb-1.5">
                                                {post.author.name}
                                            </h2>
                                            <p className="text-white/60 text-sm leading-relaxed">
                                                {post.author.bio}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </article>

                        <aside className="hidden lg:block">
                            <TableOfContents headings={headings} variant="sidebar" />
                        </aside>
                    </div>

                    {related.length > 0 && (
                        <section className="mt-24 pt-12 border-t border-white/10">
                            <h2 className="text-sm uppercase tracking-widest text-white/40 mb-8">
                                Keep reading
                            </h2>
                            <div className="grid gap-6 sm:grid-cols-2">
                                {related.map((item: any) => (
                                    <Link
                                        key={item.slug}
                                        href={`/blog/${item.slug}`}
                                        className="group block p-6 border border-white/10 rounded-lg bg-white/[0.03] hover:border-white/30 transition-colors"
                                    >
                                        <h3 className="text-lg font-semibold mb-2 leading-snug">
                                            {item.title}
                                        </h3>
                                        {item.excerpt && (
                                            <p className="text-sm text-white/55 line-clamp-2 mb-3">
                                                {item.excerpt}
                                            </p>
                                        )}
                                        {item.publishedAt && (
                                            <span className="text-xs text-white/40">
                                                {formatDate(item.publishedAt)}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            <Footer />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </>
    );
}
