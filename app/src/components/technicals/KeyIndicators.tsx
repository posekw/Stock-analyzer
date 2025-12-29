"use client";

interface KeyIndicatorsProps {
    support?: number;
    resistance?: number;
    stopLoss?: number;
    currentPrice?: number;
}

export function KeyIndicators({ support, resistance, stopLoss, currentPrice }: KeyIndicatorsProps) {
    const indicators = [
        {
            label: "Support Level",
            value: support,
            color: "emerald",
            icon: "📈",
            description: "Price floor where buying pressure typically increases",
        },
        {
            label: "Resistance Level",
            value: resistance,
            color: "rose",
            icon: "📉",
            description: "Price ceiling where selling pressure typically increases",
        },
        {
            label: "Stop Loss",
            value: stopLoss,
            color: "amber",
            icon: "🛑",
            description: "Suggested exit point to limit potential losses",
        },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-200">Key Technical Levels</h3>

            <div className="grid grid-cols-1 gap-4">
                {indicators.map((indicator) => (
                    <div
                        key={indicator.label}
                        className={`p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-${indicator.color}-500/20 transition-colors`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">{indicator.icon}</span>
                                <div>
                                    <p className="text-sm text-zinc-400 font-medium">{indicator.label}</p>
                                    <p className={`text-xl font-bold ${indicator.color === "emerald" ? "text-emerald-400" :
                                            indicator.color === "rose" ? "text-rose-400" :
                                                "text-amber-400"
                                        }`}>
                                        {indicator.value ? `$${indicator.value.toFixed(2)}` : "—"}
                                    </p>
                                </div>
                            </div>

                            {currentPrice && indicator.value && (
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">vs Current</p>
                                    <p className={`text-sm font-mono ${indicator.value > currentPrice ? "text-emerald-400" : "text-rose-400"
                                        }`}>
                                        {indicator.value > currentPrice ? "+" : ""}
                                        {(((indicator.value - currentPrice) / currentPrice) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-2">{indicator.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
