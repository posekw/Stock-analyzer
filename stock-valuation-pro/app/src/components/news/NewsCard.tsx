"use client";

interface NewsArticle {
    uuid: string;
    title: string;
    link: string;
    publisher: string;
    publishTime: number | Date | string;
    thumbnail: string | null;
    relatedTickers: string[];
}

interface NewsCardProps {
    article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
    const timeAgo = getTimeAgo(article.publishTime);

    return (
        <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1"
        >
            {/* Thumbnail */}
            {article.thumbnail && (
                <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-zinc-800">
                    <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="space-y-3">
                <h3 className="text-zinc-100 font-semibold leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {article.title}
                </h3>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-medium">{article.publisher}</span>
                    <span>{timeAgo}</span>
                </div>

                {/* Related Tickers */}
                {article.relatedTickers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {article.relatedTickers.slice(0, 3).map((ticker) => (
                            <span
                                key={ticker}
                                className="px-2 py-0.5 text-xs font-mono bg-zinc-800 text-zinc-400 rounded"
                            >
                                {ticker}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* External link indicator */}
            <div className="flex items-center justify-end mt-4 text-zinc-600 group-hover:text-emerald-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </div>
        </a>
    );
}

function getTimeAgo(timestamp: number | Date | string): string {
    if (!timestamp) return "Unknown";

    const now = Date.now();
    let timestampMs: number;

    // Handle different timestamp formats
    if (timestamp instanceof Date) {
        timestampMs = timestamp.getTime();
    } else if (typeof timestamp === 'string') {
        timestampMs = new Date(timestamp).getTime();
    } else if (timestamp > 1e12) {
        // Already in milliseconds
        timestampMs = timestamp;
    } else {
        // Unix timestamp in seconds
        timestampMs = timestamp * 1000;
    }

    if (isNaN(timestampMs)) return "Unknown";

    const seconds = Math.floor((now - timestampMs) / 1000);

    if (seconds < 0) return "Just now";
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestampMs).toLocaleDateString();
}
