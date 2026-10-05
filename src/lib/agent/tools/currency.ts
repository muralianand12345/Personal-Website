import { z } from 'zod';
import { tool } from 'langchain';

import { fetchRates } from '@/lib/exchange-rates';

const formatAmount = new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format;
const formatRate = new Intl.NumberFormat('en', { maximumSignificantDigits: 6 }).format;

/** Same rate feed as the converter on /conversion, so the two always agree. */
export const convertCurrency = tool(
    async ({ amount, from, to }) => {
        const data = await fetchRates();
        if (!data) return 'Exchange rates are unavailable right now.';

        const [source, target] = [from.toUpperCase(), to.toUpperCase()];
        const unknown = [source, target].filter((code) => !data.rates[code]);
        if (unknown.length) return `Unknown currency code: ${unknown.join(', ')}.`;

        // Rates are units per 1 USD, so go through USD.
        const rate = data.rates[target] / data.rates[source];
        const provider = data.source.name;
        return [
            `${formatAmount(amount)} ${source} = ${formatAmount(amount * rate)} ${target}.`,
            `Rate: 1 ${source} = ${formatRate(rate)} ${target} (${data.date}, ${provider}).`,
        ].join(' ');
    },
    {
        name: 'convert_currency',
        description: 'Convert an amount between currencies at the latest daily exchange rate.',
        schema: z.object({
            amount: z.number().describe('Amount in the source currency'),
            from: z.string().length(3).describe('ISO 4217 code, for example "NZD"'),
            to: z.string().length(3).describe('ISO 4217 code, for example "INR"'),
        }),
    }
);
