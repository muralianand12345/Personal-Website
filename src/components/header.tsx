'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navItems = [
        { label: 'About', href: '/#about' },
        { label: 'Work', href: '/#work' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/#contact' },
    ];

    return (
        <header className="fixed top-0 w-full bg-black/95 backdrop-blur-sm z-50 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="text-xl font-bold tracking-tight">
                        MURALI ANAND
                    </Link>
                    <nav className="hidden md:flex items-center gap-8"> {navItems.map((item) => <Link key={item.label} href={item.href} className="text-sm text-white/70 hover:text-white transition-colors"> {item.label} </Link>)}</nav>
                    <div className="hidden md:block"> <Button asChild className="bg-white text-black hover:bg-white/90 rounded-full px-6" > <Link href="/#contact">Get in Touch</Link> </Button> </div>
                    <button className="md:hidden" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu" > {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />} </button>
                </div>
                {isOpen && (
                    <nav className="md:hidden pb-4 space-y-3">
                        {navItems.map((item) => <Link key={item.label} href={item.href} className="block text-sm text-white/70 hover:text-white transition-colors py-2" onClick={() => setIsOpen(false)}> {item.label} </Link>)}
                        <Button asChild className="w-full bg-white text-black hover:bg-white/90 rounded-full"> <Link href="#contact">Get in Touch</Link> </Button>
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
