import React from 'react';

export const metadata = {
    title: 'Blog — Coming soon',
    description: 'Blog coming soon',
};

export default function BlogPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-2xl text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Blog — Coming soon</h1>
                <p className="text-lg text-gray-600">
                    I'm working on the blog. Check back soon for posts and updates.
                </p>
            </div>
        </main>
    );
}
