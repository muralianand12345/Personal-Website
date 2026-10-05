'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    ArrowDownAZ,
    Check,
    Copy,
    Link2,
    Maximize2,
    Minimize2,
    Shuffle,
    Trash2,
    Undo2,
    Volume2,
    VolumeX,
    X,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import SpinWheel, { type SpinWheelHandle } from '@/components/spin-wheel';
import {
    DEFAULT_ENTRIES,
    DEFAULT_SETTINGS,
    DEFAULT_TITLE,
    DURATION_RANGE,
    MAX_ENTRIES,
    MAX_RESULTS,
    MAX_TITLE,
    PALETTES,
    loadWheel,
    parseEntries,
    readShared,
    removeEntryAt,
    saveWheel,
    shareUrl,
    shuffled,
    sliceColors,
    type PaletteId,
    type Result,
    type Settings,
} from '@/lib/lucky-wheel';
import { launchConfetti, playWin } from '@/lib/wheel-effects';

type Tab = 'entries' | 'results' | 'options';
type Winner = { index: number; name: string; color: string };
type Undo = { label: string; text: string; title: string };

// A beat between the wheel stopping and the reveal, so the landing is seen first.
const REVEAL_DELAY = 450;
const FLASH_MS = 2000;

const formatTime = (at: number) =>
    new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const swatch = (colors: string[]) =>
    `conic-gradient(${colors
        .map((c, i) => `${c} ${(i / colors.length) * 360}deg ${((i + 1) / colors.length) * 360}deg`)
        .join(', ')})`;

const ToolButton = ({
    icon: Icon,
    children,
    ...rest
}: { icon: LucideIcon; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-35"
        {...rest}
    >
        <Icon className="size-3.5" aria-hidden />
        {children}
    </button>
);

const IconButton = ({
    label,
    children,
    ...rest
}: { label: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        className="rounded-full border border-white/15 p-2.5 text-white/60 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white"
        {...rest}
    >
        {children}
    </button>
);

const Toggle = ({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) => {
    const id = useId();
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <span>
                <label htmlFor={id} className="block cursor-pointer text-sm text-white/85">
                    {label}
                </label>
                {hint && (
                    <span id={`${id}-hint`} className="mt-0.5 block text-xs text-white/40">
                        {hint}
                    </span>
                )}
            </span>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-describedby={hint ? `${id}-hint` : undefined}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                    checked ? 'bg-white' : 'bg-white/15'
                )}
            >
                <span
                    className={cn(
                        'absolute left-0.5 top-0.5 size-4 rounded-full transition-transform',
                        checked ? 'translate-x-4 bg-black' : 'bg-white/70'
                    )}
                />
            </button>
        </div>
    );
};

const LuckyWheel = () => {
    const [ready, setReady] = useState(false);
    const [text, setText] = useState(DEFAULT_ENTRIES.join('\n'));
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [results, setResults] = useState<Result[]>([]);
    const [tab, setTab] = useState<Tab>('entries');
    const [spinning, setSpinning] = useState(false);
    const [winner, setWinner] = useState<Winner | null>(null);
    const [undo, setUndo] = useState<Undo | null>(null);
    const [flash, setFlash] = useState<'link' | 'results' | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [canFullscreen, setCanFullscreen] = useState(false);
    const [modKey, setModKey] = useState('Ctrl');
    const [touch, setTouch] = useState(false);
    const [pendingSpin, setPendingSpin] = useState(false);

    const wheelRef = useRef<SpinWheelHandle>(null);
    const stageRef = useRef<HTMLElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const confettiRef = useRef<HTMLCanvasElement>(null);
    const spinAgainRef = useRef<HTMLButtonElement>(null);
    const winnerRef = useRef<Winner | null>(null);
    const stopConfetti = useRef<(() => void) | null>(null);
    const revealTimer = useRef(0);
    const flashTimer = useRef(0);

    const entries = useMemo(() => parseEntries(text), [text]);
    const lineCount = useMemo(() => text.split('\n').filter((line) => line.trim()).length, [text]);
    const palette = PALETTES[settings.palette].colors;
    const colors = useMemo(() => sliceColors(entries.length, palette), [entries.length, palette]);
    const busy = spinning || winner !== null;

    // Restore a shared link if there is one, otherwise this browser's last wheel.
    // After hydration, so the server render stays deterministic.
    useEffect(() => {
        const saved = loadWheel();
        const shared = readShared(window.location.hash);
        if (shared) {
            setText(shared.entries.join('\n'));
            setTitle(shared.title);
            history.replaceState(null, '', window.location.pathname + window.location.search);
            if (saved.text !== undefined && saved.text !== shared.entries.join('\n')) {
                setUndo({
                    label: 'Restore my wheel',
                    text: saved.text,
                    title: saved.title ?? '',
                });
            }
        } else {
            if (saved.text !== undefined) setText(saved.text);
            if (saved.title !== undefined) setTitle(saved.title);
        }
        if (saved.settings) setSettings(saved.settings);
        if (saved.results) setResults(saved.results);
        setModKey(/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl');
        setTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches);
        setCanFullscreen(!!document.fullscreenEnabled);
        setReady(true);
    }, []);

    useEffect(() => {
        if (ready) saveWheel({ text, title, settings, results });
    }, [ready, text, title, settings, results]);

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    useEffect(
        () => () => {
            clearTimeout(revealTimer.current);
            clearTimeout(flashTimer.current);
            stopConfetti.current?.();
        },
        []
    );

    // "Spin again" closes the reveal first; spin once the freed wheel has rendered.
    useEffect(() => {
        if (!pendingSpin) return;
        setPendingSpin(false);
        wheelRef.current?.spin();
    }, [pendingSpin]);

    const showFlash = (kind: NonNullable<typeof flash>) => {
        setFlash(kind);
        clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
    };

    const updateSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

    const editEntries = (next: string[], label: string) => {
        setUndo({ label: `Undo ${label}`, text, title });
        setText(next.join('\n'));
    };

    const handleSpinStart = () => {
        setSpinning(true);
        setUndo(null);
    };

    const handleSpinEnd = (index: number) => {
        setSpinning(false);
        const name = entries[index];
        if (name === undefined) return;
        const picked = { index, name, color: colors[index] };
        winnerRef.current = picked;
        setWinner(picked);
        setResults((prev) =>
            [{ name, color: picked.color, at: Date.now() }, ...prev].slice(0, MAX_RESULTS)
        );

        revealTimer.current = window.setTimeout(() => {
            const dialog = dialogRef.current;
            if (!dialog || winnerRef.current !== picked) return;
            dialog.showModal();
            spinAgainRef.current?.focus();
            if (settings.sound) playWin();
            const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (settings.confetti && !calm && confettiRef.current) {
                stopConfetti.current = launchConfetti(confettiRef.current, [
                    picked.color,
                    ...palette,
                    '#ffffff',
                ]);
            }
        }, REVEAL_DELAY);
    };

    /** Every way out of the reveal comes through here, exactly once per winner. */
    const finishReveal = (action: 'close' | 'remove' | 'again') => {
        const picked = winnerRef.current;
        winnerRef.current = null;
        clearTimeout(revealTimer.current);
        stopConfetti.current?.();
        stopConfetti.current = null;
        if (dialogRef.current?.open) dialogRef.current.close();
        if (!picked) return;

        if (action === 'remove' || settings.autoRemove) {
            if (action === 'remove') setUndo({ label: `Put back “${picked.name}”`, text, title });
            setText((t) => removeEntryAt(t, picked.index));
        }
        setWinner(null);
        if (action === 'again') setPendingSpin(true);
    };

    // Ctrl/⌘ + Enter spins from anywhere on the page, including mid-reveal.
    const shortcut = useRef<() => void>(() => {});
    shortcut.current = () => (winnerRef.current ? finishReveal('again') : wheelRef.current?.spin());
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.repeat) return;
            e.preventDefault();
            shortcut.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const copyShareLink = async () => {
        const url = shareUrl(title, entries);
        try {
            await navigator.clipboard.writeText(url);
            showFlash('link');
        } catch {
            // No clipboard access (an insecure origin, or permission refused): hand it over to copy.
            window.prompt('Copy this link to share the wheel:', url);
        }
    };

    const copyResults = async () => {
        const lines = [...results].reverse().map((r, i) => `${i + 1}. ${r.name}`);
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            showFlash('results');
        } catch {}
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else stageRef.current?.requestFullscreen().catch(() => {});
    };

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'entries', label: 'Entries', count: entries.length },
        { id: 'results', label: 'Results', count: results.length },
        { id: 'options', label: 'Options' },
    ];

    const remaining = entries.length - (settings.autoRemove ? 1 : 0);

    return (
        <div
            className={cn(
                'grid gap-10 transition-opacity duration-500 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]',
                ready ? 'opacity-100' : 'opacity-0'
            )}
        >
            <section
                ref={stageRef}
                aria-labelledby="lucky-wheel-heading"
                className={cn(
                    'flex min-w-0 flex-col',
                    fullscreen && 'justify-center overflow-hidden bg-black p-6 sm:p-10'
                )}
            >
                <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h1
                            id="lucky-wheel-heading"
                            className="text-sm uppercase tracking-widest text-white/40"
                        >
                            Lucky wheel
                        </h1>
                        <div className="flex shrink-0 gap-2">
                            <IconButton
                                label={settings.sound ? 'Mute sound' : 'Turn sound on'}
                                aria-pressed={settings.sound}
                                onClick={() => updateSettings({ sound: !settings.sound })}
                            >
                                {settings.sound ? (
                                    <Volume2 className="size-4" />
                                ) : (
                                    <VolumeX className="size-4" />
                                )}
                            </IconButton>
                            <IconButton
                                label={
                                    flash === 'link' ? 'Link copied' : 'Copy a link to this wheel'
                                }
                                onClick={copyShareLink}
                                disabled={!entries.length}
                            >
                                {flash === 'link' ? (
                                    <Check className="size-4" />
                                ) : (
                                    <Link2 className="size-4" />
                                )}
                            </IconButton>
                            {canFullscreen && (
                                <IconButton
                                    label={fullscreen ? 'Exit full screen' : 'Full screen'}
                                    onClick={toggleFullscreen}
                                >
                                    {fullscreen ? (
                                        <Minimize2 className="size-4" />
                                    ) : (
                                        <Maximize2 className="size-4" />
                                    )}
                                </IconButton>
                            )}
                        </div>
                    </div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                        placeholder="Name this wheel"
                        aria-label="Wheel title"
                        spellCheck={false}
                        className="w-full truncate border-b border-transparent bg-transparent pb-1 text-3xl font-bold tracking-tight outline-none transition-colors placeholder:text-white/25 hover:border-white/15 focus:border-white/40 sm:text-4xl"
                    />
                </div>

                {ready ? (
                    <SpinWheel
                        ref={wheelRef}
                        entries={entries}
                        colors={colors}
                        duration={settings.duration * 1000}
                        sound={settings.sound}
                        highlight={winner?.index ?? null}
                        locked={winner !== null}
                        onSpinStart={handleSpinStart}
                        onSpinEnd={handleSpinEnd}
                        className="mx-auto"
                        style={{
                            maxWidth: fullscreen
                                ? 'min(100%, calc(100svh - 14rem))'
                                : 'min(100%, 40rem, calc(100svh - 16rem))',
                        }}
                    />
                ) : (
                    <div className="mx-auto aspect-square w-full max-w-[40rem]" />
                )}

                <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
                    {touch ? (
                        'Tap the wheel to spin, or swipe across it to give it a flick.'
                    ) : (
                        <>
                            Click the wheel or press{' '}
                            <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans text-[11px] text-white/60">
                                {modKey}
                            </kbd>{' '}
                            <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans text-[11px] text-white/60">
                                Enter
                            </kbd>{' '}
                            to spin. Or grab it and give it a flick.
                        </>
                    )}
                </p>
                <p className="sr-only" aria-live="polite">
                    {spinning ? 'Spinning…' : ''}
                    {flash === 'link' ? 'Link copied.' : ''}
                    {flash === 'results' ? 'Results copied.' : ''}
                </p>
            </section>

            <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:sticky lg:top-24 lg:self-start">
                <div
                    role="tablist"
                    aria-label="Wheel panel"
                    className="mb-5 grid grid-cols-3 rounded-full border border-white/10 p-0.5 text-xs"
                >
                    {tabs.map(({ id, label, count }) => (
                        <button
                            key={id}
                            id={`tab-${id}`}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            aria-controls={`panel-${id}`}
                            onClick={() => setTab(id)}
                            className={cn(
                                'flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors',
                                tab === id
                                    ? 'bg-white text-black'
                                    : 'text-white/55 hover:text-white'
                            )}
                        >
                            {label}
                            {count !== undefined && (
                                <span
                                    className={cn(
                                        'tabular-nums',
                                        tab === id ? 'text-black/50' : 'text-white/35'
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'entries' && (
                    <div id="panel-entries" role="tabpanel" aria-labelledby="tab-entries">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <ToolButton
                                icon={Shuffle}
                                disabled={busy || entries.length < 2}
                                onClick={() => editEntries(shuffled(entries), 'shuffle')}
                            >
                                Shuffle
                            </ToolButton>
                            <ToolButton
                                icon={ArrowDownAZ}
                                disabled={busy || entries.length < 2}
                                onClick={() =>
                                    editEntries(
                                        [...entries].sort((a, b) =>
                                            a.localeCompare(b, undefined, {
                                                numeric: true,
                                                sensitivity: 'base',
                                            })
                                        ),
                                        'sort'
                                    )
                                }
                            >
                                Sort
                            </ToolButton>
                            <ToolButton
                                icon={Trash2}
                                disabled={busy || !text.trim()}
                                onClick={() => editEntries([], 'clear')}
                            >
                                Clear
                            </ToolButton>
                        </div>

                        <textarea
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                setUndo(null);
                            }}
                            readOnly={busy}
                            placeholder={'One entry per line\n\nAlice\nBob\nCharlie'}
                            aria-label="Entries, one per line"
                            spellCheck={false}
                            className={cn(
                                'block h-72 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-7 outline-none transition-colors lg:h-[24rem]',
                                'placeholder:text-white/25 hover:border-white/20 focus:border-white/40',
                                busy && 'text-white/50'
                            )}
                        />

                        <div className="mt-3 flex min-h-7 flex-wrap items-center justify-between gap-2 text-xs text-white/40">
                            <span>
                                {lineCount > MAX_ENTRIES
                                    ? `Only the first ${MAX_ENTRIES} of ${lineCount} are on the wheel`
                                    : 'One per line. Repeat an entry to raise its odds.'}
                            </span>
                            {undo && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setText(undo.text);
                                        setTitle(undo.title);
                                        setUndo(null);
                                    }}
                                    className="inline-flex items-center gap-1 text-white/70 transition-colors hover:text-white disabled:opacity-40"
                                >
                                    <Undo2 className="size-3.5" aria-hidden />
                                    {undo.label}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'results' && (
                    <div id="panel-results" role="tabpanel" aria-labelledby="tab-results">
                        {results.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-white/10 px-4 py-14 text-center text-sm text-white/40">
                                No spins yet. Winners land here.
                            </p>
                        ) : (
                            <>
                                <ol className="max-h-[26rem] overflow-y-auto rounded-xl border border-white/10 bg-black/40 px-4">
                                    {results.map((r, i) => (
                                        <li
                                            key={`${r.at}-${i}`}
                                            className="flex items-center gap-3 border-t border-white/5 py-2.5 text-sm first:border-t-0"
                                        >
                                            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-white/30">
                                                {results.length - i}
                                            </span>
                                            <span
                                                aria-hidden
                                                className="size-2.5 shrink-0 rounded-full ring-1 ring-white/25"
                                                style={{ background: r.color }}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-white/85">
                                                {r.name}
                                            </span>
                                            <time
                                                dateTime={new Date(r.at).toISOString()}
                                                className="shrink-0 text-xs tabular-nums text-white/35"
                                            >
                                                {formatTime(r.at)}
                                            </time>
                                        </li>
                                    ))}
                                </ol>
                                <div className="mt-3 flex gap-2">
                                    <ToolButton
                                        icon={flash === 'results' ? Check : Copy}
                                        onClick={copyResults}
                                    >
                                        {flash === 'results' ? 'Copied' : 'Copy'}
                                    </ToolButton>
                                    <ToolButton icon={Trash2} onClick={() => setResults([])}>
                                        Clear
                                    </ToolButton>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'options' && (
                    <div
                        id="panel-options"
                        role="tabpanel"
                        aria-labelledby="tab-options"
                        className="divide-y divide-white/5"
                    >
                        <div className="pb-4">
                            <div className="mb-3 flex items-baseline justify-between">
                                <label htmlFor="spin-duration" className="text-sm text-white/85">
                                    Spin time
                                </label>
                                <span className="text-xs tabular-nums text-white/50">
                                    {settings.duration} s
                                </span>
                            </div>
                            <input
                                id="spin-duration"
                                type="range"
                                min={DURATION_RANGE.min}
                                max={DURATION_RANGE.max}
                                step={1}
                                value={settings.duration}
                                onChange={(e) =>
                                    updateSettings({ duration: Number(e.target.value) })
                                }
                                className="w-full cursor-pointer accent-white"
                            />
                        </div>

                        <Toggle
                            label="Sound"
                            hint="Ticks as it turns, a chime when it lands."
                            checked={settings.sound}
                            onChange={(sound) => updateSettings({ sound })}
                        />
                        <Toggle
                            label="Confetti"
                            hint="Skipped anyway if your system asks for reduced motion."
                            checked={settings.confetti}
                            onChange={(confetti) => updateSettings({ confetti })}
                        />
                        <Toggle
                            label="Remove winners"
                            hint="Take each winner off the wheel, for drawing without repeats."
                            checked={settings.autoRemove}
                            onChange={(autoRemove) => updateSettings({ autoRemove })}
                        />

                        <fieldset className="pt-4">
                            <legend className="mb-3 text-sm text-white/85">Colors</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        aria-pressed={settings.palette === id}
                                        onClick={() => updateSettings({ palette: id })}
                                        className={cn(
                                            'flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs transition-colors',
                                            settings.palette === id
                                                ? 'border-white/50 bg-white/10 text-white'
                                                : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className="size-9 rounded-full ring-1 ring-white/15"
                                            style={{ background: swatch(PALETTES[id].colors) }}
                                        />
                                        {PALETTES[id].label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    </div>
                )}
            </aside>

            <dialog
                ref={dialogRef}
                aria-labelledby="winner-name"
                onClose={() => finishReveal('close')}
                onClick={(e) => e.target === e.currentTarget && finishReveal('close')}
                className="m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-transparent p-4 text-white open:flex backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
            >
                <canvas
                    ref={confettiRef}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 size-full"
                />
                {winner && (
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 pb-7 pt-10 text-center shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 sm:px-10"
                        style={{
                            backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${winner.color}33, transparent 65%)`,
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() => finishReveal('close')}
                            className="absolute right-3 top-3 rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="size-4" />
                        </button>
                        <p className="mb-4 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-white/45">
                            <span
                                aria-hidden
                                className="size-2.5 rounded-full ring-1 ring-white/30"
                                style={{ background: winner.color }}
                            />
                            {title.trim() || 'The wheel picked'}
                        </p>
                        <h2
                            id="winner-name"
                            className="text-balance break-words text-4xl font-bold tracking-tight sm:text-5xl"
                        >
                            {winner.name}
                        </h2>
                        <p className="mt-3 text-sm text-white/45">
                            {settings.autoRemove
                                ? 'Taken off the wheel.'
                                : `1 of ${entries.length} ${
                                      entries.length === 1 ? 'entry' : 'entries'
                                  }`}
                        </p>
                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                            {!settings.autoRemove && (
                                <button
                                    type="button"
                                    onClick={() => finishReveal('remove')}
                                    className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10"
                                >
                                    Remove from wheel
                                </button>
                            )}
                            {remaining > 0 && (
                                <button
                                    ref={spinAgainRef}
                                    type="button"
                                    onClick={() => finishReveal('again')}
                                    className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
                                >
                                    Spin again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </dialog>
        </div>
    );
};

export default LuckyWheel;
