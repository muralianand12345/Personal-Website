const timeline = [
    {
        kind: 'education' as const,
        org: 'Victoria University of Wellington',
        role: 'Master of Artificial Intelligence',
        meta: 'Wellington, New Zealand',
        period: 'Jun 2026 - Present',
        points: [],
    },
    {
        kind: 'work' as const,
        org: 'Octonomy.ai',
        role: 'Associate AI Data Engineer',
        meta: null,
        period: 'Feb 2024 - Jun 2026',
        points: [
            'Designed and implemented data preprocessing, text chunking, and vector database ingestion pipelines using advanced embedding models.',
            'Optimized RAG pipelines and embedding strategies to improve semantic search performance.',
        ],
    },
    {
        kind: 'work' as const,
        org: 'Talentship.io',
        role: 'Associate AI Data Engineer',
        meta: null,
        period: 'Feb 2024 - Jun 2026',
        points: [
            'Contributed to the core research team during early-stage development of the Octonomy product.',
            'Worked across generative AI and RAG research, LangChain, LLM-based systems, and AI pipeline design.',
        ],
    },
    {
        kind: 'education' as const,
        org: 'Sri Ramachandra Engineering and Technology',
        role: 'B.Tech, Computer Science and Engineering (AI & ML)',
        meta: 'GPA 8.11 / 10',
        period: '2020 - 2024',
        points: [],
    },
];

const Experience = () => {
    return (
        <section id="experience" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-14">Experience & Education</h2>

                <ol className="relative border-l border-white/15 ml-2">
                    {timeline.map((entry) => (
                        <li key={`${entry.org}-${entry.period}`} className="relative pl-8 pb-12 last:pb-0">
                            <span
                                aria-hidden
                                className={`absolute -left-[6.5px] top-1.5 w-3 h-3 rounded-full border-2 ${
                                    entry.kind === 'education'
                                        ? 'border-white/40 bg-black'
                                        : 'border-white bg-white'
                                }`}
                            />

                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1.5">
                                <h3 className="text-xl font-semibold">{entry.org}</h3>
                                <span className="text-sm text-white/40 tabular-nums shrink-0">
                                    {entry.period}
                                </span>
                            </div>

                            <p className="text-white/70 mb-1">{entry.role}</p>
                            {entry.meta && <p className="text-sm text-white/40">{entry.meta}</p>}

                            {entry.points.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {entry.points.map((point) => (
                                        <li
                                            key={point}
                                            className="text-sm text-white/60 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-px before:bg-white/30"
                                        >
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
};

export default Experience;
