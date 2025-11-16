import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PortableText } from '@portabletext/react';

import Header from '@/components/header';
import Footer from '@/components/footer';
import CodeBlock from '@/components/code-block';
import { fetchPostBySlug, urlFor } from '@/lib/sanity';

type Props = { params: Promise<{ slug: string }> };

const portableTextComponents = {
    types: {
        image: ({ value }: any) => {
            return (
                <div className="my-8 rounded-lg overflow-hidden">
                    <Image
                        src={urlFor(value).width(800).url()}
                        alt={value.alt || ''}
                        width={800}
                        height={450}
                        className="w-full h-auto"
                    />
                    {value.alt && (
                        <p className="text-sm text-white/50 text-center mt-2 italic">
                            {value.alt}
                        </p>
                    )}
                </div>
            );
        },
        code: ({ value }: any) => {
            return <CodeBlock code={value.code || ''} language={value.language} />;
        },
    },
    block: {
        h1: ({ children }: any) => (
            <h1 className="text-4xl font-bold mt-12 mb-4">{children}</h1>
        ),
        h2: ({ children }: any) => (
            <h2 className="text-3xl font-bold mt-10 mb-4">{children}</h2>
        ),
        h3: ({ children }: any) => (
            <h3 className="text-2xl font-bold mt-8 mb-3">{children}</h3>
        ),
        h4: ({ children }: any) => (
            <h4 className="text-xl font-bold mt-6 mb-2">{children}</h4>
        ),
        normal: ({ children }: any) => (
            <p className="leading-7 text-white/80 my-4">{children}</p>
        ),
        blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-white/30 pl-4 my-6 italic text-white/70">
                {children}
            </blockquote>
        ),
    },
    list: {
        bullet: ({ children }: any) => (
            <ul className="list-disc list-inside my-4 space-y-2 text-white/80">
                {children}
            </ul>
        ),
        number: ({ children }: any) => (
            <ol className="list-decimal list-inside my-4 space-y-2 text-white/80">
                {children}
            </ol>
        ),
    },
    listItem: {
        bullet: ({ children }: any) => <li className="ml-4">{children}</li>,
        number: ({ children }: any) => <li className="ml-4">{children}</li>,
    },
    marks: {
        strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
        em: ({ children }: any) => <em className="italic">{children}</em>,
        code: ({ children }: any) => (
            <code className="bg-gray-900 px-2 py-1 rounded text-sm text-white/90">
                {children}
            </code>
        ),
        link: ({ children, value }: any) => (
            <a
                href={value.href}
                className="text-white underline hover:text-white/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        ),
    },
};

export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> => {
    const { slug } = await params;
    const post = await fetchPostBySlug(slug);
    if (!post) return { title: 'Post not found - Murali Anand', description: 'The requested post was not found.' }

    const title = post.title;
    const description = post.excerpt || (post.body ? String(post.body).slice(0, 160) : '');
    const image = post.coverImageUrl || (post.coverImage ? urlFor(post.coverImage).width(1200).url() : undefined);
    const url = `https://www.muralianand.in/blog/${slug}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            siteName: 'Murali Anand',
            images: image ? [{ url: image, alt: title, width: 1200, height: 630 }] : [],
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : [],
        },
    };
}

export default async function PostPage({ params }: Props) {
    const { slug } = await params;
    const post = await fetchPostBySlug(slug);

    if (!post) {
        return (
            <>
                <Header />
                <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
                    <div className="max-w-3xl mx-auto text-center py-20">
                        <h1 className="text-3xl font-semibold mb-4">Post not found</h1>
                        <p className="text-white/60 mb-8">
                            The blog post you're looking for doesn't exist.
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
    }

    return (
        <>
            <Header />
            <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
                <article className="max-w-3xl mx-auto py-20">
                    <div className="mb-8">
                        <Link
                            href="/blog"
                            className="text-white/70 hover:text-white transition-colors text-sm"
                        >
                            ← Back to all posts
                        </Link>
                    </div>

                    {post.coverImage && (
                        <div className="relative w-full h-[400px] rounded-lg overflow-hidden mb-8">
                            <Image
                                src={urlFor(post.coverImage).width(1200).url()}
                                alt={post.coverImage.alt || post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <header className="mb-12">
                        {post.categories && post.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
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

                        <h1 className="text-4xl sm:text-5xl font-bold mb-6">{post.title}</h1>

                        <div className="flex items-center gap-4 text-sm text-white/50">
                            {post.publishedAt && (
                                <time>
                                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>
                            )}
                            {post.author && (
                                <>
                                    <span>•</span>
                                    <span>by {post.author.name}</span>
                                </>
                            )}
                        </div>

                        {post.excerpt && (
                            <p className="text-lg text-white/70 mt-6 leading-relaxed">
                                {post.excerpt}
                            </p>
                        )}
                    </header>

                    <div className="prose prose-invert prose-lg max-w-none">
                        <PortableText value={post.body} components={portableTextComponents} />
                    </div>

                    {post.author && post.author.bio && (
                        <div className="mt-16 p-6 border border-white/10 rounded-lg bg-white/5">
                            <div className="flex items-start gap-4">
                                {post.author.image && (
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                                        <Image
                                            src={urlFor(post.author.image).width(64).url()}
                                            alt={post.author.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">
                                        About {post.author.name}
                                    </h3>
                                    <p className="text-white/70 text-sm">{post.author.bio}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-white/10">
                        <Link
                            href="/blog"
                            className="inline-block text-white/70 hover:text-white transition-colors"
                        >
                            ← Back to all posts
                        </Link>
                    </div>
                </article>
            </main>
            <Footer />
        </>
    );
}