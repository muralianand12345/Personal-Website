import Link from 'next/link';
import { fetchPosts } from '../../lib/sanity';

export const metadata = {
    title: 'Murali Anand - Blog',
    description: 'Welcome to my blog!',
};

const BlogPage = async () => {
    const posts = await fetchPosts();

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Blog</h1>
                {(!posts || posts.length === 0) ? <div className="text-center text-gray-600"> <p>No posts published yet. Check back soon.</p> </div> : (
                    <ul className="space-y-6">
                        {posts.map((post: any) => (
                            <li key={post.slug} className="border rounded-lg p-4 hover:shadow">
                                <Link href={`/blog/${post.slug}`} className="block">
                                    <h2 className="text-2xl font-semibold">{post.title}</h2>
                                    {post.excerpt && <p className="text-gray-600 mt-2">{post.excerpt}</p>}
                                    {post.publishedAt && <p className="text-sm text-gray-400 mt-3">{new Date(post.publishedAt).toLocaleDateString()}</p>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
};

export default BlogPage;
