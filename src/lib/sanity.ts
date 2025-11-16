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
    const posts = await client.fetch(query);
    return posts.map((p: any) => ({
        ...p,
        coverImageUrl: p.coverImage ? urlFor(p.coverImage).width(800).url() : null,
    }));
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
    const post = await client.fetch(query, { slug });
    if (!post) return null;
    return {
        ...post,
        coverImageUrl: post.coverImage ? urlFor(post.coverImage).width(1200).url() : null,
    };
};

export default client;
