/**
 * COMPREHENSIVE VALUATION ENGINE
 * Based on "Algorithmic Valuation Architectures" Research
 * 
 * This module implements multiple valuation methodologies:
 * 1. DCF (Discounted Cash Flow) - FCFF & FCFE variants
 * 2. Graham Number (Asset-Based)
 * 3. Peter Lynch Fair Value
 * 4. Earnings Power Value (EPV)
 * 5. Dividend Discount Model (DDM)
 * 6. Reverse DCF (Implied Growth)
 * 7. Residual Income Model (for Financials)
 * 8. Rule of 40 (for SaaS/Tech)
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface DCFInputs {
    // Cash Flow Data
    freeCashFlow: number;           // Most recent annual FCF
    freeCashFlowTTM?: number;       // Trailing 12 months FCF (preferred)
    operatingCashFlow?: number;     // For FCFE calculation
    capitalExpenditures?: number;   // CapEx (negative number)

    // Balance Sheet
    totalDebt: number;
    cashAndEquivalents: number;
    sharesOutstanding: number;

    // Market Data
    currentPrice: number;
    marketCap: number;
    beta: number;

    // Growth Estimates
    revenueGrowth5Y?: number;       // 5-year historical CAGR
    earningsGrowth5Y?: number;      // 5-year earnings CAGR
    analystGrowthEstimate?: number; // Analyst consensus

    // Margins
    netIncomeMargin?: number;
    fcfMargin?: number;

    // For DDM
    dividendPerShare?: number;
    dividendGrowthRate?: number;
    payoutRatio?: number;

    // For Financials (RIM)
    bookValuePerShare?: number;
    returnOnEquity?: number;

    // Sector Info
    sector?: string;
    industry?: string;
}

export interface DCFAssumptions {
    growthRate: number;             // Stage 1 growth (%)
    terminalGrowthRate: number;     // Perpetual growth (%)
    discountRate: number;           // WACC (%)
    projectionYears: number;        // Forecast horizon
    marginOfSafety: number;         // Conservative adjustment (%)
}

export interface ValuationOutput {
    method: string;
    fairValue: number;
    upside: number;                 // vs current price
    confidence: 'high' | 'medium' | 'low';
    assumptions: Record<string, number | string>;
    details?: string;
}

export interface ComprehensiveValuation {
    ticker: string;
    currentPrice: number;

    // Individual Valuations
    dcfFairValue: number;
    grahamNumber: number;
    lynchFairValue: number;
    epvFairValue: number;
    ddmFairValue: number | null;
    reverseDCFImpliedGrowth: number;

    // Synthesis
    averageFairValue: number;
    medianFairValue: number;
    conservativeFairValue: number;  // With margin of safety

    // Verdict
    upside: number;
    verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

    // All Methods
    methods: ValuationOutput[];
}

// ============================================================
// CONSTANTS
// ============================================================

const RISK_FREE_RATE = 4.25;        // 10-Year Treasury (Dec 2024)
const EQUITY_RISK_PREMIUM = 5.0;    // Historical average
const DEFAULT_TERMINAL_GROWTH = 2.5;
const DEFAULT_PROJECTION_YEARS = 5;
const DEFAULT_MARGIN_OF_SAFETY = 0;  // Apply margin of safety at SYNTHESIS, not per-method

// ============================================================
// CORE WACC CALCULATION
// ============================================================

/**
 * Calculate WACC using CAPM
 * WACC = Rf + β × ERP
 * 
 * For simplicity, we assume 100% equity financing.
 * A full implementation would include debt cost and tax shields.
 */
export function calculateWACC(
    beta: number,
    riskFreeRate: number = RISK_FREE_RATE,
    equityRiskPremium: number = EQUITY_RISK_PREMIUM
): number {
    // CAPM: Cost of Equity = Rf + β × (Rm - Rf)
    const costOfEquity = riskFreeRate + (beta * equityRiskPremium);

    // Clamp to reasonable range (6% to 18%)
    return Math.max(6, Math.min(18, costOfEquity));
}

// ============================================================
// DCF VALUATION (ROBUST)
// ============================================================

/**
 * Two-Stage DCF Model
 * 
 * Stage 1: Explicit forecast with declining growth
 * Stage 2: Terminal value using Gordon Growth Model
 * 
 * Key improvements over basic DCF:
 * - Uses FCF per share directly
 * - Implements growth fade (linear decline to terminal rate)
 * - Includes margin of safety
 * - Handles edge cases (negative FCF, etc.)
 */
export function calculateDCF(
    inputs: DCFInputs,
    assumptions: Partial<DCFAssumptions> = {}
): ValuationOutput {
    // Defaults
    const growthRate = assumptions.growthRate ?? estimateGrowthRate(inputs);
    const terminalGrowth = assumptions.terminalGrowthRate ?? DEFAULT_TERMINAL_GROWTH;
    const discountRate = assumptions.discountRate ?? calculateWACC(inputs.beta);
    const projectionYears = assumptions.projectionYears ?? DEFAULT_PROJECTION_YEARS;
    const marginOfSafety = assumptions.marginOfSafety ?? DEFAULT_MARGIN_OF_SAFETY;

    // Validate inputs
    if (inputs.freeCashFlow <= 0) {
        return {
            method: 'DCF (FCFF)',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Negative or zero FCF' },
            details: 'Cannot calculate DCF for companies with negative free cash flow'
        };
    }

    if (discountRate <= terminalGrowth) {
        return {
            method: 'DCF (FCFF)',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Invalid rates' },
            details: 'Discount rate must be greater than terminal growth rate'
        };
    }

    // Calculate FCF per share
    const fcfPerShare = (inputs.freeCashFlowTTM || inputs.freeCashFlow) / inputs.sharesOutstanding;

    // Stage 1: Project FCF with growth fade
    const projectedFCF: number[] = [];
    let fcf = fcfPerShare;

    for (let year = 1; year <= projectionYears; year++) {
        // Linear decay from initial growth to terminal growth
        const fadeRatio = (projectionYears - year) / projectionYears;
        const yearGrowth = (terminalGrowth / 100) + ((growthRate / 100) - (terminalGrowth / 100)) * fadeRatio;

        fcf = fcf * (1 + yearGrowth);
        projectedFCF.push(fcf);
    }

    // Discount Stage 1 FCFs
    const discountRateDecimal = discountRate / 100;
    let pvOfFCFs = 0;
    for (let i = 0; i < projectionYears; i++) {
        pvOfFCFs += projectedFCF[i] / Math.pow(1 + discountRateDecimal, i + 1);
    }

    // Stage 2: Terminal Value (Gordon Growth Model)
    const terminalGrowthDecimal = terminalGrowth / 100;
    const terminalFCF = projectedFCF[projectedFCF.length - 1];
    const terminalValue = (terminalFCF * (1 + terminalGrowthDecimal)) /
        (discountRateDecimal - terminalGrowthDecimal);

    // Discount terminal value
    const pvOfTerminalValue = terminalValue / Math.pow(1 + discountRateDecimal, projectionYears);

    // Intrinsic Value per Share
    const intrinsicValue = pvOfFCFs + pvOfTerminalValue;

    // Apply margin of safety
    const fairValue = intrinsicValue * (1 - marginOfSafety / 100);

    // Calculate upside
    const upside = ((fairValue / inputs.currentPrice) - 1) * 100;

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (inputs.freeCashFlow > 0 && inputs.beta > 0 && inputs.beta < 2) {
        confidence = 'high';
    } else if (inputs.freeCashFlow < 0 || inputs.beta > 2.5) {
        confidence = 'low';
    }

    return {
        method: 'DCF (FCFF)',
        fairValue: Math.max(0, Math.round(fairValue * 100) / 100),
        upside: Math.round(upside * 10) / 10,
        confidence,
        assumptions: {
            growthRate: `${growthRate.toFixed(1)}%`,
            terminalGrowth: `${terminalGrowth.toFixed(1)}%`,
            wacc: `${discountRate.toFixed(1)}%`,
            fcfPerShare: `$${fcfPerShare.toFixed(2)}`,
            intrinsicValue: `$${intrinsicValue.toFixed(2)}`
        },
        details: `5-year DCF model with fade to terminal growth`
    };
}

/**
 * Estimate growth rate from available data
 * Hierarchy: Analyst estimate > Historical earnings > Historical revenue
 */
function estimateGrowthRate(inputs: DCFInputs): number {
    // Priority 1: Analyst estimate (most forward-looking)
    if (inputs.analystGrowthEstimate && inputs.analystGrowthEstimate > 0) {
        return Math.min(inputs.analystGrowthEstimate, 30); // Cap at 30%
    }

    // Priority 2: Historical earnings growth (if positive)
    if (inputs.earningsGrowth5Y && inputs.earningsGrowth5Y > 0) {
        return Math.min(inputs.earningsGrowth5Y * 0.85, 25); // 15% haircut, cap at 25%
    }

    // Priority 3: Historical revenue growth
    if (inputs.revenueGrowth5Y && inputs.revenueGrowth5Y > 0) {
        return Math.min(inputs.revenueGrowth5Y * 0.8, 20); // 20% haircut, cap at 20%
    }

    // Default: Conservative 8%
    return 8;
}

// ============================================================
// GRAHAM NUMBER (ASSET-BASED)
// ============================================================

/**
 * Benjamin Graham's Intrinsic Value Formula
 * 
 * Graham Number = √(22.5 × EPS × BVPS)
 * 
 * Where:
 * - 22.5 = 15 (fair P/E) × 1.5 (fair P/B)
 * - EPS = Earnings Per Share (TTM)
 * - BVPS = Book Value Per Share
 * 
 * This gives a "defensive" fair value for value investors.
 */
export function calculateGrahamNumber(
    eps: number,
    bookValuePerShare: number,
    currentPrice: number
): ValuationOutput {
    // Graham requires positive earnings and book value
    if (eps <= 0 || bookValuePerShare <= 0) {
        return {
            method: 'Graham Number',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Requires positive EPS and Book Value' },
            details: 'Graham Number cannot be calculated for loss-making companies'
        };
    }

    // Classic Graham Formula
    const grahamNumber = Math.sqrt(22.5 * eps * bookValuePerShare);

    const upside = ((grahamNumber / currentPrice) - 1) * 100;

    return {
        method: 'Graham Number',
        fairValue: Math.round(grahamNumber * 100) / 100,
        upside: Math.round(upside * 10) / 10,
        confidence: 'low',  // Graham is always conservative
        assumptions: {
            eps: `$${eps.toFixed(2)}`,
            bookValuePerShare: `$${bookValuePerShare.toFixed(2)}`,
            impliedPE: '15x',
            impliedPB: '1.5x'
        },
        details: '⚠️ Conservative floor (for value/defensive stocks only)'
    };
}

// ============================================================
// PETER LYNCH FAIR VALUE (PEG-BASED)
// ============================================================

/**
 * Peter Lynch's PEG-Based Fair Value
 * 
 * Lynch's Rule: A stock is fairly valued when P/E = Growth Rate
 * 
 * Fair Value = EPS × Growth Rate
 * 
 * PEG Ratio = P/E ÷ Growth Rate
 * - PEG < 1.0 = Undervalued
 * - PEG = 1.0 = Fairly Valued
 * - PEG > 1.0 = Overvalued
 */
export function calculateLynchValue(
    eps: number,
    growthRate: number,      // Expected earnings growth (%)
    dividendYield: number,   // Current dividend yield (%)
    currentPrice: number
): ValuationOutput {
    if (eps <= 0 || growthRate <= 0) {
        return {
            method: 'Lynch Fair Value',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Requires positive EPS and growth' },
            details: 'Lynch method requires positive earnings and growth'
        };
    }

    // Lynch adjustment: Growth + Dividend Yield (he liked dividend payers)
    const adjustedGrowth = growthRate + dividendYield;

    // Fair P/E = Growth Rate (Lynch's rule of thumb)
    const fairPE = adjustedGrowth;

    // Fair Value = EPS × Fair P/E
    const fairValue = eps * fairPE;

    // Current PEG
    const currentPE = currentPrice / eps;
    const pegRatio = currentPE / growthRate;

    const upside = ((fairValue / currentPrice) - 1) * 100;

    // Lynch Score (his actual formula)
    // Score = (Growth + Dividend) / P/E
    // Score > 1.5 = Attractive
    const lynchScore = adjustedGrowth / currentPE;

    return {
        method: 'Lynch Fair Value',
        fairValue: Math.max(0, Math.round(fairValue * 100) / 100),
        upside: Math.round(upside * 10) / 10,
        confidence: pegRatio < 1.5 ? 'high' : pegRatio < 2.5 ? 'medium' : 'low',
        assumptions: {
            eps: `$${eps.toFixed(2)}`,
            growthRate: `${growthRate.toFixed(1)}%`,
            dividendYield: `${dividendYield.toFixed(1)}%`,
            fairPE: `${fairPE.toFixed(1)}x`,
            pegRatio: pegRatio.toFixed(2),
            lynchScore: lynchScore.toFixed(2)
        },
        details: lynchScore > 1.5 ? 'Attractive by Lynch criteria' : 'Fairly valued by Lynch criteria'
    };
}

// ============================================================
// EARNINGS POWER VALUE (EPV)
// ============================================================

/**
 * Earnings Power Value (EPV)
 * 
 * EPV = Normalized Earnings / Cost of Capital
 * 
 * This is Warren Buffett's preferred method:
 * "The value of a business is the present value of all future cash flows"
 * 
 * EPV assumes ZERO growth - it values current earning power only.
 * If EPV > Market Price, you're getting growth for free.
 */
export function calculateEPV(
    normalizedEarnings: number,  // Adjusted net income (remove one-time items)
    sharesOutstanding: number,
    costOfEquity: number,        // WACC or cost of equity
    currentPrice: number,
    maintenanceCapex?: number    // Capex needed to maintain current earnings
): ValuationOutput {
    if (normalizedEarnings <= 0) {
        return {
            method: 'Earnings Power Value',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Requires positive earnings' },
            details: 'EPV cannot be calculated for loss-making companies'
        };
    }

    // Adjust earnings for maintenance capex if provided
    const adjustedEarnings = maintenanceCapex
        ? normalizedEarnings - Math.abs(maintenanceCapex) * 0.3  // Assume 30% is maintenance
        : normalizedEarnings;

    // EPV = Earnings / Cost of Capital
    const epv = adjustedEarnings / (costOfEquity / 100);

    // Per share value
    const epvPerShare = epv / sharesOutstanding;

    const upside = ((epvPerShare / currentPrice) - 1) * 100;

    return {
        method: 'Earnings Power Value',
        fairValue: Math.max(0, Math.round(epvPerShare * 100) / 100),
        upside: Math.round(upside * 10) / 10,
        confidence: 'low',  // EPV assumes zero growth - only a floor
        assumptions: {
            normalizedEarnings: `$${(normalizedEarnings / 1e9).toFixed(2)}B`,
            costOfEquity: `${costOfEquity.toFixed(1)}%`,
            impliedPE: (1 / (costOfEquity / 100)).toFixed(1) + 'x'
        },
        details: '⚠️ Zero-growth floor (value if company stops growing)'
    };
}

// ============================================================
// DIVIDEND DISCOUNT MODEL (DDM)
// ============================================================

/**
 * Gordon Growth Model (DDM)
 * 
 * Fair Value = D1 / (r - g)
 * 
 * Where:
 * - D1 = Expected dividend next year = D0 × (1 + g)
 * - r = Required rate of return (cost of equity)
 * - g = Dividend growth rate
 * 
 * Best for: Mature, dividend-paying companies with stable growth
 */
export function calculateDDM(
    dividendPerShare: number,
    dividendGrowthRate: number,  // Historical or expected (%)
    costOfEquity: number,        // Required return (%)
    currentPrice: number
): ValuationOutput | null {
    // DDM only works for dividend payers
    if (dividendPerShare <= 0) {
        return null;
    }

    const g = dividendGrowthRate / 100;
    const r = costOfEquity / 100;

    // Must have r > g for model to work
    if (r <= g) {
        return {
            method: 'Dividend Discount Model',
            fairValue: 0,
            upside: 0,
            confidence: 'low',
            assumptions: { error: 'Growth exceeds required return' },
            details: 'DDM requires cost of equity > dividend growth rate'
        };
    }

    // D1 = D0 × (1 + g)
    const d1 = dividendPerShare * (1 + g);

    // Fair Value = D1 / (r - g)
    const fairValue = d1 / (r - g);

    const upside = ((fairValue / currentPrice) - 1) * 100;

    // Dividend yield
    const dividendYield = (dividendPerShare / currentPrice) * 100;

    return {
        method: 'Dividend Discount Model',
        fairValue: Math.max(0, Math.round(fairValue * 100) / 100),
        upside: Math.round(upside * 10) / 10,
        confidence: dividendGrowthRate < 8 ? 'high' : 'medium',
        assumptions: {
            currentDividend: `$${dividendPerShare.toFixed(2)}`,
            dividendGrowth: `${dividendGrowthRate.toFixed(1)}%`,
            costOfEquity: `${costOfEquity.toFixed(1)}%`,
            dividendYield: `${dividendYield.toFixed(2)}%`
        },
        details: 'Gordon Growth Model for dividend-paying stocks'
    };
}

// ============================================================
// REVERSE DCF (IMPLIED GROWTH)
// ============================================================

/**
 * Reverse DCF - Solve for Implied Growth Rate
 * 
 * Given the current price, what growth rate is the market pricing in?
 * 
 * Uses binary search to find the growth rate that produces
 * a fair value equal to the current market price.
 */
export function calculateReverseDCF(
    inputs: DCFInputs
): ValuationOutput {
    const { currentPrice, freeCashFlow, sharesOutstanding, beta } = inputs;

    if (freeCashFlow <= 0) {
        return {
            method: 'Reverse DCF',
            fairValue: 0,
            upside: 0,
            confidence: 'low',
            assumptions: { impliedGrowth: 'N/A' },
            details: 'Cannot calculate for negative FCF'
        };
    }

    const fcfPerShare = freeCashFlow / sharesOutstanding;
    const wacc = calculateWACC(beta);
    const terminalGrowth = DEFAULT_TERMINAL_GROWTH;

    // Binary search for implied growth
    let low = -20;
    let high = 50;
    let impliedGrowth = 0;

    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;

        // Calculate DCF at this growth rate
        const dcfResult = calculateDCF(inputs, {
            growthRate: mid,
            terminalGrowthRate: terminalGrowth,
            discountRate: wacc,
            marginOfSafety: 0  // No margin for reverse DCF
        });

        const calculatedValue = dcfResult.fairValue;

        if (Math.abs(calculatedValue - currentPrice) < 0.5) {
            impliedGrowth = mid;
            break;
        }

        if (calculatedValue > currentPrice) {
            high = mid;
        } else {
            low = mid;
        }

        impliedGrowth = mid;
    }

    // Interpretation
    let interpretation = '';
    if (impliedGrowth < 0) {
        interpretation = 'Market expects earnings decline';
    } else if (impliedGrowth < 5) {
        interpretation = 'Market expects minimal growth';
    } else if (impliedGrowth < 15) {
        interpretation = 'Market expects moderate growth';
    } else if (impliedGrowth < 25) {
        interpretation = 'Market expects high growth';
    } else {
        interpretation = 'Market expects exceptional growth (risky)';
    }

    return {
        method: 'Reverse DCF',
        fairValue: currentPrice,
        upside: 0,
        confidence: 'high',
        assumptions: {
            impliedGrowth: `${impliedGrowth.toFixed(1)}%`,
            wacc: `${wacc.toFixed(1)}%`,
            fcfPerShare: `$${fcfPerShare.toFixed(2)}`
        },
        details: interpretation
    };
}

// ============================================================
// RESIDUAL INCOME MODEL (FOR FINANCIALS)
// ============================================================

/**
 * Residual Income Model (RIM)
 * 
 * For banks and financials where FCF is not meaningful.
 * 
 * Value = Book Value + PV of Future Residual Income
 * Residual Income = Net Income - (Book Value × Cost of Equity)
 * 
 * A bank creating value above its cost of equity trades at a premium to book.
 */
export function calculateResidualIncome(
    bookValuePerShare: number,
    roe: number,                 // Return on Equity (%)
    costOfEquity: number,        // Required return (%)
    growthRate: number,          // Book value growth (%)
    currentPrice: number
): ValuationOutput {
    if (bookValuePerShare <= 0) {
        return {
            method: 'Residual Income Model',
            fairValue: 0,
            upside: -100,
            confidence: 'low',
            assumptions: { error: 'Requires positive book value' },
            details: 'RIM requires positive book value'
        };
    }

    const r = costOfEquity / 100;
    const ROE = roe / 100;
    const g = growthRate / 100;

    // Residual Income = (ROE - r) × Book Value
    const residualIncomeSpread = ROE - r;

    // If ROE > Cost of Equity, the company creates value
    // Fair P/B = 1 + (ROE - r) / (r - g)
    let fairPB: number;

    if (r > g) {
        fairPB = 1 + (residualIncomeSpread / (r - g));
    } else {
        // If growth >= cost of equity, use simpler approximation
        fairPB = ROE / r;
    }

    // Clamp P/B to reasonable range
    fairPB = Math.max(0.5, Math.min(fairPB, 4));

    const fairValue = bookValuePerShare * fairPB;
    const upside = ((fairValue / currentPrice) - 1) * 100;

    const currentPB = currentPrice / bookValuePerShare;

    return {
        method: 'Residual Income Model',
        fairValue: Math.round(fairValue * 100) / 100,
        upside: Math.round(upside * 10) / 10,
        confidence: roe > costOfEquity ? 'high' : 'medium',
        assumptions: {
            bookValue: `$${bookValuePerShare.toFixed(2)}`,
            roe: `${roe.toFixed(1)}%`,
            costOfEquity: `${costOfEquity.toFixed(1)}%`,
            fairPB: `${fairPB.toFixed(2)}x`,
            currentPB: `${currentPB.toFixed(2)}x`
        },
        details: residualIncomeSpread > 0
            ? 'Company creates value above cost of equity'
            : 'Company destroys value vs cost of equity'
    };
}

// ============================================================
// RULE OF 40 (FOR SAAS/TECH)
// ============================================================

/**
 * Rule of 40 Valuation
 * 
 * For SaaS companies: Revenue Growth% + Profit Margin% should exceed 40%
 * 
 * Companies above 40 typically command premium valuations.
 * EV/Revenue multiple scales with Rule of 40 score.
 */
export function calculateRuleOf40(
    revenue: number,
    revenueGrowth: number,       // %
    profitMargin: number,        // EBITDA or FCF margin (%)
    sharesOutstanding: number,
    enterpriseValue: number,
    currentPrice: number
): ValuationOutput {
    // Rule of 40 Score
    const ruleOf40Score = revenueGrowth + profitMargin;

    // Implied EV/Revenue multiple based on score
    // Empirical relationship: Multiple ≈ Score / 5 (with floors/caps)
    let impliedMultiple: number;

    if (ruleOf40Score >= 60) {
        impliedMultiple = 12;  // Elite SaaS
    } else if (ruleOf40Score >= 40) {
        impliedMultiple = 8;   // Strong SaaS
    } else if (ruleOf40Score >= 20) {
        impliedMultiple = 5;   // Average SaaS
    } else if (ruleOf40Score >= 0) {
        impliedMultiple = 3;   // Struggling SaaS
    } else {
        impliedMultiple = 1.5; // Value trap
    }

    // Fair Enterprise Value
    const fairEV = revenue * impliedMultiple;

    // Current EV/Revenue
    const currentMultiple = enterpriseValue / revenue;

    // Fair Equity Value (assuming net debt already in EV)
    const fairEquityValue = fairEV;  // Simplified
    const fairValuePerShare = fairEquityValue / sharesOutstanding;

    const upside = ((fairValuePerShare / currentPrice) - 1) * 100;

    return {
        method: 'Rule of 40',
        fairValue: Math.max(0, Math.round(fairValuePerShare * 100) / 100),
        upside: Math.round(upside * 10) / 10,
        confidence: ruleOf40Score >= 40 ? 'high' : 'medium',
        assumptions: {
            revenueGrowth: `${revenueGrowth.toFixed(1)}%`,
            profitMargin: `${profitMargin.toFixed(1)}%`,
            ruleOf40Score: ruleOf40Score.toFixed(0),
            impliedMultiple: `${impliedMultiple.toFixed(1)}x`,
            currentMultiple: `${currentMultiple.toFixed(1)}x`
        },
        details: ruleOf40Score >= 40
            ? 'Passes Rule of 40 - high quality growth'
            : 'Below Rule of 40 - growth quality concerns'
    };
}

// ============================================================
// COMPREHENSIVE FAIR VALUE
// ============================================================

/**
 * Calculate fair value using multiple methods and synthesize
 */
export function calculateComprehensiveFairValue(
    inputs: DCFInputs,
    eps: number,
    bookValuePerShare: number,
    dividendPerShare: number = 0,
    netIncome: number = 0
): ComprehensiveValuation {
    const methods: ValuationOutput[] = [];
    const wacc = calculateWACC(inputs.beta);
    const growthRate = estimateGrowthRate(inputs);

    // 1. DCF (Primary method - growth-aware)
    const dcfResult = calculateDCF(inputs);
    methods.push(dcfResult);

    // 2. Graham Number (Floor value - for defensive stocks)
    const grahamResult = calculateGrahamNumber(eps, bookValuePerShare, inputs.currentPrice);
    if (grahamResult.fairValue > 0) {
        methods.push(grahamResult);
    }

    // 3. Lynch Fair Value (Growth-aware)
    const dividendYield = dividendPerShare > 0
        ? (dividendPerShare / inputs.currentPrice) * 100
        : 0;
    const lynchResult = calculateLynchValue(eps, growthRate, dividendYield, inputs.currentPrice);
    if (lynchResult.fairValue > 0) {
        methods.push(lynchResult);
    }

    // 4. EPV (Floor value - zero growth)
    if (netIncome > 0) {
        const epvResult = calculateEPV(
            netIncome,
            inputs.sharesOutstanding,
            wacc,
            inputs.currentPrice
        );
        if (epvResult.fairValue > 0) {
            methods.push(epvResult);
        }
    }

    // 5. DDM (Only for high-dividend stocks - yield > 2%)
    const currentYield = dividendPerShare > 0 ? (dividendPerShare / inputs.currentPrice) * 100 : 0;
    if (dividendPerShare > 0 && currentYield > 2) {
        const ddmResult = calculateDDM(
            dividendPerShare,
            inputs.dividendGrowthRate || 5,
            wacc,
            inputs.currentPrice
        );
        if (ddmResult && ddmResult.fairValue > 0) {
            methods.push(ddmResult);
        }
    }

    // 6. Reverse DCF
    const reverseDCF = calculateReverseDCF(inputs);
    methods.push(reverseDCF);

    // 7. RIM for Financials
    if (inputs.sector === 'Financial Services' && inputs.returnOnEquity) {
        const rimResult = calculateResidualIncome(
            bookValuePerShare,
            inputs.returnOnEquity,
            wacc,
            5,
            inputs.currentPrice
        );
        if (rimResult.fairValue > 0) {
            methods.push(rimResult);
        }
    }

    // ========== SMART SYNTHESIS ==========
    // Weight growth-aware methods higher than floor methods

    interface WeightedMethod {
        method: string;
        value: number;
        weight: number;
        isFloor: boolean;  // Floor methods (Graham, EPV) are conservative limits
    }

    const weightedMethods: WeightedMethod[] = [];

    // DCF: Primary method (weight: 40%)
    if (dcfResult.fairValue > 0) {
        weightedMethods.push({
            method: 'DCF',
            value: dcfResult.fairValue,
            weight: 0.40,
            isFloor: false
        });
    }

    // Lynch: Growth-aware (weight: 35%)
    if (lynchResult.fairValue > 0) {
        weightedMethods.push({
            method: 'Lynch',
            value: lynchResult.fairValue,
            weight: 0.35,
            isFloor: false
        });
    }

    // Graham: Floor only (weight: 15%)
    if (grahamResult.fairValue > 0) {
        weightedMethods.push({
            method: 'Graham',
            value: grahamResult.fairValue,
            weight: 0.15,
            isFloor: true
        });
    }

    // EPV: Floor only (weight: 10%)
    const epvResult = methods.find(m => m.method === 'Earnings Power Value');
    if (epvResult && epvResult.fairValue > 0) {
        weightedMethods.push({
            method: 'EPV',
            value: epvResult.fairValue,
            weight: 0.10,
            isFloor: true
        });
    }

    // Calculate weighted average (Best Estimate)
    const totalWeight = weightedMethods.reduce((sum, m) => sum + m.weight, 0);
    const weightedSum = weightedMethods.reduce((sum, m) => sum + (m.value * m.weight), 0);
    const bestEstimate = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Simple average (all methods equal)
    const validValues = methods
        .filter(m => m.fairValue > 0 && m.method !== 'Reverse DCF')
        .map(m => m.fairValue);
    const simpleAvg = validValues.length > 0
        ? validValues.reduce((a, b) => a + b, 0) / validValues.length
        : 0;

    // Median
    const sorted = [...validValues].sort((a, b) => a - b);
    const median = sorted.length > 0
        ? sorted[Math.floor(sorted.length / 2)]
        : 0;

    // Conservative: Apply 15% margin of safety to best estimate
    const conservative = bestEstimate * 0.85;

    // Use BEST ESTIMATE for upside calculation (not simple average)
    const upside = bestEstimate > 0 ? ((bestEstimate / inputs.currentPrice) - 1) * 100 : 0;

    // Verdict based on upside
    let verdict: ComprehensiveValuation['verdict'];
    if (upside > 25) {
        verdict = 'STRONG_BUY';
    } else if (upside > 10) {
        verdict = 'BUY';
    } else if (upside > -10) {
        verdict = 'HOLD';
    } else if (upside > -25) {
        verdict = 'SELL';
    } else {
        verdict = 'STRONG_SELL';
    }

    return {
        ticker: inputs.sector || 'UNKNOWN',
        currentPrice: inputs.currentPrice,
        dcfFairValue: dcfResult.fairValue,
        grahamNumber: grahamResult.fairValue,
        lynchFairValue: lynchResult.fairValue,
        epvFairValue: epvResult?.fairValue || 0,
        ddmFairValue: methods.find(m => m.method === 'Dividend Discount Model')?.fairValue || null,
        reverseDCFImpliedGrowth: parseFloat(
            (reverseDCF.assumptions.impliedGrowth as string)?.replace('%', '') || '0'
        ),
        averageFairValue: Math.round(bestEstimate * 100) / 100,  // Now returns WEIGHTED average
        medianFairValue: Math.round(median * 100) / 100,
        conservativeFairValue: Math.round(conservative * 100) / 100,
        upside: Math.round(upside * 10) / 10,
        verdict,
        methods
    };
}

