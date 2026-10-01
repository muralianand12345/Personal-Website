'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExchangeRates } from '@/lib/exchange-rates';
import { HISTORY_RANGES, type HistoryRange, type RateHistory } from '@/lib/rate-history';

// Series and status colors validated against the black surface (dataviz palette, dark steps).
const LINE = '#3987e5';
const UP = '#0ca30c';
const DOWN = '#d03b3b';
const SURFACE = '#050505';

const PLOT_HEIGHT = 200;
const PLOT_TOP = 8;
const AXIS_BAND = 28;
const PLOT_RIGHT = 8;

type Point = { date: string; value: number };

const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Date(toTime(date)).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });

const axisDate = (range: HistoryRange, date: string) =>
    formatDate(
        date,
        range === '1M' || range === '3M'
            ? { day: 'numeric', month: 'short' }
            : { month: 'short', year: 'numeric' }
    );

const pointDate = (date: string) =>
    formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Published rates carry 5 significant digits; 6 keeps them, and cross rates, unrounded.
const formatValue = (value: number) =>
    new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(value);

const percentChange = (from: Point | undefined, to: Point | undefined) =>
    from && to ? (to.value / from.value - 1) * 100 : null;

/** Clean, evenly stepped y-axis values that bracket [min, max]. */
const niceTicks = (min: number, max: number, target = 4) => {
    if (min === max) {
        const pad = Math.abs(min) * 0.005 || 1;
        min -= pad;
        max += pad;
    }
    const raw = (max - min) / target;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const residual = raw / magnitude;
    const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
    const first = Math.floor(min / step);
    const last = Math.ceil(max / step);
    return {
        ticks: Array.from({ length: last - first + 1 }, (_, i) => (first + i) * step),
        decimals: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)),
    };
};

/** Signed percent with an arrow, so direction never rests on color alone. */
const Delta = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-white/35">–</span>;
    const flat = Math.abs(value) < 0.005;
    const Icon = value > 0 ? ArrowUp : ArrowDown;
    return (
        <span
            className="inline-flex items-center gap-0.5 tabular-nums"
            style={{ color: flat ? undefined : value > 0 ? UP : DOWN }}
        >
            {!flat && <Icon className="size-3" aria-hidden />}
            {flat ? '' : value > 0 ? '+' : '−'}
            {Math.abs(value).toFixed(2)}%
        </span>
    );
};

type ChartProps = {
    points: Point[];
    range: HistoryRange;
    label: string;
    hover: number | null;
    onHover: (index: number | null) => void;
};

const LineChart = ({ points, range, label, hover, onHover }: ChartProps) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    // useId() contains colons, which break a url(#id) reference.
    const gradientId = `area-${useId().replace(/:/g, '')}`;

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        // Measure now too: observers only report on a rendered frame, which a background tab never gets.
        setWidth(el.getBoundingClientRect().width);
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Up to ~1,800 daily points on 5Y: build the geometry once per data/size, not per hover.
    const { ticks, tickLabels, x0, x1, xs, y, line, area } = useMemo(() => {
        const values = points.map((p) => p.value);
        const { ticks, decimals } = niceTicks(Math.min(...values), Math.max(...values));
        const tickFormat = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        const tickLabels = ticks.map((t) => tickFormat.format(t));
        const x0 = Math.max(...tickLabels.map((l) => l.length)) * 6.5 + 12;
        const x1 = Math.max(x0 + 1, width - PLOT_RIGHT);
        const t0 = toTime(points[0].date);
        const t1 = toTime(points[points.length - 1].date);
        const xs = points.map((p) =>
            t1 === t0 ? (x0 + x1) / 2 : x0 + ((toTime(p.date) - t0) / (t1 - t0)) * (x1 - x0)
        );
        const lo = ticks[0];
        const hi = ticks[ticks.length - 1];
        const y = (value: number) =>
            PLOT_TOP + (1 - (value - lo) / (hi - lo)) * (PLOT_HEIGHT - PLOT_TOP);
        const line = points
            .map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${y(p.value).toFixed(1)}`)
            .join('');
        const area = `${line}L${x1},${PLOT_HEIGHT}L${x0},${PLOT_HEIGHT}Z`;
        return { ticks, tickLabels, x0, x1, xs, y, line, area };
    }, [points, width]);

    const xTickCount = width < 420 ? 3 : 5;
    const xTicks = [
        ...new Set(
            Array.from({ length: xTickCount }, (_, i) =>
                Math.round((i * (points.length - 1)) / (xTickCount - 1))
            )
        ),
    ];

    // The crosshair snaps to the nearest date; readers aim at a time, not at a 2px line.
    const nearest = (clientX: number) => {
        const px = clientX - (wrapperRef.current?.getBoundingClientRect().left ?? 0);
        let lo = 0;
        let hi = xs.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (xs[mid] < px) lo = mid + 1;
            else hi = mid;
        }
        return lo > 0 && px - xs[lo - 1] < xs[lo] - px ? lo - 1 : lo;
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const last = points.length - 1;
        const current = hover ?? last;
        const next =
            e.key === 'ArrowLeft'
                ? Math.max(0, current - 1)
                : e.key === 'ArrowRight'
                ? Math.min(last, current + 1)
                : e.key === 'Home'
                ? 0
                : e.key === 'End'
                ? last
                : null;
        if (next === null) return;
        e.preventDefault();
        onHover(next);
    };

    const active = hover !== null ? points[hover] : undefined;
    const markerIndex = hover ?? points.length - 1;

    return (
        <div
            ref={wrapperRef}
            tabIndex={0}
            role="group"
            aria-label={`${label} chart. Use the arrow keys to step through dates.`}
            onKeyDown={onKeyDown}
            onBlur={() => onHover(null)}
            className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ height: PLOT_HEIGHT + AXIS_BAND }}
        >
            {width > 0 && (
                <svg
                    width={width}
                    height={PLOT_HEIGHT + AXIS_BAND}
                    aria-hidden
                    className="block select-none"
                    style={{ touchAction: 'pan-y' }}
                    onPointerMove={(e) => onHover(nearest(e.clientX))}
                    onPointerDown={(e) => onHover(nearest(e.clientX))}
                    onPointerLeave={() => onHover(null)}
                    onPointerUp={(e) => e.pointerType !== 'mouse' && onHover(null)}
                    onPointerCancel={() => onHover(null)}
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={LINE} stopOpacity={0.16} />
                            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    {ticks.map((tick, i) => (
                        <g key={tick}>
                            <line
                                x1={x0}
                                x2={x1}
                                y1={y(tick)}
                                y2={y(tick)}
                                stroke="rgba(255,255,255,0.08)"
                                shapeRendering="crispEdges"
                            />
                            <text
                                x={x0 - 10}
                                y={y(tick)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize={11}
                                fill="rgba(255,255,255,0.4)"
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                                {tickLabels[i]}
                            </text>
                        </g>
                    ))}

                    {xTicks.map((index, i) => (
                        <text
                            key={index}
                            x={xs[index]}
                            y={PLOT_HEIGHT + 20}
                            textAnchor={
                                i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'
                            }
                            fontSize={11}
                            fill="rgba(255,255,255,0.4)"
                        >
                            {axisDate(range, points[index].date)}
                        </text>
                    ))}

                    <path d={area} fill={`url(#${gradientId})`} />
                    <path
                        d={line}
                        fill="none"
                        stroke={LINE}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {active && (
                        <line
                            x1={xs[hover!]}
                            x2={xs[hover!]}
                            y1={PLOT_TOP}
                            y2={PLOT_HEIGHT}
                            stroke="rgba(255,255,255,0.35)"
                            shapeRendering="crispEdges"
                        />
                    )}
                    <circle
                        cx={xs[markerIndex]}
                        cy={y(points[markerIndex].value)}
                        r={4}
                        fill={LINE}
                        stroke={SURFACE}
                        strokeWidth={2}
                    />

                    {/* Transparent hit layer over the whole plot, wider than any mark. */}
                    <rect x={0} y={0} width={width} height={PLOT_HEIGHT} fill="transparent" />
                </svg>
            )}
        </div>
    );
};

type TableProps = { points: Point[]; from: string; target: string; label: string };

// Memoized and only filled while open: 5Y is ~1,800 rows and hover re-renders the panel.
const DataTable = memo(({ points, from, target, label }: TableProps) => {
    const [open, setOpen] = useState(false);
    return (
        <details
            className="mt-3 text-xs text-white/50"
            onToggle={(e) => setOpen(e.currentTarget.open)}
        >
            <summary className="cursor-pointer select-none hover:text-white/80 transition-colors">
                Show data table
            </summary>
            {open && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/10">
                    <table className="w-full tabular-nums">
                        <caption className="sr-only">{label}</caption>
                        <thead className="sticky top-0 bg-black text-white/40">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left font-medium">
                                    Date
                                </th>
                                <th scope="col" className="px-4 py-2 text-right font-medium">
                                    {target} per {from}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...points].reverse().map((p) => (
                                <tr key={p.date} className="border-t border-white/5">
                                    <td className="px-4 py-1.5">{pointDate(p.date)}</td>
                                    <td className="px-4 py-1.5 text-right text-white/80">
                                        {formatValue(p.value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </details>
    );
});
DataTable.displayName = 'DataTable';

type Props = { from: string; codes: string[]; live: ExchangeRates };

const RateHistoryPanel = ({ from, codes, live }: Props) => {
    const [range, setRange] = useState<HistoryRange>('1Y');
    const [picked, setPicked] = useState<string | null>(null);
    const [history, setHistory] = useState<RateHistory | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [attempt, setAttempt] = useState(0);
    const [hover, setHover] = useState<number | null>(null);

    // History is USD-based, so switching the source row re-derives pairs without a refetch.
    const codesKey = [...codes].sort().join(',');

    useEffect(() => {
        const controller = new AbortController();
        setStatus('loading');
        fetch(`/api/rates/history?range=${range}&codes=${codesKey}`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`History responded ${res.status}`);
                return res.json();
            })
            .then((data: RateHistory) => {
                setHistory(data);
                setStatus('ready');
            })
            .catch((err) => {
                if (err?.name !== 'AbortError') setStatus('error');
            });
        return () => controller.abort();
    }, [range, codesKey, attempt]);

    const others = codes.filter((code) => code !== from);

    // Every pair's daily series, rebuilt only when the data or the source row changes.
    const seriesByCode = useMemo(() => {
        const series = new Map<string, Point[]>();
        for (const to of codes.filter((code) => code !== from)) {
            const base = history?.rates[from];
            const quote = history?.rates[to];
            if (!history || !base || !quote) {
                series.set(to, []);
                continue;
            }
            const points = history.dates.flatMap((date, i) => {
                const b = base[i];
                const q = quote[i];
                return b && q ? [{ date, value: q / b }] : [];
            });
            // End on the converter's own rate, so the chart and the amounts above never disagree.
            const now = live.rates[to] / live.rates[from];
            const last = points[points.length - 1];
            if (points.length && Number.isFinite(now)) {
                if (last.date === live.date)
                    points[points.length - 1] = { date: last.date, value: now };
                else if (last.date < live.date) points.push({ date: live.date, value: now });
            }
            series.set(to, points);
        }
        return series;
    }, [history, from, codes, live]);

    const target = picked && others.includes(picked) ? picked : others[0];
    const points = seriesByCode.get(target) ?? [];
    const hovered = hover !== null ? points[hover] : undefined;
    const latest = points[points.length - 1];
    const shown = hovered ?? latest;
    const values = points.map((p) => p.value);
    const label = `1 ${from} in ${target}, ${HISTORY_RANGES[range].label}`;

    const selectRange = (next: HistoryRange) => {
        setHover(null);
        setRange(next);
    };

    return (
        <section className="mt-14" aria-labelledby="rate-history-heading">
            {/* One control row above everything it scopes: range first, then the pair. */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 id="rate-history-heading" className="text-lg font-semibold tracking-tight">
                    Rate history
                </h2>
                <div
                    role="radiogroup"
                    aria-label="Time range"
                    className="inline-flex rounded-full border border-white/10 p-0.5 text-xs"
                >
                    {(Object.keys(HISTORY_RANGES) as HistoryRange[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={key === range}
                            onClick={() => selectRange(key)}
                            className={cn(
                                'rounded-full px-3 py-1.5 font-medium transition-colors',
                                key === range
                                    ? 'bg-white text-black'
                                    : 'text-white/55 hover:text-white'
                            )}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4" aria-label={`Charted against ${from}`}>
                {others.map((code) => {
                    const series = seriesByCode.get(code) ?? [];
                    return (
                        <button
                            key={code}
                            type="button"
                            aria-pressed={code === target}
                            onClick={() => {
                                setHover(null);
                                setPicked(code);
                            }}
                            className={cn(
                                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                                code === target
                                    ? 'border-white/50 bg-white/10 text-white'
                                    : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                            )}
                        >
                            <span className="font-semibold tracking-wide">{code}</span>
                            <Delta value={percentChange(series[0], series[series.length - 1])} />
                        </button>
                    );
                })}
            </div>

            <div
                className={cn(
                    'rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-opacity',
                    status === 'loading' && history && 'opacity-50'
                )}
            >
                {status === 'error' ? (
                    <div className="flex h-[320px] flex-col items-center justify-center gap-3 text-sm text-white/55">
                        Couldn&apos;t load the rate history.
                        <button
                            type="button"
                            onClick={() => setAttempt((n) => n + 1)}
                            className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white hover:bg-white/10 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                ) : !history ? (
                    <div className="flex h-[320px] items-center justify-center text-sm text-white/40">
                        Loading rate history…
                    </div>
                ) : points.length < 2 ? (
                    <div className="flex h-[320px] items-center justify-center text-center text-sm text-white/45">
                        No history available for {from} to {target}.
                    </div>
                ) : (
                    <>
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                            <div aria-live="polite">
                                <p className="mb-1 text-xs text-white/45">
                                    {hovered ? pointDate(hovered.date) : `1 ${from} in ${target}`}
                                </p>
                                <p className="text-3xl font-semibold tracking-tight">
                                    {formatValue(shown.value)}{' '}
                                    <span className="text-base font-normal text-white/45">
                                        {target}
                                    </span>
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/45">
                                    <Delta value={percentChange(points[0], shown)} />
                                    <span>
                                        {hovered
                                            ? `since ${formatDate(points[0].date, {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: 'numeric',
                                              })}`
                                            : HISTORY_RANGES[range].label}
                                    </span>
                                </p>
                            </div>
                            <dl className="flex gap-5 text-xs">
                                <div>
                                    <dt className="text-white/40">Low</dt>
                                    <dd className="tabular-nums text-white/80">
                                        {formatValue(Math.min(...values))}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-white/40">High</dt>
                                    <dd className="tabular-nums text-white/80">
                                        {formatValue(Math.max(...values))}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <LineChart
                            points={points}
                            range={range}
                            label={label}
                            hover={hover}
                            onHover={setHover}
                        />
                    </>
                )}
            </div>

            {points.length >= 2 && (
                <DataTable points={points} from={from} target={target} label={label} />
            )}
        </section>
    );
};

export default RateHistoryPanel;
