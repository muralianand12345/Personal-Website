const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-white/50 text-sm"> © {currentYear} Murali Anand. </p>
                    <div className="flex gap-6">
                        <a
                            href="https://www.linkedin.com/in/murali-anand/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/50 hover:text-white transition-colors text-sm"
                        >
                            LinkedIn
                        </a>
                        <a
                            href="https://github.com/muralianand12345"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/50 hover:text-white transition-colors text-sm"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://www.instagram.com/nln.mur.lee/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/50 hover:text-white transition-colors text-sm"
                        >
                            Instagram
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
