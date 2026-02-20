'use client';

import Link from 'next/link';
import Image from 'next/image';

const Work = () => {
    const projects = [
        {
            id: 1,
            title: 'Streamlit Reasoning ChatBot using Groq',
            category: 'LLM',
            description:
                "Interactive AI chat application with reasoning capabilities using Groq's openai-oss models.",
            url: 'https://github.com/muralianand12345/streamlit-chatbot',
            image: '/images/work/groq-chatbot.jpg',
        },
        {
            id: 2,
            title: 'Fine-Tuning LLMs on Apple MacBook',
            category: 'Machine Learning and LLMs',
            description:
                'Fine-tuning large language models on Apple MacBook using local models and LoRA techniques.',
            url: '/blog/getting-started-with-llm-fine-tuning-on-apple-silicon',
            image: '/images/work/fine-tuning.jpg',
        },
        {
            id: 3,
            title: 'Coup Game',
            category: 'Game Development',
            description:
                'Multiplayer online adaptation of the Coup card game with real-time interactions and strategic gameplay.',
            url: 'https://coup.muralianand.in/',
            image: '/images/work/coup-game.jpg',
        },
        {
            id: 4,
            title: 'Smart Terminal for Windows, Linux and MacOS',
            category: 'LLM & Productivity',
            description:
                'AI-powered terminal enhancing productivity with LLM integration for command suggestions and automation.',
            url: 'https://pypi.org/project/smart-terminal-cli/',
            image: '/images/work/smart-terminal.jpg',
        },
    ];

    return (
        <section id="work" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl font-bold mb-16 text-center">Selected Work</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group cursor-pointer"
                        >
                            <div className="relative h-64 rounded-lg overflow-hidden mb-4 bg-white/5">
                                <Image
                                    src={project.image || '/placeholder.svg'}
                                    alt={project.title}
                                    fill
                                    className="object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                                    title={project.description}
                                />
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                                {project.title}
                            </h3>
                            <p className="text-white/60 text-sm">{project.category}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Work;
