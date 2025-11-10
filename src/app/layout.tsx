import type React from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from 'next/font/google';

// @ts-ignore: Ignore missing type declarations for side-effect CSS import
import './globals.css';
import ChatbotButton from '@/components/chatbot-button';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Murali Anand - AI Engineer & Machine Learning Specialist',
    description: 'Portfolio of Murali Anand, an AI Engineer specializing in machine learning, LLM integration, and intelligent systems.',
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
