import Image from 'next/image';
import Link from 'next/link';

const Work = () => {
    const projects = [
        {
            id: 1,
            title: 'LLM Fine-tuning Pipeline',
            category: 'Machine Learning',
            description: 'Custom LLM optimization framework',
            image: '/modern-design-system-ui.jpg',
        },
        {
            id: 2,
            title: 'AI-Powered Chatbot',
            category: 'NLP Application',
            description: 'Intelligent conversational AI system',
            image: '/mobile-app-interface.jpg',
        },
        {
            id: 3,
            title: 'Computer Vision System',
            category: 'Deep Learning',
            description: 'Advanced image recognition model',
            image: '/brand-identity-design.jpg',
        },
        {
            id: 4,
            title: 'Predictive Analytics Dashboard',
            category: 'Data Science',
            description: 'Real-time ML insights platform',
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
