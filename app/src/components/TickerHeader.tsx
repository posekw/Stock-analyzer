"use client";

import { useDashboardStore } from "@/stores/dashboardStore";
import { useValuationStore } from "@/stores/valuationStore";
import { useState } from "react";

interface ValuationMethod {
    method: string;
    fairValue: number;
    upside: number;
    confidence: 'high' | 'medium' | 'low';
    assumptions: Record<string, string | number>;
    details?: string;
}

interface ComprehensiveValuation {
    dcfFairValue: number;
    grahamNumber: number;
    lynchFairValue: number;
    epvFairValue: number;
    ddmFairValue: number | null;
    averageFairValue: number;
    medianFairValue: number;
    conservativeFairValue: number;
    impliedGrowth: number;
    upside: number;
    verdict: string;
    methods: ValuationMethod[];
}

export function TickerHeader() {
    const { currentTicker, setMarketPrice } = useDashboardStore();
    const { setFcfPerShare, setSuggestions, setFundamentals } = useValuationStore();
    const [valuation, setValuation] = useState<ComprehensiveValuation | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [companyName, setCompanyName] = useState<string>('');

    const handleFetch = async () => {
        if (!currentTicker) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/stock?ticker=${currentTicker}`);
            const data = await res.json();

            if (data.error) {
                console.error('API Error:', data.error);
                return;
            }

            // Update stores
            setMarketPrice(data.price);
            setCurrentPrice(data.price);
            setCompanyName(data.companyName);

            if (data.fcfPerShare) setFcfPerShare(data.fcfPerShare);
            if (data.valuation) setValuation(data.valuation);
            if (data.suggestions) {
                setSuggestions(
                    data.suggestions,
                    data.sector,
                    data.companyName,
                    data.financials
                );
            }
            if (data.fundamentals) {
                setFundamentals(data.fundamentals);
            }
        } catch (e) {
            console.error("Failed to fetch stock data", e);
        } finally {
            setLoading(false);
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'STRONG_BUY': return 'text-green-400 bg-green-500/20 border-green-500/50';
            case 'BUY': return 'text-green-300 bg-green-500/10 border-green-500/30';
            case 'HOLD': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
            case 'SELL': return 'text-red-300 bg-red-500/10 border-red-500/30';
            case 'STRONG_SELL': return 'text-red-400 bg-red-500/20 border-red-500/50';
            default: return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/50';
        }
    };

    const getConfidenceColor = (conf: string) => {
        switch (conf) {
            case 'high': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-red-400';
            default: return 'text-zinc-400';
        }
    };

    return (
        <header className="mb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Comprehensive Valuation</h1>
                    <p className="text-zinc-400 text-sm">
                        Multi-method analysis for{" "}
                        <span className="text-emerald-400 font-mono font-semibold">{currentTicker}</span>
                        {companyName && <span className="text-zinc-500"> • {companyName}</span>}
                    </p>
                </div>

                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-emerald-900/20"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <span>📊</span>
                            <span>Get FMP Data</span>
                        </>
                    )}
                </button>
            </div>

            {/* Comprehensive Valuation Results */}
            {valuation && (
                <div className="mt-6 space-y-4">
                    {/* Main Verdict Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getVerdictColor(valuation.verdict)}`}>
                                        {valuation.verdict.replace('_', ' ')}
                                    </span>
                                    <span className={`text-2xl font-bold ${valuation.upside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {valuation.upside >= 0 ? '+' : ''}{valuation.upside.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-zinc-400 text-sm">
                                    Based on {valuation.methods.filter(m => m.fairValue > 0 && m.method !== 'Reverse DCF').length} valuation methods
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Current Price</p>
                                <p className="text-2xl font-bold text-white">${currentPrice.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Fair Value Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Average Fair Value</p>
                                <p className="text-xl font-bold text-emerald-400">${valuation.averageFairValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Conservative Value</p>
                                <p className="text-xl font-bold text-blue-400">${valuation.conservativeFairValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">DCF Fair Value</p>
                                <p className="text-xl font-bold text-purple-400">${valuation.dcfFairValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Implied Growth</p>
                                <p className="text-xl font-bold text-amber-400">{valuation.impliedGrowth.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* All Methods */}
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">All Valuation Methods</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {valuation.methods.map((method, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/20 hover:border-zinc-600/30 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-white text-sm">{method.method}</h4>
                                            <span className={`text-xs ${getConfidenceColor(method.confidence)}`}>
                                                {method.confidence}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-lg font-bold text-white">
                                                ${method.fairValue.toFixed(2)}
                                            </span>
                                            <span className={`text-sm font-medium ${method.upside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {method.upside >= 0 ? '+' : ''}{method.upside.toFixed(1)}%
                                            </span>
                                        </div>
                                        {method.details && (
                                            <p className="text-xs text-zinc-500 mt-2">{method.details}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                            <p className="text-xs text-zinc-500 mb-1">Graham Number</p>
                            <p className="text-lg font-bold text-white">${valuation.grahamNumber.toFixed(2)}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                            <p className="text-xs text-zinc-500 mb-1">Lynch Fair Value</p>
                            <p className="text-lg font-bold text-white">${valuation.lynchFairValue.toFixed(2)}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                            <p className="text-xs text-zinc-500 mb-1">EPV</p>
                            <p className="text-lg font-bold text-white">${valuation.epvFairValue.toFixed(2)}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                            <p className="text-xs text-zinc-500 mb-1">DDM</p>
                            <p className="text-lg font-bold text-white">
                                {valuation.ddmFairValue ? `$${valuation.ddmFairValue.toFixed(2)}` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
