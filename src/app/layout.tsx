import type React from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from 'next/font/google';

// @ts-ignore: Ignore missing type declarations for side-effect CSS import
import './globals.css';
import ChatbotButton from '@/components/chatbot-button';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

const SITE_URL = 'https://www.muralianand.in';
const TITLE = 'Murali Anand - AI Engineer & Machine Learning Specialist';
const DESCRIPTION =
    'Murali Anand is an AI Engineer working on retrieval-augmented generation, embedding pipelines, and LLM systems, currently completing a Master of Artificial Intelligence at Victoria University of Wellington.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: TITLE, template: '%s - Murali Anand' },
    description: DESCRIPTION,
    keywords: [
        'Murali Anand',
        'AI Engineer',
        'Machine Learning',
        'LLM',
        'Deep Learning',
        'RAG',
        'Retrieval-Augmented Generation',
        'Python',
        'TypeScript',
    ],
    authors: [{ name: 'Murali Anand', url: SITE_URL }],
    creator: 'Murali Anand',
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: 'Murali Anand',
        title: TITLE,
        description: DESCRIPTION,
        url: SITE_URL,
        locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
    robots: { index: true, follow: true },
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
        apple: '/favicon.svg',
    },
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
    return (
        <html lang="en">
            <body className={`font-sans antialiased bg-black text-white`}>
                {children}
                <ChatbotButton />
                <Analytics />
            </body>
        </html>
    );
};

export default RootLayout;
