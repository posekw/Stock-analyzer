import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

import { auth } from "@/auth";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // Use search API with newsCount to fetch news
        const searchResult = await yahooFinance.search(ticker, {
            newsCount: 10,
            quotesCount: 0,
        });

        const news = searchResult.news?.map((item) => ({
            uuid: item.uuid,
            title: item.title,
            link: item.link,
            publisher: item.publisher,
            publishTime: item.providerPublishTime,
            thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
            relatedTickers: item.relatedTickers || [],
        })) || [];

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            news,
            count: news.length,
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Yahoo Finance News Error:', error);
        return NextResponse.json({ error: 'Failed to fetch news', details: errorMessage }, { status: 500 });
    }
}
