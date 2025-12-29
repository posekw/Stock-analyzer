import { NormalizedFinancials } from "@/types/valuation-architectures";

/**
 * ASSET-BASED VALUATION ENGINE
 * 
 * Logic for floor valuations based on balance sheet assets.
 */

// 1. Modified Graham Number
// Formula: Sqrt(22.5 * EPS * BVPS)
export function calculateGrahamNumber(eps: number, bvps: number): number {
    if (eps < 0 || bvps < 0) return 0; // Cannot calculate for loss-makers
    return Math.sqrt(22.5 * eps * bvps);
}

// 2. Net-Net Working Capital (NNWC)
// Formula: Cash + 0.75*Receivables + 0.5*Inventory - Total Liabilities
// "Dead" value (Liquidation value)
export function calculateNNWC(financials: NormalizedFinancials): number {
    const bs = financials.balanceSheet;

    // Formula: Cash + (0.75 * Receivables) + (0.5 * Inventory) - Total Liabilities
    const adjustedAssets =
        bs.cashAndEquivalents +
        (0.75 * bs.receivables) +
        (0.5 * bs.inventory);

    const nnwcVal = adjustedAssets - bs.totalLiabilities;

    // Return per-share value
    if (bs.sharesOutstanding > 0) {
        return Math.max(0, nnwcVal / bs.sharesOutstanding);
    }
    return 0;
}

/**
 * Enhanced Asset Valuation
 * Calculates standard Graham Number and potentially NAV for REITs
 */
export function calculateAssetValue(financials: NormalizedFinancials, sector: string): number {
    const eps = financials.ttm.eps;
    const bvps = financials.ttm.bookValue;

    if (sector === 'REIT') {
        // REIT specific logic (placeholder)
        // NAV = (NOI / CapRate) - Debt
        return bvps * 1.1; // Slight premium to book for simple proxy
    }

    return calculateGrahamNumber(eps, bvps);
}
