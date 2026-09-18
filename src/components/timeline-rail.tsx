'use client';

import { useEffect, useRef } from 'react';

/**
 * The vertical rail behind the experience timeline. A faint static track always
 * spans the list; a brighter fill draws down it in step with the scroll, so the
 * career reads as a progression rather than a finished list.
 *
 * Absolutely positioned against the <ol>, replacing its former border-left.
 */
const TimelineRail = () => {
    const trackRef = useRef<HTMLSpanElement>(null);
    const fillRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const track = trackRef.current;
        const fill = fillRef.current;
        if (!track || !fill) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            fill.style.transform = 'scaleY(1)';
            return;
        }

        let frame = 0;

        const update = () => {
            frame = 0;
            const bounds = track.getBoundingClientRect();
            if (bounds.height === 0) return;

            // The rail fills as it passes a line near the bottom of the viewport.
            const anchor = window.innerHeight * 0.82;
            const progress = (anchor - bounds.top) / bounds.height;
            fill.style.transform = `scaleY(${Math.min(Math.max(progress, 0), 1)})`;
        };

        const schedule = () => {
            if (frame) return;
            frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);

        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, []);

    return (
        <span
            ref={trackRef}
            aria-hidden="true"
            className="absolute -left-px top-0 bottom-0 w-px bg-white/15"
        >
            <span
                ref={fillRef}
                className="absolute inset-0 origin-top bg-white/70"
                style={{ transform: 'scaleY(0)' }}
            />
        </span>
    );
};

export default TimelineRail;
