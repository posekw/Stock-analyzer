import { NormalizedFinancials, SectorType } from "@/types/valuation-architectures";
import { detectSector } from "./switchboard";

/**
 * DATA INGESTION & NORMALIZATION LAYER
 * 
 * Maps raw Yahoo Finance / FMP data to our strict internal schema.
 * Handles imputation, currency conversion (assumed USD for now), and cleaning.
 */

export function transformYahooData(
    quote: any,
    summary: any,
    financials: any, // Summary financials
    statistics: any, // defaultKeyStatistics
    timeSeries: any[], // Deep history
    profile: any
): NormalizedFinancials {

    const sector = detectSector(profile?.sector, profile?.industry);

    // 1. Safe extraction helpers
    const getVal = (v: any) => v && typeof v === 'number' ? v : 0;

    // 2. Extract latest annual data from timeSeries if available
    const latestAnnual = timeSeries && timeSeries.length > 0 ? timeSeries[0] : {};

    // 3. TTM vs Annual Priority
    // Ideally we use TTM for income/cashflow, but balance sheet is point-in-time (latest)
    const income = {
        revenue: getVal(financials?.totalRevenue || latestAnnual.totalRevenue),
        ebitda: getVal(financials?.ebitda || latestAnnual.ebitda),
        operatingIncome: getVal(latestAnnual.operatingIncome || latestAnnual.totalOperatingIncomeAsReported),
        netIncome: getVal(financials?.netIncomeToCommon || latestAnnual.netIncome),
        eps: getVal(summary?.trailingPE ? (quote?.regularMarketPrice / summary.trailingPE) : latestAnnual.basicEPS), // Derive EPS if missing or use annual
        bookValue: 0, // Calculated below
        freeCashFlow: getVal(financials?.freeCashflow || latestAnnual.freeCashFlow),
        operatingCashFlow: getVal(financials?.operatingCashflow || latestAnnual.operatingCashFlow),
        dividendsPaid: getVal(latestAnnual.cashDividendsPaid || 0) * -1 // Usually negative in CF
    };

    // 4. Imputation Logic
    // If Beta is missing, default to 1.0 (Market Average)
    const beta = typeof summary?.beta === 'number' ? summary.beta : 1.0;

    // 5. Balance Sheet Construction
    const balance = {
        cashAndEquivalents: getVal(financials?.totalCash || latestAnnual.cashAndCashEquivalents),
        receivables: getVal(latestAnnual.netReceivables || latestAnnual.accountsReceivable || 0),
        inventory: getVal(latestAnnual.inventory || 0),
        totalDebt: getVal(financials?.totalDebt || latestAnnual.totalDebt),
        totalAssets: getVal(latestAnnual.totalAssets),
        totalLiabilities: getVal(latestAnnual.totalLiabilitiesNetMinorityInterest || latestAnnual.totalLiabilities),
        totalEquity: getVal(latestAnnual.totalStockholderEquity || latestAnnual.commonStockEquity),
        sharesOutstanding: getVal(
            statistics?.sharesOutstanding ||
            quote?.sharesOutstanding ||
            latestAnnual.ordinarySharesNumber ||
            (summary?.marketCap && quote?.regularMarketPrice ? summary.marketCap / quote.regularMarketPrice : 0)
        ),
        netWorkingCapital: getVal(latestAnnual.workingCapital || 0) // Or Calculate: (CurrentAssets - CurrentLiabilities)
    };

    // Calculate Book Value Per Share
    const bookValuePerShare = balance.sharesOutstanding > 0
        ? balance.totalEquity / balance.sharesOutstanding
        : 0;
    income.bookValue = bookValuePerShare;

    // 6. Ratios & Market Data
    const price = getVal(quote?.regularMarketPrice);

    const ratios = {
        pe: getVal(summary?.trailingPE),
        pb: getVal(summary?.priceToBook),
        evEbitda: getVal(summary?.enterpriseToEbitda),
        evSales: getVal(summary?.enterpriseToRevenue),
        dividendYield: getVal(summary?.dividendYield),
        revenueGrowth3Y: getVal(financials?.revenueGrowth || 0) * 100, // Placeholder, usually need history array
        profitMargin: getVal(financials?.profitMargins),
        roe: getVal(financials?.returnOnEquity),
        debtToEquity: getVal(financials?.debtToEquity)
    };

    return {
        symbol: quote?.symbol || 'UNKNOWN',
        currency: quote?.currency || 'USD',
        ttm: income,
        balanceSheet: balance,
        ratios,
        market: {
            price,
            marketCap: getVal(summary?.marketCap),
            beta,
            riskFreeRate: 4.5, // Hardcoded macro for now
            equityRiskPremium: 5.5
        },
        sector
    };
}
