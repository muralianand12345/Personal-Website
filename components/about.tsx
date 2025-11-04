const About = () => {
    const skills = [
        'AI',
        'Machine Learning',
        'LLM Integration',
        'Python & TypeScript',
    ];

    return (
        <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-4xl mx-auto">
                <div>
                    <h2 className="text-4xl font-bold mb-6">About Me</h2>
                    <p className="text-white/70 mb-6 leading-relaxed">
                        As an AI Engineer, I specialize in developing intelligent
                        systems and machine learning solutions that drive real-world impact. With
                        expertise in LLM integration, neural networks, and AI architecture, I
                        transform complex problems into elegant, scalable solutions. My approach
                        combines deep technical knowledge with a focus on practical applications and
                        user-centric design.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {skills.map((skill) => (
                            <span
                                key={skill}
                                className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20 hover:border-white/50 transition-colors"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
