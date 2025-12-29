import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ValuationState, ValuationModel, DCFAssumptions } from '@/types/valuation';
import { calculateDCF, calculateFullDCF } from '@/lib/valuation';
import type {
    FMPIncomeStatement,
    FMPBalanceSheet,
    FMPCashFlowStatement,
    FMPAnalystEstimates
} from '@/types/fmp';

interface SuggestionInfo {
    value: number;
    source: string;
    raw?: any;
}

interface Suggestions {
    revenueGrowth: SuggestionInfo;
    terminalGrowth: SuggestionInfo;
    wacc: SuggestionInfo;
    marginExpansion: SuggestionInfo;
    exitMultiple: SuggestionInfo;
    ebitdaMargin: SuggestionInfo;
    fcfConversionRate: SuggestionInfo;
}

interface CompanyFundamentals {
    totalRevenue: number | null;
    ebitda: number | null;
    freeCashFlow: number | null;
    sharesOutstanding: number | null;
    cash: number | null;
    shortTermInvestments: number | null;
    longTermInvestments: number | null;
    totalDebt: number | null;
}

interface FinancialData {
    income: FMPIncomeStatement[];
    balance: FMPBalanceSheet[];
    cashflow: FMPCashFlowStatement[];
    estimates: FMPAnalystEstimates[];
}

interface ValuationStore extends ValuationState {
    suggestions: Suggestions | null;
    financials: FinancialData | null;
    sector: string | null;
    companyName: string | null;
    fundamentals: CompanyFundamentals | null;

    setAssumption: (key: keyof DCFAssumptions, value: number) => void;
    setModel: (model: ValuationModel) => void;
    setFcfPerShare: (value: number) => void;
    setFundamentals: (fundamentals: CompanyFundamentals) => void;
    setSuggestions: (suggestions: Suggestions, sector: string, companyName: string, financials?: FinancialData) => void;
    applySuggestions: () => void;
    resetToDefaults: () => void;
    recalculate: () => void;
}

// Defaults
const DEFAULT_ASSUMPTIONS: DCFAssumptions = {
    revenueGrowth: 8.0,
    terminalGrowth: 2.5,
    wacc: 10.0,
    marginExpansion: 1.0,
    exitMultiple: 0,
    ebitdaMargin: 0,
    fcfConversionRate: 0,
};

const DEFAULT_FCF = 5.0;

export const useValuationStore = create<ValuationStore>()(
    immer((set, get) => ({
        model: 'DCF',
        assumptions: DEFAULT_ASSUMPTIONS,
        fcfPerShare: DEFAULT_FCF,
        fairValue: calculateDCF(DEFAULT_ASSUMPTIONS, DEFAULT_FCF),
        suggestions: null,
        financials: null,
        sector: null,
        companyName: null,
        fundamentals: null,

        setAssumption: (key, value) =>
            set((state) => {
                state.assumptions[key] = value;
                const { fundamentals, assumptions, fcfPerShare } = get();
                if (fundamentals && fundamentals.freeCashFlow && fundamentals.sharesOutstanding) {
                    state.fairValue = calculateFullDCF(state.assumptions, fundamentals as any);
                } else {
                    state.fairValue = calculateDCF(state.assumptions, fcfPerShare);
                }
            }),

        setModel: (model) =>
            set((state) => {
                state.model = model;
            }),

        setFcfPerShare: (value) =>
            set((state) => {
                state.fcfPerShare = value;
                const { fundamentals } = get();
                if (fundamentals && fundamentals.freeCashFlow && fundamentals.sharesOutstanding) {
                    state.fairValue = calculateFullDCF(state.assumptions, fundamentals as any);
                } else {
                    state.fairValue = calculateDCF(state.assumptions, value);
                }
            }),

        setFundamentals: (fundamentals) =>
            set((state) => {
                state.fundamentals = fundamentals;
                if (fundamentals.freeCashFlow && fundamentals.sharesOutstanding) {
                    state.fairValue = calculateFullDCF(state.assumptions, fundamentals as any);
                }
            }),

        setSuggestions: (suggestions, sector, companyName, financials) =>
            set((state) => {
                state.suggestions = suggestions;
                state.sector = sector;
                state.companyName = companyName;
                if (financials) {
                    state.financials = financials;
                }
            }),

        applySuggestions: () =>
            set((state) => {
                if (state.suggestions) {
                    state.assumptions = {
                        revenueGrowth: state.suggestions.revenueGrowth.value,
                        terminalGrowth: state.suggestions.terminalGrowth.value,
                        wacc: state.suggestions.wacc.value,
                        marginExpansion: state.suggestions.marginExpansion.value,
                        exitMultiple: state.suggestions.exitMultiple.value,
                        ebitdaMargin: state.suggestions.ebitdaMargin?.value || 0,
                        fcfConversionRate: state.suggestions.fcfConversionRate?.value || 0,
                    };
                    const { fundamentals, fcfPerShare } = get();
                    if (fundamentals && fundamentals.freeCashFlow && fundamentals.sharesOutstanding) {
                        state.fairValue = calculateFullDCF(state.assumptions, fundamentals as any);
                    } else {
                        state.fairValue = calculateDCF(state.assumptions, fcfPerShare);
                    }
                }
            }),

        recalculate: () =>
            set((state) => {
                const { fundamentals, assumptions, fcfPerShare } = get();
                if (fundamentals && fundamentals.freeCashFlow && fundamentals.sharesOutstanding) {
                    state.fairValue = calculateFullDCF(assumptions, fundamentals as any);
                } else {
                    state.fairValue = calculateDCF(assumptions, fcfPerShare);
                }
            }),

        resetToDefaults: () =>
            set((state) => {
                state.assumptions = DEFAULT_ASSUMPTIONS;
                state.fcfPerShare = DEFAULT_FCF;
                state.fundamentals = null;
                state.suggestions = null;
                state.financials = null;
                state.sector = null;
                state.companyName = null;
                state.fairValue = calculateDCF(DEFAULT_ASSUMPTIONS, DEFAULT_FCF);
            }),
    }))
);
