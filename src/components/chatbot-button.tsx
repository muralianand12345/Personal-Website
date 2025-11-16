'use client'

import { MessageCircle } from 'lucide-react'
import React, { useRef, useState, useEffect } from 'react'

import ChatbotModal from '@/components/chatbot-modal'

const STORAGE_KEY = 'chatbot-button-position-v1'
const BTN_SIZE = 56
const MARGIN = 18
const INITIAL_CORDS = { right: MARGIN, bottom: MARGIN }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const getVerticalBounds = (height: number) => {
    if (typeof window === 'undefined') return { topMin: 8, bottomMax: Number.MAX_SAFE_INTEGER }
    const header = document.querySelector('header')
    const footer = document.querySelector('footer')
    const headerRect = header?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()
    const topMin = headerRect ? Math.max(8, headerRect.bottom + 8) : 8
    let bottomMax = window.innerHeight - height - 8
    if (footerRect && footerRect.top < window.innerHeight) bottomMax = Math.min(bottomMax, Math.max(8, footerRect.top - height - 8))
    return { topMin, bottomMax }
}

const ChatbotButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const btnRef = useRef<HTMLButtonElement | null>(null)
    const dragging = useRef(false)
    const moved = useRef(false)
    const start = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
    const current = useRef<{ x: number; y: number } | null>(null)

    const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
        if (typeof window === 'undefined') return null
        try {
            const defaultPos = { x: window.innerWidth - BTN_SIZE - INITIAL_CORDS.right, y: window.innerHeight - BTN_SIZE - INITIAL_CORDS.bottom }
            const raw = localStorage.getItem(STORAGE_KEY)
            const parsed = raw ? JSON.parse(raw) : null
            const valid = parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && isFinite(parsed.x) && isFinite(parsed.y) ? parsed : null
            const width = BTN_SIZE
            const height = BTN_SIZE
            const horizMin = 8
            const horizMax = window.innerWidth - width - 8
            if (valid) {
                const { topMin, bottomMax } = getVerticalBounds(height)
                const x = clamp(valid.x, horizMin, horizMax)
                const y = clamp(valid.y, topMin, bottomMax)
                current.current = { x, y }
                return { x, y }
            }
            const header = document.querySelector('header')
            const headerRect = header?.getBoundingClientRect()
            const topMin = headerRect ? Math.max(8, headerRect.bottom + 8) : 8
            const x = clamp(defaultPos.x, horizMin, horizMax)
            const y = clamp(defaultPos.y, topMin, window.innerHeight - height - 8)
            current.current = { x, y }
            return { x, y }
        } catch {
            return null
        }
    })

    useEffect(() => {
        const onResize = () => {
            if (!pos) return
            const width = btnRef.current?.getBoundingClientRect()?.width ?? BTN_SIZE
            const height = btnRef.current?.getBoundingClientRect()?.height ?? BTN_SIZE
            const horizMin = 8
            const horizMax = window.innerWidth - width - 8
            const { topMin, bottomMax } = getVerticalBounds(height)
            const x = clamp(pos.x, horizMin, horizMax)
            const y = clamp(pos.y, topMin, bottomMax)
            if (x !== pos.x || y !== pos.y) {
                setPos({ x, y })
                current.current = { x, y }
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }))
            }
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [pos])

    const onPointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        dragging.current = true
        moved.current = false
        const rect = btnRef.current?.getBoundingClientRect()
        const left = rect?.left ?? (pos?.x ?? 0)
        const top = rect?.top ?? (pos?.y ?? 0)
        start.current = { x: e.clientX, y: e.clientY, left, top }
        if (btnRef.current) {
            btnRef.current.style.transition = 'none'
            btnRef.current.style.willChange = 'transform'
        }
    }

    const onPointerMove: React.PointerEventHandler<HTMLButtonElement> = (e) => {
        if (!dragging.current || !start.current) return
        const dx = e.clientX - start.current.x
        const dy = e.clientY - start.current.y
        const newX = start.current.left + dx
        const newY = start.current.top + dy
        if (typeof window === 'undefined') return
        const width = btnRef.current?.getBoundingClientRect()?.width ?? BTN_SIZE
        const height = btnRef.current?.getBoundingClientRect()?.height ?? BTN_SIZE
        const { topMin, bottomMax } = getVerticalBounds(height)
        const clampedX = clamp(newX, 8, window.innerWidth - width - 8)
        const clampedY = clamp(newY, topMin, bottomMax)
        const transX = clampedX - (start.current.left)
        const transY = clampedY - (start.current.top)
        if (btnRef.current) btnRef.current.style.transform = `translate3d(${transX}px, ${transY}px, 0)`
        current.current = { x: clampedX, y: clampedY }
        moved.current = true
    }

    const onPointerUp: React.PointerEventHandler<HTMLButtonElement> = (e) => {
        try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { }
        if (!dragging.current) return
        dragging.current = false
        start.current = null
        const final = current.current
        if (btnRef.current) {
            btnRef.current.style.transform = ''
            btnRef.current.style.willChange = ''
            btnRef.current.style.transition = ''
            if (final) {
                btnRef.current.style.left = `${final.x}px`
                btnRef.current.style.top = `${final.y}px`
            }
        }
        if (final) {
            setPos(final)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(final))
        }
        if (moved.current) { moved.current = false; return }
        setIsOpen(true)
    }

    const onKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
        if (!pos) return
        const step = e.shiftKey ? 32 : 8
        let { x, y } = pos
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const height = btnRef.current?.getBoundingClientRect()?.height ?? BTN_SIZE
            const { topMin, bottomMax } = getVerticalBounds(height)
            y = clamp(e.key === 'ArrowUp' ? y - step : y + step, topMin, bottomMax)
            setPos({ x, y })
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }))
            e.preventDefault()
            return
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            x = clamp(e.key === 'ArrowLeft' ? x - step : x + step, 8, window.innerWidth - BTN_SIZE - 8)
            setPos({ x, y })
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }))
            e.preventDefault()
            return
        }
        if (e.key === 'Enter' || e.key === ' ') { setIsOpen(true); e.preventDefault() }
    }

    const style: React.CSSProperties = pos ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 40, touchAction: 'none' } : { position: 'fixed', right: 16, bottom: 16, zIndex: 40, touchAction: 'none' }

    return (
        <>
            <button
                ref={btnRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={onKeyDown}
                tabIndex={0}
                aria-label="Open AI Assistant"
                title="Drag to move — press Enter or Space to open"
                style={style}
                className="w-14 h-14 rounded-full bg-white text-black shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center border-2 border-gray-700"
            >
                <MessageCircle size={24} />
            </button>
            <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}

export default ChatbotButton
