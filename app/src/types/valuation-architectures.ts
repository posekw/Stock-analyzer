export type ValuationEngineType = 'INTRINSIC' | 'RELATIVE' | 'ASSET' | 'HIBRID';
export type SectorType = 'GENERAL' | 'FINANCIAL' | 'REIT' | 'TECH_GROWTH' | 'BIOTECH' | 'CYCLICAL';

// ----------------------------------------------------
// 1. Data Ingestion & Normalization Layer
// ----------------------------------------------------

export interface NormalizedFinancials {
    symbol: string;
    currency: string;
    ttm: {
        revenue: number;
        ebitda: number;
        operatingIncome: number;
        netIncome: number;
        eps: number;
        bookValue: number;
        freeCashFlow: number; // FCFF preference
        operatingCashFlow: number;
        dividendsPaid: number;
    };
    balanceSheet: {
        cashAndEquivalents: number;
        receivables: number;
        inventory: number;
        totalDebt: number;
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        sharesOutstanding: number;
        netWorkingCapital: number;
    };
    ratios: {
        pe: number;
        pb: number;
        evEbitda: number;
        evSales: number;
        dividendYield: number;
        revenueGrowth3Y: number;
        profitMargin: number;
        roe: number;
        debtToEquity: number;
    };
    market: {
        price: number;
        marketCap: number;
        beta: number;
        riskFreeRate: number; // 4.5% default
        equityRiskPremium: number; // 5.5% default
    };
    sector: SectorType; // Detected sector
}

// ----------------------------------------------------
// 2. Valuation Engine Outputs
// ----------------------------------------------------

export interface ValuationResult {
    type: ValuationEngineType;
    modelName: string; // e.g. "Discounted Cash Flow (FCFF)"
    fairValue: number; // The central target price
    rangeLow: number;  // Bearish case
    rangeHigh: number; // Bullish case
    weight: number;    // 0 to 1, contribution to final price
    details: Record<string, any>; // Debug info (e.g. WACC used, Peer list)
}

// ----------------------------------------------------
// 3. The "Football Field" Synthesis
// ----------------------------------------------------

export interface ComprehensiveValuation {
    symbol: string;
    currentPrice: number;
    finalFairValue: number; // Weighted Average
    upsidePercent: number;
    rating: 'BUY' | 'SELL' | 'HOLD';

    // The visual bars
    footballField: ValuationResult[];

    // Switchboard Logic
    sectorUsed: SectorType;
    warnings: string[]; // e.g. "Missing Beta, defaulted to 1.0"
}

export type ValuationModelType =
    | 'DCF_STANDARD'
    | 'DCF_GROWTH'
    | 'NORMALIZED_DCF'
    | 'RESIDUAL_INCOME'
    | 'NAV'
    | 'R_NPV'
    | 'EV_EBITDA'
    | 'EV_SALES'
    | 'PRICE_TO_BOOK'
    | 'PRICE_TO_FFO'
    | 'PE_AVG'
    | 'CASH_BURN';

export interface ValuationModelConfig {
    primary: ValuationModelType;
    secondary: ValuationModelType;
    warnings: string[];
}

export interface ValuatonConstraint {
    minGrowth?: number;
    maxGrowth?: number;
    requiredProfitability?: boolean;
}
