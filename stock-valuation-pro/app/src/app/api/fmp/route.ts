import { NextRequest, NextResponse } from 'next/server';
import { calculateWACC } from '@/lib/valuation';
import type {
    FMPIncomeStatement,
    FMPBalanceSheet,
    FMPCashFlowStatement,
    FMPAnalystEstimates
} from '@/types/fmp';

const FMP_API_KEY = 'DewCGgUaYY2y5c9Fsb3sqM9MX9cT72u4';
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

/**
 * FMP API Integration
 * Fetches comprehensive company data:
 * - Profile & Real-time Prices
 * - 5 Years of Financial Statements (Income, Balance, Cash Flow)
 * - Analyst Estimates
 * - Key Metrics & Ratios
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
        // Fetch massive dataset in parallel
        const [
            profileRes,
            dcfRes,
            incomeRes,
            balanceRes,
            cashflowRes,
            estimatesRes,
            metricsRes,
            ratiosRes
        ] = await Promise.all([
            fetch(`${FMP_BASE_URL}/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/discounted-cash-flow?symbol=${ticker}&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/income-statement?symbol=${ticker}&period=annual&limit=5&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/balance-sheet-statement?symbol=${ticker}&period=annual&limit=5&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/cash-flow-statement?symbol=${ticker}&period=annual&limit=5&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/analyst-estimates?symbol=${ticker}&period=annual&limit=30&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/key-metrics-ttm?symbol=${ticker}&apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/ratios-ttm?symbol=${ticker}&apikey=${FMP_API_KEY}`),
        ]);

        const [
            profileData,
            dcfData,
            incomeData,
            balanceData,
            cashflowData,
            estimatesData,
            metricsData,
            ratiosData
        ] = await Promise.all([
            profileRes.json(),
            dcfRes.json(),
            incomeRes.json(),
            balanceRes.json(),
            cashflowRes.json(),
            estimatesRes.json(),
            metricsRes.json(),
            ratiosRes.json(),
        ]);

        // Helper to extract array data safely
        const getFirst = (data: any) => Array.isArray(data) ? data[0] : (data?.length ? data[0] : null);
        const getArray = (data: any) => Array.isArray(data) ? data : [];

        // Extract key objects
        const profile = getFirst(profileData) || profileData; // Handle FMP's inconsistent response formats

        if (!profile || !profile.price) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }

        const incomeStatements: FMPIncomeStatement[] = getArray(incomeData);
        const balanceSheets: FMPBalanceSheet[] = getArray(balanceData);
        const cashFlowStatements: FMPCashFlowStatement[] = getArray(cashflowData);
        const estimates: FMPAnalystEstimates[] = getArray(estimatesData);
        const dcf = getFirst(dcfData);
        const metrics = getFirst(metricsData);
        const ratios = getFirst(ratiosData);

        // === SNAPSHOT DATA ===
        const beta = profile.beta || 1.0;
        const sector = profile.sector || 'Unknown';
        const marketCap = profile.marketCap || 0;
        const sharesOutstanding = incomeStatements[0]?.weightedAverageShsOutDil || (marketCap / profile.price);

        // === DERIVED CALCULATION LOGIC ===

        // 1. Calculate Historical Revenue CAGR (3yr and 5yr)
        let revenueCagr3Y = 0;
        let revenueCagr5Y = 0;

        if (incomeStatements.length >= 4) {
            const currentRev = incomeStatements[0].revenue;
            const rev3Y = incomeStatements[3].revenue;
            if (rev3Y > 0 && currentRev > 0) {
                revenueCagr3Y = (Math.pow(currentRev / rev3Y, 1 / 3) - 1) * 100;
            }
        }

        if (incomeStatements.length >= 5) {
            const currentRev = incomeStatements[0].revenue;
            const rev5Y = incomeStatements[4].revenue;
            if (rev5Y > 0 && currentRev > 0) {
                revenueCagr5Y = (Math.pow(currentRev / rev5Y, 1 / 5) - 1) * 100;
            }
        }

        // 2. Analyst Consensus Growth
        // Look for next 2 years of estimates
        let analystGrowthNextYear = 0;
        const currentYear = new Date().getFullYear();
        const nextYearEst = estimates.find(e => new Date(e.date).getFullYear() === currentYear + 1);
        const thisYearEst = estimates.find(e => new Date(e.date).getFullYear() === currentYear);

        if (nextYearEst && thisYearEst && thisYearEst.estimatedRevenueAvg > 0) {
            analystGrowthNextYear = ((nextYearEst.estimatedRevenueAvg - thisYearEst.estimatedRevenueAvg) / thisYearEst.estimatedRevenueAvg) * 100;
        }

        // 3. Smart Growth Selection
        // Prefer Analyst estimates for short term, but sanity check with historicals
        let suggestedGrowth = analystGrowthNextYear || revenueCagr3Y || 5;
        let growthSource = 'Analyst Consensus';

        if (!analystGrowthNextYear) {
            suggestedGrowth = revenueCagr3Y;
            growthSource = '3-Year Historical CAGR';
        }

        // Cap anomalous growth for the model
        if (suggestedGrowth > 25) {
            suggestedGrowth = 25;
            growthSource += ' (Capped)';
        }
        if (suggestedGrowth < 0) suggestedGrowth = 0; // Floor at 0 for basic DCF

        // 4. WACC Calculation
        const calculatedWacc = calculateWACC(beta, sector);

        // 5. FCF Derivation
        const ttmFCF = metrics?.freeCashFlowTTM || (cashFlowStatements[0]?.freeCashFlow) || 0;
        const fcfPerShare = sharesOutstanding > 0 ? ttmFCF / sharesOutstanding : 0.01;

        // === RESPONSE CONSTRUCTION ===
        return NextResponse.json({
            ticker: ticker,
            price: profile.price,
            currency: profile.currency,
            companyName: profile.companyName,
            sector: sector,
            description: profile.description,
            isEtf: profile.isEtf,
            isFund: profile.isFund,

            // Raw Financials (for advanced UI)
            financials: {
                income: incomeStatements,
                balance: balanceSheets,
                cashflow: cashFlowStatements,
                estimates: estimates.slice(0, 5), // Next 5 years
            },

            // Model Inputs
            fcfPerShare: fcfPerShare,
            sharesOutstanding: sharesOutstanding,
            marketCap: marketCap,
            netDebt: (balanceSheets[0]?.netDebt) || 0,

            // Smart Suggestions (Robust)
            suggestions: {
                revenueGrowth: {
                    value: Math.round(suggestedGrowth * 10) / 10,
                    source: growthSource,
                    raw: {
                        cagr3y: revenueCagr3Y.toFixed(1),
                        cagr5y: revenueCagr5Y.toFixed(1),
                        analystNextYear: analystGrowthNextYear.toFixed(1)
                    }
                },
                terminalGrowth: {
                    value: 2.5,
                    source: 'Long-term GDP',
                },
                wacc: {
                    value: calculatedWacc,
                    source: `CAPM (Beta: ${beta.toFixed(2)})`,
                },
                // Legacy fields for compatibility (safely zeroed or defaulted)
                marginExpansion: { value: 1.0, source: 'N/A' },
                exitMultiple: { value: 0, source: 'N/A' },
                ebitdaMargin: { value: 0, source: 'N/A' },
                fcfConversionRate: { value: 0, source: 'N/A' }
            },

            // Display Metrics
            metrics: {
                peRatio: ratios?.peRatioTTM || 0,
                fcfYield: metrics?.freeCashFlowYieldTTM ? metrics.freeCashFlowYieldTTM * 100 : 0,
                revenueGrowth3Y: revenueCagr3Y,
            }
        });

    } catch (error: unknown) {
        console.error('FMP API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
