import type { Metadata } from 'next';

import Header from '@/components/header';
import Footer from '@/components/footer';
import LuckyWheel from '@/components/lucky-wheel';

// A personal utility: reachable by URL, but kept out of nav, sitemap and search.
export const metadata: Metadata = {
    title: 'Lucky Wheel',
    description: 'Add names or ideas, spin the wheel, and let chance decide.',
    alternates: { canonical: '/lucky-wheel' },
    robots: { index: false, follow: false },
};

const LuckyWheelPage = () => (
    <>
        <Header />
        <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-6xl mx-auto py-10 sm:py-14">
                <LuckyWheel />
            </div>
        </main>
        <Footer />
    </>
);

export default LuckyWheelPage;
