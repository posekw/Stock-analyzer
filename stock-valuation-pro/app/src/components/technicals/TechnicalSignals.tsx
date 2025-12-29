"use client";

interface Outlook {
    stateDescription?: string;
    direction?: string;
    score?: number;
    scoreDescription?: string;
    sectorDirection?: string;
    sectorScore?: number;
    sectorScoreDescription?: string;
    indexDirection?: string;
    indexScore?: number;
    indexScoreDescription?: string;
}

interface TechnicalSignalsProps {
    provider?: string;
    sector?: string;
    shortTerm?: Outlook;
    intermediateTerm?: Outlook;
    longTerm?: Outlook;
}

export function TechnicalSignals({
    provider,
    sector,
    shortTerm,
    intermediateTerm,
    longTerm,
}: TechnicalSignalsProps) {
    const getOutlookColor = (direction?: string) => {
        if (!direction) return "zinc";
        const d = direction.toLowerCase();
        if (d.includes("bull") || d.includes("up")) return "emerald";
        if (d.includes("bear") || d.includes("down")) return "rose";
        return "amber";
    };

    const getOutlookIcon = (direction?: string) => {
        if (!direction) return "➖";
        const d = direction.toLowerCase();
        if (d.includes("bull") || d.includes("up")) return "🐂";
        if (d.includes("bear") || d.includes("down")) return "🐻";
        return "➖";
    };

    const outlooks = [
        { label: "Short Term", data: shortTerm, period: "1-2 weeks" },
        { label: "Intermediate Term", data: intermediateTerm, period: "1-3 months" },
        { label: "Long Term", data: longTerm, period: "3-12 months" },
    ];

    const hasData = shortTerm || intermediateTerm || longTerm;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-200">Technical Signals</h3>
                {provider && (
                    <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                        via {provider}
                    </span>
                )}
            </div>

            {sector && (
                <p className="text-sm text-zinc-400">
                    Sector: <span className="text-zinc-300">{sector}</span>
                </p>
            )}

            {hasData ? (
                <div className="space-y-3">
                    {outlooks.map(({ label, data, period }) => {
                        const color = getOutlookColor(data?.direction);
                        const icon = getOutlookIcon(data?.direction);

                        return (
                            <div
                                key={label}
                                className={`p-4 rounded-xl bg-zinc-900/50 border transition-all duration-200 ${color === "emerald" ? "border-emerald-500/20 hover:border-emerald-500/40" :
                                        color === "rose" ? "border-rose-500/20 hover:border-rose-500/40" :
                                            "border-zinc-800/50 hover:border-zinc-700/50"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-300">{label}</p>
                                            <p className="text-xs text-zinc-500">{period}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-semibold ${color === "emerald" ? "text-emerald-400" :
                                                color === "rose" ? "text-rose-400" :
                                                    "text-zinc-400"
                                            }`}>
                                            {data?.stateDescription || data?.direction || "N/A"}
                                        </p>
                                        {data?.scoreDescription && (
                                            <p className="text-xs text-zinc-500">{data.scoreDescription}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-6 text-center bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <p className="text-zinc-500">No technical signals available</p>
                </div>
            )}
        </div>
    );
}
