// ---------------------------------------------------------------------------
// Sound. Synthesised with Web Audio, so there are no files to fetch and the
// first spin is never silent while a sample downloads.
// ---------------------------------------------------------------------------

let audio: AudioContext | null = null;

/** Browsers only start audio from a gesture, so call this from the click that spins. */
export const unlockAudio = () => {
    try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') void audio.resume();
    } catch {
        audio = null;
    }
};

/** The flapper clicking past a pin: a short pitched knock, quieter as the wheel slows. */
export const playTick = (strength = 1) => {
    if (!audio || audio.state !== 'running') return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.03);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05 + 0.07 * strength, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.05);
};

/** A rising major arpeggio for the reveal. */
export const playWin = () => {
    if (!audio || audio.state !== 'running') return;
    const t = audio.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const start = t + i * 0.085;
        const osc = audio!.createOscillator();
        const gain = audio!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (i === 3 ? 0.9 : 0.35));
        osc.connect(gain).connect(audio!.destination);
        osc.start(start);
        osc.stop(start + 1);
    });
};

// ---------------------------------------------------------------------------
// Confetti. A few hundred paper scraps on a canvas the caller owns; returns a
// cancel function so closing early never leaves a loop running.
// ---------------------------------------------------------------------------

type Scrap = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    angle: number;
    flip: number;
    size: number;
    color: string;
    round: boolean;
};

const LIFETIME = 3200;
const GRAVITY = 0.0011;
const DRAG = 0.0018;

export const launchConfetti = (canvas: HTMLCanvasElement, colors: string[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    const count = width < 640 ? 140 : 220;
    // Wider screens get a harder throw, so the scraps still meet in the middle.
    const reach = Math.min(1.3, Math.max(0.6, width / 1100));
    const scraps: Scrap[] = Array.from({ length: count }, (_, i) => {
        // Two cannons, one at each lower corner, aimed up and inwards.
        const left = i % 2 === 0;
        const angle = -Math.PI / 2 + (left ? 0.8 : -0.8) + (Math.random() - 0.5) * 0.9;
        const speed = (1 + Math.random() * 1.2) * reach;
        return {
            x: left ? -10 : width + 10,
            y: height * 0.85,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            spin: (Math.random() - 0.5) * 0.02,
            angle: Math.random() * Math.PI * 2,
            flip: Math.random() * Math.PI * 2,
            size: 6 + Math.random() * 6,
            color: colors[i % colors.length],
            round: Math.random() < 0.25,
        };
    });

    let frame = 0;
    let last = performance.now();
    const start = last;

    const tick = (now: number) => {
        const dt = Math.min(now - last, 40);
        last = now;
        const age = now - start;
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = age > LIFETIME - 700 ? Math.max(0, (LIFETIME - age) / 700) : 1;

        for (const s of scraps) {
            s.vx -= s.vx * DRAG * dt;
            s.vy += GRAVITY * dt - s.vy * DRAG * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.angle += s.spin * dt;
            s.flip += 0.012 * dt;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            // Scaling one axis by cos(flip) reads as the scrap tumbling end over end.
            ctx.scale(1, Math.cos(s.flip));
            ctx.fillStyle = s.color;
            if (s.round) {
                ctx.beginPath();
                ctx.arc(0, 0, s.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-s.size / 2, -s.size / 4, s.size, s.size / 2);
            }
            ctx.restore();
        }

        if (age < LIFETIME) frame = requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, width, height);
    };

    frame = requestAnimationFrame(tick);
    return () => {
        cancelAnimationFrame(frame);
        ctx.clearRect(0, 0, width, height);
    };
};
