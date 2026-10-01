import { NextResponse } from 'next/server';

import { fetchHistory, HISTORY_RANGES, type HistoryRange } from '@/lib/rate-history';

const MAX_CODES = 10;

/** GET /api/rates/history?range=1Y&codes=INR,VND,NZD,USD */
export const GET = async (request: Request) => {
    const params = new URL(request.url).searchParams;

    const range = params.get('range') ?? '1Y';
    if (!(range in HISTORY_RANGES)) {
        return NextResponse.json({ error: 'Unknown range' }, { status: 400 });
    }

    const codes = [
        ...new Set(
            (params.get('codes') ?? '')
                .toUpperCase()
                .split(',')
                .filter((code) => /^[A-Z]{3}$/.test(code))
        ),
    ];
    if (codes.length === 0 || codes.length > MAX_CODES) {
        return NextResponse.json({ error: `Pass 1-${MAX_CODES} currency codes` }, { status: 400 });
    }

    const history = await fetchHistory(range as HistoryRange, codes);
    if (!history) {
        return NextResponse.json({ error: 'Rate history unavailable' }, { status: 502 });
    }

    return NextResponse.json(history, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
};
