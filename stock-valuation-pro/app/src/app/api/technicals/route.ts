import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Timeframe configurations
const TIMEFRAME_CONFIG: Record<string, { months: number; interval: '1d' | '1wk' | '1mo' }> = {
    '1M': { months: 1, interval: '1d' },
    '6M': { months: 6, interval: '1d' },
    '1Y': { months: 12, interval: '1d' },
    '3Y': { months: 36, interval: '1wk' },
    '5Y': { months: 60, interval: '1wk' },
    '10Y': { months: 120, interval: '1mo' },
};

/**
 * Calculate support and resistance levels from price data
 * Uses pivot points and volume-weighted price levels
 */
function calculateSupportResistance(quotes: any[]): {
    support: number[];
    resistance: number[];
    pivotPoint: number;
    s1: number;
    s2: number;
    s3: number;
    r1: number;
    r2: number;
    r3: number;
} {
    if (!quotes || quotes.length === 0) {
        return { support: [], resistance: [], pivotPoint: 0, s1: 0, s2: 0, s3: 0, r1: 0, r2: 0, r3: 0 };
    }

    // Get recent data for pivot calculation (last 20 candles)
    const recentQuotes = quotes.slice(-20);

    // Find swing highs and lows
    const highs = quotes.map(q => q.high).filter((h): h is number => h !== null);
    const lows = quotes.map(q => q.low).filter((l): l is number => l !== null);
    const closes = quotes.map(q => q.close).filter((c): c is number => c !== null);

    if (highs.length === 0 || lows.length === 0 || closes.length === 0) {
        return { support: [], resistance: [], pivotPoint: 0, s1: 0, s2: 0, s3: 0, r1: 0, r2: 0, r3: 0 };
    }

    // Calculate classic pivot points using recent data
    const lastQuote = recentQuotes[recentQuotes.length - 1];
    const high = Math.max(...recentQuotes.map(q => q.high).filter((h): h is number => h !== null));
    const low = Math.min(...recentQuotes.map(q => q.low).filter((l): l is number => l !== null));
    const close = lastQuote?.close || closes[closes.length - 1];

    // Pivot Point (PP) = (High + Low + Close) / 3
    const pivotPoint = (high + low + close) / 3;

    // Support and Resistance levels
    const r1 = (2 * pivotPoint) - low;
    const s1 = (2 * pivotPoint) - high;
    const r2 = pivotPoint + (high - low);
    const s2 = pivotPoint - (high - low);
    const r3 = high + 2 * (pivotPoint - low);
    const s3 = low - 2 * (high - pivotPoint);

    // Find price clusters (zones where price frequently trades)
    const priceZones = findPriceZones(quotes);

    // Filter resistance zones (above current price)
    const currentPrice = close;
    const resistanceLevels = priceZones
        .filter(zone => zone > currentPrice)
        .sort((a, b) => a - b)
        .slice(0, 3);

    // Filter support zones (below current price)
    const supportLevels = priceZones
        .filter(zone => zone < currentPrice)
        .sort((a, b) => b - a)
        .slice(0, 3);

    return {
        support: supportLevels,
        resistance: resistanceLevels,
        pivotPoint: Math.round(pivotPoint * 100) / 100,
        s1: Math.round(s1 * 100) / 100,
        s2: Math.round(s2 * 100) / 100,
        s3: Math.round(s3 * 100) / 100,
        r1: Math.round(r1 * 100) / 100,
        r2: Math.round(r2 * 100) / 100,
        r3: Math.round(r3 * 100) / 100,
    };
}

/**
 * Find price zones where price frequently reverses
 * Uses a histogram approach to identify key price levels
 */
function findPriceZones(quotes: any[]): number[] {
    const allPrices: number[] = [];

    quotes.forEach(q => {
        if (q.high) allPrices.push(q.high);
        if (q.low) allPrices.push(q.low);
        if (q.close) allPrices.push(q.close);
    });

    if (allPrices.length === 0) return [];

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const range = maxPrice - minPrice;

    // Create buckets (1% of range each)
    const bucketSize = range / 100;
    const buckets: Map<number, number> = new Map();

    allPrices.forEach(price => {
        const bucketIndex = Math.floor((price - minPrice) / bucketSize);
        buckets.set(bucketIndex, (buckets.get(bucketIndex) || 0) + 1);
    });

    // Find the most frequent price zones
    const sortedBuckets = Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Convert bucket indices back to prices
    return sortedBuckets.map(([index]) =>
        Math.round((minPrice + (index * bucketSize) + bucketSize / 2) * 100) / 100
    );
}

/**
 * Calculate moving averages
 */
function calculateMovingAverages(quotes: any[]): {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
} {
    const closes = quotes.map(q => q.close).filter((c): c is number => c !== null);

    const sma = (data: number[], period: number): number | null => {
        if (data.length < period) return null;
        const slice = data.slice(-period);
        return Math.round((slice.reduce((a, b) => a + b, 0) / period) * 100) / 100;
    };

    const ema = (data: number[], period: number): number | null => {
        if (data.length < period) return null;
        const k = 2 / (period + 1);
        let emaValue = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < data.length; i++) {
            emaValue = data[i] * k + emaValue * (1 - k);
        }
        return Math.round(emaValue * 100) / 100;
    };

    return {
        sma20: sma(closes, 20),
        sma50: sma(closes, 50),
        sma200: sma(closes, 200),
        ema12: ema(closes, 12),
        ema26: ema(closes, 26),
    };
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(quotes: any[], period: number = 14): number | null {
    const closes = quotes.map(q => q.close).filter((c): c is number => c !== null);
    if (closes.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}

import { auth } from "@/auth";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const timeframe = searchParams.get('timeframe') || '1Y';  // Default to 1 year

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['1Y'];

    try {
        // Fetch insights for technical analysis data
        const insights = await yahooFinance.insights(ticker);

        // Fetch chart data based on timeframe
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - config.months);

        const chartData = await yahooFinance.chart(ticker, {
            period1: startDate,
            period2: endDate,
            interval: config.interval,
        });

        // Extract key data
        const instrumentInfo = insights.instrumentInfo;
        const keyTechnicals = instrumentInfo?.keyTechnicals || {};
        const technicalEvents = instrumentInfo?.technicalEvents || {};
        const valuation = instrumentInfo?.valuation || {};

        // Format chart quotes
        const quotes = chartData.quotes?.map((quote) => ({
            date: quote.date,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume,
        })) || [];

        // Calculate support/resistance from historical data
        const levels = calculateSupportResistance(quotes);

        // Calculate moving averages
        const movingAverages = calculateMovingAverages(quotes);

        // Calculate RSI
        const rsi = calculateRSI(quotes);

        // Get current price
        const currentPrice = quotes[quotes.length - 1]?.close || 0;

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            currentPrice,
            timeframe,

            // Key Technical Levels
            keyTechnicals: {
                support: keyTechnicals.support || levels.s1,
                resistance: keyTechnicals.resistance || levels.r1,
                stopLoss: keyTechnicals.stopLoss,
                // Calculated levels
                calculatedSupport: levels.support,
                calculatedResistance: levels.resistance,
                pivotPoints: {
                    pp: levels.pivotPoint,
                    r1: levels.r1,
                    r2: levels.r2,
                    r3: levels.r3,
                    s1: levels.s1,
                    s2: levels.s2,
                    s3: levels.s3,
                },
            },

            // Moving Averages
            movingAverages,

            // Indicators
            indicators: {
                rsi,
                rsiSignal: rsi ? (rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL') : null,
            },

            // Technical Events (from Yahoo)
            technicalEvents: {
                provider: technicalEvents.provider,
                sector: technicalEvents.sector,
                shortTermOutlook: technicalEvents.shortTermOutlook,
                intermediateTermOutlook: technicalEvents.intermediateTermOutlook,
                longTermOutlook: technicalEvents.longTermOutlook,
            },

            // Valuation
            valuation: {
                description: valuation.description,
                discount: valuation.discount,
                relativeValue: valuation.relativeValue,
            },

            // Chart Data
            chart: {
                quotes,
                currency: chartData.meta?.currency,
                symbol: chartData.meta?.symbol,
                dataPoints: quotes.length,
            },
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Yahoo Finance Technicals Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch technical data',
            details: errorMessage
        }, { status: 500 });
    }
}
