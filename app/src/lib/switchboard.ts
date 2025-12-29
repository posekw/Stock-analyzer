import { SectorType, ValuatonConstraint, ValuationModelConfig } from "@/types/valuation-architectures";

/**
 * THE SWITCHBOARD
 * 
 * Logic to map stock industry/sector to specific valuation methodologies.
 */

export function detectSector(sector: string, industry: string): SectorType {
    const s = sector?.toLowerCase() || '';
    const i = industry?.toLowerCase() || '';

    // 1. Financials (Banks & Insurance)
    // Avoid "Financial Data" or Fintechs which might be "Technology"
    if (s.includes('financial') || s.includes('bank') || s.includes('insurance')) {
        // Exclude Fintech if possible (often classified as tech in some systems, but GICS puts Visa/Mastercard in Financials sometimes)
        // For now, if it smells like a bank, treat it as a bank
        return 'FINANCIAL';
    }

    // 2. Real Estate / REITs
    if (s.includes('real estate') || i.includes('reit')) {
        return 'REIT';
    }

    // 3. Biotech
    if (i.includes('biotechnology') || i.includes('pharmaceutical')) {
        return 'BIOTECH';
    }

    // 4. Technology (Split into Growth vs Mature later? For now, detect potential SaaS)
    if (s.includes('technology') || i.includes('software') || i.includes('internet')) {
        return 'TECH_GROWTH';
    }

    // 5. Cyclical (Energy, Materials)
    if (s.includes('energy') || s.includes('basic materials') || i.includes('oil') || i.includes('mining')) {
        return 'CYCLICAL';
    }

    // Default
    return 'GENERAL';
}

/**
 * Get Valid Models for Sector
 * Returns the list of engines that should be run for this sector.
 */
export function getValuationConfig(sector: SectorType): ValuationModelConfig {
    switch (sector) {
        case 'FINANCIAL':
            return {
                primary: 'RESIDUAL_INCOME',
                secondary: 'PRICE_TO_BOOK',
                warnings: ['DCF is unreliable for banks due to nature of cash flow. Using RIM & P/B.']
            };
        case 'REIT':
            return {
                primary: 'NAV', // We will build a simple NAV proxy
                secondary: 'PRICE_TO_FFO',
                warnings: ['Net Income is distorted by depreciation. Using FFO/AFFO logic.']
            };
        case 'TECH_GROWTH':
            return {
                primary: 'DCF_GROWTH', // Standard DCF but with high growth allowance
                secondary: 'EV_SALES',
                warnings: ['High reliance on future growth. Check Rule of 40.']
            };
        case 'BIOTECH':
            return {
                primary: 'R_NPV', // Risk Adjusted NPV
                secondary: 'CASH_BURN',
                warnings: ['Valuation depends heavily on clinical trial success probability.']
            };
        case 'CYCLICAL':
            return {
                primary: 'NORMALIZED_DCF', // Using average earnings
                secondary: 'PE_AVG',
                warnings: ['Cyclical peak/trough detected. Using normalized 5-10y earnings.']
            };
        default:
            return {
                primary: 'DCF_STANDARD',
                secondary: 'EV_EBITDA',
                warnings: []
            };
    }
}
