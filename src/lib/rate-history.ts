/**
 * Chart ranges for /conversion. Every point is a real published daily rate;
 * nothing is averaged, so the chart reads the same numbers the converter uses.
 */
export const HISTORY_RANGES = {
    '1M': { label: 'past month', months: 1 },
    '3M': { label: 'past 3 months', months: 3 },
    '1Y': { label: 'past year', months: 12 },
    '5Y': { label: 'past 5 years', months: 60 },
} as const satisfies Record<string, { label: string; months: number }>;

export type HistoryRange = keyof typeof HISTORY_RANGES;

export type RateHistory = {
    dates: string[];
    /**
     * Units per 1 USD at each date, keyed by code; null where a day is missing.
     * A requested code without upstream history is absent.
     */
    rates: Record<string, Array<number | null>>;
};

type Row = { date: string; quote: string; rate: number };

const FRANKFURTER = 'https://api.frankfurter.dev/v2';

// One unknown code fails an upstream request, so filter against its list first.
const fetchSupportedCodes = async () => {
    const res = await fetch(`${FRANKFURTER}/currencies`, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) throw new Error(`Frankfurter currencies responded ${res.status}`);
    const list: Array<{ iso_code: string }> = await res.json();
    return new Set(list.map((c) => c.iso_code));
};

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Long daily ranges are slow upstream (5Y takes several seconds), so each code is
 * its own request, cached on its own: adding a currency only fetches that one.
 * The start is pinned to the 1st of the month so the URL, and its cache, stay the
 * same all month; rows before the real start are trimmed afterwards.
 */
const fetchCode = async (code: string, from: string): Promise<Row[]> => {
    const url = `${FRANKFURTER}/rates?from=${from}&base=USD&quotes=${code}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!res.ok) throw new Error(`Frankfurter rates for ${code} responded ${res.status}`);
    return res.json();
};

/** USD-based daily history for `codes` over `range`, or null if the provider is unavailable. */
export const fetchHistory = async (
    range: HistoryRange,
    codes: string[]
): Promise<RateHistory | null> => {
    try {
        const { months } = HISTORY_RANGES[range];
        const supported = await fetchSupportedCodes();
        const quotes = codes.filter((code) => code !== 'USD' && supported.has(code));
        // A pair needs two charted codes, and USD alone is only the base.
        if (quotes.length === 0) return { dates: [], rates: {} };

        const now = new Date();
        const start = isoDay(
            new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()))
        );
        const pinned = isoDay(
            new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1))
        );

        const results = await Promise.allSettled(quotes.map((code) => fetchCode(code, pinned)));
        const rows = results.flatMap((result, i) => {
            if (result.status === 'fulfilled') return result.value;
            console.error(`Rate history for ${quotes[i]} failed:`, result.reason);
            return [];
        });
        if (results.every((result) => result.status === 'rejected')) return null;

        const inRange = rows.filter((row) => row.date >= start);
        const dates = [...new Set(inRange.map((row) => row.date))].sort();
        const position = new Map(dates.map((date, i) => [date, i]));

        const rates: RateHistory['rates'] = {};
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') rates[quotes[i]] = dates.map(() => null);
        });
        for (const row of inRange) {
            if (rates[row.quote] && Number.isFinite(row.rate) && row.rate > 0) {
                rates[row.quote][position.get(row.date)!] = row.rate;
            }
        }
        if (codes.includes('USD')) rates.USD = dates.map(() => 1);

        return { dates, rates };
    } catch (err) {
        console.error('Rate history provider failed:', err);
        return null;
    }
};
