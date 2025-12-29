"use client";

import { useState } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { NewsCard } from "./NewsCard";
import { AIAnalysisCard } from "./AIAnalysisCard";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { analyzeNews, NewsAnalysisResult, translateAnalysis } from "@/lib/ai-analyzer";

interface NewsArticle {
    uuid: string;
    title: string;
    link: string;
    publisher: string;
    publishTime: number | Date | string;
    thumbnail: string | null;
    relatedTickers: string[];
}

export function NewsFeed() {
    const { currentTicker, marketPrice } = useDashboardStore();
    const { llmProvider, llmApiKey, isConfigured } = useSettingsStore();


    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // AI Analysis state
    const [analysis, setAnalysis] = useState<NewsAnalysisResult | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const fetchNews = async () => {
        if (!currentTicker) return;

        setLoading(true);
        setError(null);
        setAnalysis(null); // Clear previous analysis

        try {
            const res = await fetch(`/api/news?ticker=${currentTicker}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch news");
            }

            setNews(data.news || []);
            setHasFetched(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch news");
        } finally {
            setLoading(false);
        }
    };

    const runAIAnalysis = async () => {
        if (!isConfigured() || !llmProvider || !llmApiKey) {
            setShowSettings(true);
            return;
        }

        if (news.length === 0) {
            setAnalysisError("No news to analyze. Fetch news first.");
            return;
        }

        setAnalyzing(true);
        setAnalysisError(null);

        try {
            const result = await analyzeNews(
                news,
                currentTicker || 'UNKNOWN',
                marketPrice || 0,
                llmProvider,
                llmApiKey
            );
            setAnalysis(result);
        } catch (e) {
            setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleTranslate = async (analysisToTranslate: NewsAnalysisResult) => {
        if (!llmApiKey) throw new Error("API Key required for translation");
        return translateAnalysis(analysisToTranslate, llmApiKey, null);
    };

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Latest News</h2>
                    <p className="text-zinc-400 text-sm mt-1">
                        Market news and AI analysis for{" "}
                        <span className="text-emerald-400 font-mono font-semibold">
                            {currentTicker || "..."}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`px-3 py-3 rounded-xl transition-all duration-200 ${isConfigured()
                            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        title={isConfigured() ? 'AI Configured' : 'Configure AI'}
                    >
                        ⚙️
                    </button>

                    {/* Fetch News Button */}
                    <button
                        onClick={fetchNews}
                        disabled={loading || !currentTicker}
                        className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>Fetching...</span>
                            </>
                        ) : (
                            <>
                                <span>📰</span>
                                <span>Fetch News</span>
                            </>
                        )}
                    </button>

                    {/* AI Analyze Button */}
                    <button
                        onClick={runAIAnalysis}
                        disabled={analyzing || news.length === 0}
                        className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg ${isConfigured()
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/20'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {analyzing ? (
                            <>
                                <span className="animate-pulse">🤖</span>
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <span>🤖</span>
                                <span>Analyze with AI</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* AI Configuration Prompt */}
            {!isConfigured() && hasFetched && news.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔑</span>
                        <div>
                            <p className="text-indigo-300 font-medium">Configure AI to unlock insights</p>
                            <p className="text-sm text-indigo-400/70">Add your OpenAI or Gemini API key for news analysis</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                    >
                        Configure
                    </button>
                </div>
            )}

            {/* Error States */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}
            {analysisError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    AI Analysis Error: {analysisError}
                </div>
            )}

            {/* AI Analysis Card */}
            {analysis && (
                <AIAnalysisCard
                    analysis={analysis}
                    onReanalyze={runAIAnalysis}
                    onTranslate={handleTranslate}
                    isLoading={analyzing}
                />
            )}

            {/* Analyzing Skeleton */}
            {analyzing && !analysis && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl animate-bounce">🤖</span>
                        <div>
                            <div className="h-5 w-32 bg-zinc-700 rounded"></div>
                            <div className="h-3 w-48 bg-zinc-800 rounded mt-2"></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-full bg-zinc-700 rounded"></div>
                        <div className="h-4 w-3/4 bg-zinc-700 rounded"></div>
                        <div className="h-4 w-5/6 bg-zinc-700 rounded"></div>
                    </div>
                    <p className="text-center text-sm text-purple-400 mt-4">
                        Analyzing {news.length} articles with AI...
                    </p>
                </div>
            )}

            {/* News Grid */}
            {news.length > 0 ? (
                <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-4">📰 {news.length} Articles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {news.map((article) => (
                            <NewsCard key={article.uuid} article={article} />
                        ))}
                    </div>
                </div>
            ) : hasFetched && !loading ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-zinc-300 mb-2">No News Found</h3>
                    <p className="text-zinc-500">
                        No recent news articles found for {currentTicker}
                    </p>
                </div>
            ) : !hasFetched ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">📰</div>
                    <h3 className="text-xl font-semibold text-zinc-300 mb-2">Ready to Explore</h3>
                    <p className="text-zinc-500 mb-4">
                        Click "Fetch News" to get the latest articles for your ticker
                    </p>
                    <p className="text-sm text-zinc-600">
                        💡 Then use "Analyze with AI" for intelligent insights
                    </p>
                </div>
            ) : null}

            {/* Settings Modal */}
            <ApiKeySettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
}
