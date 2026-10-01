import Link from 'next/link';
import type { Metadata } from 'next';

import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata: Metadata = {
    title: 'Page not found',
    description: 'The page you are looking for does not exist.',
    robots: { index: false, follow: true },
};

/**
 * Shown for any URL that matches no route, and wherever a page calls
 * notFound() (an unknown /md/<name>, for example).
 */
const NotFound = () => (
    <>
        <Header />
        <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-3xl mx-auto text-center py-32">
                <p className="text-sm uppercase tracking-widest text-white/40 mb-4">404</p>
                <h1 className="text-3xl font-semibold mb-4">Page not found</h1>
                <p className="text-white/60 mb-8">
                    There&apos;s no page here. It may have moved, or the link may be wrong.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-white text-black px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
                >
                    Back to home
                </Link>
            </div>
        </main>
        <Footer />
    </>
);

export default NotFound;
