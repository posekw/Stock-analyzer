import { NormalizedFinancials } from "@/types/valuation-architectures";

/**
 * RELATIVE VALUATION ENGINE
 * 
 * Calculates fair value using multiple methods:
 * - P/E Ratio
 * - PEG Ratio
 * - EV/EBITDA
 * - EV/Sales
 * - Price/Book
 * - Peter Lynch Fair Value
 * 
 * Uses Harmonic Mean for sector averages (filters outliers).
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface CompanyMetrics {
    ticker: string;
    price: number;
    sector: string;
    industry: string;

    // Per Share Data
    eps: number;
    epsForward: number | null;
    bookValuePerShare: number;
    revenuePerShare: number;
    fcfPerShare: number;

    // Absolute Numbers (in millions)
    ebitda: number;
    marketCap: number;
    enterpriseValue: number;
    revenue: number;
    sharesOutstanding: number;
    netDebt: number;

    // Ratios
    peRatio: number | null;
    forwardPE: number | null;
    pegRatio: number | null;
    evToEbitda: number | null;
    evToRevenue: number | null;
    priceToBook: number | null;
    priceToSales: number | null;

    // Growth
    revenueGrowth: number;
    earningsGrowth: number;
}

export interface SectorAverages {
    sector: string;
    peRatio: number;
    forwardPE: number;
    pegRatio: number;
    evToEbitda: number;
    evToRevenue: number;
    priceToBook: number;
    priceToSales: number;
}

export interface ValuationMethod {
    method: string;
    fairValue: number;
    upside: number;
    weight: number;
    confidence: 'high' | 'medium' | 'low';
}

export interface RelativeValuationResult {
    valuations: ValuationMethod[];
    averageFairValue: number;
    weightedFairValue: number;
    overallUpside: number;
    verdict: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
    sectorPremium: number;
}

// ============================================================
// SECTOR AVERAGES DATABASE
// ============================================================

const SECTOR_AVERAGES: Record<string, SectorAverages> = {
    'Technology': {
        sector: 'Technology',
        peRatio: 28,
        forwardPE: 24,
        pegRatio: 1.5,
        evToEbitda: 18,
        evToRevenue: 6,
        priceToBook: 8,
        priceToSales: 5
    },
    'Healthcare': {
        sector: 'Healthcare',
        peRatio: 22,
        forwardPE: 18,
        pegRatio: 1.8,
        evToEbitda: 14,
        evToRevenue: 4,
        priceToBook: 4,
        priceToSales: 3
    },
    'Financial Services': {
        sector: 'Financial Services',
        peRatio: 12,
        forwardPE: 10,
        pegRatio: 1.2,
        evToEbitda: 8,
        evToRevenue: 3,
        priceToBook: 1.2,
        priceToSales: 2
    },
    'Consumer Cyclical': {
        sector: 'Consumer Cyclical',
        peRatio: 18,
        forwardPE: 15,
        pegRatio: 1.5,
        evToEbitda: 12,
        evToRevenue: 1.5,
        priceToBook: 4,
        priceToSales: 1.2
    },
    'Consumer Defensive': {
        sector: 'Consumer Defensive',
        peRatio: 20,
        forwardPE: 18,
        pegRatio: 2.5,
        evToEbitda: 14,
        evToRevenue: 2,
        priceToBook: 5,
        priceToSales: 1.5
    },
    'Industrials': {
        sector: 'Industrials',
        peRatio: 18,
        forwardPE: 16,
        pegRatio: 1.8,
        evToEbitda: 12,
        evToRevenue: 2,
        priceToBook: 3.5,
        priceToSales: 1.5
    },
    'Energy': {
        sector: 'Energy',
        peRatio: 10,
        forwardPE: 8,
        pegRatio: 1.0,
        evToEbitda: 5,
        evToRevenue: 1,
        priceToBook: 1.5,
        priceToSales: 0.8
    },
    'Utilities': {
        sector: 'Utilities',
        peRatio: 16,
        forwardPE: 15,
        pegRatio: 3.0,
        evToEbitda: 10,
        evToRevenue: 2.5,
        priceToBook: 1.8,
        priceToSales: 2
    },
    'Real Estate': {
        sector: 'Real Estate',
        peRatio: 35,
        forwardPE: 30,
        pegRatio: 2.5,
        evToEbitda: 18,
        evToRevenue: 8,
        priceToBook: 2,
        priceToSales: 6
    },
    'Communication Services': {
        sector: 'Communication Services',
        peRatio: 20,
        forwardPE: 18,
        pegRatio: 1.5,
        evToEbitda: 10,
        evToRevenue: 3,
        priceToBook: 3,
        priceToSales: 2.5
    },
    'Basic Materials': {
        sector: 'Basic Materials',
        peRatio: 12,
        forwardPE: 10,
        pegRatio: 1.2,
        evToEbitda: 7,
        evToRevenue: 1.5,
        priceToBook: 2,
        priceToSales: 1
    }
};

const DEFAULT_AVERAGES: SectorAverages = {
    sector: 'Market',
    peRatio: 18,
    forwardPE: 16,
    pegRatio: 1.5,
    evToEbitda: 12,
    evToRevenue: 2.5,
    priceToBook: 3,
    priceToSales: 2
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Calculate Harmonic Mean - More robust than arithmetic mean for ratios
 */
export function calculateHarmonicMean(values: number[]): number {
    const validValues = values.filter(v => v > 0);
    if (validValues.length === 0) return 0;

    const sumReciprocal = validValues.reduce((sum, val) => sum + (1 / val), 0);
    return validValues.length / sumReciprocal;
}

/**
 * Get sector averages for comparison
 */
export function getSectorAverages(sector: string): SectorAverages {
    return SECTOR_AVERAGES[sector] || DEFAULT_AVERAGES;
}

/**
 * Aggregate peer multiples using Harmonic Mean
 */
export function aggregatePeerMultiples(peers: NormalizedFinancials[]) {
    const pe = peers.map(p => p.ratios.pe);
    const pb = peers.map(p => p.ratios.pb);
    const evEbitda = peers.map(p => p.ratios.evEbitda);
    const evSales = peers.map(p => p.ratios.evSales);

    return {
        pe: calculateHarmonicMean(pe),
        pb: calculateHarmonicMean(pb),
        evEbitda: calculateHarmonicMean(evEbitda),
        evSales: calculateHarmonicMean(evSales)
    };
}

/**
 * Peter Lynch Fair Value Calculation
 * Fair PE = Growth Rate + Dividend Yield
 * Score > 1.5 = Cheap, Score < 1.0 = Expensive
 */
export function calculateLynchValue(financials: NormalizedFinancials): { fairValue: number, score: number } {
    const growth = financials.ratios.revenueGrowth3Y || 0;
    const yieldPct = financials.ratios.dividendYield || 0;

    const fairPE = growth + yieldPct;
    const fairValue = fairPE * financials.ttm.eps;

    const currentPE = financials.ratios.pe;
    const score = currentPE > 0 ? (growth + yieldPct) / currentPE : 0;

    return {
        fairValue: Math.max(0, fairValue),
        score
    };
}

/**
 * Main Relative Valuation Calculator
 * Triangulates value from multiple methods
 */
export function calculateRelativeValuation(
    company: CompanyMetrics,
    sectorAvg: SectorAverages
): RelativeValuationResult {
    const valuations: ValuationMethod[] = [];
    const price = company.price;

    // 1. P/E Valuation
    if (company.eps > 0 && company.peRatio && company.peRatio > 0) {
        const fairPE = sectorAvg.peRatio;
        const fairValue = company.eps * fairPE;
        const upside = ((fairValue - price) / price) * 100;

        valuations.push({
            method: 'P/E Ratio',
            fairValue,
            upside,
            weight: 0.25,
            confidence: company.earningsGrowth > 0 ? 'high' : 'medium'
        });
    }

    // 2. Forward P/E Valuation
    if (company.epsForward && company.epsForward > 0) {
        const fairValue = company.epsForward * sectorAvg.forwardPE;
        const upside = ((fairValue - price) / price) * 100;

        valuations.push({
            method: 'Forward P/E',
            fairValue,
            upside,
            weight: 0.20,
            confidence: 'medium'
        });
    }

    // 3. PEG Ratio Valuation
    if (company.pegRatio && company.pegRatio > 0 && company.revenueGrowth > 0) {
        // Fair PEG = 1.0 means fairly valued
        // If current PEG > 1.0, stock is expensive
        const fairPEG = 1.0;
        const impliedFairPE = fairPEG * company.revenueGrowth;
        const fairValue = (company.eps || 0) * impliedFairPE;
        const upside = ((fairValue - price) / price) * 100;

        if (fairValue > 0) {
            valuations.push({
                method: 'PEG Ratio',
                fairValue,
                upside,
                weight: 0.15,
                confidence: 'medium'
            });
        }
    }

    // 4. EV/EBITDA Valuation
    if (company.ebitda > 0 && company.evToEbitda && company.evToEbitda > 0) {
        const fairEV = company.ebitda * sectorAvg.evToEbitda;
        const fairMarketCap = fairEV - company.netDebt;
        const fairValue = fairMarketCap / company.sharesOutstanding;
        const upside = ((fairValue - price) / price) * 100;

        if (fairValue > 0) {
            valuations.push({
                method: 'EV/EBITDA',
                fairValue,
                upside,
                weight: 0.20,
                confidence: 'high'
            });
        }
    }

    // 5. EV/Sales Valuation (good for growth companies)
    if (company.revenue > 0) {
        const fairEV = company.revenue * sectorAvg.evToRevenue;
        const fairMarketCap = fairEV - company.netDebt;
        const fairValue = fairMarketCap / company.sharesOutstanding;
        const upside = ((fairValue - price) / price) * 100;

        if (fairValue > 0) {
            valuations.push({
                method: 'EV/Sales',
                fairValue,
                upside,
                weight: 0.10,
                confidence: company.revenueGrowth > 20 ? 'high' : 'low'
            });
        }
    }

    // 6. Price/Book Valuation
    if (company.bookValuePerShare > 0) {
        const fairValue = company.bookValuePerShare * sectorAvg.priceToBook;
        const upside = ((fairValue - price) / price) * 100;

        valuations.push({
            method: 'Price/Book',
            fairValue,
            upside,
            weight: 0.10,
            confidence: 'medium'
        });
    }

    // Calculate averages
    const simpleAvg = valuations.length > 0
        ? valuations.reduce((sum, v) => sum + v.fairValue, 0) / valuations.length
        : 0;

    const totalWeight = valuations.reduce((sum, v) => sum + v.weight, 0);
    const weightedAvg = totalWeight > 0
        ? valuations.reduce((sum, v) => sum + (v.fairValue * v.weight), 0) / totalWeight
        : 0;

    const overallUpside = price > 0 ? ((weightedAvg - price) / price) * 100 : 0;

    // Determine verdict
    let verdict: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
    if (overallUpside > 15) {
        verdict = 'UNDERVALUED';
    } else if (overallUpside < -15) {
        verdict = 'OVERVALUED';
    } else {
        verdict = 'FAIRLY_VALUED';
    }

    // Sector premium calculation
    const avgPE = company.peRatio || 0;
    const sectorPremium = sectorAvg.peRatio > 0
        ? ((avgPE - sectorAvg.peRatio) / sectorAvg.peRatio) * 100
        : 0;

    return {
        valuations,
        averageFairValue: Math.round(simpleAvg * 100) / 100,
        weightedFairValue: Math.round(weightedAvg * 100) / 100,
        overallUpside: Math.round(overallUpside * 10) / 10,
        verdict,
        sectorPremium: Math.round(sectorPremium * 10) / 10
    };
}
