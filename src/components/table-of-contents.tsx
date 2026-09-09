'use client';

import { useEffect, useState } from 'react';

import type { Heading } from '@/lib/portable-text';

const useActiveHeading = (headings: Heading[], enabled: boolean) => {
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        if (!enabled || headings.length === 0) return;

        const elements = headings
            .map((h) => document.getElementById(h.id))
            .filter((el): el is HTMLElement => el !== null);

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length > 0) {
                    setActiveId(visible[0].target.id);
                    return;
                }

                // Nothing inside the band: fall back to the last heading scrolled past.
                const passed = elements.filter((el) => el.getBoundingClientRect().top < 120);
                if (passed.length > 0) setActiveId(passed[passed.length - 1].id);
            },
            { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [headings, enabled]);

    return activeId;
};

type Props = { headings: Heading[]; variant?: 'sidebar' | 'inline' };

const TableOfContents = ({ headings, variant = 'sidebar' }: Props) => {
    // Only the sidebar copy tracks scroll position; the inline one is a plain jump list.
    const activeId = useActiveHeading(headings, variant === 'sidebar');

    if (headings.length < 3) return null;

    const minLevel = Math.min(...headings.map((h) => h.level));

    const links = headings.map((heading) => {
        const isActive = variant === 'sidebar' && activeId === heading.id;
        return (
            <li key={heading.id} style={{ paddingLeft: `${(heading.level - minLevel) * 0.75}rem` }}>
                <a
                    href={`#${heading.id}`}
                    className={`block py-1.5 text-sm leading-snug border-l-2 -ml-px pl-3 transition-colors ${
                        isActive
                            ? 'border-white text-white'
                            : 'border-transparent text-white/50 hover:text-white/90 hover:border-white/30'
                    }`}
                >
                    {heading.text}
                </a>
            </li>
        );
    });

    if (variant === 'inline') {
        return (
            <details className="lg:hidden mb-10 border border-white/10 rounded-lg bg-white/[0.03]">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-white/80 hover:text-white">
                    Contents
                </summary>
                <nav aria-label="Table of contents" className="px-4 pb-4">
                    <ul className="border-l border-white/10">{links}</ul>
                </nav>
            </details>
        );
    }

    return (
        <nav aria-label="Table of contents" className="hidden lg:block sticky top-28">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-4">On this page</p>
            <ul className="border-l border-white/10 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
                {links}
            </ul>
        </nav>
    );
};

export default TableOfContents;
