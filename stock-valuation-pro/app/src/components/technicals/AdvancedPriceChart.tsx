"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChartQuote {
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

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

interface HoveredData {
    x: number;
    y: number;
    index: number;
    quote: ChartQuote;
    priceAtCursor: number;
}

interface ZoomState {
    startIndex: number;
    endIndex: number;
}

interface AdvancedPriceChartProps {
    quotes: ChartQuote[];
    ticker: string;
    currentPrice: number;
    support?: number;
    resistance?: number;
    calculatedSupport?: number[];
    calculatedResistance?: number[];
    pivotPoints?: PivotPoints;
    movingAverages?: MovingAverages;
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
}

const TIMEFRAMES = ['1M', '6M', '1Y', '3Y', '5Y', '10Y'];
const MIN_VISIBLE_BARS = 10;

export function AdvancedPriceChart({
    quotes,
    ticker,
    currentPrice,
    support,
    resistance,
    calculatedSupport = [],
    calculatedResistance = [],
    pivotPoints,
    movingAverages,
    timeframe,
    onTimeframeChange,
}: AdvancedPriceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showMAs, setShowMAs] = useState(true);
    const [showPivots, setShowPivots] = useState(true);
    const [chartType, setChartType] = useState<'line' | 'candle'>('line');
    const [hoveredData, setHoveredData] = useState<HoveredData | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

    // Zoom and pan state
    const [zoom, setZoom] = useState<ZoomState>({ startIndex: 0, endIndex: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, startIndex: 0 });

    // Chart padding
    const padding = { top: 30, right: 80, bottom: 40, left: 15 };

    // Reset zoom when quotes change
    useEffect(() => {
        if (quotes.length > 0) {
            setZoom({ startIndex: 0, endIndex: quotes.length - 1 });
        }
    }, [quotes.length, timeframe]);

    // Get visible quotes based on zoom
    const visibleQuotes = quotes.slice(zoom.startIndex, zoom.endIndex + 1);
    const zoomLevel = quotes.length > 0 ? ((quotes.length) / visibleQuotes.length) : 1;

    // Calculate price range and helpers for visible quotes
    const getChartHelpers = useCallback(() => {
        const closePrices = visibleQuotes.map(q => q.close).filter((p): p is number => p !== null);
        const highPrices = visibleQuotes.map(q => q.high).filter((p): p is number => p !== null);
        const lowPrices = visibleQuotes.map(q => q.low).filter((p): p is number => p !== null);

        if (closePrices.length === 0) return null;

        // Only include levels if they're in the visible range
        const visibleSupports = [support, ...calculatedSupport].filter(p => p && p > 0) as number[];
        const visibleResistances = [resistance, ...calculatedResistance].filter(p => p && p > 0) as number[];

        const allPrices = [
            ...closePrices,
            ...highPrices,
            ...lowPrices,
        ];

        // Optionally include support/resistance in range
        const minData = Math.min(...allPrices);
        const maxData = Math.max(...allPrices);

        // Add small padding
        const minPrice = minData * 0.995;
        const maxPrice = maxData * 1.005;
        const priceRange = maxPrice - minPrice;

        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        const priceToY = (price: number) => padding.top + ((maxPrice - price) / priceRange) * chartHeight;
        const yToPrice = (y: number) => maxPrice - ((y - padding.top) / chartHeight) * priceRange;
        const indexToX = (index: number) => {
            const visibleLength = visibleQuotes.length - 1;
            return padding.left + (index / Math.max(1, visibleLength)) * chartWidth;
        };
        const xToIndex = (x: number) => {
            const chartWidth = dimensions.width - padding.left - padding.right;
            const ratio = (x - padding.left) / chartWidth;
            return Math.round(ratio * (visibleQuotes.length - 1));
        };

        return { minPrice, maxPrice, priceRange, chartWidth, chartHeight, priceToY, yToPrice, indexToX, xToIndex };
    }, [visibleQuotes, dimensions, support, resistance, calculatedSupport, calculatedResistance, padding]);

    // Handle resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: 400
                });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // Native wheel event listener (passive: false to allow preventDefault)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => {
            // Prevent page scroll
            e.preventDefault();
            e.stopPropagation();

            if (quotes.length === 0) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Check if mouse is in chart area
            if (mouseX < padding.left || mouseX > dimensions.width - padding.right ||
                mouseY < padding.top || mouseY > dimensions.height - padding.bottom) {
                return;
            }

            // Calculate chart helpers
            const chartWidth = dimensions.width - padding.left - padding.right;
            const ratio = (mouseX - padding.left) / chartWidth;
            const visibleIndex = Math.round(ratio * (visibleQuotes.length - 1));
            const globalIndex = zoom.startIndex + visibleIndex;

            // Zoom factor
            const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87; // Scroll down = zoom out

            const currentRange = zoom.endIndex - zoom.startIndex;
            const newRange = Math.round(currentRange * zoomFactor);

            // Clamp range
            const minRange = MIN_VISIBLE_BARS - 1;
            const maxRange = quotes.length - 1;
            const clampedRange = Math.max(minRange, Math.min(maxRange, newRange));

            // Calculate new start/end to keep mouse position anchored
            const mouseRatio = visibleIndex / Math.max(1, visibleQuotes.length - 1);
            let newStart = Math.round(globalIndex - mouseRatio * clampedRange);
            let newEnd = newStart + clampedRange;

            // Clamp to valid range
            if (newStart < 0) {
                newStart = 0;
                newEnd = clampedRange;
            }
            if (newEnd >= quotes.length) {
                newEnd = quotes.length - 1;
                newStart = Math.max(0, newEnd - clampedRange);
            }

            setZoom({ startIndex: newStart, endIndex: newEnd });
        };

        // Add with passive: false to allow preventDefault
        canvas.addEventListener('wheel', handleWheelEvent, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheelEvent);
        };
    }, [quotes.length, zoom, visibleQuotes.length, dimensions, padding]);

    // Pan handlers
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === 0 && zoomLevel > 1) { // Left click and zoomed in
            setIsPanning(true);
            setPanStart({ x: e.clientX, startIndex: zoom.startIndex });
        }
    }, [zoom.startIndex, zoomLevel]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const handlePan = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isPanning) return;

        const helpers = getChartHelpers();
        if (!helpers) return;

        const deltaX = e.clientX - panStart.x;
        const barsPerPixel = visibleQuotes.length / helpers.chartWidth;
        const barsDelta = Math.round(-deltaX * barsPerPixel);

        const range = zoom.endIndex - zoom.startIndex;
        let newStart = panStart.startIndex + barsDelta;
        let newEnd = newStart + range;

        // Clamp
        if (newStart < 0) {
            newStart = 0;
            newEnd = range;
        }
        if (newEnd >= quotes.length) {
            newEnd = quotes.length - 1;
            newStart = newEnd - range;
        }

        setZoom({ startIndex: newStart, endIndex: newEnd });
    }, [isPanning, panStart, visibleQuotes.length, zoom.endIndex, zoom.startIndex, quotes.length, getChartHelpers]);

    // Reset zoom
    const resetZoom = useCallback(() => {
        setZoom({ startIndex: 0, endIndex: quotes.length - 1 });
    }, [quotes.length]);

    // Draw chart
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || visibleQuotes.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const helpers = getChartHelpers();
        if (!helpers) return;

        const { minPrice, maxPrice, priceRange, chartWidth, chartHeight, priceToY, indexToX } = helpers;

        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        ctx.scale(dpr, dpr);

        const width = dimensions.width;
        const height = dimensions.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, 'rgba(24, 24, 27, 0.95)');
        bgGradient.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = "rgba(63, 63, 70, 0.2)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const price = maxPrice - (priceRange / 5) * i;
            ctx.fillStyle = "#52525b";
            ctx.font = "11px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 5, y + 4);
        }

        // Moving averages
        if (showMAs && movingAverages) {
            const drawMA = (maValue: number | null, color: string) => {
                if (maValue && maValue >= minPrice && maValue <= maxPrice) {
                    const y = priceToY(maValue);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(padding.left, y);
                    ctx.lineTo(width - padding.right, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            };
            drawMA(movingAverages.sma20, "#fbbf24");
            drawMA(movingAverages.sma50, "#60a5fa");
            drawMA(movingAverages.sma200, "#f472b6");
        }

        // Pivot points
        if (showPivots && pivotPoints) {
            const drawPivot = (value: number, color: string) => {
                if (value >= minPrice && value <= maxPrice) {
                    const y = priceToY(value);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 4]);
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(padding.left, y);
                    ctx.lineTo(width - padding.right, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 1;
                }
            };
            drawPivot(pivotPoints.pp, "#a78bfa");
            drawPivot(pivotPoints.r1, "#ef4444");
            drawPivot(pivotPoints.s1, "#22c55e");
        }

        // Support/Resistance
        if (support && support >= minPrice && support <= maxPrice) {
            const y = priceToY(support);
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(`Support $${support.toFixed(2)}`, padding.left + 5, y - 4);
        }

        if (resistance && resistance >= minPrice && resistance <= maxPrice) {
            const y = priceToY(resistance);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(`Resistance $${resistance.toFixed(2)}`, padding.left + 5, y + 12);
        }

        // Price chart
        if (chartType === 'line') {
            const closePrices = visibleQuotes.map(q => q.close).filter((p): p is number => p !== null);

            ctx.beginPath();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 2;

            closePrices.forEach((price, index) => {
                const x = indexToX(index);
                const y = priceToY(price);
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Gradient fill
            const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
            gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
            gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

            ctx.beginPath();
            closePrices.forEach((price, index) => {
                const x = indexToX(index);
                const y = priceToY(price);
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.lineTo(indexToX(closePrices.length - 1), height - padding.bottom);
            ctx.lineTo(padding.left, height - padding.bottom);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
        } else {
            // Candlesticks
            const candleWidth = Math.max(2, Math.min(15, (chartWidth / visibleQuotes.length) * 0.7));

            visibleQuotes.forEach((quote, index) => {
                if (quote.open === null || quote.close === null || quote.high === null || quote.low === null) return;

                const x = indexToX(index);
                const isGreen = quote.close >= quote.open;

                ctx.strokeStyle = isGreen ? "#22c55e" : "#ef4444";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, priceToY(quote.high));
                ctx.lineTo(x, priceToY(quote.low));
                ctx.stroke();

                const bodyTop = priceToY(Math.max(quote.open, quote.close));
                const bodyBottom = priceToY(Math.min(quote.open, quote.close));
                ctx.fillStyle = isGreen ? "#22c55e" : "#ef4444";
                ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
            });
        }

        // Current price
        if (currentPrice && currentPrice >= minPrice && currentPrice <= maxPrice) {
            const y = priceToY(currentPrice);
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(width - padding.right, y - 9, 65, 18);
            ctx.fillStyle = "#000";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`$${currentPrice.toFixed(2)}`, width - padding.right + 4, y + 4);
        }

        // Date labels
        const numLabels = Math.min(5, visibleQuotes.length);
        ctx.fillStyle = "#52525b";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";

        for (let i = 0; i < numLabels; i++) {
            const index = Math.floor((i / (numLabels - 1)) * (visibleQuotes.length - 1));
            if (visibleQuotes[index]) {
                const x = indexToX(index);
                const date = new Date(visibleQuotes[index].date);
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                ctx.fillText(label, x, height - 8);
            }
        }

        // Crosshair
        if (hoveredData && hoveredData.quote) {
            const x = indexToX(hoveredData.index);
            const y = hoveredData.y;

            // Vertical line
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Price badge
            const cursorPrice = hoveredData.priceAtCursor;
            ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
            ctx.fillRect(width - padding.right, y - 9, 65, 18);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`$${cursorPrice.toFixed(2)}`, width - padding.right + 4, y + 4);

            // Date badge
            const hoverDate = new Date(hoveredData.quote.date);
            const dateLabel = hoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
            const dateLabelWidth = ctx.measureText(dateLabel).width + 16;
            ctx.fillRect(x - dateLabelWidth / 2, height - padding.bottom + 5, dateLabelWidth, 18);
            ctx.fillStyle = "#fff";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(dateLabel, x, height - padding.bottom + 17);

            // Data point dot
            if (hoveredData.quote.close) {
                const closeY = priceToY(hoveredData.quote.close);
                ctx.beginPath();
                ctx.arc(x, closeY, 5, 0, Math.PI * 2);
                ctx.fillStyle = "#10b981";
                ctx.fill();
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

    }, [visibleQuotes, dimensions, support, resistance, pivotPoints, movingAverages, showMAs, showPivots, chartType, currentPrice, hoveredData, getChartHelpers, padding]);

    // Mouse move handler
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        // Handle panning
        if (isPanning) {
            handlePan(e);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas || visibleQuotes.length === 0) return;

        const helpers = getChartHelpers();
        if (!helpers) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < padding.left || x > dimensions.width - padding.right ||
            y < padding.top || y > dimensions.height - padding.bottom) {
            setHoveredData(null);
            return;
        }

        const index = helpers.xToIndex(x);
        const clampedIndex = Math.max(0, Math.min(visibleQuotes.length - 1, index));
        const quote = visibleQuotes[clampedIndex];
        const priceAtCursor = helpers.yToPrice(y);

        if (quote) {
            setHoveredData({
                x,
                y,
                index: clampedIndex,
                quote,
                priceAtCursor
            });
        }
    }, [visibleQuotes, dimensions, getChartHelpers, padding, isPanning, handlePan]);

    const handleMouseLeave = useCallback(() => {
        setHoveredData(null);
        setIsPanning(false);
    }, []);

    const formatVolume = (vol: number | null) => {
        if (!vol) return 'N/A';
        if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
        if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
        if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
        return vol.toString();
    };

    if (quotes.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <p className="text-zinc-500">No chart data available</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{ticker}</h3>
                    <span className="text-2xl font-bold text-emerald-400">${currentPrice.toFixed(2)}</span>
                    {zoomLevel > 1.01 && (
                        <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded-full">
                            {zoomLevel.toFixed(1)}x zoom
                        </span>
                    )}
                </div>

                {/* Timeframe selector */}
                <div className="flex items-center gap-2">
                    {zoomLevel > 1.01 && (
                        <button
                            onClick={resetZoom}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                        >
                            Reset Zoom
                        </button>
                    )}
                    <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf}
                                onClick={() => onTimeframeChange(tf)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeframe === tf
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/30 bg-zinc-800/20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-2 py-1 text-xs rounded ${chartType === 'line' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                        >
                            📈 Line
                        </button>
                        <button
                            onClick={() => setChartType('candle')}
                            className={`px-2 py-1 text-xs rounded ${chartType === 'candle' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                        >
                            🕯️ Candle
                        </button>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showMAs}
                            onChange={e => setShowMAs(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-800"
                        />
                        MAs
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showPivots}
                            onChange={e => setShowPivots(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-800"
                        />
                        Pivots
                    </label>
                </div>
                <div className="text-xs text-zinc-500">
                    🖱️ Scroll to zoom • {zoomLevel > 1.01 ? 'Drag to pan' : 'Hover for details'}
                </div>
            </div>

            {/* Chart */}
            <div ref={containerRef} className="relative">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    className={`w-full ${isPanning ? 'cursor-grabbing' : zoomLevel > 1.01 ? 'cursor-grab' : 'cursor-crosshair'}`}
                    style={{ height: '400px' }}
                />

                {/* OHLCV Tooltip */}
                {hoveredData && hoveredData.quote && (
                    <div className="absolute top-2 left-4 bg-zinc-800/95 backdrop-blur border border-zinc-700 rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                        <div className="flex items-center gap-4 text-xs">
                            <div className="text-zinc-400">
                                {new Date(hoveredData.quote.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-3 mt-1.5 text-xs">
                            <div>
                                <span className="text-zinc-500">O</span>
                                <span className="text-white font-mono ml-1">
                                    ${hoveredData.quote.open?.toFixed(2) || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-500">H</span>
                                <span className="text-green-400 font-mono ml-1">
                                    ${hoveredData.quote.high?.toFixed(2) || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-500">L</span>
                                <span className="text-red-400 font-mono ml-1">
                                    ${hoveredData.quote.low?.toFixed(2) || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-500">C</span>
                                <span className="text-white font-mono ml-1">
                                    ${hoveredData.quote.close?.toFixed(2) || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Vol</span>
                                <span className="text-cyan-400 font-mono ml-1">
                                    {formatVolume(hoveredData.quote.volume)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-zinc-800/30 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-yellow-400"></div>
                    <span className="text-zinc-400">Current</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-green-500"></div>
                    <span className="text-zinc-400">Support</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span className="text-zinc-400">Resistance</span>
                </div>
                {showMAs && (
                    <>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-yellow-400 opacity-70"></div>
                            <span className="text-zinc-400">SMA20</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-blue-400"></div>
                            <span className="text-zinc-400">SMA50</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-pink-400"></div>
                            <span className="text-zinc-400">SMA200</span>
                        </div>
                    </>
                )}
                <div className="ml-auto text-zinc-500">
                    Showing {visibleQuotes.length} of {quotes.length} bars
                </div>
            </div>
        </div>
    );
}
