import type { Metadata } from 'next';

import Header from '@/components/header';
import Footer from '@/components/footer';
import CurrencyConverter from '@/components/currency-converter';
import { describeCurrencies, fetchRates } from '@/lib/exchange-rates';

/**
 * Rendered per request so a provider outage never gets baked into a cached
 * page; the upstream fetch itself is cached for an hour in fetchRates.
 */
export const dynamic = 'force-dynamic';

// A personal utility: reachable by URL, but kept out of nav, sitemap and search.
export const metadata: Metadata = {
    title: 'Currency Converter',
    description: 'Convert between up to ten currencies at the latest exchange rates.',
    alternates: { canonical: '/conversion' },
    robots: { index: false, follow: false },
};

const ConversionPage = async () => {
    const rates = await fetchRates();

    return (
        <>
            <Header />
            <main className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 bg-black">
                <div className="max-w-xl mx-auto py-16 sm:py-20">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                        Currency converter
                    </h1>
                    <p className="text-white/55 mb-10">
                        Pick 2 to 10 currencies, type an amount in any of them, and the rest follow.
                    </p>

                    {rates ? (
                        <CurrencyConverter
                            rates={rates}
                            currencies={describeCurrencies(Object.keys(rates.rates))}
                        />
                    ) : (
                        <div className="rounded-2xl border border-white/10 px-6 py-10 text-center">
                            <p className="text-white/70 mb-2">
                                Exchange rates are unavailable right now.
                            </p>
                            <p className="text-sm text-white/40">
                                Both rate providers failed to respond. Try again in a minute.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
};

export default ConversionPage;
