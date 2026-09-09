import Image from 'next/image';
import { Github, Linkedin, Mail } from 'lucide-react';

const socials = [
    { label: 'GitHub', href: 'https://github.com/muralianand12345', Icon: Github },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/murali-anand/', Icon: Linkedin },
    { label: 'Email', href: 'mailto:connect@muralianand.in', Icon: Mail },
];

const Hero = () => {
    return (
        <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-center mb-12">
                    <div className="group relative w-52 sm:w-60 aspect-[3/4] rounded-xl overflow-hidden border border-white/15 hover:border-white/30 transition-colors">
                        <Image
                            src="/images/profile/murali-sunset-portrait.jpg"
                            alt="Murali Anand at the Mount Victoria lookout, Wellington"
                            fill
                            sizes="(min-width: 640px) 15rem, 13rem"
                            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            priority
                        />
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-3 leading-tight text-balance">
                        Murali Anand
                    </h1>
                    <p className="text-2xl sm:text-3xl lg:text-4xl text-white/80 mb-6 font-semibold">
                        AI Engineer
                    </p>
                    <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto text-balance">
                        I build retrieval-augmented systems and the data pipelines behind them.
                        Currently completing a Master of Artificial Intelligence at Victoria
                        University of Wellington.
                    </p>

                    <div className="flex items-center justify-center gap-3 mt-10">
                        {socials.map(({ label, href, Icon }) => (
                            <a
                                key={label}
                                href={href}
                                aria-label={label}
                                {...(href.startsWith('mailto:')
                                    ? {}
                                    : { target: '_blank', rel: 'noopener noreferrer' })}
                                className="p-3 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
                            >
                                <Icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
