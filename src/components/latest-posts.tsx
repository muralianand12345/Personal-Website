import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { fetchPosts } from '@/lib/sanity';

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const LatestPosts = async () => {
    const posts = await fetchPosts();
    if (!posts || posts.length === 0) return null;

    return (
        <section id="writing" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-end justify-between mb-10">
                    <h2 className="text-4xl font-bold">Writing</h2>
                    <Link
                        href="/blog"
                        className="group text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                        All posts
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                <ul className="divide-y divide-white/10 border-y border-white/10">
                    {posts.slice(0, 3).map((post: any) => (
                        <li key={post.slug}>
                            <Link
                                href={`/blog/${post.slug}`}
                                className="group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-6 hover:bg-white/[0.03] transition-colors -mx-4 px-4"
                            >
                                {post.publishedAt && (
                                    <time
                                        dateTime={post.publishedAt}
                                        className="text-sm text-white/40 shrink-0 sm:w-28 tabular-nums"
                                    >
                                        {formatDate(post.publishedAt)}
                                    </time>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-lg font-medium leading-snug group-hover:text-white text-white/90 transition-colors">
                                        {post.title}
                                    </h3>
                                    {post.excerpt && (
                                        <p className="text-sm text-white/50 mt-1.5 line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default LatestPosts;
