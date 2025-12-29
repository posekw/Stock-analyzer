"use client";

import { useValuationStore } from "@/stores/valuationStore";

export function ValuationControls() {
    const {
        assumptions,
        fcfPerShare,
        suggestions,
        sector,
        companyName,
        setAssumption,
        setFcfPerShare,
        applySuggestions,
        resetToDefaults
    } = useValuationStore();

    return (
        <div className="space-y-6">
            {/* Suggestions Banner */}
            {suggestions && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg">✨</span>
                                <h3 className="text-sm font-semibold text-emerald-400">Smart Suggestions</h3>
                            </div>
                            <p className="text-xs text-zinc-400">
                                Based on <span className="text-zinc-300 font-medium">{companyName}</span> ({sector})
                            </p>
                        </div>
                        <button
                            onClick={applySuggestions}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-emerald-900/30"
                        >
                            <span>🎯</span>
                            <span>Apply All</span>
                        </button>
                    </div>

                    {/* Key Suggestions */}
                    <div className="grid grid-cols-3 gap-3">
                        <SuggestionChip
                            label="Growth"
                            value={`${suggestions.revenueGrowth.value}%`}
                            source={suggestions.revenueGrowth.source}
                            onClick={() => setAssumption('revenueGrowth', suggestions.revenueGrowth.value)}
                        />
                        <SuggestionChip
                            label="WACC"
                            value={`${suggestions.wacc.value}%`}
                            source={suggestions.wacc.source}
                            onClick={() => setAssumption('wacc', suggestions.wacc.value)}
                        />
                        <SuggestionChip
                            label="Terminal"
                            value={`${suggestions.terminalGrowth.value}%`}
                            source={suggestions.terminalGrowth.source}
                            onClick={() => setAssumption('terminalGrowth', suggestions.terminalGrowth.value)}
                        />
                    </div>
                </div>
            )}

            {/* Main Controls */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-zinc-100">Assumptions</h2>
                    <button
                        onClick={resetToDefaults}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Reset to Defaults
                    </button>
                </div>

                <div className="space-y-6">
                    {/* FCF Per Share Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Current FCF Per Share ($)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                            <input
                                type="number"
                                value={fcfPerShare}
                                onChange={(e) => setFcfPerShare(parseFloat(e.target.value) || 0)}
                                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg py-2 pl-7 pr-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-zinc-600">Free Cash Flow per share (trailing 12 months)</p>
                    </div>

                    {/* Core DCF Sliders */}
                    <div className="space-y-5">
                        <AssumptionSlider
                            label="FCF Growth Rate (%)"
                            description="Annual growth in Free Cash Flow"
                            value={assumptions.revenueGrowth}
                            suggestedValue={suggestions?.revenueGrowth.value}
                            min={0}
                            max={30}
                            step={0.5}
                            onChange={(val) => setAssumption('revenueGrowth', val)}
                            // Show historical context if available
                            extraContext={suggestions?.revenueGrowth?.raw && (
                                <div className="flex space-x-3 text-[10px] mt-1 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 inline-block">
                                    <span className="text-zinc-500">3Y Hist: <span className="text-zinc-300 font-mono">{suggestions.revenueGrowth.raw.cagr3y}%</span></span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-500">Analyst Est: <span className="text-zinc-300 font-mono">{suggestions.revenueGrowth.raw.analystNextYear}%</span></span>
                                </div>
                            )}
                        />
                        <AssumptionSlider
                            label="Terminal Growth (%)"
                            description="Long-term perpetual growth (usually 2-3%)"
                            value={assumptions.terminalGrowth}
                            suggestedValue={suggestions?.terminalGrowth.value}
                            min={0}
                            max={5}
                            step={0.1}
                            onChange={(val) => setAssumption('terminalGrowth', val)}
                        />
                        <AssumptionSlider
                            label="Discount Rate / WACC (%)"
                            description="Your required annual return"
                            value={assumptions.wacc}
                            suggestedValue={suggestions?.wacc.value}
                            min={6}
                            max={15}
                            step={0.1}
                            onChange={(val) => setAssumption('wacc', val)}
                        />
                    </div>

                    {/* Explanation */}
                    <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                        <h4 className="text-sm font-medium text-zinc-300 mb-2">How it works</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            This DCF model projects Free Cash Flow for 5 years (with growth declining toward terminal rate),
                            then calculates a terminal value using the Gordon Growth Model. All values are discounted
                            back at your WACC to determine today's fair value.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SuggestionChipProps {
    label: string;
    value: string;
    source: string;
    onClick: () => void;
}

function SuggestionChip({ label, value, source, onClick }: SuggestionChipProps) {
    return (
        <button
            onClick={onClick}
            className="group p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-200 text-left"
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">{value}</span>
            </div>
            <p className="text-[10px] text-zinc-600 line-clamp-1">{source}</p>
        </button>
    );
}

interface SliderProps {
    label: string;
    description?: string;
    value: number;
    suggestedValue?: number;
    extraContext?: React.ReactNode;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
}

function AssumptionSlider({ label, description, value, suggestedValue, extraContext, min, max, step, onChange }: SliderProps) {
    const isAtSuggested = suggestedValue !== undefined && Math.abs(value - suggestedValue) < step;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <div>
                    <span className="text-zinc-300">{label}</span>
                    {description && <p className="text-[10px] text-zinc-600">{description}</p>}
                    {extraContext}
                </div>
                <div className="flex items-center space-x-2 self-start mt-1">
                    {suggestedValue !== undefined && !isAtSuggested && (
                        <span className="text-xs text-emerald-500/70">
                            suggested: {suggestedValue.toFixed(1)}
                        </span>
                    )}
                    <span className={`font-mono text-lg ${isAtSuggested ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {value.toFixed(1)}
                    </span>
                </div>
            </div>
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
                {/* Suggested value marker */}
                {suggestedValue !== undefined && (
                    <div
                        className="absolute w-1 h-4 bg-emerald-500/50 rounded -top-1 pointer-events-none"
                        style={{
                            left: `${((suggestedValue - min) / (max - min)) * 100}%`,
                            transform: 'translateX(-50%)'
                        }}
                    />
                )}
            </div>
        </div>
    );
}
