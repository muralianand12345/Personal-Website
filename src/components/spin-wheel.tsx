'use client';

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type PointerEvent,
} from 'react';

import { cn } from '@/lib/utils';
import { inkFor, secureRandom } from '@/lib/lucky-wheel';
import { playTick, unlockAudio } from '@/lib/wheel-effects';

const TAU = Math.PI * 2;

// Geometry, as fractions of the wheel radius (the radius itself is a fraction
// of the square the wheel sits in, leaving room for the pointer on the right).
const RADIUS = 0.43;
const RIM = 0.04;
const HUB = 0.17;

/**
 * Share of a slice kept clear at each edge. The winner is drawn first and the
 * stopping point is placed inside its slice, so this never shifts the odds; it
 * only means the pointer never comes to rest on a line.
 */
const EDGE = 0.08;
const TURNS_PER_SECOND = 1.25;
const MIN_TURNS = 2;
const MAX_TURNS = 40;
const WIND_UP_MS = 260;
const DRIFT = 0.00008; // rad/ms while idle: one turn every ~80 seconds
const FLICK_MIN = 0.0035; // rad/ms needed for a released drag to count as a spin
const TAP_SLOP = 6; // px a press may wander and still count as a click
const FLAP_MAX = 26; // degrees the pointer bends when a pin pushes it

type Spin = {
    start: number;
    from: number;
    delta: number;
    duration: number;
    index: number;
    curve: Float32Array;
};

type Drag = {
    id: number;
    angle: number;
    startX: number;
    startY: number;
    moved: number;
    samples: { t: number; r: number }[];
};

const mod = (value: number, n: number) => ((value % n) + n) % n;
const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

/**
 * Progress over normalised time. Speed eases up over the wind-up, then bleeds
 * off quadratically, so the wheel crawls through its last slices the way a
 * real one does. With no wind-up this is exactly 1 - (1 - t)^3, whose starting
 * speed is 3 × distance / duration: what a flick hands over.
 */
const buildCurve = (windUp: number) => {
    const steps = 512;
    const curve = new Float32Array(steps + 1);
    let total = 0;
    for (let i = 1; i <= steps; i++) {
        const t = (i - 0.5) / steps;
        const ramp = windUp > 0 ? Math.min(1, t / windUp) : 1;
        total += ramp * ramp * (3 - 2 * ramp) * (1 - t) ** 2;
        curve[i] = total;
    }
    for (let i = 1; i <= steps; i++) curve[i] /= total;
    return curve;
};

const progress = (curve: Float32Array, t: number) => {
    const x = t * (curve.length - 1);
    const i = Math.floor(x);
    return i >= curve.length - 1 ? 1 : curve[i] + (curve[i + 1] - curve[i]) * (x - i);
};

/** Longest prefix that fits, with an ellipsis. */
const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= maxWidth) lo = mid;
        else hi = mid - 1;
    }
    return lo ? `${text.slice(0, lo).trimEnd()}…` : '';
};

/** Everything that turns with the wheel, drawn once per change rather than per frame. */
const drawFace = (
    size: number,
    dpr: number,
    entries: string[],
    colors: string[],
    family: string
) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.translate(size / 2, size / 2);

    const R = size * RADIUS;
    const rim = R * RIM;
    const inner = R - rim;
    const n = entries.length;

    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fillStyle = '#0d0d0d';
    ctx.fill();

    if (!n) {
        ctx.beginPath();
        ctx.arc(0, 0, inner, 0, TAU);
        ctx.fillStyle = '#111111';
        ctx.fill();
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, inner * 0.72, 0, TAU);
        ctx.stroke();
        return canvas;
    }

    const w = TAU / n;
    for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, inner, i * w, (i + 1) * w);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
    }

    // A dark hairline between slices keeps same-tone neighbours apart.
    if (n > 1 && n <= 360) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = Math.max(1, R * 0.005);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(i * w) * inner, Math.sin(i * w) * inner);
        }
        ctx.stroke();
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, inner, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, R - 0.5, 0, TAU);
    ctx.stroke();

    // Pins on the rim at every boundary: what the pointer clicks against.
    if (n > 1 && n <= 120) {
        const pinR = Math.max(1.5, rim * 0.24);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.cos(i * w) * (inner + rim / 2),
                Math.sin(i * w) * (inner + rim / 2),
                pinR,
                0,
                TAU
            );
            ctx.fill();
        }
    }

    // Labels run from the hub outwards and are right-aligned to the rim, so the
    // winner reads left to right when it stops under the pointer.
    const start = R * HUB + R * 0.07;
    const end = inner - R * 0.06;
    const room = end - start;
    // Few, wide slices (a yes/no wheel) can carry much bigger type than a crowded one.
    const cap = R * (n <= 2 ? 0.13 : n <= 4 ? 0.105 : 0.085);
    const base = Math.min(cap, 2 * inner * 0.6 * Math.sin(Math.min(w, Math.PI) / 2) * 0.62);
    if (base >= 7) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
            // Long names shrink a little before they get cut.
            ctx.font = `600 ${base}px ${family}`;
            const fullWidth = ctx.measureText(entries[i]).width;
            const fontSize =
                fullWidth > room ? Math.max(base * 0.72, (base * room) / fullWidth) : base;
            ctx.font = `600 ${fontSize}px ${family}`;
            ctx.save();
            ctx.rotate((i + 0.5) * w);
            ctx.fillStyle = inkFor(colors[i]);
            ctx.fillText(fitText(ctx, entries[i], room), end, 0);
            ctx.restore();
        }
    }

    return canvas;
};

/** Fixed lighting laid over the turning face: depth at the hub, a soft vignette at the rim. */
const drawShade = (size: number, dpr: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const c = size / 2;
    const R = size * RADIUS;
    const inner = R * (1 - RIM);

    ctx.beginPath();
    ctx.arc(c, c, inner, 0, TAU);
    ctx.clip();

    const hub = ctx.createRadialGradient(c, c, R * HUB, c, c, R * HUB * 2.4);
    hub.addColorStop(0, 'rgba(0,0,0,0.32)');
    hub.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hub;
    ctx.fillRect(0, 0, size, size);

    const edge = ctx.createRadialGradient(c, c, inner * 0.7, c, c, inner);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, size, size);

    const sheen = ctx.createLinearGradient(c - inner, c - inner, c, c);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);

    return canvas;
};

type Props = {
    entries: string[];
    colors: string[];
    /** Milliseconds for a spin started by a click or the keyboard. */
    duration: number;
    sound: boolean;
    /** Slice to spotlight, dimming the rest. */
    highlight: number | null;
    /** Ignore spins and drags, and hold still. */
    locked: boolean;
    onSpinStart: () => void;
    onSpinEnd: (index: number) => void;
    className?: string;
    style?: React.CSSProperties;
};

export type SpinWheelHandle = { spin: () => void };

const SpinWheel = forwardRef<SpinWheelHandle, Props>(function SpinWheel(props, ref) {
    const { entries, colors, highlight, locked, className, style } = props;

    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerRef = useRef<SVGSVGElement>(null);
    const [size, setSize] = useState(0);
    const [fontsLoaded, setFontsLoaded] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [dragging, setDragging] = useState(false);

    // The animation loop reads these instead of props, so it never restarts on a render.
    const live = useRef(props);
    live.current = props;
    const face = useRef<HTMLCanvasElement | null>(null);
    const shade = useRef<HTMLCanvasElement | null>(null);
    const metrics = useRef({ size: 0, dpr: 1 });
    const rotation = useRef(-Math.PI / 2);
    const spinRef = useRef<Spin | null>(null);
    const drag = useRef<Drag | null>(null);
    const boundary = useRef(0);
    const direction = useRef(1);
    const flap = useRef({ angle: 0, velocity: 0 });
    const lastTick = useRef(0);
    const spot = useRef({ alpha: 0, index: -1 });
    const visible = useRef(true);
    const reducedMotion = useRef(false);
    // Set when a spin lands, so idle drift can't nudge the result before the reveal locks the wheel.
    const hold = useRef(false);
    const frame = useRef(0);
    const lastFrame = useRef(0);

    const draw = (r: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const { size, dpr } = metrics.current;
        if (!ctx || !face.current || !size) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(r);
        ctx.drawImage(face.current, -size / 2, -size / 2, size, size);

        const n = live.current.entries.length;
        const { alpha, index } = spot.current;
        if (alpha > 0.001 && n > 1 && index >= 0 && index < n) {
            const w = TAU / n;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, size * RADIUS * (1 - RIM), (index + 1) * w, index * w + TAU);
            ctx.closePath();
            ctx.fillStyle = `rgba(0,0,0,${0.65 * alpha})`;
            ctx.fill();
        }
        ctx.restore();

        if (shade.current) ctx.drawImage(shade.current, 0, 0, size, size);
    };

    const loop = (now: number) => {
        const dt = clamp(now - lastFrame.current, 1, 50);
        lastFrame.current = now;
        const p = live.current;
        const n = p.entries.length;
        const previous = rotation.current;
        let r = previous;
        let active = false;
        let finished: number | null = null;

        const s = spinRef.current;
        if (s) {
            // A frame can be stamped slightly before the click that started the spin.
            const t = clamp((now - s.start) / s.duration, 0, 1);
            r = s.from + s.delta * progress(s.curve, t);
            active = true;
            if (t >= 1) {
                r = s.from + s.delta;
                spinRef.current = null;
                finished = s.index;
            }
        } else if (drag.current) {
            r = rotation.current;
            active = true;
        } else if (
            !p.locked &&
            !hold.current &&
            p.highlight === null &&
            n > 0 &&
            visible.current &&
            !reducedMotion.current
        ) {
            r += DRIFT * dt;
            active = true;
        }

        if (r !== previous) direction.current = r > previous ? 1 : -1;
        const speed = Math.abs(r - previous) / dt;

        if (n > 1) {
            const w = TAU / n;
            // A tick for every pin that passed the pointer this frame.
            const b = Math.floor(-r / w);
            if (b !== boundary.current) {
                boundary.current = b;
                if ((s || drag.current) && p.sound && now - lastTick.current > 28) {
                    playTick(Math.min(1, speed / 0.02));
                    lastTick.current = now;
                }
            }

            // The pointer is a flapper: the pin about to pass bends it, then lets it spring back.
            const reach = Math.min(0.4 * w, 0.09);
            const a = mod(r, w);
            const gap = direction.current > 0 ? w - a : a;
            const push = gap < reach ? -direction.current * FLAP_MAX * (1 - gap / reach) : 0;
            const f = flap.current;
            if (Math.abs(push) >= Math.abs(f.angle) && push !== 0) {
                f.angle = push;
                f.velocity = 0;
            } else {
                for (let left = dt; left > 0; left -= 8) {
                    const step = Math.min(8, left);
                    f.velocity += (-0.0025 * (f.angle - push) - 0.07 * f.velocity) * step;
                    f.angle += f.velocity * step;
                }
            }
            if (Math.abs(f.angle - push) > 0.05 || Math.abs(f.velocity) > 0.001) active = true;
        } else {
            flap.current = { angle: 0, velocity: 0 };
        }

        const target = p.highlight !== null ? 1 : 0;
        if (p.highlight !== null) spot.current.index = p.highlight;
        const sp = spot.current;
        sp.alpha += (target - sp.alpha) * (1 - Math.exp(-dt / 110));
        if (Math.abs(target - sp.alpha) > 0.002) active = true;
        else sp.alpha = target;

        rotation.current = r;
        draw(r);
        if (pointerRef.current) {
            pointerRef.current.style.transform = `translateY(-50%) rotate(${flap.current.angle.toFixed(
                2
            )}deg)`;
        }

        frame.current = active ? requestAnimationFrame(loop) : 0;

        if (finished !== null) {
            // Keep the turn count small so it never loses float precision; the pins stay put.
            rotation.current = mod(rotation.current, TAU);
            if (n > 1) boundary.current = Math.floor(-rotation.current / (TAU / n));
            hold.current = true;
            setSpinning(false);
            p.onSpinEnd(finished);
        }
    };

    const wake = () => {
        if (frame.current) return;
        lastFrame.current = performance.now();
        frame.current = requestAnimationFrame(loop);
    };

    /** Start a spin. A velocity (rad/ms) continues a flick at the speed it was let go. */
    const spin = (velocity = 0) => {
        const p = live.current;
        const n = p.entries.length;
        if (!n || spinRef.current || p.locked) return;
        if (p.sound) unlockAudio();

        // The outcome is fixed here, uniformly at random; the animation only shows it.
        const w = TAU / n;
        const u = secureRandom();
        const index = Math.min(n - 1, Math.floor(u * n));
        const landing = (index + EDGE + (u * n - index) * (1 - 2 * EDGE)) * w;

        const dir = velocity < 0 ? -1 : 1;
        const from = rotation.current;
        // The pointer sits at angle 0, so it reads the slice at -rotation.
        const align = mod(dir * (-landing - from), TAU);
        const base = reducedMotion.current ? Math.min(p.duration, 1500) : p.duration;

        let duration = base;
        let turns: number;
        if (velocity) {
            turns = clamp(Math.round((Math.abs(velocity) * base) / 3 / TAU), MIN_TURNS, MAX_TURNS);
            duration = clamp(
                (3 * (align + turns * TAU)) / Math.abs(velocity),
                base * 0.6,
                base * 1.6
            );
        } else {
            turns = Math.max(MIN_TURNS, Math.round((TURNS_PER_SECOND * base) / 1000));
        }

        hold.current = false;
        spinRef.current = {
            start: performance.now(),
            from,
            delta: dir * (align + turns * TAU),
            duration,
            index,
            curve: buildCurve(velocity ? 0 : Math.min(0.2, WIND_UP_MS / duration)),
        };
        setSpinning(true);
        p.onSpinStart();
        wake();
    };

    useImperativeHandle(ref, () => ({ spin: () => spin() }));

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        setSize(el.getBoundingClientRect().width);
        const resize = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
        resize.observe(el);
        // No point drifting a wheel nobody can see.
        const intersect = new IntersectionObserver(([entry]) => {
            visible.current = entry.isIntersecting;
            if (entry.isIntersecting) wake();
        });
        intersect.observe(el);
        document.fonts?.ready.then(() => setFontsLoaded((n) => n + 1));
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotion = () => {
            reducedMotion.current = motion.matches;
            wake();
        };
        onMotion();
        motion.addEventListener('change', onMotion);
        return () => {
            resize.disconnect();
            intersect.disconnect();
            motion.removeEventListener('change', onMotion);
            cancelAnimationFrame(frame.current);
            frame.current = 0;
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !size) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        canvas.width = canvas.height = Math.round(size * dpr);
        metrics.current = { size, dpr };
        const family = getComputedStyle(canvas).fontFamily || 'system-ui, sans-serif';
        face.current = drawFace(size, dpr, entries, colors, family);
        shade.current = drawShade(size, dpr);
        // A new set of slices makes the old spotlight meaningless.
        if (highlight === null) spot.current.alpha = 0;
        if (entries.length > 1)
            boundary.current = Math.floor(-rotation.current / (TAU / entries.length));
        draw(rotation.current);
        wake();
    }, [entries, colors, size, fontsLoaded]);

    useEffect(() => {
        // Once the reveal has locked the wheel, the landing has been seen; drift may resume after.
        if (locked) hold.current = false;
        wake();
    }, [highlight, locked]);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (locked || spinRef.current || !entries.length || e.button !== 0) return;
        // The hub is a real button and handles its own click.
        if ((e.target as Element).closest('[data-hub]')) return;
        const box = e.currentTarget.getBoundingClientRect();
        const dx = e.clientX - box.left - box.width / 2;
        const dy = e.clientY - box.top - box.height / 2;
        if (Math.hypot(dx, dy) > box.width * RADIUS) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        if (live.current.sound) unlockAudio();
        hold.current = false;
        drag.current = {
            id: e.pointerId,
            angle: Math.atan2(dy, dx),
            startX: e.clientX,
            startY: e.clientY,
            moved: 0,
            samples: [{ t: performance.now(), r: rotation.current }],
        };
        wake();
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const box = e.currentTarget.getBoundingClientRect();
        const angle = Math.atan2(
            e.clientY - box.top - box.height / 2,
            e.clientX - box.left - box.width / 2
        );
        const delta = mod(angle - d.angle + Math.PI, TAU) - Math.PI;
        d.angle = angle;
        d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
        if (d.moved <= TAP_SLOP) return;

        if (!dragging) setDragging(true);
        rotation.current += delta;
        const now = performance.now();
        d.samples.push({ t: now, r: rotation.current });
        while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
        wake();
    };

    const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        drag.current = null;
        setDragging(false);
        if (cancelled) return;
        if (d.moved <= TAP_SLOP) return spin();

        // Speed over the last moments of the drag; holding still before letting go means no flick.
        const now = performance.now();
        const recent = d.samples.filter((s) => now - s.t <= 80);
        const first = recent[0];
        const velocity =
            first && now > first.t ? (rotation.current - first.r) / (now - first.t) : 0;
        if (Math.abs(velocity) >= FLICK_MIN) spin(velocity);
    };

    const fontSize = Math.max(10, size * 0.024);

    return (
        <div
            ref={wrapRef}
            className={cn(
                'relative aspect-square w-full select-none [touch-action:pan-y]',
                locked || spinning || !entries.length
                    ? 'cursor-default'
                    : dragging
                    ? 'cursor-grabbing'
                    : 'cursor-pointer',
                className
            )}
            style={style}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-[8%] rounded-full bg-white/[0.05] blur-3xl"
            />
            <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />

            {!entries.length && (
                <p
                    className="pointer-events-none absolute inset-x-0 top-[68%] text-center text-white/40"
                    style={{ fontSize }}
                >
                    Add entries to spin
                </p>
            )}

            <svg
                ref={pointerRef}
                aria-hidden
                viewBox="0 0 100 64"
                className="pointer-events-none absolute top-1/2 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]"
                style={{
                    left: `${(0.5 + RADIUS - RADIUS * RIM * 1.4) * 100}%`,
                    width: `${RADIUS * 0.24 * 100}%`,
                    transform: 'translateY(-50%)',
                    transformOrigin: '74% 50%',
                }}
            >
                <path
                    d="M2 32 L60 8 C80 0 98 12 98 32 C98 52 80 64 60 56 Z"
                    fill="#fafafa"
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth={1.5}
                />
                <circle cx={74} cy={32} r={8} fill="#0a0a0a" />
            </svg>

            <button
                type="button"
                data-hub=""
                onClick={() => spin()}
                aria-disabled={locked || spinning || !entries.length}
                aria-label={spinning ? 'Spinning' : 'Spin the wheel'}
                className={cn(
                    'absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full',
                    'border border-white/15 bg-black font-semibold uppercase tracking-[0.2em] text-white',
                    'shadow-[0_0_0_6px_rgba(0,0,0,0.35),0_8px_30px_rgba(0,0,0,0.6)] transition-[transform,border-color,color] duration-200',
                    'outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    locked || spinning || !entries.length
                        ? 'cursor-default text-white/30'
                        : 'cursor-pointer hover:scale-105 hover:border-white/40 active:scale-95'
                )}
                style={{ width: `${RADIUS * HUB * 2 * 100}%`, fontSize }}
            >
                <span className="pl-[0.2em]">Spin</span>
            </button>
        </div>
    );
});

export default SpinWheel;
