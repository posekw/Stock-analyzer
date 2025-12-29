import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
    calculateComprehensiveFairValue,
    calculateDCF,
    calculateGrahamNumber,
    calculateLynchValue,
    calculateEPV,
    calculateDDM,
    calculateReverseDCF,
    calculateWACC,
    DCFInputs
} from '@/lib/comprehensive-valuation';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Helper to map flat FundamentalsTimeSeries objects to our structure
function mapFinancials(timeSeriesData: any[]) {
    if (!timeSeriesData || !Array.isArray(timeSeriesData)) return {
        income: [], balance: [], cashflow: []
    };

    const sortedData = [...timeSeriesData].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    }).slice(0, 4);

    const formatDate = (dateInput: any) => {
        if (!dateInput) return '';
        try {
            return new Date(dateInput).toISOString().split('T')[0];
        } catch (e) {
            return String(dateInput);
        }
    };

    const income = sortedData.map(item => ({
        date: formatDate(item.date),
        revenue: item.totalRevenue || 0,
        costOfRevenue: item.costOfRevenue || 0,
        grossProfit: item.grossProfit || 0,
        operatingIncome: item.operatingIncome || 0,
        netIncome: item.netIncomeCommonStockholders || item.netIncome || 0,
        eps: item.basicEPS || item.dilutedEPS || 0
    }));

    const balance = sortedData.map(item => ({
        date: formatDate(item.date),
        cashAndCashEquivalents: item.cashAndCashEquivalents || 0,
        totalAssets: item.totalAssets || 0,
        totalLiabilities: item.totalLiabilitiesNetMinorityInterest || 0,
        totalDebt: item.totalDebt || 0,
        totalStockholdersEquity: item.commonStockEquity || 0
    }));

    const cashflow = sortedData.map(item => ({
        date: formatDate(item.date),
        operatingCashFlow: item.cashFlowFromContinuingOperatingActivities || 0,
        capitalExpenditure: item.capitalExpenditure || 0,
        freeCashFlow: item.freeCashFlow || (
            (item.cashFlowFromContinuingOperatingActivities || 0) + (item.capitalExpenditure || 0)
        )
    }));

    return { income, balance, cashflow };
}

/**
 * Calculate 5-year CAGR from historical revenue data
 */
function calculateCAGR(revenueHistory: number[]): number {
    if (revenueHistory.length < 2) return 0;

    const startValue = revenueHistory[revenueHistory.length - 1];
    const endValue = revenueHistory[0];
    const years = revenueHistory.length - 1;

    if (startValue <= 0 || endValue <= 0) return 0;

    const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    return Math.round(cagr * 10) / 10;
}

import { auth } from "@/auth";

export async function GET(request: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // 1. Fetch Quote Summary
        const quoteSummary = await yahooFinance.quoteSummary(ticker, {
            modules: ['price', 'summaryDetail', 'financialData', 'assetProfile', 'defaultKeyStatistics'] as any
        });

        // 2. Fetch Deep Fundamentals
        let fundamentals: any;
        try {
            fundamentals = await yahooFinance.fundamentalsTimeSeries(ticker, {
                period1: '2019-01-01',
                type: 'annual',
                module: 'all'
            });
        } catch (error: any) {
            if (error.result) {
                fundamentals = error.result;
            } else {
                fundamentals = [];
            }
        }

        const price = quoteSummary.price;
        const summary = quoteSummary.summaryDetail;
        const stats = quoteSummary.defaultKeyStatistics;
        const financialData = quoteSummary.financialData;
        const profile = quoteSummary.assetProfile;

        // Map Historical Data
        const robustFinancials = mapFinancials(fundamentals);

        // Extract key metrics
        const currentPrice = price?.regularMarketPrice || 0;
        const beta = summary?.beta || stats?.beta || 1.0;
        const sharesOutstanding = stats?.sharesOutstanding ||
            (summary?.marketCap && currentPrice ? summary.marketCap / currentPrice : 0);

        // Get TTM FCF
        const ttmFCF = financialData?.freeCashflow ||
            (robustFinancials.cashflow[0]?.freeCashFlow || 0);

        // Get historical revenue for CAGR
        const revenueHistory = robustFinancials.income.map(i => i.revenue).filter(r => r > 0);
        const revenueGrowth5Y = calculateCAGR(revenueHistory);

        // EPS and Book Value
        const eps = stats?.trailingEps || price?.epsTrailingTwelveMonths ||
            (robustFinancials.income[0]?.eps || 0);
        const bookValue = stats?.bookValue ||
            (robustFinancials.balance[0]?.totalStockholdersEquity / sharesOutstanding) || 0;

        // Dividend data
        const dividendPerShare = summary?.dividendRate || 0;
        const dividendYield = summary?.dividendYield ? summary.dividendYield * 100 : 0;

        // Net Income (most recent)
        const netIncome = robustFinancials.income[0]?.netIncome || 0;

        // Debt and Cash
        const totalDebt = financialData?.totalDebt || robustFinancials.balance[0]?.totalDebt || 0;
        const cash = financialData?.totalCash || robustFinancials.balance[0]?.cashAndCashEquivalents || 0;

        // ROE for Financials
        const roe = financialData?.returnOnEquity ? financialData.returnOnEquity * 100 : 0;

        // Build DCF Inputs
        const dcfInputs: DCFInputs = {
            freeCashFlow: Math.abs(ttmFCF),
            freeCashFlowTTM: Math.abs(ttmFCF),
            totalDebt,
            cashAndEquivalents: cash,
            sharesOutstanding,
            currentPrice,
            marketCap: summary?.marketCap || (currentPrice * sharesOutstanding),
            beta,
            revenueGrowth5Y,
            analystGrowthEstimate: financialData?.earningsGrowth ? financialData.earningsGrowth * 100 : undefined,
            sector: profile?.sector,
            industry: profile?.industry,
            dividendPerShare,
            dividendGrowthRate: 5,  // Default assumption
            bookValuePerShare: bookValue,
            returnOnEquity: roe
        };

        // Calculate WACC
        const wacc = calculateWACC(beta);

        // Run Comprehensive Valuation
        const comprehensiveResult = calculateComprehensiveFairValue(
            dcfInputs,
            eps,
            bookValue,
            dividendPerShare,
            netIncome
        );

        // FCF Per Share
        const fcfPerShare = sharesOutstanding > 0 ? ttmFCF / sharesOutstanding : 0;

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            price: currentPrice,
            currency: price?.currency || 'USD',
            companyName: price?.longName || ticker,
            sector: profile?.sector || 'Unknown',
            industry: profile?.industry || 'Unknown',
            description: profile?.longBusinessSummary,
            beta,
            fcfPerShare: Math.round(fcfPerShare * 100) / 100,

            // Comprehensive Valuation Results
            valuation: {
                // Primary Fair Values
                dcfFairValue: comprehensiveResult.dcfFairValue,
                grahamNumber: comprehensiveResult.grahamNumber,
                lynchFairValue: comprehensiveResult.lynchFairValue,
                epvFairValue: comprehensiveResult.epvFairValue,
                ddmFairValue: comprehensiveResult.ddmFairValue,

                // Synthesis
                averageFairValue: comprehensiveResult.averageFairValue,
                medianFairValue: comprehensiveResult.medianFairValue,
                conservativeFairValue: comprehensiveResult.conservativeFairValue,

                // Market Expectations
                impliedGrowth: comprehensiveResult.reverseDCFImpliedGrowth,

                // Verdict
                upside: comprehensiveResult.upside,
                verdict: comprehensiveResult.verdict,

                // All Methods Detail
                methods: comprehensiveResult.methods
            },

            // Key Inputs Used
            inputs: {
                eps,
                bookValue,
                fcfPerShare: Math.round(fcfPerShare * 100) / 100,
                revenueGrowth5Y,
                wacc,
                dividendPerShare,
                dividendYield: Math.round(dividendYield * 100) / 100,
                roe: Math.round(roe * 10) / 10
            },

            // Historical Financials
            financials: {
                ...robustFinancials,
                estimates: []
            },

            // Suggestions for UI
            suggestions: {
                revenueGrowth: {
                    value: revenueGrowth5Y || 8.0,
                    source: revenueGrowth5Y ? `${revenueHistory.length}Y Historical CAGR` : 'Default'
                },
                terminalGrowth: { value: 2.5, source: "Long-term GDP avg" },
                wacc: { value: wacc, source: `CAPM (Beta: ${beta.toFixed(2)})` },
                marginOfSafety: { value: 25, source: 'Default' }
            },

            // Legacy
            fundamentals: {
                totalRevenue: financialData?.totalRevenue || 0,
                ebitda: financialData?.ebitda || 0,
                freeCashFlow: ttmFCF,
                sharesOutstanding,
                totalDebt,
                cash
            }
        });

    } catch (error: any) {
        console.error('Yahoo Finance API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch stock data',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
