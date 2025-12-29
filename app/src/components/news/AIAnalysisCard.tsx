"use client";
import { useState, useEffect } from "react";
import { NewsAnalysisResult } from "@/lib/ai-analyzer";

interface AIAnalysisCardProps {
    analysis: NewsAnalysisResult;
    onReanalyze?: () => void;
    onTranslate?: (analysis: NewsAnalysisResult) => Promise<NewsAnalysisResult>;
    isLoading?: boolean;
}

export function AIAnalysisCard({ analysis, onReanalyze, onTranslate, isLoading }: AIAnalysisCardProps) {
    const [language, setLanguage] = useState<'en' | 'ar'>('en');
    const [translatedData, setTranslatedData] = useState<NewsAnalysisResult | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    // Reset translation when analysis updates
    useEffect(() => {
        setLanguage('en');
        setTranslatedData(null);
    }, [analysis]);

    const sentimentColors = {
        BULLISH: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '🐂' },
        BEARISH: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🐻' },
        NEUTRAL: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '⚖️' },
    };

    const confidenceColors = {
        HIGH: 'text-green-400',
        MEDIUM: 'text-yellow-400',
        LOW: 'text-zinc-400',
    };

    const handleTranslateToggle = async () => {
        if (language === 'ar') {
            setLanguage('en');
            return;
        }

        if (translatedData) {
            setLanguage('ar');
            return;
        }

        if (onTranslate) {
            setIsTranslating(true);
            try {
                const result = await onTranslate(analysis);
                setTranslatedData(result);
                setLanguage('ar');
            } catch (error) {
                console.error("Translation failed", error);
            } finally {
                setIsTranslating(false);
            }
        }
    };

    // Use either the translated data or original based on language selection
    const displayData = language === 'ar' && translatedData ? translatedData : analysis;
    const isRTL = language === 'ar';

    const colors = sentimentColors[displayData.sentiment];
    const impactSign = displayData.fairPriceImpact.percentageEstimate >= 0 ? '+' : '';

    return (
        <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 space-y-6`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{colors.icon}</span>
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {isRTL ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {displayData.sentiment}
                            </span>
                            {displayData.isSimulated && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    ⚠️ {isRTL ? 'محاكاة' : 'SIMULATED'}
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-zinc-500">
                            {isRTL ? 'تم التحليل بواسطة' : 'Powered by'} {displayData.model} • {new Date(displayData.analyzedAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onTranslate && (
                        <button
                            onClick={handleTranslateToggle}
                            disabled={isTranslating || isLoading}
                            className="px-3 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {isTranslating ? '⏳ ...' : language === 'en' ? '🇦🇪 العربية' : '🇺🇸 English'}
                        </button>
                    )}
                    {onReanalyze && (
                        <button
                            onClick={onReanalyze}
                            disabled={isLoading || isTranslating}
                            className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg disabled:opacity-50"
                        >
                            {isLoading ? '⏳' : '🔄'} {isRTL ? 'إعادة التحليل' : 'Re-analyze'}
                        </button>
                    )}
                </div>
            </div>

            {/* Sentiment Score Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-red-400">{isRTL ? 'هبوطي' : 'Bearish'}</span>
                    <span className="text-zinc-400">{isRTL ? 'النتيجة' : 'Score'}: {displayData.sentimentScore}</span>
                    <span className="text-green-400">{isRTL ? 'صعودي' : 'Bullish'}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative" dir="ltr">
                    {/* Keep bar LTR even in Arabic mode for consistency with 0-100 logic */}
                    <div
                        className="absolute top-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"
                        style={{ left: 0, right: 0 }}
                    />
                    <div
                        className={`absolute top-0 h-full w-2 rounded-full ${colors.text.replace('text', 'bg')}`}
                        style={{ left: `${(displayData.sentimentScore + 100) / 2}%`, transform: 'translateX(-50%)' }}
                    />
                </div>
            </div>

            {/* Fair Price Impact */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-zinc-500 uppercase tracking-wide">
                            {isRTL ? 'تأثير السعر العادل' : 'Fair Price Impact'}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1" dir="ltr">
                            <span className={`text-3xl font-bold ${displayData.fairPriceImpact.direction === 'UP' ? 'text-green-400' :
                                displayData.fairPriceImpact.direction === 'DOWN' ? 'text-red-400' :
                                    'text-zinc-400'
                                }`}>
                                {displayData.fairPriceImpact.direction === 'UP' ? '+' : displayData.fairPriceImpact.direction === 'DOWN' ? '' : ''}
                                {Math.abs(displayData.fairPriceImpact.percentageEstimate)}%
                            </span>
                            <span className={`text-sm ${confidenceColors[displayData.fairPriceImpact.confidence]}`}>
                                ({displayData.fairPriceImpact.confidence} {isRTL ? 'ثقة' : 'confidence'})
                            </span>
                        </div>
                    </div>
                    <div className="text-4xl">
                        {displayData.fairPriceImpact.direction === 'UP' ? '📈' :
                            displayData.fairPriceImpact.direction === 'DOWN' ? '📉' : '➡️'}
                    </div>
                </div>
                <p className="text-base text-zinc-400 mt-3 italic leading-relaxed">
                    "{displayData.fairPriceImpact.reasoning}"
                </p>
            </div>

            {/* Trading Signal Section */}
            {displayData.tradingSignal && (displayData.tradingSignal.fairValueRange.min > 0 || displayData.tradingSignal.supportLevel.min > 0) && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-blue-300 mb-4 uppercase tracking-wide">
                        <span>📊</span> {isRTL ? 'إشارات التداول الفنية' : 'Technical Trading Signals'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Fair Value Range */}
                        {displayData.tradingSignal.fairValueRange.max > 0 && (
                            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700">
                                <p className="text-xs text-zinc-500 mb-1">{isRTL ? 'نطاق القيمة العادلة' : 'Fair Value Range'}</p>
                                <p className="text-lg font-bold text-white" dir="ltr">
                                    ${displayData.tradingSignal.fairValueRange.min.toFixed(2)} - ${displayData.tradingSignal.fairValueRange.max.toFixed(2)}
                                </p>
                            </div>
                        )}

                        {/* Support Level */}
                        {displayData.tradingSignal.supportLevel.max > 0 && (
                            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700">
                                <p className="text-xs text-zinc-500 mb-1">{isRTL ? 'منطقة الدعم (شراء)' : 'Support Zone (Buy)'}</p>
                                <p className="text-lg font-bold text-green-400" dir="ltr">
                                    ${displayData.tradingSignal.supportLevel.min.toFixed(2)} - ${displayData.tradingSignal.supportLevel.max.toFixed(2)}
                                </p>
                            </div>
                        )}

                        {/* Resistance Level */}
                        {displayData.tradingSignal.resistanceLevel.max > 0 && (
                            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700">
                                <p className="text-xs text-zinc-500 mb-1">{isRTL ? 'منطقة المقاومة (بيع)' : 'Resistance Zone (Sell)'}</p>
                                <p className="text-lg font-bold text-red-400" dir="ltr">
                                    ${displayData.tradingSignal.resistanceLevel.min.toFixed(2)} - ${displayData.tradingSignal.resistanceLevel.max.toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-zinc-900/30 p-3 rounded-lg border border-blue-500/10">
                        <p className="text-xs text-blue-300/70 mb-1 uppercase">{isRTL ? 'استراتيجية مقترحة' : 'Suggested Strategy'}</p>
                        <p className="text-sm text-blue-100 italic">
                            "{displayData.tradingSignal.strategy}"
                        </p>
                    </div>
                </div>
            )}

            {/* Summary */}
            <div>
                <h4 className="text-base font-medium text-zinc-300 mb-2">
                    {isRTL ? '📝 الملخص' : '📝 Summary'}
                </h4>
                <p className="text-base text-zinc-400 leading-relaxed whitespace-pre-line">
                    {displayData.summary}
                </p>
            </div>

            {/* Key Insights */}
            {displayData.keyInsights.length > 0 && (
                <div>
                    <h4 className="text-base font-medium text-zinc-300 mb-2">
                        {isRTL ? '💡 رؤى رئيسية' : '💡 Key Insights'}
                    </h4>
                    <ul className="space-y-1">
                        {displayData.keyInsights.map((insight, i) => (
                            <li key={i} className="text-base text-zinc-400 flex items-start gap-2">
                                <span className="text-emerald-400 ml-2">•</span>
                                {insight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Catalysts & Risks */}
            <div className="grid grid-cols-2 gap-4">
                {displayData.catalysts.length > 0 && (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <h4 className="text-sm font-medium text-green-400 mb-2">
                            {isRTL ? '🚀 المحفزات' : '🚀 Catalysts'}
                        </h4>
                        <ul className="space-y-1">
                            {displayData.catalysts.map((item, i) => (
                                <li key={i} className="text-sm text-zinc-400">• {item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {displayData.risks.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <h4 className="text-sm font-medium text-red-400 mb-2">
                            {isRTL ? '⚠️ المخاطر' : '⚠️ Risks'}
                        </h4>
                        <ul className="space-y-1">
                            {displayData.risks.map((item, i) => (
                                <li key={i} className="text-sm text-zinc-400">• {item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
