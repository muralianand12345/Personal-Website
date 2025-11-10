import Header from '@/components/header';
import Hero from '@/components/hero';
import About from '@/components/about';
import Work from '@/components/work';
import Contact from '@/components/contact';
import Footer from '@/components/footer';

const Home = () => {
    return (
        <main className="min-h-screen bg-black">
            <Header />
            <Hero />
            <About />
            <Work />
            <Contact />
            <Footer />
        </main>
    );
};

export default Home;
