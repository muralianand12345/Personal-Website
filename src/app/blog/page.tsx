import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/header';
import Footer from '@/components/footer';

import { fetchPosts, urlFor } from '../../lib/sanity';

export const metadata = {
    title: 'Murali Anand - Blog',
    description: 'Insights on AI, Machine Learning, and Software Engineering',
};

const BlogPage = async () => {
    const posts = await fetchPosts();

    return (
        <>
            <Header />
            <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
                <div className="max-w-5xl mx-auto py-20">
                    <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Blog</h1>
                    <p className="text-white/70 mb-12 text-lg">
                        Thoughts on AI, machine learning, and building intelligent systems.
                    </p>

                    {!posts || posts.length === 0 ? (
                        <div className="text-center text-gray-600 py-20">
                            <p className="text-xl">No posts published yet.</p>
                            <p className="text-white/50 mt-2">Check back soon for new content!</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2">
                            {posts.map((post: any) => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="group block"
                                >
                                    <article className="border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all duration-300 bg-white/5 h-full">
                                        {post.coverImage && (
                                            <div className="relative h-48 w-full overflow-hidden">
                                                <Image
                                                    src={urlFor(post.coverImage).width(600).url()}
                                                    alt={post.coverImage.alt || post.title}
                                                    fill
                                                    className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
                                                />
                                            </div>
                                        )}
                                        <div className="p-6">
                                            {post.categories && post.categories.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {post.categories.map((category: string) => (
                                                        <span
                                                            key={category}
                                                            className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded"
                                                        >
                                                            {category}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <h2 className="text-2xl font-semibold mb-2 group-hover:text-white transition-colors">
                                                {post.title}
                                            </h2>
                                            {post.excerpt && (
                                                <p className="text-white/60 text-sm mb-4 line-clamp-3">
                                                    {post.excerpt}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between text-xs text-white/50">
                                                {post.publishedAt && (
                                                    <time>
                                                        {new Date(post.publishedAt).toLocaleDateString(
                                                            'en-US',
                                                            {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                            }
                                                        )}
                                                    </time>
                                                )}
                                                {post.author && <span>by {post.author}</span>}
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
};

export default BlogPage;