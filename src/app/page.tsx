import Hero from '@/components/hero';
import Work from '@/components/work';
import About from '@/components/about';
import Header from '@/components/header';
import Footer from '@/components/footer';
import Contact from '@/components/contact';

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
