import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
    CompanyMetrics,
    calculateRelativeValuation,
    getSectorAverages
} from '@/lib/relative-valuation';

const yahooFinance = new YahooFinance();

/**
 * Relative Valuation API (Yahoo Finance Version)
 * 
 * Calculates fair value by comparing stock ratios to sector averages.
 * Uses Yahoo Finance data which is more reliable than FMP free tier.
 */
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.toUpperCase();

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // Fetch data from Yahoo Finance
        const quote = await yahooFinance.quote(ticker);
        const queryOptions = {
            modules: [
                'financialData',
                'defaultKeyStatistics',
                'summaryProfile',
                'balanceSheetHistory',
                'incomeStatementHistory',
            ]
        };
        const summary = await yahooFinance.quoteSummary(ticker, queryOptions as any);

        if (!quote || !summary) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }

        const financialData = summary.financialData;
        const keyStats = summary.defaultKeyStatistics;
        const profile = summary.summaryProfile;
        const balanceSheet = (summary as any).balanceSheetHistory?.balanceSheetStatements?.[0];
        const incomeStatement = (summary as any).incomeStatementHistory?.balanceSheetStatements?.[0];

        // Basic Info
        const price = quote.regularMarketPrice || 0;
        const marketCap = keyStats?.enterpriseValue ? (keyStats.enterpriseValue / 1e6) : (quote.marketCap ? quote.marketCap / 1e6 : 0); // fallback
        // Note: keyStats.enterpriseValue is actually EV, not Market Cap. 
        // Correct Market Cap is quote.marketCap.
        const actualMarketCap = quote.marketCap ? quote.marketCap / 1e6 : 0;

        const sharesOutstanding = keyStats?.sharesOutstanding ? keyStats.sharesOutstanding / 1e6 : (actualMarketCap / price);

        // Financials (in millions)
        const revenue = financialData?.totalRevenue ? financialData.totalRevenue / 1e6 : 0;
        const ebitda = financialData?.ebitda ? financialData.ebitda / 1e6 : 0;
        const totalDebt = financialData?.totalDebt ? financialData.totalDebt / 1e6 : 0;
        const cash = financialData?.totalCash ? financialData.totalCash / 1e6 : 0;
        const netDebt = totalDebt - cash;
        const enterpriseValue = keyStats?.enterpriseValue ? keyStats.enterpriseValue / 1e6 : (actualMarketCap + netDebt);

        // Per Share Metrics
        const eps = keyStats?.trailingEps || (quote.epsTrailingTwelveMonths) || 0;
        const epsForward = keyStats?.forwardEps || (quote.epsForward) || null;
        const bookValuePerShare = keyStats?.bookValue || 0;
        const revenuePerShare = financialData?.revenuePerShare || (revenue / sharesOutstanding);

        // FCF Calculation
        const fcf = financialData?.freeCashflow ? financialData.freeCashflow / 1e6 : 0;
        const fcfPerShare = sharesOutstanding > 0 ? fcf / sharesOutstanding : 0;

        // Build Company Metrics
        const companyMetrics: CompanyMetrics = {
            ticker: ticker,
            price: price,
            sector: profile?.sector || 'Unknown',
            industry: profile?.industry || 'Unknown',

            eps: eps,
            epsForward: epsForward,
            bookValuePerShare: bookValuePerShare,
            revenuePerShare: revenuePerShare,
            fcfPerShare: fcfPerShare,

            ebitda: ebitda,
            marketCap: actualMarketCap,
            enterpriseValue: enterpriseValue,
            revenue: revenue,
            sharesOutstanding: sharesOutstanding,
            netDebt: netDebt,

            // Ratios (Prioritize calculated ratios from Yahoo)
            peRatio: quote.trailingPE || (eps > 0 ? price / eps : null),
            forwardPE: quote.forwardPE || (epsForward && epsForward > 0 ? price / epsForward : null),
            pegRatio: keyStats?.pegRatio || null,
            evToEbitda: keyStats?.enterpriseToEbitda || (ebitda > 0 ? enterpriseValue / ebitda : null),
            evToRevenue: keyStats?.enterpriseToRevenue || (revenue > 0 ? enterpriseValue / revenue : null),
            priceToBook: keyStats?.priceToBook || (bookValuePerShare > 0 ? price / bookValuePerShare : null),
            priceToSales: keyStats?.priceToSalesTrailing12Months || (revenuePerShare > 0 ? price / revenuePerShare : null),

            // Growth
            revenueGrowth: financialData?.revenueGrowth ? financialData.revenueGrowth * 100 : 0,
            earningsGrowth: financialData?.earningsGrowth ? financialData.earningsGrowth * 100 : 0,
        };

        // Get sector averages
        const sectorAverages = getSectorAverages(companyMetrics.sector);

        // Calculate relative valuation
        const valuation = calculateRelativeValuation(companyMetrics, sectorAverages);

        return NextResponse.json({
            ticker: ticker,
            companyName: quote.longName || quote.shortName || ticker,
            price: price,
            sector: companyMetrics.sector,
            industry: companyMetrics.industry,
            beta: keyStats?.beta || null,

            metrics: companyMetrics,
            sectorAverages: sectorAverages,
            valuation: valuation,

            summary: {
                fairValue: valuation.averageFairValue,
                upside: valuation.overallUpside,
                verdict: valuation.verdict,
                sectorPremium: valuation.sectorPremium,
                methodsUsed: valuation.valuations.length,
            }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Relative Valuation API Error:', error);
        return NextResponse.json({
            error: 'Failed to calculate valuation',
            details: errorMessage
        }, { status: 500 });
    }
}
