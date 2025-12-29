export type ValuationModel = 'DCF' | 'DDM';

// Simplified DCF assumptions - only the essential parameters
export interface DCFAssumptions {
    revenueGrowth: number;          // FCF growth rate for projection period (%)
    terminalGrowth: number;         // Long-term perpetual growth rate (%) - typically 2-3%
    wacc: number;                   // Discount rate (%) - your required return
    // Legacy fields kept for compatibility but not used in new model
    marginExpansion: number;
    exitMultiple: number;
    ebitdaMargin: number;
    fcfConversionRate: number;
}

export interface ValuationState {
    model: ValuationModel;
    assumptions: DCFAssumptions;
    fcfPerShare: number;
    fairValue: number | null;
}
