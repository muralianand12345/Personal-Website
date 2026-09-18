'use client';

import { useRef, type ReactNode } from 'react';

const MAX_TILT_X = 9;
const MAX_TILT_Y = 11;

/**
 * Tilts its contents toward the cursor in 3D and tracks a soft highlight across
 * them. Everything is driven through CSS custom properties so the transform
 * itself stays on the compositor; globals.css owns the actual visual rules and
 * flattens the whole effect under prefers-reduced-motion.
 */
const TiltCard = ({ children, className }: { children: ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    const applyTilt = (event: React.PointerEvent<HTMLDivElement>) => {
        // Coarse pointers have no hover state to speak of, and tilting on touch
        // just fights the scroll.
        if (event.pointerType === 'touch') return;

        const element = ref.current;
        if (!element) return;

        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;

        element.style.setProperty('--tilt-x', `${(0.5 - y) * MAX_TILT_X * 2}deg`);
        element.style.setProperty('--tilt-y', `${(x - 0.5) * MAX_TILT_Y * 2}deg`);
        element.style.setProperty('--glow-x', `${x * 100}%`);
        element.style.setProperty('--glow-y', `${y * 100}%`);
        element.style.setProperty('--glow-opacity', '1');
    };

    const resetTilt = () => {
        const element = ref.current;
        if (!element) return;
        element.style.setProperty('--tilt-x', '0deg');
        element.style.setProperty('--tilt-y', '0deg');
        element.style.setProperty('--glow-opacity', '0');
    };

    return (
        <div
            ref={ref}
            className={className}
            data-tilt=""
            onPointerMove={applyTilt}
            onPointerLeave={resetTilt}
            onPointerCancel={resetTilt}
        >
            {children}
        </div>
    );
};

export default TiltCard;
