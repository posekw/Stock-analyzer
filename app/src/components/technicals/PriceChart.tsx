"use client";

import { useEffect, useRef } from "react";

interface ChartQuote {
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

interface PriceChartProps {
    quotes: ChartQuote[];
    support?: number;
    resistance?: number;
}

export function PriceChart({ quotes, support, resistance }: PriceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || quotes.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Get valid close prices
        const closePrices = quotes
            .map((q) => q.close)
            .filter((p): p is number => p !== null);

        if (closePrices.length === 0) return;

        const minPrice = Math.min(...closePrices) * 0.995;
        const maxPrice = Math.max(...closePrices) * 1.005;
        const priceRange = maxPrice - minPrice;

        const width = canvas.width;
        const height = canvas.height;
        const padding = { top: 20, right: 60, bottom: 30, left: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = "rgba(63, 63, 70, 0.3)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Price labels
            const price = maxPrice - (priceRange / 4) * i;
            ctx.fillStyle = "#71717a";
            ctx.font = "11px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 5, y + 4);
        }

        // Draw support line
        if (support && support >= minPrice && support <= maxPrice) {
            const y = padding.top + ((maxPrice - support) / priceRange) * chartHeight;
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#22c55e";
            ctx.font = "10px sans-serif";
            ctx.fillText("Support", padding.left + 5, y - 5);
        }

        // Draw resistance line
        if (resistance && resistance >= minPrice && resistance <= maxPrice) {
            const y = padding.top + ((maxPrice - resistance) / priceRange) * chartHeight;
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#ef4444";
            ctx.font = "10px sans-serif";
            ctx.fillText("Resistance", padding.left + 5, y + 12);
        }

        // Draw price line
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;

        closePrices.forEach((price, index) => {
            const x = padding.left + (index / (closePrices.length - 1)) * chartWidth;
            const y = padding.top + ((maxPrice - price) / priceRange) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw gradient fill under line
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

        ctx.beginPath();
        closePrices.forEach((price, index) => {
            const x = padding.left + (index / (closePrices.length - 1)) * chartWidth;
            const y = padding.top + ((maxPrice - price) / priceRange) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

    }, [quotes, support, resistance]);

    if (quotes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <p className="text-zinc-500">No chart data available</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Price History (1 Month)</h3>
            <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full h-auto"
            />
        </div>
    );
}
