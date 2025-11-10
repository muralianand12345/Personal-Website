'use client';

import Image from "next/image"

const Hero = () => {
    return (
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-center mb-12">
                    <div className="relative w-63 h-63 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-gray-500 transition-colors group">
                        <Image src="/images/profile/murali-profile.png" alt="Murali Anand" fill className="object-cover filter transition-all duration-300 group-hover:grayscale" priority />
                    </div>
                </div>
                <div className="text-center">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-3 leading-tight text-balance">Murali Anand</h1>
                    <p className="text-2xl sm:text-3xl lg:text-4xl text-white/80 mb-6 font-semibold">AI Engineer</p>
                    <p className="text-lg sm:text-xl text-white/70 mb-2">
                        I build intelligent systems and cutting-edge AI solutions. My work is driven by a
                    </p>
                    <p className="text-lg sm:text-xl mb-12">
                        <span className="text-white/70">passion for innovation and solving complex problems with AI.</span>
                    </p>
                </div>
            </div>
        </section>
    )
}

export default Hero
