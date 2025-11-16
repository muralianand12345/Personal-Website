import Header from '@/components/header';
import Footer from '@/components/footer';
import { fetchPosts } from '@/lib/sanity';
import BlogList from '@/components/blog-list';

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
                    <BlogList posts={posts || []} />
                </div>
            </main>
            <Footer />
        </>
    );
};

export default BlogPage;