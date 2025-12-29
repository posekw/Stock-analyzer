import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type Verdict = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

interface DashboardState {
    currentTicker: string;
    verdict: Verdict;
    confidence: number;
    marketPrice: number;
    fairPrice: number;
}

interface DashboardStore extends DashboardState {
    setTicker: (ticker: string) => void;
    setVerdict: (verdict: Verdict) => void;
    setConfidence: (score: number) => void;
    setMarketPrice: (price: number) => void;
    setFairPrice: (price: number) => void;
}

export const useDashboardStore = create<DashboardStore>()(
    immer((set) => ({
        currentTicker: 'AAPL',
        verdict: 'HOLD',
        confidence: 50,
        marketPrice: 0,
        fairPrice: 0,

        setTicker: (ticker) =>
            set((state) => {
                state.currentTicker = ticker;
            }),

        setVerdict: (verdict) =>
            set((state) => {
                state.verdict = verdict;
            }),

        setConfidence: (score) =>
            set((state) => {
                state.confidence = score;
            }),

        setMarketPrice: (price) =>
            set((state) => {
                state.marketPrice = price;
            }),

        setFairPrice: (price) =>
            set((state) => {
                state.fairPrice = price;
            }),
    }))
);
