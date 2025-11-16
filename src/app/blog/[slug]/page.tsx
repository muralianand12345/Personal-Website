import Link from 'next/link';

import { fetchPostBySlug } from '../../../lib/sanity';

type Props = { params: { slug: string } };

const renderPortableText = (body: any) => {
    if (!body || !Array.isArray(body)) return null;
    return body.map((block: any, idx: number) => {
        if (block._type === 'block') {
            const text = (block.children || []).map((c: any) => c.text).join('');
            return <p key={idx} className="leading-7 text-gray-800 my-4">{text}</p>;
        }
        if (block._type === 'image' && block.asset) {
            const alt = block.alt || '';
            return <div key={idx} className="my-4"> <img alt={alt} src={block.url || ''} className="w-full rounded" /> </div>;
        }
        return null;
    });
}

export default async function PostPage({ params }: Props) {
    const { slug } = params;
    const post = await fetchPostBySlug(slug);

    if (!post) {
        return (
            <main className="min-h-screen p-8">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-2xl font-semibold">Post not found</h1>
                    <p className="mt-4"> <Link href="/blog" className="underline">Back to blog</Link> </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold">{post.title}</h1>
                {post.publishedAt && <p className="text-sm text-gray-400 mt-2">{new Date(post.publishedAt).toLocaleDateString()}</p>}
                <article className="mt-6">{renderPortableText(post.body)}</article>
                <p className="mt-8"><Link href="/blog" className="underline">← Back to all posts</Link></p>
            </div>
        </main>
    );
}
