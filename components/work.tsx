import Image from 'next/image';
import Link from 'next/link';

const Work = () => {
    const projects = [
        {
            id: 1,
            title: 'Streamlit Reasoning ChatBot using Groq',
            category: 'LLM',
            description: 'Interactive AI chat application with reasoning capabilities using Groq\'s openai-oss models.',
            url: 'https://github.com/muralianand12345/streamlit-chatbot',
            image: '/modern-design-system-ui.jpg',
        },
        {
            id: 2,
            title: 'Fine-Tuning LLMs on Apple MacBook',
            category: 'Machine Learning and LLMs',
            description: 'Fine-tuning large language models on Apple MacBook using local models and LoRA techniques.',
            url: 'https://github.com/muralianand12345/mlx-finetune',
            image: '/mobile-app-interface.jpg',
        },
        {
            id: 3,
            title: 'Discord Translation Bot',
            category: 'AI & NLP',
            description: 'Discord bot for real-time language translation using OpenAI models.',
            url: 'https://github.com/muralianand12345/translation-bot',
            image: '/brand-identity-design.jpg',
        },
        {
            id: 4,
            title: 'Smart Terminal for Windows, Linux and MacOS',
            category: 'LLM & Productivity',
            description: 'AI-powered terminal enhancing productivity with LLM integration for command suggestions and automation.',
            url: 'https://github.com/muralianand12345/Smart-Terminal',
            image: '/analytics-dashboard-interface.jpg',
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
                            href={`/project/${project.id}`}
                            className="group cursor-pointer"
                        >
                            <div className="relative h-64 rounded-lg overflow-hidden mb-4 bg-white/5">
                                <Image
                                    src={project.image || '/placeholder.svg'}
                                    alt={project.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
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
