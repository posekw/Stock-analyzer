"use client";

import { useState, useCallback } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { AdvancedPriceChart } from "@/components/technicals/AdvancedPriceChart";
import { KeyIndicators } from "@/components/technicals/KeyIndicators";
import { TechnicalSignals } from "@/components/technicals/TechnicalSignals";

interface PivotPoints {
    pp: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
}

interface MovingAverages {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
}

interface TechnicalData {
    ticker: string;
    currentPrice: number;
    timeframe: string;
    keyTechnicals: {
        support?: number;
        resistance?: number;
        stopLoss?: number;
        calculatedSupport?: number[];
        calculatedResistance?: number[];
        pivotPoints?: PivotPoints;
    };
    movingAverages?: MovingAverages;
    indicators?: {
        rsi: number | null;
        rsiSignal: string | null;
    };
    technicalEvents: {
        provider?: string;
        sector?: string;
        shortTermOutlook?: any;
        intermediateTermOutlook?: any;
        longTermOutlook?: any;
    };
    valuation: {
        description?: string;
        discount?: string;
        relativeValue?: string;
    };
    chart: {
        quotes: any[];
        currency?: string;
        symbol?: string;
        dataPoints?: number;
    };
}

export default function TechnicalsPage() {
    const { currentTicker, marketPrice, setMarketPrice } = useDashboardStore();
    const [data, setData] = useState<TechnicalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState('1Y');

    const fetchTechnicals = useCallback(async (tf: string = timeframe) => {
        if (!currentTicker) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/technicals?ticker=${currentTicker}&timeframe=${tf}`);
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to fetch technical data");
            }

            setData(result);
            setTimeframe(tf);

            // Update market price in store
            if (result.currentPrice) {
                setMarketPrice(result.currentPrice);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch technical data");
        } finally {
            setLoading(false);
        }
    }, [currentTicker, timeframe, setMarketPrice]);

    const handleTimeframeChange = (newTimeframe: string) => {
        fetchTechnicals(newTimeframe);
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-900/15 rounded-full blur-[128px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Technical Analysis</h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            Advanced charts, support/resistance & indicators for{" "}
                            <span className="text-emerald-400 font-mono font-semibold">
                                {currentTicker || "..."}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => fetchTechnicals()}
                        disabled={loading || !currentTicker}
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
                                <span>Analyze</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-8">
                        {error}
                    </div>
                )}

                {/* Content */}
                {data ? (
                    <div className="space-y-6">
                        {/* Chart - Full Width */}
                        <AdvancedPriceChart
                            quotes={data.chart.quotes}
                            ticker={data.ticker}
                            currentPrice={data.currentPrice}
                            support={data.keyTechnicals.support}
                            resistance={data.keyTechnicals.resistance}
                            calculatedSupport={data.keyTechnicals.calculatedSupport}
                            calculatedResistance={data.keyTechnicals.calculatedResistance}
                            pivotPoints={data.keyTechnicals.pivotPoints}
                            movingAverages={data.movingAverages}
                            timeframe={timeframe}
                            onTimeframeChange={handleTimeframeChange}
                        />

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left: Key Levels & Indicators */}
                            <div className="lg:col-span-5 space-y-6">
                                <KeyIndicators
                                    support={data.keyTechnicals.support}
                                    resistance={data.keyTechnicals.resistance}
                                    stopLoss={data.keyTechnicals.stopLoss}
                                    currentPrice={data.currentPrice}
                                />

                                {/* Pivot Points Card */}
                                {data.keyTechnicals.pivotPoints && (
                                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-4">📐 Pivot Points</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">R3</span>
                                                    <span className="text-red-400 font-mono">${data.keyTechnicals.pivotPoints.r3}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">R2</span>
                                                    <span className="text-red-400 font-mono">${data.keyTechnicals.pivotPoints.r2}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">R1</span>
                                                    <span className="text-red-400 font-mono">${data.keyTechnicals.pivotPoints.r1}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">Pivot</span>
                                                    <span className="text-purple-400 font-mono">${data.keyTechnicals.pivotPoints.pp}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">S1</span>
                                                    <span className="text-green-400 font-mono">${data.keyTechnicals.pivotPoints.s1}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 text-sm">S2</span>
                                                    <span className="text-green-400 font-mono">${data.keyTechnicals.pivotPoints.s2}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* RSI Card */}
                                {data.indicators?.rsi && (
                                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-4">📊 RSI Indicator</h3>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-3xl font-bold text-white">{data.indicators.rsi}</span>
                                                <span className="text-zinc-500 text-sm ml-2">/ 100</span>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.indicators.rsiSignal === 'OVERBOUGHT'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : data.indicators.rsiSignal === 'OVERSOLD'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-zinc-500/20 text-zinc-400'
                                                }`}>
                                                {data.indicators.rsiSignal}
                                            </span>
                                        </div>
                                        {/* RSI bar */}
                                        <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${data.indicators.rsi > 70 ? 'bg-red-500'
                                                        : data.indicators.rsi < 30 ? 'bg-green-500'
                                                            : 'bg-yellow-500'
                                                    }`}
                                                style={{ width: `${data.indicators.rsi}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-zinc-500">
                                            <span>0 (Oversold)</span>
                                            <span>50</span>
                                            <span>100 (Overbought)</span>
                                        </div>
                                    </div>
                                )}

                                {/* Moving Averages Card */}
                                {data.movingAverages && (
                                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-4">📈 Moving Averages</h3>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'SMA 20', value: data.movingAverages.sma20, color: 'text-yellow-400' },
                                                { label: 'SMA 50', value: data.movingAverages.sma50, color: 'text-blue-400' },
                                                { label: 'SMA 200', value: data.movingAverages.sma200, color: 'text-pink-400' },
                                                { label: 'EMA 12', value: data.movingAverages.ema12, color: 'text-cyan-400' },
                                                { label: 'EMA 26', value: data.movingAverages.ema26, color: 'text-purple-400' },
                                            ].map(ma => (
                                                <div key={ma.label} className="flex justify-between items-center">
                                                    <span className="text-zinc-500 text-sm">{ma.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono ${ma.color}`}>
                                                            {ma.value ? `$${ma.value}` : 'N/A'}
                                                        </span>
                                                        {ma.value && data.currentPrice && (
                                                            <span className={`text-xs ${data.currentPrice > ma.value ? 'text-green-400' : 'text-red-400'
                                                                }`}>
                                                                {data.currentPrice > ma.value ? '↑' : '↓'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Technical Signals & Valuation */}
                            <div className="lg:col-span-7 space-y-6">
                                <TechnicalSignals
                                    provider={data.technicalEvents.provider}
                                    sector={data.technicalEvents.sector}
                                    shortTerm={data.technicalEvents.shortTermOutlook}
                                    intermediateTerm={data.technicalEvents.intermediateTermOutlook}
                                    longTerm={data.technicalEvents.longTermOutlook}
                                />

                                {/* Valuation Summary */}
                                {data.valuation.description && (
                                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-2">💰 Valuation Assessment</h3>
                                        <p className="text-zinc-300">{data.valuation.description}</p>
                                        {data.valuation.relativeValue && (
                                            <p className="text-sm text-emerald-400 mt-2">
                                                Relative Value: {data.valuation.relativeValue}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Data Info */}
                                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/30">
                                    <div className="flex items-center justify-between text-sm text-zinc-500">
                                        <span>Data Points: {data.chart.dataPoints} ({timeframe})</span>
                                        <span>Currency: {data.chart.currency || 'USD'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !loading ? (
                    <div className="text-center py-20">
                        <div className="text-7xl mb-6">📈</div>
                        <h2 className="text-2xl font-semibold text-zinc-300 mb-3">Ready for Analysis</h2>
                        <p className="text-zinc-500 max-w-md mx-auto">
                            Click &quot;Analyze&quot; to fetch technical indicators, price charts with support/resistance levels, and trading signals.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2 justify-center text-sm text-zinc-600">
                            <span className="px-3 py-1 bg-zinc-800/50 rounded">1M</span>
                            <span className="px-3 py-1 bg-zinc-800/50 rounded">6M</span>
                            <span className="px-3 py-1 bg-emerald-600/30 rounded text-emerald-400">1Y</span>
                            <span className="px-3 py-1 bg-zinc-800/50 rounded">3Y</span>
                            <span className="px-3 py-1 bg-zinc-800/50 rounded">5Y</span>
                            <span className="px-3 py-1 bg-zinc-800/50 rounded">10Y</span>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
