import type { MetadataRoute } from 'next';

import { fetchPosts } from '@/lib/sanity';

const SITE_URL = 'https://www.muralianand.in';

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
    const posts = await fetchPosts();

    return [
        { url: SITE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
        {
            url: `${SITE_URL}/blog`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        ...(posts || []).map((post: any) => ({
            url: `${SITE_URL}/blog/${post.slug}`,
            lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
    ];
};

export default sitemap;
