import { DCFAssumptions } from "@/types/valuation";

/**
 * UNIVERSAL DCF VALUATION MODEL
 * 
 * A standard, textbook Discounted Cash Flow model that works with any stock.
 * 
 * Formula:
 * Fair Value = PV of Future FCFs + PV of Terminal Value
 * 
 * Where:
 * - Future FCFs are projected using user-provided growth rate
 * - Terminal Value = Final Year FCF × (1 + Terminal Growth) / (WACC - Terminal Growth)
 * - All values discounted back at WACC
 */

interface CompanyFundamentals {
    totalRevenue: number;         // In millions
    ebitda: number;               // In millions
    freeCashFlow: number;         // In millions
    sharesOutstanding: number;    // In millions
    cash: number;                 // In millions
    shortTermInvestments: number; // In millions
    longTermInvestments: number;  // In millions
    totalDebt: number;            // In millions
}

/**
 * Standard DCF Calculation
 * 
 * This is the classic 2-stage DCF model used by analysts worldwide:
 * - Stage 1: Explicit forecast period (typically 5 years) with declining growth
 * - Stage 2: Terminal value using perpetuity growth model
 */
export function calculateDCF(assumptions: DCFAssumptions, currentFCFPerShare: number): number {
    const {
        revenueGrowth,
        terminalGrowth,
        wacc,
    } = assumptions;

    if (currentFCFPerShare <= 0 || wacc <= 0) return 0;
    if (wacc <= terminalGrowth) return 0; // Invalid: would produce infinite value

    const projectionYears = 5;
    const waccRate = wacc / 100;
    const terminalRate = terminalGrowth / 100;
    const initialGrowthRate = revenueGrowth / 100;

    // Stage 1: Project FCF for each year with declining growth
    const projectedFCF: number[] = [];
    let fcf = currentFCFPerShare;

    for (let year = 1; year <= projectionYears; year++) {
        // Growth declines linearly from initial rate to terminal rate over the forecast period
        // This is more realistic than constant growth
        const growthDecay = (initialGrowthRate - terminalRate) * ((projectionYears - year) / projectionYears);
        const yearGrowthRate = terminalRate + growthDecay;

        fcf = fcf * (1 + yearGrowthRate);
        projectedFCF.push(fcf);
    }

    // Discount Stage 1 FCFs back to present value
    let pvOfFCFs = 0;
    for (let i = 0; i < projectionYears; i++) {
        pvOfFCFs += projectedFCF[i] / Math.pow(1 + waccRate, i + 1);
    }

    // Stage 2: Terminal Value using Gordon Growth Model
    // TV = FCF_final × (1 + g) / (WACC - g)
    const finalFCF = projectedFCF[projectedFCF.length - 1];
    const terminalValue = (finalFCF * (1 + terminalRate)) / (waccRate - terminalRate);

    // Discount terminal value back to present
    const pvOfTerminalValue = terminalValue / Math.pow(1 + waccRate, projectionYears);

    // Total Fair Value = PV of FCFs + PV of Terminal Value
    const fairValue = pvOfFCFs + pvOfTerminalValue;

    return Math.max(0, fairValue);
}

/**
 * Full DCF with Enterprise-to-Equity Bridge
 * 
 * Calculates enterprise value from projected FCFs, then converts to equity value:
 * Equity Value = Enterprise Value + Cash - Debt
 */
export function calculateFullDCF(
    assumptions: DCFAssumptions,
    fundamentals: CompanyFundamentals
): number {
    const {
        revenueGrowth,
        terminalGrowth,
        wacc,
    } = assumptions;

    // Validate inputs
    if (!fundamentals.freeCashFlow || fundamentals.freeCashFlow <= 0) return 0;
    if (!fundamentals.sharesOutstanding || fundamentals.sharesOutstanding <= 0) return 0;
    if (wacc <= terminalGrowth) return 0;

    const projectionYears = 5;
    const waccRate = wacc / 100;
    const terminalRate = terminalGrowth / 100;
    const initialGrowthRate = revenueGrowth / 100;

    // Stage 1: Project FCF with declining growth
    const projectedFCF: number[] = [];
    let fcf = fundamentals.freeCashFlow; // In millions

    for (let year = 1; year <= projectionYears; year++) {
        // Linear growth decay from initial rate to terminal rate
        const growthDecay = (initialGrowthRate - terminalRate) * ((projectionYears - year) / projectionYears);
        const yearGrowthRate = terminalRate + growthDecay;

        fcf = fcf * (1 + yearGrowthRate);
        projectedFCF.push(fcf);
    }

    // Discount Stage 1 FCFs
    let pvOfFCFs = 0;
    for (let i = 0; i < projectionYears; i++) {
        pvOfFCFs += projectedFCF[i] / Math.pow(1 + waccRate, i + 1);
    }

    // Terminal Value (Gordon Growth)
    const finalFCF = projectedFCF[projectedFCF.length - 1];
    const terminalValue = (finalFCF * (1 + terminalRate)) / (waccRate - terminalRate);
    const pvOfTerminalValue = terminalValue / Math.pow(1 + waccRate, projectionYears);

    // Enterprise Value (in millions)
    const enterpriseValue = pvOfFCFs + pvOfTerminalValue;

    // Bridge to Equity Value
    const cash = fundamentals.cash || 0;
    const shortTermInvestments = fundamentals.shortTermInvestments || 0;
    const longTermInvestments = fundamentals.longTermInvestments || 0;
    const totalDebt = fundamentals.totalDebt || 0;

    const equityValue = enterpriseValue + cash + shortTermInvestments + longTermInvestments - totalDebt;

    // Fair Value per Share
    const fairValuePerShare = equityValue / fundamentals.sharesOutstanding;

    return Math.max(0, fairValuePerShare);
}

/**
 * WACC Calculation using CAPM
 * 
 * WACC = Risk-Free Rate + Beta × Equity Risk Premium
 * 
 * Using current market assumptions:
 * - Risk-Free Rate: ~4.5% (10-year Treasury)
 * - Equity Risk Premium: ~5.5% (historical average)
 */
export function calculateWACC(beta: number, _sector?: string): number {
    const riskFreeRate = 4.5;
    const equityRiskPremium = 5.5;

    // CAPM: Required Return = Rf + β × (Rm - Rf)
    const wacc = riskFreeRate + (beta * equityRiskPremium);

    // Clamp to reasonable range (6% to 15%)
    return Math.max(6, Math.min(15, Math.round(wacc * 10) / 10));
}

/**
 * Suggest reasonable growth rate based on historical data
 */
export function suggestGrowthRate(
    historicalRevenueGrowth: number | null,
    historicalEarningsGrowth: number | null,
    sector: string
): { rate: number; source: string } {
    // Sector baseline growth rates
    const sectorGrowth: Record<string, number> = {
        'Technology': 12,
        'Healthcare': 8,
        'Consumer Cyclical': 6,
        'Consumer Defensive': 4,
        'Financial Services': 6,
        'Industrials': 5,
        'Energy': 3,
        'Utilities': 3,
        'Real Estate': 5,
        'Communication Services': 6,
        'Basic Materials': 4,
    };

    const sectorDefault = sectorGrowth[sector] || 6;

    // Prefer historical revenue growth if available and reasonable
    if (historicalRevenueGrowth !== null && historicalRevenueGrowth > 0 && historicalRevenueGrowth < 50) {
        // Cap at a reasonable maximum (30%) and apply slight discount for conservatism
        const suggested = Math.min(30, historicalRevenueGrowth * 0.9);
        return {
            rate: Math.round(suggested * 10) / 10,
            source: 'Historical revenue growth (discounted 10%)'
        };
    }

    // Fall back to sector average
    return {
        rate: sectorDefault,
        source: `${sector} sector average`
    };
}

/**
 * Calculate sensitivity table for DCF
 * Shows fair value at different WACC and growth rate combinations
 */
export function calculateSensitivityTable(
    baseFCFPerShare: number,
    terminalGrowth: number = 2.5,
    centerWACC: number = 10,
    centerGrowth: number = 10
): { wacc: number; growth: number; fairValue: number }[] {
    const results: { wacc: number; growth: number; fairValue: number }[] = [];

    // WACC range: center ± 2%
    const waccRange = [centerWACC - 2, centerWACC - 1, centerWACC, centerWACC + 1, centerWACC + 2];
    // Growth range: center ± 4%
    const growthRange = [centerGrowth - 4, centerGrowth - 2, centerGrowth, centerGrowth + 2, centerGrowth + 4];

    for (const wacc of waccRange) {
        for (const growth of growthRange) {
            if (wacc > terminalGrowth && growth >= 0) {
                const assumptions: DCFAssumptions = {
                    revenueGrowth: growth,
                    terminalGrowth,
                    wacc,
                    marginExpansion: 1,
                    exitMultiple: 0,
                    ebitdaMargin: 0,
                    fcfConversionRate: 0
                };
                const fairValue = calculateDCF(assumptions, baseFCFPerShare);
                results.push({ wacc, growth, fairValue: Math.round(fairValue * 100) / 100 });
            }
        }
    }
    return results;
}

/**
 * REVERSE DCF
 * 
 * Solves for the Implied Growth Rate that justifies the current stock price.
 */
export function calculateReverseDCF(
    currentPrice: number,
    baseFCFPerShare: number,
    wacc: number,
    terminalGrowth: number = 2.5
): number {
    if (currentPrice <= 0 || baseFCFPerShare <= 0) return 0;

    let low = -20; // -20% growth
    let high = 100; // 100% growth
    let iterations = 0;

    while (iterations < 50) {
        const mid = (low + high) / 2;
        const assumptions: DCFAssumptions = {
            revenueGrowth: mid,
            terminalGrowth,
            wacc,
            marginExpansion: 0,
            exitMultiple: 0,
            ebitdaMargin: 0,
            fcfConversionRate: 0
        };

        const value = calculateDCF(assumptions, baseFCFPerShare);

        if (Math.abs(value - currentPrice) < 0.1) {
            return Math.round(mid * 10) / 10;
        }

        if (value > currentPrice) {
            high = mid; // Growth too high
        } else {
            low = mid; // Growth too low
        }
        iterations++;
    }

    return Math.round(((low + high) / 2) * 10) / 10;
}
