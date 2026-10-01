'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Currency, ExchangeRates } from '@/lib/exchange-rates';

const MIN_ROWS = 2;
const MAX_ROWS = 10;
// Only the first-visit starting set; after that the viewer's own picks are remembered.
const DEFAULT_CODES = ['INR', 'VND', 'NZD', 'USD'];
const STORAGE_KEY = 'conversion:currencies';

/** Keep digits and a single decimal point; grouping commas from a formatted value drop out. */
const sanitize = (raw: string) => {
    const [whole, ...fraction] = raw.replace(/[^\d.]/g, '').split('.');
    return fraction.length ? `${whole}.${fraction.join('')}` : whole;
};

const formatAmount = (value: number, digits: number) => {
    // Sub-unit amounts (1 INR in USD) would round to 0.01, so show significant digits instead.
    const options =
        value > 0 && value < 1
            ? { maximumSignificantDigits: 3 }
            : { maximumFractionDigits: digits };
    return new Intl.NumberFormat('en-US', options).format(value);
};

const formatRate = (value: number) =>
    new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 }).format(value);

const formatUpdated = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    });

const optionLabel = ({ code, name }: Currency) => (name === code ? code : `${code} — ${name}`);

const selectClass =
    'appearance-none bg-transparent cursor-pointer outline-none [color-scheme:dark] focus-visible:underline underline-offset-4';

type Props = { rates: ExchangeRates; currencies: Currency[] };

const CurrencyConverter = ({ rates: { rates, updatedAt, source }, currencies }: Props) => {
    const byCode = new Map(currencies.map((c) => [c.code, c]));

    const [codes, setCodes] = useState(() => {
        const available = DEFAULT_CODES.filter((code) => byCode.has(code));
        const extras = currencies.map((c) => c.code).filter((code) => !available.includes(code));
        return [...available, ...extras].slice(0, Math.max(MIN_ROWS, available.length));
    });
    // Only the row being typed in holds raw text; every other row is derived from it.
    const [from, setFrom] = useState(codes[0]);
    const [amount, setAmount] = useState('1000');

    // Restore the viewer's last set of currencies (after hydration, so SSR stays deterministic).
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
            const valid =
                Array.isArray(stored) &&
                stored.length >= MIN_ROWS &&
                stored.length <= MAX_ROWS &&
                new Set(stored).size === stored.length &&
                stored.every((code) => byCode.has(code));
            if (valid) {
                setCodes(stored);
                setFrom(stored[0]);
            }
        } catch {}
    }, []);

    const saveCodes = (next: string[]) => {
        setCodes(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
    };

    const parsed = amount === '' || amount === '.' ? null : Number(amount);
    const convert = (value: number, to: string) => (value / rates[from]) * rates[to];

    const changeCurrency = (oldCode: string, newCode: string) => {
        saveCodes(codes.map((code) => (code === oldCode ? newCode : code)));
        // The typed amount stays put and is reread in the new currency.
        if (oldCode === from) setFrom(newCode);
    };

    const removeCurrency = (code: string) => {
        const next = codes.filter((c) => c !== code);
        if (code === from) {
            // Hand the typed amount to another row so the remaining values don't change.
            const heir = next[0];
            setAmount(
                parsed === null
                    ? ''
                    : sanitize(formatAmount(convert(parsed, heir), byCode.get(heir)!.digits))
            );
            setFrom(heir);
        }
        saveCodes(next);
    };

    const unused = currencies.filter((c) => !codes.includes(c.code));

    return (
        <div>
            <div className="space-y-3">
                {codes.map((code) => {
                    const currency = byCode.get(code)!;
                    const isSource = code === from;
                    const value = isSource
                        ? amount
                        : parsed === null
                        ? ''
                        : formatAmount(convert(parsed, code), currency.digits);

                    return (
                        <div
                            key={code}
                            className={cn(
                                'rounded-2xl border px-5 py-4 transition-colors',
                                'focus-within:border-white/50 hover:border-white/25',
                                isSource
                                    ? 'border-white/30 bg-white/[0.06]'
                                    : 'border-white/10 bg-white/[0.02]'
                            )}
                        >
                            <div className="flex items-center gap-3 text-xs">
                                <div className="relative min-w-0">
                                    <select
                                        aria-label="Currency"
                                        value={code}
                                        onChange={(e) => changeCurrency(code, e.target.value)}
                                        className={cn(
                                            selectClass,
                                            'max-w-full truncate pr-5 field-sizing-content font-semibold tracking-wide text-white/80 hover:text-white'
                                        )}
                                    >
                                        {currencies.map((c) => (
                                            <option
                                                key={c.code}
                                                value={c.code}
                                                disabled={c.code !== code && codes.includes(c.code)}
                                            >
                                                {optionLabel(c)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
                                </div>

                                <span className="ml-auto shrink-0 tabular-nums text-white/35">
                                    {!isSource &&
                                        `1 ${from} = ${formatRate(convert(1, code))} ${code}`}
                                </span>

                                {codes.length > MIN_ROWS && (
                                    <button
                                        type="button"
                                        onClick={() => removeCurrency(code)}
                                        aria-label={`Remove ${currency.name}`}
                                        className="shrink-0 -m-1 p-1 rounded-full text-white/35 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <label className="mt-2 flex items-baseline gap-3 cursor-text">
                                <span className="min-w-10 shrink-0 text-xl text-white/35">
                                    {currency.symbol}
                                </span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    spellCheck={false}
                                    placeholder="0"
                                    aria-label={`Amount in ${currency.name}`}
                                    value={value}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => {
                                        setFrom(code);
                                        setAmount(sanitize(e.target.value));
                                    }}
                                    className="w-full min-w-0 bg-transparent text-3xl font-semibold tabular-nums tracking-tight outline-none placeholder:text-white/20"
                                />
                            </label>
                        </div>
                    );
                })}
            </div>

            {codes.length < MAX_ROWS ? (
                <div className="relative mt-3 text-sm text-white/50 hover:text-white/80 transition-colors">
                    <Plus className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 size-4" />
                    <select
                        aria-label="Add a currency"
                        value=""
                        onChange={(e) => e.target.value && saveCodes([...codes, e.target.value])}
                        className={cn(
                            selectClass,
                            'w-full rounded-2xl border border-dashed border-white/15 hover:border-white/30 focus-visible:border-white/50 py-4 pl-12 pr-20'
                        )}
                    >
                        <option value="" disabled>
                            Add currency
                        </option>
                        {unused.map((c) => (
                            <option key={c.code} value={c.code}>
                                {optionLabel(c)}
                            </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-white/35">
                        {codes.length} / {MAX_ROWS}
                    </span>
                </div>
            ) : (
                <p className="mt-3 text-center text-xs text-white/35">
                    {MAX_ROWS} currencies is the limit. Remove one to add another.
                </p>
            )}

            <p className="mt-8 text-xs text-white/40">
                Rates by{' '}
                <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-white transition-colors"
                >
                    {source.name}
                </a>
                , last updated {formatUpdated(updatedAt)}. Mid-market reference rates, not a quote.
            </p>
        </div>
    );
};

export default CurrencyConverter;
