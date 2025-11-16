import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: process.env.SANITY_API_VERSION || '2025-01-01',
    useCdn: process.env.NODE_ENV === 'production',
});

const builder = imageUrlBuilder(client);

export const urlFor = (source: any) => {
    return builder.image(source);
};

export const fetchPosts = async () => {
    const query = `*[_type == "post"] | order(publishedAt desc) {
        title,
        "slug": slug.current,
        excerpt,
        publishedAt,
        coverImage,
        "author": author->name,
        "categories": categories[]->title
    }`;
    return client.fetch(query);
};

export const fetchPostBySlug = async (slug: string) => {
    const query = `*[_type == "post" && slug.current == $slug][0] {
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        coverImage,
        body,
        "author": author->{name, image, bio},
        "categories": categories[]->title,
        seo
    }`;
    return client.fetch(query, { slug });
};

export default client;
