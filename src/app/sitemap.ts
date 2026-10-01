import type { MetadataRoute } from 'next';

import { getMdSlugs } from '@/lib/md-pages';
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
        {
            url: `${SITE_URL}/md`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        ...getMdSlugs().map((slug) => ({
            url: `${SITE_URL}/md/${encodeURIComponent(slug)}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
    ];
};

export default sitemap;
