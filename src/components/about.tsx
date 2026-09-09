import Image from 'next/image';

const skillGroups = [
    { label: 'Languages', items: ['Python', 'TypeScript', 'Lua'] },
    { label: 'AI & ML', items: ['LangChain', 'PyTorch', 'RAG', 'Vector Databases', 'LLMs'] },
    { label: 'Build', items: ['FastAPI', 'Next.js', 'Streamlit', 'Gradio'] },
];

const About = () => {
    return (
        <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-8">About Me</h2>

                <div className="grid gap-10 md:grid-cols-[1fr_15rem] md:gap-12 md:items-start">
                    <div className="space-y-5 text-white/70 leading-relaxed">
                        <p>
                            I&apos;m an AI engineer drawn to the unglamorous half of applied AI: the
                            data pipelines that decide whether a model is actually useful. Across
                            two years at Talentship.io and Octonomy.ai I built preprocessing, text
                            chunking, and vector database ingestion pipelines, and tuned retrieval
                            and embedding strategies to make semantic search return the right thing.
                        </p>
                        <p>
                            I joined during the early-stage generative AI and RAG research that
                            became the Octonomy product. I&apos;m now completing a Master of
                            Artificial Intelligence at Victoria University of Wellington in New
                            Zealand.
                        </p>
                        <p>
                            Alongside that I ship small tools and write about what I learn:
                            fine-tuning on Apple Silicon, PDF extraction, agentic workflows.
                        </p>
                    </div>

                    <figure className="group relative w-full max-w-[15rem] mx-auto md:mx-0 aspect-[3/4] rounded-xl overflow-hidden border border-white/15">
                        <Image
                            src="/images/profile/murali-waterfront-portrait.jpg"
                            alt="Murali Anand on the Wellington waterfront"
                            fill
                            sizes="(min-width: 768px) 15rem, 15rem"
                            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                    </figure>
                </div>

                <dl className="mt-12 grid gap-6 sm:grid-cols-3">
                    {skillGroups.map((group) => (
                        <div key={group.label}>
                            <dt className="text-xs uppercase tracking-widest text-white/40 mb-3">
                                {group.label}
                            </dt>
                            <dd className="flex flex-wrap gap-2">
                                {group.items.map((item) => (
                                    <span
                                        key={item}
                                        className="px-3 py-1.5 bg-white/[0.06] text-white/80 rounded-full text-sm border border-white/10 hover:border-white/30 transition-colors"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
};

export default About;
