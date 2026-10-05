'use client';

import React, { useRef, useState, useEffect } from 'react';

import LeoMark from '@/components/chat/leo-mark';
import ChatbotModal from '@/components/chat/chatbot-modal';
import { ChatButtonPosition, ChatButtonDragState } from '@/types';

const STORAGE_KEY = 'chatbot-button-position-v1';
const BTN_SIZE = 56;
const MARGIN = 18;

const clampPosition = (x: number, y: number): ChatButtonPosition => {
    if (typeof window === 'undefined') return { x, y };
    const minX = 8;
    const maxX = window.innerWidth - BTN_SIZE - 8;
    const minY = 8;
    const maxY = window.innerHeight - BTN_SIZE - 8;
    return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
    };
};

const ChatbotButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<ChatButtonPosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(0);
    const btnRef = useRef<HTMLButtonElement>(null);
    const dragState = useRef<ChatButtonDragState | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setViewportWidth(window.innerWidth);

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    setPosition(clampPosition(parsed.x, parsed.y));
                    return;
                }
            }
        } catch {}

        const defaultPos = clampPosition(
            window.innerWidth - BTN_SIZE - MARGIN,
            window.innerHeight - BTN_SIZE - MARGIN
        );
        setPosition(defaultPos);
    }, []);

    const savePosition = (pos: ChatButtonPosition) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch {}
    };

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
            if (!position) return;
            const clamped = clampPosition(position.x, position.y);
            if (clamped.x !== position.x || clamped.y !== position.y) {
                setPosition(clamped);
                savePosition(clamped);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [position]);

    const startDrag = (clientX: number, clientY: number) => {
        if (!position) return;
        setIsDragging(true);
        setHasMoved(false);
        dragState.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y,
        };
    };

    const onDrag = (clientX: number, clientY: number) => {
        if (!isDragging || !dragState.current) return;
        const deltaX = clientX - dragState.current.startX;
        const deltaY = clientY - dragState.current.startY;
        if (!hasMoved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) setHasMoved(true);
        const newPos = clampPosition(
            dragState.current.initialX + deltaX,
            dragState.current.initialY + deltaY
        );
        setPosition(newPos);
    };

    const endDrag = () => {
        if (!isDragging) return;
        setIsDragging(false);
        dragState.current = null;
        if (position) savePosition(position);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    };

    const handleClick = () => {
        if (!hasMoved) setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!position) return;

        const step = e.shiftKey ? 32 : 8;
        let newX = position.x;
        let newY = position.y;
        let moved = false;

        switch (e.key) {
            case 'ArrowUp':
                newY -= step;
                moved = true;
                break;
            case 'ArrowDown':
                newY += step;
                moved = true;
                break;
            case 'ArrowLeft':
                newX -= step;
                moved = true;
                break;
            case 'ArrowRight':
                newX += step;
                moved = true;
                break;
            case 'Enter':
            case ' ':
                setIsOpen(true);
                e.preventDefault();
                return;
        }

        if (moved) {
            e.preventDefault();
            const clamped = clampPosition(newX, newY);
            setPosition(clamped);
            savePosition(clamped);
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            onDrag(e.clientX, e.clientY);
        };

        const handleGlobalMouseUp = () => endDrag();

        const handleGlobalTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            onDrag(touch.clientX, touch.clientY);
        };

        const handleGlobalTouchEnd = () => endDrag();

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('touchmove', handleGlobalTouchMove);
            document.removeEventListener('touchend', handleGlobalTouchEnd);
        };
    }, [isDragging, position]);

    if (!position) return null;
    if (isOpen) return <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;

    // Open the hover label toward the middle of the screen so it never runs off an edge.
    const labelOnLeft = position.x + BTN_SIZE / 2 > viewportWidth / 2;

    return (
        <button
            ref={btnRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="Chat with Leo, Murali's AI assistant"
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 60,
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
            className="group w-14 h-14 rounded-full bg-white text-black shadow-[0_8px_28px_-6px_rgba(255,255,255,0.35)] ring-1 ring-white/20 hover:ring-4 hover:ring-white/15 active:scale-95 flex items-center justify-center transition-[transform,box-shadow] duration-200"
        >
            <LeoMark className="w-7 h-7 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
            {!isDragging && (
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 transition-[opacity,translate] duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 ${
                        labelOnLeft
                            ? 'right-full mr-3 translate-x-1'
                            : 'left-full ml-3 -translate-x-1'
                    }`}
                >
                    Ask Leo <span className="text-white/40">· drag to move</span>
                </span>
            )}
        </button>
    );
};

export default ChatbotButton;
