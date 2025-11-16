import { createClient } from '@sanity/client';

export const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2025-01-01',
    useCdn: process.env.NODE_ENV === 'production',
});

export const fetchPosts = async () => {
    const query = `*[_type == "post"]{ title, "slug": slug.current, excerpt, publishedAt }|order(publishedAt desc)`;
    return client.fetch(query);
};

export const fetchPostBySlug = async (slug: string) => {
    const query = `*[_type == "post" && slug.current == $slug][0]{ title, body, publishedAt, "slug": slug.current }`;
    return client.fetch(query, { slug });
};

export default client;
