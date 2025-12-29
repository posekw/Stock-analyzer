"use client";

import { useValuationStore } from "@/stores/valuationStore";
import { useDashboardStore } from "@/stores/dashboardStore";

export function ValuationResult() {
    const { fairValue } = useValuationStore();
    const { marketPrice, setMarketPrice } = useDashboardStore();

    const upside = fairValue && marketPrice
        ? ((fairValue - marketPrice) / marketPrice) * 100
        : 0;

    const isUndervalued = fairValue && marketPrice ? fairValue > marketPrice : false;
    const colorClass = isUndervalued ? "text-emerald-400" : "text-rose-400";

    return (
        <div className="p-8 rounded-2xl bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center space-y-6">

            <div className="space-y-1">
                <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Intrinsic Value</h3>
                <div className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                    ${fairValue?.toFixed(2) ?? "---"}
                </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            <div className="grid grid-cols-2 gap-8 w-full">
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500 font-medium uppercase">Current Price</label>
                    <div className="relative flex items-center justify-center">
                        <span className="absolute left-2 text-zinc-500 text-sm">$</span>
                        <input
                            type="number"
                            value={marketPrice}
                            onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0)}
                            className="w-24 bg-transparent text-center text-xl font-semibold text-zinc-200 border-b border-zinc-700 focus:border-zinc-500 outline-none pb-1"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500 font-medium uppercase">Potential Upside</label>
                    <div className={`text-xl font-semibold ${colorClass}`}>
                        {upside > 0 ? "+" : ""}{upside.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase ${isUndervalued ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {isUndervalued ? "Strong Buy Opportunity" : "Overvalued"}
            </div>

        </div>
    );
}
