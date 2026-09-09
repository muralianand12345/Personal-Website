import Image from 'next/image';

/**
 * Wide cinematic band that sits between About and the timeline, so the move to
 * New Zealand is visible before the reader hits the Wellington entry.
 */
const WellingtonBanner = () => (
    <section aria-label="Wellington, New Zealand" className="px-4 sm:px-6 lg:px-8 bg-black">
        <figure className="max-w-6xl mx-auto relative aspect-[21/9] rounded-xl overflow-hidden border border-white/10">
            <Image
                src="/images/profile/wellington-lookout.jpg"
                alt="Murali Anand standing arms out at the Mount Victoria lookout above Wellington harbour at sunset"
                fill
                sizes="(min-width: 1152px) 72rem, 100vw"
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <figcaption className="absolute bottom-0 left-0 p-5 sm:p-7">
                <p className="text-xs uppercase tracking-widest text-white/60">
                    Mount Victoria lookout
                </p>
                <p className="text-lg sm:text-xl font-semibold">Wellington, New Zealand</p>
            </figcaption>
        </figure>
    </section>
);

export default WellingtonBanner;
