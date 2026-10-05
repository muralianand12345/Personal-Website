import Link from 'next/link';

const linkClass = 'text-white/50 hover:text-white transition-colors text-sm';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-white/50 text-sm"> © {currentYear} Murali Anand. </p>
                    <nav
                        aria-label="Footer"
                        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
                    >
                        <Link href="/md" className={linkClass}>
                            Pages
                        </Link>
                        <Link href="/conversion" className={linkClass}>
                            Currency converter
                        </Link>
                        <Link href="/lucky-wheel" className={linkClass}>
                            Lucky wheel
                        </Link>
                        <span aria-hidden className="hidden sm:block h-4 w-px bg-white/15" />
                        <a
                            href="https://www.linkedin.com/in/murali-anand/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                        >
                            LinkedIn
                        </a>
                        <a
                            href="https://github.com/muralianand12345"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                        >
                            GitHub
                        </a>
                        <a
                            href="https://www.instagram.com/nln.mur.lee/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                        >
                            Instagram
                        </a>
                    </nav>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
