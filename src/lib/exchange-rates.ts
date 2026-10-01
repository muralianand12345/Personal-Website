export type ExchangeRates = {
    /** Units of each currency per 1 USD, keyed by ISO 4217 code. */
    rates: Record<string, number>;
    updatedAt: string;
    source: { name: string; url: string };
};

export type Currency = { code: string; name: string; symbol: string; digits: number };

// Upstream publishes once a day; an hour keeps us current without hammering it.
const REVALIDATE_SECONDS = 60 * 60;

const getJson = async (url: string) => {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return res.json();
};

// The fallback feed also carries crypto and tokens; keep real ISO currencies only.
const ISO_CODES = new Set(Intl.supportedValuesOf('currency'));

const cleanRates = (all: Record<string, unknown>) => {
    const rates: Record<string, number> = {};
    for (const [key, value] of Object.entries(all ?? {})) {
        const code = key.toUpperCase();
        const rate = Number(value);
        if (ISO_CODES.has(code) && Number.isFinite(rate) && rate > 0) rates[code] = rate;
    }
    if (!rates.USD) throw new Error('Rates feed is missing USD');
    return rates;
};

const PROVIDERS: Array<() => Promise<ExchangeRates>> = [
    async () => {
        const data = await getJson('https://open.er-api.com/v6/latest/USD');
        if (data?.result !== 'success') throw new Error('ExchangeRate-API returned an error');
        return {
            rates: cleanRates(data.rates),
            updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
            source: { name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' },
        };
    },
    async () => {
        const data = await getJson(
            'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
        );
        return {
            rates: cleanRates(data.usd),
            updatedAt: new Date(data.date).toISOString(),
            source: { name: 'Currency API', url: 'https://github.com/fawazahmed0/exchange-api' },
        };
    },
];

/** Latest USD-based rates, falling back across providers; null if all of them fail. */
export const fetchRates = async (): Promise<ExchangeRates | null> => {
    for (const provider of PROVIDERS) {
        try {
            return await provider();
        } catch (err) {
            console.error('Exchange rate provider failed:', err);
        }
    }
    return null;
};

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

const symbolFor = (code: string, currencyDisplay: 'symbol' | 'narrowSymbol') =>
    new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value;

/**
 * Name, symbol and decimal places for every code in the feed, sorted by code.
 * Built on the server so the client renders exactly what was server-rendered.
 */
export const describeCurrencies = (codes: string[]): Currency[] =>
    [...codes].sort().map((code) => {
        // Prefer the unambiguous symbol (NZ$ over $), then the narrow one (R for ZAR).
        const symbol = [symbolFor(code, 'symbol'), symbolFor(code, 'narrowSymbol')].find(
            (s) => s && s !== code
        );
        return {
            code,
            name: currencyNames.of(code) ?? code,
            symbol: symbol ?? '',
            digits:
                new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
                    .maximumFractionDigits ?? 2,
        };
    });
