'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Size = { width: number; height: number };

const STORAGE_KEY = 'chatbot-panel-size-v1';
/** Space kept between the panel and each viewport edge; matches sm:bottom-6 / sm:right-6. */
const GUTTER = 24;
const MIN_SIZE: Size = { width: 340, height: 420 };
const COMPACT_SIZE: Size = { width: 416, height: 608 };
/** Taller than any screen on purpose: CSS clamps it, so expanded means as tall as fits. */
const EXPANDED_SIZE: Size = { width: 1024, height: 4096 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const loadSize = (): Size => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (typeof saved?.width === 'number' && typeof saved?.height === 'number') {
            return {
                width: Math.max(MIN_SIZE.width, saved.width),
                height: Math.max(MIN_SIZE.height, saved.height),
            };
        }
    } catch {}
    return COMPACT_SIZE;
};

/**
 * Size of a panel pinned to the bottom-right corner, which the reader can toggle between
 * compact and expanded or drag from its top and left edges. Remembered across visits.
 * The size is a wish; the panel's CSS caps it at the viewport.
 */
export const useResizablePanel = <T extends HTMLElement>() => {
    const ref = useRef<T>(null);
    const [size, setSize] = useState(loadSize);
    const [isResizing, setIsResizing] = useState(false);

    const isExpanded = size.width > COMPACT_SIZE.width || size.height > COMPACT_SIZE.height;
    const toggle = () => setSize(isExpanded ? COMPACT_SIZE : EXPANDED_SIZE);

    useEffect(() => {
        if (isResizing) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
        } catch {}
    }, [size, isResizing]);

    /** Pointer-down handler for a resize handle on the given edges. */
    const resizeFrom =
        (edges: { top?: boolean; left?: boolean }) => (e: ReactPointerEvent<HTMLElement>) => {
            const panel = ref.current;
            if (!panel || e.button !== 0) return;
            e.preventDefault();

            const handle = e.currentTarget;
            // Start from the rendered size, which may be smaller than the wish when clamped.
            const rect = panel.getBoundingClientRect();
            const start = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };

            const onMove = (move: PointerEvent) => {
                const maxWidth = window.innerWidth - GUTTER * 2;
                const maxHeight = window.innerHeight - GUTTER * 2;
                setSize((prev) => ({
                    width: edges.left
                        ? clamp(start.width + start.x - move.clientX, MIN_SIZE.width, maxWidth)
                        : prev.width,
                    height: edges.top
                        ? clamp(start.height + start.y - move.clientY, MIN_SIZE.height, maxHeight)
                        : prev.height,
                }));
            };
            const onEnd = () => {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onEnd);
                handle.removeEventListener('pointercancel', onEnd);
                setIsResizing(false);
            };

            // Capture keeps the drag (and its cursor) on the handle when the pointer outruns it.
            handle.setPointerCapture(e.pointerId);
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onEnd);
            handle.addEventListener('pointercancel', onEnd);
            setIsResizing(true);
        };

    return { ref, size, isExpanded, isResizing, toggle, resizeFrom };
};
