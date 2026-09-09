'use client';

import { MessageCircle } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';

import ChatbotModal from '@/components/chatbot-modal';
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
    const btnRef = useRef<HTMLButtonElement>(null);
    const dragState = useRef<ChatButtonDragState | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

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

    return (
        <button
            ref={btnRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="Chat with Leo, Murali's AI assistant"
            title="Drag to move · Click to chat"
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
            className="group w-14 h-14 rounded-full bg-white text-black shadow-lg ring-1 ring-white/20 hover:ring-white/40 hover:scale-105 active:scale-95 flex items-center justify-center transition-[transform,box-shadow] duration-200"
        >
            <MessageCircle size={22} className="transition-transform group-hover:-rotate-6" />
        </button>
    );
};

export default ChatbotButton;
