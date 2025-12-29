'use client';

import { useState } from 'react';
import { ValuationMethod, SectorAverages, CompanyMetrics, RelativeValuationResult } from '@/lib/relative-valuation';

interface RelativeValuationData {
    ticker: string;
    companyName: string;
    price: number;
    sector: string;
    industry: string;
    metrics: CompanyMetrics;
    sectorAverages: SectorAverages;
    valuation: RelativeValuationResult;
    summary: {
        fairValue: number;
        upside: number;
        verdict: string;
        sectorPremium: number;
        methodsUsed: number;
    };
}

interface ValuationMethodCardProps {
    result: ValuationMethod;
}

function ValuationMethodCard({ result }: ValuationMethodCardProps) {
    const isPositive = result.upside > 0;
    const confidenceColors = {
        high: 'bg-green-500/20 text-green-400 border-green-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-white">{result.method}</h4>
                <span className={`px-2 py-0.5 rounded text-xs border ${confidenceColors[result.confidence]}`}>
                    {result.confidence}
                </span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-bold text-white">
                    ${result.fairValue.toFixed(2)}
                </span>
                <span className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{result.upside.toFixed(1)}%
                </span>
            </div>
            <p className="text-sm text-gray-400">Weight: {(result.weight * 100).toFixed(0)}%</p>
        </div>
    );
}

interface SectorComparisonProps {
    metrics: CompanyMetrics;
    sectorAverages: SectorAverages;
}

function SectorComparison({ metrics, sectorAverages }: SectorComparisonProps) {
    const comparisons = [
        {
            label: 'P/E Ratio',
            company: metrics.peRatio,
            sector: sectorAverages.peRatio,
            format: (v: number | null) => v ? `${v.toFixed(1)}x` : 'N/A',
        },
        {
            label: 'EV/EBITDA',
            company: metrics.evToEbitda,
            sector: sectorAverages.evToEbitda,
            format: (v: number | null) => v ? `${v.toFixed(1)}x` : 'N/A',
        },
        {
            label: 'EV/Revenue',
            company: metrics.evToRevenue,
            sector: sectorAverages.evToRevenue,
            format: (v: number | null) => v ? `${v.toFixed(1)}x` : 'N/A',
        },
        {
            label: 'P/Book',
            company: metrics.priceToBook,
            sector: sectorAverages.priceToBook,
            format: (v: number | null) => v ? `${v.toFixed(1)}x` : 'N/A',
        },
    ];

    return (
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Sector Comparison</h3>
            <div className="space-y-3">
                {comparisons.map((comp) => {
                    const premium = comp.company && comp.sector
                        ? ((comp.company - comp.sector) / comp.sector) * 100
                        : 0;
                    const isPremium = premium > 0;

                    return (
                        <div key={comp.label} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{comp.label}</span>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-white font-medium">
                                        {comp.format(comp.company)}
                                    </span>
                                    <span className="text-gray-500 text-sm ml-2">
                                        vs {comp.format(comp.sector)}
                                    </span>
                                </div>
                                {comp.company && (
                                    <span className={`text-sm font-medium ${isPremium ? 'text-red-400' : 'text-green-400'}`}>
                                        {isPremium ? '+' : ''}{premium.toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function RelativeValuationPanel() {
    const [ticker, setTicker] = useState('AAPL');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<RelativeValuationData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFetch = async () => {
        if (!ticker.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/relative-valuation?ticker=${ticker.toUpperCase()}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch valuation');
            }

            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getVerdictStyles = (verdict: string) => {
        switch (verdict) {
            case 'Strong Buy':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'Buy':
                return 'bg-green-400/20 text-green-300 border-green-400/50';
            case 'Hold':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'Sell':
                return 'bg-red-400/20 text-red-300 border-red-400/50';
            case 'Strong Sell':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Relative Valuation</h1>
                    <p className="text-gray-400">
                        Fair value based on sector comparison (P/E, EV/EBITDA, etc.)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                        placeholder="AAPL"
                        className="w-28 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white uppercase focus:outline-none focus:border-green-500"
                    />
                    <button
                        onClick={handleFetch}
                        disabled={loading}
                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Analyze'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {data && (
                <>
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-3xl font-bold text-white">{data.ticker}</h2>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getVerdictStyles(data.summary.verdict)}`}>
                                        {data.summary.verdict}
                                    </span>
                                </div>
                                <p className="text-gray-400">{data.companyName}</p>
                                <p className="text-sm text-gray-500">{data.sector} • {data.industry}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-1">Current Price</p>
                                <p className="text-3xl font-bold text-white">${data.price.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-1">Fair Value</p>
                                <p className="text-3xl font-bold text-green-400">${data.summary.fairValue.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-1">Upside/Downside</p>
                                <p className={`text-3xl font-bold ${data.summary.upside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.summary.upside >= 0 ? '+' : ''}{data.summary.upside.toFixed(1)}%
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-1">Sector Premium</p>
                                <p className={`text-3xl font-bold ${data.summary.sectorPremium <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.summary.sectorPremium >= 0 ? '+' : ''}{data.summary.sectorPremium.toFixed(0)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Valuation Methods Grid */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">
                            📈 Valuation Methods ({data.valuation.valuations.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.valuation.valuations.map((result, index) => (
                                <ValuationMethodCard key={index} result={result} />
                            ))}
                        </div>
                    </div>

                    {/* Sector Comparison */}
                    <SectorComparison
                        metrics={data.metrics}
                        sectorAverages={data.sectorAverages}
                    />

                    {/* Key Metrics */}
                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-white mb-4">📋 Key Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-gray-400 text-sm">EPS (TTM)</p>
                                <p className="text-xl font-bold text-white">${data.metrics.eps.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-gray-400 text-sm">Revenue Growth</p>
                                <p className="text-xl font-bold text-white">{data.metrics.revenueGrowth.toFixed(1)}%</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-gray-400 text-sm">EBITDA</p>
                                <p className="text-xl font-bold text-white">${(data.metrics.ebitda / 1000).toFixed(1)}B</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-gray-400 text-sm">Market Cap</p>
                                <p className="text-xl font-bold text-white">${(data.metrics.marketCap / 1000).toFixed(1)}B</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!data && !loading && (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-4xl mb-4">📊</p>
                    <p>Enter a ticker and click "Analyze" to see relative valuation</p>
                </div>
            )}
        </div>
    );
}
