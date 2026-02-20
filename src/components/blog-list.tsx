'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { Post } from '@/types';

export default function BlogList({ posts }: { posts: Post[] }) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 250);
        return () => clearTimeout(t);
    }, [query]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        posts.forEach((p) => {
            if (p.categories && p.categories.length > 0) p.categories.forEach((c) => set.add(c));
        });
        return ['All', ...Array.from(set)];
    }, [posts]);

    const filtered = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        return posts.filter((p) => {
            const byCategory =
                selectedCategory === 'All' || (p.categories || []).includes(selectedCategory);
            if (!byCategory) return false;
            if (!q) return true;
            const hay = `${p.title || ''} ${p.excerpt || ''} ${p.author || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [posts, debouncedQuery, selectedCategory]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="relative flex-1">
                    <input
                        aria-label="Search posts"
                        className="w-full rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
                        placeholder="Search posts, authors, excerpts..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-white/60 hover:text-white"
                            onClick={() => setQuery('')}
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="text-sm text-white/60">
                    {filtered.length} post{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="flex gap-2 flex-wrap mb-6">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-xs px-3 py-1 rounded ${
                            selectedCategory === cat
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-white/70'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center text-white/50 py-16">
                    <p className="mb-2">No posts match your search or filters.</p>
                    <p className="text-sm">
                        Try clearing the search or selecting a different category.
                    </p>
                </div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2">
                    {filtered.map((post) => (
                        <Link
                            key={post.slug || post.title}
                            href={`/blog/${post.slug}`}
                            className="group block"
                        >
                            <article className="border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all duration-300 bg-white/5 h-full">
                                {(() => {
                                    const imgSrc =
                                        post.coverImageUrl ||
                                        (typeof post.coverImage === 'string'
                                            ? post.coverImage
                                            : null);
                                    if (!imgSrc) return null;
                                    return (
                                        <div className="relative h-48 w-full overflow-hidden">
                                            <Image
                                                src={imgSrc}
                                                alt={post.title || 'Cover image'}
                                                fill
                                                className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
                                            />
                                        </div>
                                    );
                                })()}
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

                                    <h3 className="text-2xl font-semibold mb-2 group-hover:text-white transition-colors">
                                        {post.title}
                                    </h3>

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
    );
}
