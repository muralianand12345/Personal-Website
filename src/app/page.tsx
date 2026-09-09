import Hero from '@/components/hero';
import Work from '@/components/work';
import About from '@/components/about';
import Header from '@/components/header';
import Footer from '@/components/footer';
import Contact from '@/components/contact';
import Experience from '@/components/experience';
import WellingtonBanner from '@/components/wellington-banner';
import LatestPosts from '@/components/latest-posts';

export const revalidate = 60;

const Home = () => {
    return (
        <main className="min-h-screen bg-black">
            <Header />
            <Hero />
            <About />
            <WellingtonBanner />
            <Experience />
            <Work />
            <LatestPosts />
            <Contact />
            <Footer />
        </main>
    );
};

export default Home;
