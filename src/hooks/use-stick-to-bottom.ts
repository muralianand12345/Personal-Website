'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/** How close to the bottom, in px, still counts as following along. */
const STICK_THRESHOLD = 80;

/**
 * Keeps a scroll container pinned to its bottom as `content` changes, unless the reader has
 * scrolled up to look at something. Scrolling back down resumes following.
 */
export const useStickToBottom = <T extends HTMLElement>(content: unknown) => {
    const ref = useRef<T>(null);
    const following = useRef(true);

    useLayoutEffect(() => {
        const el = ref.current;
        if (el && following.current) el.scrollTop = el.scrollHeight;
    }, [content]);

    // The container resizing (the chat panel shrinking, say) also pushes the bottom out of view.
    // Watches the element mounted on first render.
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            if (following.current) el.scrollTop = el.scrollHeight;
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const onScroll = () => {
        const el = ref.current;
        if (!el) return;
        following.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
    };

    /** Start following again, for example after the reader sends a message. */
    const follow = () => {
        following.current = true;
    };

    return { ref, onScroll, follow };
};
