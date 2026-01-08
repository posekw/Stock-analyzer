/**
 * Stock Valuation Pro - Frontend JavaScript
 * Complete implementation matching the original Next.js app
 */

(function ($) {
    'use strict';

    // Safety check for localization
    if (typeof svpData === 'undefined') {
        console.error('Stock Valuation Pro: svpData is not defined. Scripts may not function correctly.');
        return;
    }

    // Store user's Gemini API key
    let userGeminiKey = localStorage.getItem('svp_user_gemini_key') || '';

    // Function to get user's Gemini API key
    function getUserGeminiKey() {
        return userGeminiKey;
    }

    // Function to set user's Gemini API key
    function setUserGeminiKey(key) {
        userGeminiKey = key;
        if (key) {
            localStorage.setItem('svp_user_gemini_key', key);
        }
    }

    /**
     * Advanced Chart Implementation - Matching main web app
     */
    class DetailedChart {
        constructor(canvas, quotes, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.quotes = quotes;
            this.options = {
                support: null,
                resistance: null,
                movingAverages: null,
                pivotPoints: null,
                chartType: 'line',
                currentPrice: null,
                showMAs: true,
                showPivots: true,
                ...options
            };
            this.state = {
                zoom: { startIndex: 0, endIndex: quotes.length - 1 },
                panStart: null, isPanning: false, hovered: null
            };
            // Huge padding to force dates up into visible area
            this.padding = { top: 30, right: 80, bottom: 100, left: 15 };
            this.init();
        }



        init() {
            this.bindEvents();
            this.handleResize = this.handleResize.bind(this);
            window.addEventListener('resize', this.handleResize);
            this.handleResize(); // Set initial size
        }

        destroy() {
            this.unbindEvents();
            window.removeEventListener('resize', this.handleResize);
        }

        handleResize() {
            const parent = this.canvas.parentElement;
            if (parent) {
                // Set resolution to match display size exactly (fixes squashed look)
                const rect = this.canvas.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.draw();
            }
        }

        bindEvents() {
            this.handleWheel = this.handleWheel.bind(this);
            this.handleMouseDown = this.handleMouseDown.bind(this);
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseUp = this.handleMouseUp.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleTouchStart = this.handleTouchStart.bind(this);
            this.handleTouchMove = this.handleTouchMove.bind(this);
            this.handleTouchEnd = this.handleTouchEnd.bind(this);

            this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
            this.canvas.addEventListener('mousedown', this.handleMouseDown);
            this.canvas.addEventListener('mousemove', this.handleMouseMove);
            this.canvas.addEventListener('mouseup', this.handleMouseUp);
            this.canvas.addEventListener('mouseleave', this.handleMouseLeave);

            // Touch events
            this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            this.canvas.addEventListener('touchend', this.handleTouchEnd);
        }

        unbindEvents() {
            this.canvas.removeEventListener('wheel', this.handleWheel);
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        }

        handleWheel(e) {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
            const range = this.state.zoom.endIndex - this.state.zoom.startIndex;
            const newRange = Math.max(10, Math.round(range * zoomFactor));
            const center = Math.round((this.state.zoom.startIndex + this.state.zoom.endIndex) / 2);
            let start = center - Math.floor(newRange / 2);
            let end = start + newRange;

            if (start < 0) { start = 0; end = newRange; }
            if (end >= this.quotes.length) { end = this.quotes.length - 1; start = Math.max(0, end - newRange); }

            this.state.zoom = { startIndex: start, endIndex: end };
            this.draw();
        }

        handleMouseDown(e) {
            // Always enable panning, regardless of zoom level
            this.state.isPanning = true;
            this.state.panStart = { x: e.clientX, startIndex: this.state.zoom.startIndex };
            this.canvas.style.cursor = 'grabbing';
        }

        handleMouseUp() {
            this.state.isPanning = false;
            this.canvas.style.cursor = 'crosshair';
        }

        // --- Touch Handling for Mobile ---
        handleTouchStart(e) {
            if (e.touches.length !== 1) return; // Ignore multi-touch for parsing
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            this.state.isPanning = true;
            // Store raw clientX and keeping track of initial index
            this.state.panStart = { x: touch.clientX, startIndex: this.state.zoom.startIndex };
            this.state.lastTouchX = touch.clientX;
            this.state.lastTouchY = touch.clientY;

            // Note: We don't prevent default here to allow click simulation? 
            // Actually, we should let scrolling start if it's vertical, but we handle that in move.
        }

        handleTouchMove(e) {
            if (!this.state.isPanning || e.touches.length !== 1) return;
            const touch = e.touches[0];

            // Calculate movement delta
            const dx = touch.clientX - this.state.lastTouchX;
            const dy = touch.clientY - this.state.lastTouchY;

            // Logic: If horizontal movement is significant, lock it as a pan and block scroll
            if (Math.abs(dx) > Math.abs(dy)) {
                if (e.cancelable) e.preventDefault(); // STOP page scroll
            }
            // If vertical is dominant, we might want to let it scroll? 
            // But if 'isPanning' is true, we usually want to pan.
            // Let's force pan priority for better "Control" sensation.
            if (e.cancelable) e.preventDefault();

            const helpers = this.getHelpers();
            const deltaX = touch.clientX - this.state.panStart.x;
            const barsPerPx = (this.state.zoom.endIndex - this.state.zoom.startIndex) / Math.max(1, helpers.chartWidth);

            // Adjust sensitivity for touch (mobile screens are smaller, might need faster pan)
            const sensitivity = 2.0;
            const offset = Math.round(-deltaX * barsPerPx * sensitivity);

            const range = this.state.zoom.endIndex - this.state.zoom.startIndex;
            let start = this.state.panStart.startIndex + offset;
            let end = start + range;

            if (start < 0) { start = 0; end = range; }
            if (end >= this.quotes.length) { end = this.quotes.length - 1; start = end - range; }

            this.state.zoom = { startIndex: start, endIndex: end };
            this.draw();

            // Update Crosshair for touch
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const visible = this.getVisibleQuotes();
            if (x >= helpers.chartLeft && x <= helpers.chartRight) {
                const xRatio = (x - helpers.chartLeft) / helpers.chartWidth;
                const idx = Math.floor(xRatio * visible.length);
                if (visible[idx]) {
                    this.state.hovered = showIndex = visible[idx];
                    this.state.hoveredIndex = idx;
                }
            }
        }

        handleTouchEnd(e) {
            this.state.isPanning = false;
            this.state.hovered = null;
            this.draw();
        }

        handleMouseLeave() {
            this.state.isPanning = false;
            this.state.hovered = null;
            this.state.hoveredIndex = -1;
            this.draw();
        }

        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.state.isPanning) {
                const helpers = this.getHelpers();
                const deltaX = e.clientX - this.state.panStart.x;
                const barsPerPx = (this.state.zoom.endIndex - this.state.zoom.startIndex) / Math.max(1, helpers.chartWidth);
                const offset = Math.round(-deltaX * barsPerPx * 1.5); // 1.5x speed for better feel
                const range = this.state.zoom.endIndex - this.state.zoom.startIndex;
                let start = this.state.panStart.startIndex + offset;
                let end = start + range;

                if (start < 0) { start = 0; end = range; }
                if (end >= this.quotes.length) { end = this.quotes.length - 1; start = end - range; }

                this.state.zoom = { startIndex: start, endIndex: end };
                this.draw();
                return;
            }

            const helpers = this.getHelpers();
            const visible = this.getVisibleQuotes();

            // Check if in chart area
            if (x >= this.padding.left && x <= helpers.chartWidth + this.padding.left &&
                y >= this.padding.top && y <= this.canvas.height - this.padding.bottom) {
                const ratio = (x - this.padding.left) / helpers.chartWidth;
                const idx = Math.min(visible.length - 1, Math.max(0, Math.round(ratio * (visible.length - 1))));
                this.state.hovered = { x, y, quote: visible[idx], price: helpers.yToPrice(y) };
                this.state.hoveredIndex = idx;
                this.draw();
            } else {
                this.state.hovered = null;
                this.state.hoveredIndex = -1;
                this.draw();
            }
        }

        getVisibleQuotes() {
            return this.quotes.slice(this.state.zoom.startIndex, this.state.zoom.endIndex + 1);
        }

        getHelpers() {
            const visible = this.getVisibleQuotes();

            // Handle empty data case
            if (visible.length === 0) {
                const w = this.canvas.width;
                const h = this.canvas.height;
                return {
                    minPrice: 0, maxPrice: 100,
                    chartWidth: w - this.padding.left - this.padding.right,
                    chartHeight: h - this.padding.top - this.padding.bottom,
                    priceRange: 100,
                    priceToY: () => 0,
                    yToPrice: () => 0,
                    indexToX: () => 0
                };
            }

            let minPrice = Infinity, maxPrice = -Infinity;

            const highItems = visible.map(q => q.high);
            const lowItems = visible.map(q => q.low);

            // Include support/resistance in range calculation
            if (this.options.support) { lowItems.push(this.options.support); }
            if (this.options.resistance) { highItems.push(this.options.resistance); }
            if (this.options.currentPrice) {
                highItems.push(this.options.currentPrice);
                lowItems.push(this.options.currentPrice);
            }

            minPrice = Math.min(...lowItems) * 0.995;
            maxPrice = Math.max(...highItems) * 1.005;

            const w = this.canvas.width;
            const h = this.canvas.height;
            const chartWidth = w - this.padding.left - this.padding.right;
            const chartHeight = h - this.padding.top - this.padding.bottom;
            const priceRange = maxPrice - minPrice;

            return {
                minPrice, maxPrice, chartWidth, chartHeight, priceRange,
                priceToY: p => this.padding.top + ((maxPrice - p) / priceRange) * chartHeight,
                yToPrice: y => maxPrice - ((y - this.padding.top) / chartHeight) * priceRange,
                indexToX: i => this.padding.left + (i / Math.max(1, visible.length - 1)) * chartWidth
            };
        }

        formatVolume(vol) {
            if (!vol) return 'N/A';
            if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
            if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
            if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
            return vol.toString();
        }

        draw() {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            // Clear and draw background gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
            bgGradient.addColorStop(0, 'rgba(24, 24, 27, 0.95)');
            bgGradient.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, w, h);

            const visible = this.getVisibleQuotes();
            if (visible.length === 0) {
                ctx.fillStyle = '#71717a';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('No Data Available', w / 2, h / 2);
                return;
            }

            const helpers = this.getHelpers();
            const { minPrice, maxPrice, chartWidth, chartHeight, priceRange, priceToY, indexToX } = helpers;

            // Grid lines
            ctx.strokeStyle = 'rgba(63, 63, 70, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = this.padding.top + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(this.padding.left, y);
                ctx.lineTo(w - this.padding.right, y);
                ctx.stroke();

                const price = maxPrice - (priceRange / 5) * i;
                ctx.fillStyle = '#a1a1aa'; // Lighter text
                ctx.font = '11px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('$' + price.toFixed(2), w - this.padding.right + 5, y + 4);
            }

            // Support line with label
            if (this.options.support && this.options.support >= minPrice && this.options.support <= maxPrice) {
                const y = priceToY(this.options.support);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(this.padding.left, y);
                ctx.lineTo(w - this.padding.right, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('Support $' + this.options.support.toFixed(2), this.padding.left + 5, y - 4);
            }

            // Resistance line with label
            if (this.options.resistance && this.options.resistance >= minPrice && this.options.resistance <= maxPrice) {
                const y = priceToY(this.options.resistance);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(this.padding.left, y);
                ctx.lineTo(w - this.padding.right, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('Resistance $' + this.options.resistance.toFixed(2), this.padding.left + 5, y + 12);
            }

            // Moving Averages (dashed lines)
            if (this.options.showMAs && this.options.movingAverages) {
                const drawMA = (val, color) => {
                    if (val && val >= minPrice && val <= maxPrice) {
                        const y = priceToY(val);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        ctx.beginPath();
                        ctx.moveTo(this.padding.left, y);
                        ctx.lineTo(w - this.padding.right, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                };
                drawMA(this.options.movingAverages.sma20, '#fbbf24');
                drawMA(this.options.movingAverages.sma50, '#60a5fa');
                drawMA(this.options.movingAverages.sma200, '#f472b6');
            }

            // Pivot points
            if (this.options.showPivots && this.options.pivotPoints) {
                const drawPivot = (val, color) => {
                    if (val && val >= minPrice && val <= maxPrice) {
                        const y = priceToY(val);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 4]);
                        ctx.globalAlpha = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(this.padding.left, y);
                        ctx.lineTo(w - this.padding.right, y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                        ctx.setLineDash([]);
                    }
                };
                drawPivot(this.options.pivotPoints.pp, '#a78bfa');
                drawPivot(this.options.pivotPoints.r1, '#ef4444');
                drawPivot(this.options.pivotPoints.s1, '#22c55e');
            }

            // Price chart
            // const candleWidth = Math.max(2, Math.min(15, (chartWidth / visible.length) * 0.7)); // Removed this line

            if (this.options.chartType === 'line') {
                // Line chart with gradient fill
                ctx.beginPath();
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;

                visible.forEach((q, i) => {
                    const x = indexToX(i);
                    const y = priceToY(q.close);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();

                // Gradient fill under line
                const gradient = ctx.createLinearGradient(0, this.padding.top, 0, h - this.padding.bottom);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                ctx.fillStyle = gradient;
                ctx.lineTo(indexToX(visible.length - 1), h - this.padding.bottom);
                ctx.lineTo(indexToX(0), h - this.padding.bottom);
                ctx.fill();

                // Current price line is handled globally below to support both chart types
            } else {
                // Candle chart (simplified)
                visible.forEach((q, i) => {
                    const x = indexToX(i);
                    const openY = priceToY(q.open);
                    const closeY = priceToY(q.close);
                    const highY = priceToY(q.high);
                    const lowY = priceToY(q.low);
                    const isUp = q.close >= q.open;

                    ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
                    ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';

                    // Wick
                    ctx.beginPath();
                    ctx.moveTo(x, highY);
                    ctx.lineTo(x, lowY);
                    ctx.stroke();

                    // Body
                    const bodyHeight = Math.max(1, Math.abs(closeY - openY));
                    const bodyY = Math.min(openY, closeY);
                    const cWidth = Math.max(1, (chartWidth / visible.length) * 0.6);
                    ctx.fillRect(x - cWidth / 2, bodyY, cWidth, bodyHeight);
                });
            }

            // X-Axis Labels (Dates)
            // Draw smart date labels
            const isMobile = w < 600;
            const labelSpacing = isMobile ? 130 : 100; // More space on mobile labels
            const numXLabels = Math.max(2, Math.floor(chartWidth / labelSpacing));

            ctx.fillStyle = '#a1a1aa'; // Zinc-400
            ctx.font = isMobile ? '10px sans-serif' : '12px sans-serif';
            ctx.textAlign = 'center';

            for (let i = 0; i < numXLabels; i++) {
                const ratio = i / (numXLabels - 1);
                const idx = Math.round(ratio * (visible.length - 1));
                const quote = visible[idx];
                if (quote && quote.date) {
                    const x = indexToX(idx);

                    // Grid line stops at the chart bottom
                    ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, this.padding.top);
                    ctx.lineTo(x, h - this.padding.bottom); // Stop above date labels
                    ctx.stroke();

                    // Date Label - Drawn in the middle of the 100px buffer
                    const date = new Date(quote.date);

                    // Format: MMM d, yy (e.g. Apr 1, 25)
                    const day = date.getDate();
                    const month = date.toLocaleString('default', { month: 'short' });
                    const year = date.getFullYear().toString().slice(-2);
                    const dateStr = `${month} ${day}, ${year}`;

                    // Draw well above the bottom edge (h-50)
                    ctx.fillText(dateStr, x, h - 50);
                }
            }

            // Current price line and marker
            const currentPrice = this.options.currentPrice || (visible.length > 0 ? visible[visible.length - 1].close : null);
            if (currentPrice && currentPrice >= minPrice && currentPrice <= maxPrice) {
                const y = priceToY(currentPrice);

                // Dashed line
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 2]);
                ctx.beginPath();
                ctx.moveTo(this.padding.left, y);
                ctx.lineTo(w - this.padding.right, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Price badge on right
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(w - this.padding.right, y - 9, 65, 18);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('$' + currentPrice.toFixed(2), w - this.padding.right + 4, y + 4);

                // Dot on last data point
                const lastX = indexToX(visible.length - 1);
                const lastY = priceToY(visible[visible.length - 1].close);
                ctx.beginPath();
                ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#10b981';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Date labels at bottom
            const numLabels = Math.min(5, visible.length);
            ctx.fillStyle = '#52525b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i < numLabels; i++) {
                const index = Math.floor((i / (numLabels - 1)) * (visible.length - 1));
                if (visible[index]) {
                    const x = indexToX(index);
                    const date = new Date(visible[index].date);
                    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                    ctx.fillText(label, x, h - 8);
                }
            }

            // Crosshair on hover
            if (this.state.hovered && this.state.hoveredIndex >= 0) {
                const quote = this.state.hovered.quote;
                const dataX = indexToX(this.state.hoveredIndex);
                const mouseY = this.state.hovered.y;

                // Vertical crosshair line
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(dataX, this.padding.top);
                ctx.lineTo(dataX, h - this.padding.bottom);
                ctx.stroke();

                // Horizontal crosshair line
                ctx.beginPath();
                ctx.moveTo(this.padding.left, mouseY);
                ctx.lineTo(w - this.padding.right, mouseY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Price badge on right (purple)
                const cursorPrice = this.state.hovered.price;
                ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
                ctx.fillRect(w - this.padding.right, mouseY - 9, 65, 18);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('$' + cursorPrice.toFixed(2), w - this.padding.right + 4, mouseY + 4);

                // Date badge at bottom (purple)
                const hoverDate = new Date(quote.date);
                const dateLabel = hoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                ctx.font = '10px sans-serif';
                const dateLabelWidth = ctx.measureText(dateLabel).width + 16;
                ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
                ctx.fillRect(dataX - dateLabelWidth / 2, h - this.padding.bottom + 5, dateLabelWidth, 18);
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(dateLabel, dataX, h - this.padding.bottom + 17);

                // Data point dot on price line
                const closeY = priceToY(quote.close);
                ctx.beginPath();
                ctx.arc(dataX, closeY, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#10b981';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // OHLCV Info box (top left)
                const boxWidth = 320;
                const boxHeight = 45;
                ctx.fillStyle = 'rgba(39, 39, 42, 0.95)';
                ctx.strokeStyle = 'rgba(63, 63, 70, 0.8)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(8, 8, boxWidth, boxHeight, 6);
                ctx.fill();
                ctx.stroke();

                // Date
                ctx.fillStyle = '#a1a1aa';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                const dateFull = hoverDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                ctx.fillText(dateFull, 15, 24);

                // OHLCV values
                ctx.font = '11px monospace';
                let xPos = 15;

                ctx.fillStyle = '#71717a'; ctx.fillText('O', xPos, 40); xPos += 12;
                ctx.fillStyle = '#fff'; ctx.fillText('$' + (quote.open?.toFixed(2) || 'N/A'), xPos, 40); xPos += 55;

                ctx.fillStyle = '#71717a'; ctx.fillText('H', xPos, 40); xPos += 12;
                ctx.fillStyle = '#4ade80'; ctx.fillText('$' + (quote.high?.toFixed(2) || 'N/A'), xPos, 40); xPos += 55;

                ctx.fillStyle = '#71717a'; ctx.fillText('L', xPos, 40); xPos += 10;
                ctx.fillStyle = '#f87171'; ctx.fillText('$' + (quote.low?.toFixed(2) || 'N/A'), xPos, 40); xPos += 55;

                ctx.fillStyle = '#71717a'; ctx.fillText('C', xPos, 40); xPos += 12;
                ctx.fillStyle = '#fff'; ctx.fillText('$' + (quote.close?.toFixed(2) || 'N/A'), xPos, 40); xPos += 55;

                ctx.fillStyle = '#71717a'; ctx.fillText('Vol', xPos, 40); xPos += 22;
                ctx.fillStyle = '#22d3ee'; ctx.fillText(this.formatVolume(quote.volume), xPos, 40);
            }
        }
    }

    // Global state
    const state = {
        ticker: '',
        currentPrice: 0,
        stockData: null,
        valuation: null,
        technicals: null,
        news: [],
        fcfPerShare: 0,
        assumptions: {
            revenueGrowth: parseFloat(svpData.options.default_growth || 8),
            terminalGrowth: parseFloat(svpData.options.default_terminal_growth || 2.5),
            wacc: parseFloat(svpData.options.default_wacc || 10)
        },
        suggestions: null,
        priceChart: null,
        timeframe: '1Y'
    };

    // Format number for display
    function formatNumber(num) {
        if (!num || isNaN(num)) return '—';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    function formatPrice(num) {
        if (!num || isNaN(num)) return '$0.00';
        return '$' + parseFloat(num).toFixed(2);
    }

    function formatPercent(num) {
        if (!num || isNaN(num)) return '0%';
        return parseFloat(num).toFixed(1) + '%';
    }

    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    $(document).ready(function () {
        console.log('SVP: Frontend script initialized');

        // Force Full Width Logic
        class ForceFullWidth {
            constructor(selector) {
                this.element = document.querySelector(selector);
                if (!this.element) return;
                this.init();
            }

            init() {
                this.adjust();
                window.addEventListener('resize', () => this.adjust());
                // Also adjust periodically to handle dynamic content loading
                setInterval(() => this.adjust(), 2000);
            }

            adjust() {
                if (!this.element) return;

                // Reset to measure natural offset
                this.element.style.marginLeft = '0';
                this.element.style.marginRight = '0';
                this.element.style.width = '100vw';
                this.element.style.maxWidth = '100vw';

                const rect = this.element.getBoundingClientRect();
                const offsetLeft = rect.left;

                // Calculate negative margin needed to pull to left edge
                // We use !important via cssText to override any specifics
                this.element.style.cssText = `
                    width: 100vw !important;
                    max-width: 100vw !important;
                    margin-left: -${offsetLeft}px !important;
                    margin-right: -2000px !important; /* arbitrary large number, overflow hidden handles it */
                    box-sizing: border-box !important;
                    position: relative !important;
                    left: 0 !important;
                    right: 0 !important;
                `;
            }
        }

        // Initialize Layout Fix
        new ForceFullWidth('.svp-app');

        initNavigation();
        initSliders();
        initButtons();
        initTickerInput();
        initTimeframeButtons();
        initWatchlist();

        // Load initial ticker if set
        const initialTicker = $('#svp-dashboard').data('ticker');
        if (initialTicker) {
            state.ticker = initialTicker;
            $('#svp-ticker-input').val(initialTicker);
        }
    });

    // Navigation tabs
    function initNavigation() {
        $('.svp-nav-link').on('click', function () {
            const section = $(this).data('section');

            // Update active nav
            $('.svp-nav-link').removeClass('active');
            $(this).addClass('active');

            // Show section
            $('.svp-section').hide();
            $('#svp-section-' + section).show();
        });
    }

    // Ticker input
    function initTickerInput() {
        $('#svp-ticker-input').on('input', function () {
            state.ticker = $(this).val().toUpperCase();
            updateTickerDisplays();
        });

        $('#svp-ticker-input').on('keypress', function (e) {
            if (e.which === 13) {
                fetchStockData();
            }
        });
    }

    function updateTickerDisplays() {
        $('.svp-ticker-highlight, .svp-current-ticker, #svp-current-ticker').text(state.ticker || '...');
    }

    // Sliders
    function initSliders() {
        // Growth slider
        $('#svp-growth-slider').on('input', function () {
            state.assumptions.revenueGrowth = parseFloat($(this).val());
            $('#svp-growth-display').text(state.assumptions.revenueGrowth.toFixed(1));
            recalculateValuation();
        });

        // Terminal growth slider
        $('#svp-terminal-slider').on('input', function () {
            state.assumptions.terminalGrowth = parseFloat($(this).val());
            $('#svp-terminal-display').text(state.assumptions.terminalGrowth.toFixed(1));
            recalculateValuation();
        });

        // WACC slider
        $('#svp-wacc-slider').on('input', function () {
            state.assumptions.wacc = parseFloat($(this).val());
            $('#svp-wacc-display').text(state.assumptions.wacc.toFixed(1));
            recalculateValuation();
        });

        // FCF input
        $('#svp-fcf-input').on('change', function () {
            state.fcfPerShare = parseFloat($(this).val()) || 0;
            recalculateValuation();
        });

        // Reset defaults
        $('#svp-reset-defaults').on('click', function () {
            state.assumptions.revenueGrowth = parseFloat(svpData.options.default_growth || 8);
            state.assumptions.terminalGrowth = parseFloat(svpData.options.default_terminal_growth || 2.5);
            state.assumptions.wacc = parseFloat(svpData.options.default_wacc || 10);

            $('#svp-growth-slider').val(state.assumptions.revenueGrowth);
            $('#svp-terminal-slider').val(state.assumptions.terminalGrowth);
            $('#svp-wacc-slider').val(state.assumptions.wacc);

            $('#svp-growth-display').text(state.assumptions.revenueGrowth.toFixed(1));
            $('#svp-terminal-display').text(state.assumptions.terminalGrowth.toFixed(1));
            $('#svp-wacc-display').text(state.assumptions.wacc.toFixed(1));

            recalculateValuation();
        });

        // Apply suggestions
        $('#svp-apply-suggestions').on('click', function () {
            if (state.suggestions) {
                if (state.suggestions.revenueGrowth) {
                    state.assumptions.revenueGrowth = state.suggestions.revenueGrowth.value;
                    $('#svp-growth-slider').val(state.assumptions.revenueGrowth);
                    $('#svp-growth-display').text(state.assumptions.revenueGrowth.toFixed(1));
                }
                if (state.suggestions.terminalGrowth) {
                    state.assumptions.terminalGrowth = state.suggestions.terminalGrowth.value;
                    $('#svp-terminal-slider').val(state.assumptions.terminalGrowth);
                    $('#svp-terminal-display').text(state.assumptions.terminalGrowth.toFixed(1));
                }
                if (state.suggestions.wacc) {
                    state.assumptions.wacc = state.suggestions.wacc.value;
                    $('#svp-wacc-slider').val(state.assumptions.wacc);
                    $('#svp-wacc-display').text(state.assumptions.wacc.toFixed(1));
                }
                recalculateValuation();
            }
        });
    }

    // Buttons
    function initButtons() {
        // Fetch stock data
        $('#svp-fetch-btn').on('click', function () {
            fetchStockData();
        });

        // Fetch technicals
        $('#svp-fetch-technicals').on('click', function () {
            fetchTechnicals();
        });

        // Fetch news
        $('#svp-fetch-news').on('click', fetchNews);
        // AI Analyze
        $('#svp-analyze-ai').on('click', function () { runAIAnalysis(); });
        // Fetch and Analyze
        $('#svp-fetch-analyze-btn').on('click', handleFetchAndAnalyze);

        // Initialize dashboard interactions
        initDashboard();
    }

    // Dashboard landing page interactions
    function initDashboard() {
        // Hero search button
        $('#svp-hero-search-btn').on('click', function () {
            const ticker = $('#svp-hero-ticker').val().toUpperCase().trim();
            if (ticker) {
                navigateToAnalysis(ticker);
            }
        });

        // Hero search input enter key
        $('#svp-hero-ticker').on('keypress', function (e) {
            if (e.which === 13) {
                const ticker = $(this).val().toUpperCase().trim();
                if (ticker) {
                    navigateToAnalysis(ticker);
                }
            }
        });

        // Popular ticker chips
        $('.svp-ticker-chip').on('click', function () {
            const ticker = $(this).data('ticker');
            navigateToAnalysis(ticker);
        });

        // Feature cards navigation
        $('.svp-feature-card').on('click', function () {
            const section = $(this).data('section');
            const ticker = $('#svp-hero-ticker').val().toUpperCase().trim() || state.ticker;

            if (ticker) {
                state.ticker = ticker;
                $('#svp-ticker-input').val(ticker);
                updateTickerDisplays();
            }

            // Navigate to section
            $('.svp-nav-link').removeClass('active');
            $('.svp-nav-link[data-section="' + section + '"]').addClass('active');
            $('.svp-section').hide().removeClass('active');
            $('#svp-section-' + section).show().addClass('active');
        });
    }

    // Helper to navigate from dashboard to analysis sections
    function navigateToAnalysis(ticker) {
        state.ticker = ticker;
        $('#svp-ticker-input').val(ticker);
        $('#svp-hero-ticker').val(ticker);
        updateTickerDisplays();

        // Navigate to AI Analyzer section by default (most popular feature)
        const targetSection = svpData.options.enable_news_feed ? 'news' : 'technicals';

        $('.svp-nav-link').removeClass('active');
        $('.svp-nav-link[data-section="' + targetSection + '"]').addClass('active');
        $('.svp-section').hide().removeClass('active');
        $('#svp-section-' + targetSection).show().addClass('active');

        // Auto-trigger the analysis
        if (targetSection === 'news') {
            handleFetchAndAnalyze();
        } else {
            fetchTechnicals();
        }
    }

    // ========================================
    // WATCHLIST FUNCTIONALITY
    // ========================================
    let watchlistData = [];

    function renderWatchlist() {
        console.log('SVP Watchlist: renderWatchlist called, data:', watchlistData);

        const container = $('#svp-watchlist-content');
        const emptyState = $('#svp-watchlist-empty');

        console.log('SVP Watchlist: Container found:', container.length);
        console.log('SVP Watchlist: Empty state found:', emptyState.length);

        // Clear current content
        container.empty();

        if (!watchlistData || watchlistData.length === 0) {
            // Show empty state
            console.log('SVP Watchlist: Showing empty state');
            emptyState.show();
            return;
        }

        // Hide empty state
        console.log('SVP Watchlist: Hiding empty state, rendering', watchlistData.length, 'items');
        emptyState.hide();

        // Render each watchlist item
        watchlistData.forEach(function (ticker) {
            const item = $('<div>')
                .addClass('svp-watchlist-item')
                .attr('data-ticker', ticker);

            const info = $('<div>').addClass('svp-watchlist-item-info');
            const tickerLabel = $('<div>')
                .addClass('svp-watchlist-item-ticker')
                .text(ticker);
            const nameLabel = $('<div>')
                .addClass('svp-watchlist-item-name')
                .text('Click to analyze');

            info.append(tickerLabel, nameLabel);

            const removeBtn = $('<button>')
                .addClass('svp-watchlist-item-remove')
                .html('✕')
                .attr('title', 'Remove from watchlist')
                .on('click', function (e) {
                    e.stopPropagation();
                    removeFromWatchlist(ticker);
                });

            // Click on item to analyze that ticker
            item.on('click', function () {
                $('#svp-ticker-input').val(ticker);
                loadTickerAndAnalyze(ticker);
                // Close sidebar on mobile
                if ($(window).width() < 768) {
                    $('#svp-watchlist-sidebar').removeClass('open');
                }
            });

            item.append(info, removeBtn);
            container.append(item);
        });
    }

    function removeFromWatchlist(ticker) {
        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_remove_from_watchlist',
                ticker: ticker,
                _ajax_nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success && response.data.watchlist) {
                    watchlistData = response.data.watchlist;
                    renderWatchlist();
                }
            },
            error: function () {
                console.log('Failed to remove from watchlist');
            }
        });
    }

    function initWatchlist() {
        // Toggle sidebar
        $('#svp-watchlist-toggle').on('click', function () {
            $('#svp-watchlist-sidebar').toggleClass('open');
        });

        // Add ticker from watchlist input to watchlist
        $('#svp-watchlist-add-btn').on('click', function () {
            const input = $('#svp-watchlist-ticker-input');
            let ticker = input.val().toUpperCase().trim();

            console.log('SVP Watchlist: Add button clicked, ticker=', ticker);

            if (ticker) {
                addToWatchlist(ticker);
                input.val(''); // Clear the input after adding
            } else {
                console.log('SVP Watchlist: No ticker entered');
                input.focus(); // Focus the input to prompt user to enter ticker
                input.attr('placeholder', 'Please enter a ticker!');
                setTimeout(() => {
                    input.attr('placeholder', 'Enter ticker (e.g., AAPL)');
                }, 2000);
            }
        });

        // Allow Enter key to add ticker
        $('#svp-watchlist-ticker-input').on('keypress', function (e) {
            if (e.which === 13) { // Enter key
                $('#svp-watchlist-add-btn').click();
            }
        });

        // Load watchlist on page load (if logged in)
        loadWatchlist();
    }

    function loadWatchlist() {
        // Check if user is logged in using PHP-provided flag OR has JWT token
        const isLoggedIn = (svpData && !!svpData.isLoggedIn) || !!localStorage.getItem('svp_token');

        console.log('SVP Watchlist: Checking auth...', {
            'svpData exists': !!svpData,
            'svpData.isLoggedIn': svpData ? svpData.isLoggedIn : 'N/A',
            'Has JWT token': !!localStorage.getItem('svp_token'),
            'Final isLoggedIn': isLoggedIn
        });

        if (!isLoggedIn) {
            $('#svp-watchlist-content').hide();
            $('#svp-watchlist-login').show();
            $('#svp-watchlist-add-btn').hide();
            console.log('SVP Watchlist: User not logged in, showing login prompt');
            return;
        }

        console.log('SVP Watchlist: User logged in, loading watchlist...');
        $('#svp-watchlist-content').show();
        $('#svp-watchlist-login').hide();
        $('#svp-watchlist-add-btn').show();

        const token = localStorage.getItem('svp_token');
        const ajaxConfig = {
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_get_watchlist',
                _ajax_nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success && response.data.watchlist) {
                    watchlistData = response.data.watchlist;
                    renderWatchlist();
                    console.log('SVP Watchlist: Loaded', watchlistData.length, 'items');
                } else {
                    console.log('SVP Watchlist: Failed to load', response);
                }
            },
            error: function (xhr, status, error) {
                console.error('SVP Watchlist: Error loading watchlist', error);
            }
        };

        // Add Authorization header if JWT token exists
        if (token) {
            ajaxConfig.headers = { 'Authorization': 'Bearer ' + token };
        }

        $.ajax(ajaxConfig);
    }

    function addToWatchlist(ticker) {
        if (!ticker) return;

        const ajaxConfig = {
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_add_to_watchlist',
                ticker: ticker,
                _ajax_nonce: svpData.nonce
            },
            success: function (response) {
                console.log('SVP Watchlist: Add response:', response);
                if (response.success && response.data.watchlist) {
                    console.log('SVP Watchlist: Add successful, watchlist:', response.data.watchlist);
                    watchlistData = response.data.watchlist;
                    renderWatchlist();
                    // Open the sidebar to show the added item
                    $('#svp-watchlist-sidebar').addClass('open');
                } else {
                    console.log('SVP Watchlist: Add failed or no watchlist in response');
                    if (response.data && response.data.message) {
                        alert(response.data.message);
                    }
                }
            },
            error: function (xhr, status, error) {
                console.error('SVP Watchlist: Failed to add to watchlist', error);
                console.error('SVP Watchlist: XHR:', xhr);
            }
        };

        $.ajax(ajaxConfig);
    }

    function removeFromWatchlist(ticker) {
        const ajaxConfig = {
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_remove_from_watchlist',
                ticker: ticker,
                _ajax_nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success && response.data.watchlist) {
                    watchlistData = response.data.watchlist;
                    renderWatchlist();
                }
            },
            error: function () {
                console.log('Failed to remove from watchlist');
            }
        };

        $.ajax(ajaxConfig);
    }

    function renderWatchlist() {
        const $content = $('#svp-watchlist-content');
        const $empty = $('#svp-watchlist-empty');

        if (watchlistData.length === 0) {
            $empty.show();
            $content.find('.svp-watchlist-item').remove();
            return;
        }

        $empty.hide();
        $content.find('.svp-watchlist-item').remove();

        watchlistData.forEach(function (ticker) {
            const $item = $(`
                <div class="svp-watchlist-item" data-ticker="${escapeHtml(ticker)}">
                    <div class="svp-watchlist-item-info">
                        <span class="svp-watchlist-item-ticker">${escapeHtml(ticker)}</span>
                    </div>
                    <button class="svp-watchlist-item-remove" title="Remove">✕</button>
                </div>
            `);

            // Click to analyze
            $item.on('click', function (e) {
                if (!$(e.target).hasClass('svp-watchlist-item-remove')) {
                    const t = $(this).data('ticker');
                    navigateToAnalysis(t);
                }
            });

            // Remove button
            $item.find('.svp-watchlist-item-remove').on('click', function (e) {
                e.stopPropagation();
                const t = $(this).closest('.svp-watchlist-item').data('ticker');
                removeFromWatchlist(t);
            });

            $content.append($item);
        });
    }

    // Timeframe buttons
    function initTimeframeButtons() {
        $('#svp-timeframe-buttons .svp-timeframe-btn').on('click', function () {
            const tf = $(this).data('tf');
            state.timeframe = tf;

            $('#svp-timeframe-buttons .svp-timeframe-btn').removeClass('active');
            $(this).addClass('active');

            if (state.ticker) {
                fetchTechnicals();
            }
        });
    }

    // Fetch stock data
    function fetchStockData() {
        if (!state.ticker) {
            alert('Please enter a ticker symbol');
            return;
        }

        $('#svp-loading').show();
        $('#svp-valuation-results').hide();
        $('#svp-fetch-btn').prop('disabled', true).html('<span class="svp-spinner" style="width:16px;height:16px;margin-right:8px;"></span> Analyzing...');

        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_fetch_stock_data',
                ticker: state.ticker,
                nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success) {
                    state.stockData = response.data;
                    state.currentPrice = response.data.currentPrice;

                    // Update FCF per share
                    if (response.data.fundamentals && response.data.fundamentals.freeCashFlow && response.data.fundamentals.sharesOutstanding) {
                        state.fcfPerShare = response.data.fundamentals.freeCashFlow / response.data.fundamentals.sharesOutstanding;
                        $('#svp-fcf-input').val(state.fcfPerShare.toFixed(2));
                    }

                    // Update company name
                    if (response.data.fundamentals && response.data.fundamentals.sector) {
                        $('#svp-company-name').text(' • ' + (response.data.fundamentals.sector || 'Technology'));
                    }

                    // Generate suggestions based on data
                    generateSuggestions(response.data);

                    // Display fundamentals
                    displayFundamentals(response.data);

                    // Calculate valuation
                    calculateValuation();
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to fetch data'));
                }
            },
            error: function (xhr, status, error) {
                alert('Network error. Please try again.');
                console.error(error);
            },
            complete: function () {
                $('#svp-loading').hide();
                $('#svp-fetch-btn').prop('disabled', false).html('<span>📊</span><span>Get FMP Data</span>');
            }
        });
    }

    // Generate suggestions from stock data
    function generateSuggestions(data) {
        const fundamentals = data.fundamentals || {};

        state.suggestions = {
            revenueGrowth: {
                value: Math.min(30, Math.max(0, fundamentals.revenueGrowth || 10)),
                source: 'Based on historical revenue growth'
            },
            terminalGrowth: {
                value: 2.5,
                source: 'Long-term GDP growth assumption'
            },
            wacc: {
                value: 8 + (fundamentals.beta || 1) * 2,
                source: 'CAPM: Rf + Beta × (Rm - Rf)'
            }
        };

        // Update UI
        $('#svp-suggestion-company').text(state.ticker);
        $('#svp-suggestion-sector').text(fundamentals.sector || 'Technology');

        $('#svp-suggest-growth-val').text(formatPercent(state.suggestions.revenueGrowth.value));
        $('#svp-suggest-growth-src').text(state.suggestions.revenueGrowth.source);

        $('#svp-suggest-wacc-val').text(formatPercent(state.suggestions.wacc.value));
        $('#svp-suggest-wacc-src').text(state.suggestions.wacc.source);

        $('#svp-suggest-terminal-val').text(formatPercent(state.suggestions.terminalGrowth.value));
        $('#svp-suggest-terminal-src').text(state.suggestions.terminalGrowth.source);

        $('#svp-suggestions').show();
    }

    // Display fundamentals
    function displayFundamentals(data) {
        const f = data.fundamentals || {};

        $('#svp-market-cap').text(formatNumber(f.marketCap));
        $('#svp-pe-ratio').text(f.trailingPE ? f.trailingPE.toFixed(1) : '—');
        $('#svp-beta').text(f.beta ? f.beta.toFixed(2) : '1.00');
        $('#svp-dividend-yield').text(f.dividendYield ? formatPercent(f.dividendYield) : '0%');
        $('#svp-fcf').text(formatNumber(f.freeCashFlow));
        $('#svp-fcf-per-share').text(formatPrice(state.fcfPerShare));
        $('#svp-revenue-growth').text(f.revenueGrowth ? formatPercent(f.revenueGrowth) : '—');
        $('#svp-profit-margin').text(f.profitMargin ? formatPercent(f.profitMargin) : '—');
        $('#svp-roe').text(f.returnOnEquity ? formatPercent(f.returnOnEquity) : '—');
    }

    // Calculate valuation
    function calculateValuation() {
        if (!state.stockData || state.fcfPerShare <= 0) {
            return;
        }

        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_calculate_valuation',
                nonce: svpData.nonce,
                freeCashFlow: state.stockData.fundamentals ? state.stockData.fundamentals.freeCashFlow : 0,
                sharesOutstanding: state.stockData.fundamentals ? state.stockData.fundamentals.sharesOutstanding : 1,
                currentPrice: state.currentPrice,
                beta: state.stockData.fundamentals ? state.stockData.fundamentals.beta : 1,
                growthRate: state.assumptions.revenueGrowth,
                wacc: state.assumptions.wacc,
                terminalGrowth: state.assumptions.terminalGrowth,
                eps: state.stockData.fundamentals ? state.stockData.fundamentals.earningsPerShare : 0,
                bookValue: state.stockData.fundamentals ? state.stockData.fundamentals.bookValuePerShare : 0,
                dividend: state.stockData.fundamentals ? state.stockData.fundamentals.dividendRate : 0
            },
            success: function (response) {
                if (response.success) {
                    state.valuation = response.data;
                    displayValuation(response.data);
                }
            }
        });
    }

    function recalculateValuation() {
        calculateValuation();
    }

    // Display valuation results
    function displayValuation(data) {
        $('#svp-valuation-results').show();

        // Current price
        $('#svp-current-price').text(formatPrice(state.currentPrice));

        // Verdict
        const verdict = data.verdict || 'HOLD';
        const verdictClass = 'svp-verdict-' + verdict.toLowerCase().replace('_', '-');
        $('#svp-verdict').removeClass().addClass('svp-verdict ' + verdictClass).text(verdict.replace('_', ' '));

        // Upside
        const upside = data.upside || 0;
        $('#svp-total-upside')
            .removeClass('positive negative')
            .addClass(upside >= 0 ? 'positive' : 'negative')
            .text((upside >= 0 ? '+' : '') + upside.toFixed(1) + '%');

        // Methods count
        const validMethods = (data.methods || []).filter(m => m.fairValue > 0 && m.method !== 'Reverse DCF').length;
        $('#svp-methods-count').text(validMethods);

        // Fair values
        $('#svp-avg-fair-value').text(formatPrice(data.averageFairValue));
        $('#svp-conservative-value').text(formatPrice(data.conservativeFairValue));
        $('#svp-dcf-value').text(formatPrice(data.dcfFairValue));
        $('#svp-implied-growth').text(formatPercent(data.impliedGrowth));

        // Quick stats
        $('#svp-graham').text(formatPrice(data.grahamNumber));
        $('#svp-lynch').text(formatPrice(data.lynchFairValue));
        $('#svp-epv').text(formatPrice(data.epvFairValue));
        $('#svp-ddm').text(data.ddmFairValue ? formatPrice(data.ddmFairValue) : 'N/A');

        // Methods grid
        const methodsHtml = (data.methods || []).map(method => {
            const upsideClass = method.upside >= 0 ? 'positive' : 'negative';
            const confClass = method.confidence || 'medium';

            return `
                <div class="svp-method-card">
                    <div class="svp-method-header">
                        <h4 class="svp-method-name">${escapeHtml(method.method)}</h4>
                        <span class="svp-method-confidence ${confClass}">${method.confidence || 'medium'}</span>
                    </div>
                    <div class="svp-method-values">
                        <span class="svp-method-price">${formatPrice(method.fairValue)}</span>
                        <span class="svp-method-upside ${upsideClass}">${method.upside >= 0 ? '+' : ''}${method.upside.toFixed(1)}%</span>
                    </div>
                    ${method.details ? `<p class="svp-method-details">${escapeHtml(method.details)}</p>` : ''}
                </div>
            `;
        }).join('');

        $('#svp-methods-grid').html(methodsHtml);
    }

    // Fetch technicals
    function fetchTechnicals() {
        if (!state.ticker) {
            alert('Please enter a ticker symbol');
            return;
        }

        $('#svp-tech-loading').show();
        $('#svp-tech-content').hide();
        $('#svp-tech-empty').hide();

        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_fetch_technicals',
                ticker: state.ticker,
                timeframe: state.timeframe,
                nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success) {
                    state.technicals = response.data;
                    displayTechnicals(response.data);
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to fetch technicals'));
                    $('#svp-tech-empty').show();
                }
            },
            error: function () {
                alert('Network error. Please try again.');
                $('#svp-tech-empty').show();
            },
            complete: function () {
                $('#svp-tech-loading').hide();
            }
        });
    }

    // Display technicals
    function displayTechnicals(data) {
        $('#svp-tech-content').show();

        // Price
        $('#svp-tech-price').text(formatPrice(data.currentPrice));

        // RSI
        const rsi = data.rsi || { value: 50, signal: 'NEUTRAL' };
        $('#svp-rsi-value').text(Math.round(rsi.value));

        const rsiSignal = rsi.signal || 'NEUTRAL';
        const rsiClass = rsiSignal.toLowerCase();
        $('#svp-rsi-signal').removeClass('overbought oversold neutral').addClass(rsiClass).text(rsiSignal);
        $('#svp-rsi-fill')
            .removeClass('overbought oversold neutral')
            .addClass(rsiClass)
            .css('width', rsi.value + '%');

        // Moving Averages
        const ma = data.movingAverages || {};
        const price = data.currentPrice;

        updateMADisplay('#svp-sma20', ma.sma20, price);
        updateMADisplay('#svp-sma50', ma.sma50, price);
        updateMADisplay('#svp-sma200', ma.sma200, price);
        updateMADisplay('#svp-ema12', ma.ema12, price);
        updateMADisplay('#svp-ema26', ma.ema26, price);

        // Pivot Points
        const pivots = data.pivotPoints || {};
        $('#svp-r3').text(formatPrice(pivots.r3));
        $('#svp-r2').text(formatPrice(pivots.r2));
        $('#svp-r1').text(formatPrice(pivots.r1));
        $('#svp-pivot').text(formatPrice(pivots.pp));
        $('#svp-s1').text(formatPrice(pivots.s1));
        $('#svp-s2').text(formatPrice(pivots.s2));
        $('#svp-s3').text(formatPrice(pivots.s3));

        // Support/Resistance
        const sr = data.supportResistance || { support: [], resistance: [] };

        const resistanceHtml = (sr.resistance || []).map(r =>
            `<span class="svp-sr-pill resistance">${formatPrice(r)}</span>`
        ).join('') || '<span class="svp-sr-pill resistance">—</span>';

        const supportHtml = (sr.support || []).map(s =>
            `<span class="svp-sr-pill support">${formatPrice(s)}</span>`
        ).join('') || '<span class="svp-sr-pill support">—</span>';

        $('#svp-resistance-levels').html(resistanceHtml);
        $('#svp-support-levels').html(supportHtml);

        // Data info
        $('#svp-data-points').text((data.chart || []).length);
        $('#svp-timeframe-display').text(state.timeframe);

        // Render chart
        renderPriceChart(data);
    }

    function updateMADisplay(selector, value, currentPrice) {
        const $el = $(selector);
        if (value && value > 0) {
            const arrow = currentPrice > value ? '↑' : '↓';
            const arrowClass = currentPrice > value ? 'up' : 'down';
            $el.html(`${formatPrice(value)} <span class="svp-ma-arrow ${arrowClass}">${arrow}</span>`);
        } else {
            $el.text('N/A');
        }
    }

    // Render price chart with DetailedChart
    function renderPriceChart(data) {
        const canvas = document.getElementById('svp-price-chart');
        if (!canvas) return;

        // Ensure canvas visible dimensions match display for sharp rendering
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        if (state.priceChart) {
            if (state.priceChart instanceof DetailedChart) state.priceChart.destroy();
            else if (typeof state.priceChart.destroy === 'function') state.priceChart.destroy();
        }

        const quotes = data.chart || [];

        // Determine best current price
        let validPrice = data.currentPrice;
        if ((!validPrice || validPrice === 0) && quotes.length > 0) {
            validPrice = quotes[quotes.length - 1].close;
        }
        state.currentPrice = validPrice; // Update state

        const options = {
            support: data.supportResistance?.support?.[0],
            resistance: data.supportResistance?.resistance?.[0],
            pivotPoints: data.pivotPoints,
            movingAverages: data.movingAverages,
            currentPrice: validPrice,
            showMAs: true,
            showPivots: true
        };

        state.priceChart = new DetailedChart(canvas, quotes, options);

        // Hide legacy header
        $(canvas).closest('.svp-card').find('.svp-card-header').hide();

        // Add chart header and controls if missing
        if ($('#svp-chart-header').length === 0) {
            const headerHtml = `
                <div id="svp-chart-header" class="svp-chart-header">
                    <div class="svp-chart-header-left">
                        <span class="svp-chart-ticker">${state.ticker}</span>
                        <span class="svp-chart-price">$${(state.currentPrice || 0).toFixed(2)}</span>
                    </div>
                    <div class="svp-chart-header-right">
                        <div class="svp-timeframe-btns">
                            ${['1M', '6M', '1Y', '3Y', '5Y', '10Y'].map(tf =>
                `<button class="svp-tf-btn ${state.timeframe === tf ? 'active' : ''}" data-tf="${tf}">${tf}</button>`
            ).join('')}
                        </div>
                    </div>
                </div>
                <div id="svp-chart-controls" class="svp-chart-controls">
                    <div class="svp-chart-controls-left">
                        <button class="svp-chart-type-btn active" data-type="line">📈 Line</button>
                        <button class="svp-chart-type-btn" data-type="candle">🕯️ Candle</button>
                        <span class="svp-chart-divider"></span>
                        <label class="svp-chart-toggle"><input type="checkbox" id="svp-show-mas" checked> MAs</label>
                        <label class="svp-chart-toggle"><input type="checkbox" id="svp-show-pivots" checked> Pivots</label>
                    </div>
                    <div class="svp-chart-controls-right">
                        🖱️ Scroll to zoom • Hover for details
                    </div>
                </div>
            `;
            $(canvas).parent().prepend(headerHtml);

            // Legend below canvas
            const legendHtml = `
                <div id="svp-chart-legend" class="svp-chart-legend">
                    <div class="svp-legend-item"><span class="svp-legend-color" style="background:#fbbf24"></span> Current</div>
                    <div class="svp-legend-item"><span class="svp-legend-color" style="background:#22c55e"></span> Support</div>
                    <div class="svp-legend-item"><span class="svp-legend-color" style="background:#ef4444"></span> Resistance</div>
                    <div class="svp-legend-item svp-legend-bars">Showing <span id="svp-visible-bars">${quotes.length}</span> of ${quotes.length} bars</div>
                </div>
            `;
            $(canvas).parent().append(legendHtml);

            // Bind chart type buttons
            $('.svp-chart-type-btn').on('click', function () {
                const type = $(this).data('type');
                $('.svp-chart-type-btn').removeClass('active');
                $(this).addClass('active');
                if (state.priceChart instanceof DetailedChart) {
                    state.priceChart.options.chartType = type;
                    state.priceChart.draw();
                }
            });

            // Bind timeframe buttons
            $('.svp-tf-btn').on('click', function () {
                const tf = $(this).data('tf');
                $('.svp-tf-btn').removeClass('active');
                $(this).addClass('active');
                state.timeframe = tf;
                fetchTechnicals();
            });

            // Bind MA/Pivot toggles
            $('#svp-show-mas').on('change', function () {
                if (state.priceChart instanceof DetailedChart) {
                    state.priceChart.options.showMAs = $(this).is(':checked');
                    state.priceChart.draw();
                }
            });
            $('#svp-show-pivots').on('change', function () {
                if (state.priceChart instanceof DetailedChart) {
                    state.priceChart.options.showPivots = $(this).is(':checked');
                    state.priceChart.draw();
                }
            });
        } else {
            // Update price display
            $('.svp-chart-ticker').text(state.ticker);
            $('.svp-chart-price').text('$' + (state.currentPrice || 0).toFixed(2));
            $('#svp-visible-bars').text(quotes.length);
        }
    }

    function handleFetchAndAnalyze() {
        if (!state.ticker) {
            alert('Please enter a ticker symbol');
            return;
        }

        const btn = $('#svp-fetch-analyze-btn');
        btn.prop('disabled', true).html('<span class="svp-spinner" style="width:16px;height:16px;margin-right:8px;"></span> Fetching & Analyzing...');

        // Hide previous results
        $('#svp-news-loading').show();
        $('#svp-news-empty').hide();
        $('#svp-news-container').hide();
        $('#svp-ai-analysis').hide();

        // Step 1: Fetch News
        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_fetch_news',
                ticker: state.ticker,
                count: 12,
                nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success && response.data.news && response.data.news.length > 0) {
                    state.news = response.data.news;
                    displayNews(state.news);

                    // Step 2: Auto Analyze
                    btn.html('<span class="svp-spinner" style="width:16px;height:16px;margin-right:8px;"></span> Analyzing with AI...');
                    runAIAnalysis(btn);
                } else {
                    $('#svp-news-empty').show();
                    btn.prop('disabled', false).html('<span>🤖</span><span>AI Analyzer</span>');
                }
            },
            error: function () {
                alert('Network error. Failed to fetch news.');
                $('#svp-news-empty').show();
                btn.prop('disabled', false).html('<span>🤖</span><span>AI Analyzer</span>');
            },
            complete: function () {
                $('#svp-news-loading').hide();
            }
        });
    }

    // Fetch news only (Legacy/Fallback)
    function fetchNews() {
        if (!state.ticker) {
            alert('Please enter a ticker symbol');
            return;
        }

        $('#svp-news-loading').show();
        $('#svp-news-empty').hide();
        $('#svp-news-container').hide();

        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_fetch_news',
                ticker: state.ticker,
                count: 12,
                nonce: svpData.nonce
            },
            success: function (response) {
                if (response.success && response.data.news) {
                    state.news = response.data.news;
                    displayNews(response.data.news);
                } else {
                    $('#svp-news-empty').show();
                }
            },
            error: function () {
                alert('Network error. Please try again.');
                $('#svp-news-empty').show();
            },
            complete: function () {
                $('#svp-news-loading').hide();
            }
        });
    }

    // Display news
    function displayNews(news) {
        if (!news || news.length === 0) {
            $('#svp-news-empty').show();
            return;
        }

        $('#svp-news-container').show();
        $('#svp-news-count').text(news.length);

        const newsHtml = news.map(article => {
            const thumbnail = article.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" fill="%2327272a"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%2371717a" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">📰</text></svg>';
            const timeAgo = article.publishedAt ? formatTimeAgo(article.publishedAt) : '';

            return `
                <div class="svp-news-card">
                    <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener">
                        <img src="${escapeHtml(thumbnail)}" alt="" class="svp-news-thumbnail" onerror="this.style.display='none'">
                        <div class="svp-news-content">
                            <h4 class="svp-news-title">${escapeHtml(article.title)}</h4>
                            <div class="svp-news-meta">
                                <span>${escapeHtml(article.publisher)}</span>
                                <span>${timeAgo}</span>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');

        $('#svp-news-grid').html(newsHtml);
    }

    function formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString();
    }

    // AI Analysis (Modified to accept btn reference)
    function runAIAnalysis(btn = null) {
        if (state.news.length === 0) {
            // Should not happen in new flow
            return;
        }

        // If called standalone (legacy), handle button state
        if (!btn) {
            btn = $('#svp-analyze-ai'); // Fallback if exists
            btn.prop('disabled', true).html('<span class="svp-spinner" style="width:16px;height:16px;margin-right:8px;"></span> Analyzing...');
        }

        // Prepare news data for PHP
        const newsData = state.news.slice(0, 10).map(n => ({
            title: n.title,
            publisher: n.publisher,
            publishTime: new Date(n.publishedAt).getTime(), // PHP expects ts or string
            link: n.link
        }));

        $.ajax({
            url: svpData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'svp_analyze_news',
                ticker: state.ticker,
                price: state.currentPrice,
                news: newsData,
                nonce: svpData.nonce,
                user_api_key: getUserGeminiKey()
            },
            success: function (response) {
                if (response.success) {
                    renderAIAnalysis(response.data);
                } else {
                    alert('Analysis failed: ' + (response.data || 'Unknown error'));
                }
            },
            error: function () {
                alert('AI Analysis failed. Check console.');
            },
            complete: function () {
                // Reset unified button text
                if (btn.attr('id') === 'svp-fetch-analyze-btn') {
                    btn.prop('disabled', false).html('<span>🤖</span><span>AI Analyzer</span>');
                } else {
                    btn.prop('disabled', false).html('<span>🤖</span><span>Analyze with AI</span>');
                }
            }
        });
    }

    function renderAIAnalysis(data) {
        const sentiment = data.sentiment || 'NEUTRAL';
        const sentimentScore = data.sentimentScore || 0;
        const color = sentiment === 'BULLISH' ? 'var(--svp-green-400)' : (sentiment === 'BEARISH' ? 'var(--svp-red-400)' : 'var(--svp-yellow-400)');

        // Prepare localized content
        const isAr = data.isArabic;
        const strategy = isAr ? (data.tradingSignal?.strategy_ar || data.tradingSignal?.strategy) : data.tradingSignal?.strategy;
        const reasoning = isAr ? (data.fairPriceImpact?.reasoning_ar || data.fairPriceImpact?.reasoning) : data.fairPriceImpact?.reasoning;
        const summary = isAr ? (data.summary_ar || data.summary) : data.summary;
        const catalysts = isAr ? (data.catalysts_ar || data.catalysts) : data.catalysts;
        const risks = isAr ? (data.risks_ar || data.risks) : data.risks;
        const insights = isAr ? (data.keyInsights_ar || data.keyInsights) : data.keyInsights; // Not explicitly used in previous design but good to have

        // Build Trading Signals HTML if data exists
        let tradingSignalsHtml = '';
        const ts = data.tradingSignal;
        if (ts && (ts.fairValueRange?.max > 0 || ts.supportLevel?.max > 0 || ts.resistanceLevel?.max > 0)) {
            tradingSignalsHtml = `
                <div class="svp-trading-signals">
                    <h4 class="svp-trading-signals-title">📊 ${isAr ? 'إشارات التداول الفنية' : 'Technical Trading Signals'}</h4>
                    <div class="svp-trading-signals-grid">
                        ${ts.fairValueRange?.max > 0 ? `
                        <div class="svp-signal-box">
                            <p class="svp-signal-label">${isAr ? 'نطاق القيمة العادلة' : 'Fair Value Range'}</p>
                            <p class="svp-signal-value" dir="ltr">$${ts.fairValueRange.min.toFixed(2)} - $${ts.fairValueRange.max.toFixed(2)}</p>
                        </div>
                        ` : ''}
                        ${ts.supportLevel?.max > 0 ? `
                        <div class="svp-signal-box">
                            <p class="svp-signal-label">${isAr ? 'منطقة الدعم (شراء)' : 'Support Zone (Buy)'}</p>
                            <p class="svp-signal-value support" dir="ltr">$${ts.supportLevel.min.toFixed(2)} - $${ts.supportLevel.max.toFixed(2)}</p>
                        </div>
                        ` : ''}
                        ${ts.resistanceLevel?.max > 0 ? `
                        <div class="svp-signal-box">
                            <p class="svp-signal-label">${isAr ? 'منطقة المقاومة (بيع)' : 'Resistance Zone (Sell)'}</p>
                            <p class="svp-signal-value resistance" dir="ltr">$${ts.resistanceLevel.min.toFixed(2)} - $${ts.resistanceLevel.max.toFixed(2)}</p>
                        </div>
                        ` : ''}
                    </div>
                    ${strategy ? `
                    <div class="svp-strategy-box">
                        <p class="svp-strategy-label">${isAr ? 'استراتيجية مقترحة' : 'Suggested Strategy'}</p>
                        <p class="svp-strategy-text">"${escapeHtml(strategy)}"</p>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        const aiHtml = `
            <div class="svp-ai-card ${sentiment.toLowerCase()} svp-mb-6" ${isAr ? 'dir="rtl"' : ''}>
                <div class="svp-ai-header">
                    <div class="svp-ai-title-row">
                        <span class="svp-ai-icon">${sentiment === 'BULLISH' ? '🐂' : (sentiment === 'BEARISH' ? '🐻' : '⚖️')}</span>
                        <div>
                            <h3 class="svp-ai-title">${isAr ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'} <span class="svp-ai-sentiment-badge ${sentiment.toLowerCase()}">${sentiment}</span></h3>
                            <p class="svp-ai-meta">Model: ${escapeHtml(data.model)} • ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                    ${!isAr && (data.summary_ar || data.summary) ? `
                    <button id="svp-translate-btn" class="svp-btn svp-btn-sm svp-btn-secondary" title="Switch to Arabic">
                        <span>🌐</span> ترجمة للعربية
                    </button>
                    ` : ''}
                    ${isAr ? `
                    <button id="svp-translate-btn" class="svp-btn svp-btn-sm svp-btn-secondary" title="Switch to English">
                        <span>🌐</span> English
                    </button>
                    ` : ''}
                </div>
                
                <div class="svp-sentiment-bar-container">
                    <div class="svp-sentiment-labels">
                        <span class="bearish">${isAr ? 'هابط' : 'BEARISH'}</span>
                        <span class="score">${isAr ? 'الدرجة' : 'SCORE'}: ${sentimentScore}</span>
                        <span class="bullish">${isAr ? 'صاعد' : 'BULLISH'}</span>
                    </div>
                    <div class="svp-sentiment-bar">
                        <div class="svp-sentiment-gradient"></div>
                        <div class="svp-sentiment-marker" style="left: ${(sentimentScore + 100) / 2}%; background: ${color}"></div>
                    </div>
                </div>
                
                <div class="svp-impact-card">
                    <div class="svp-impact-row">
                        <div>
                            <p class="svp-impact-label">${isAr ? 'تأثير السعر العادل' : 'FAIR PRICE IMPACT'}</p>
                            <span class="svp-impact-value ${data.fairPriceImpact?.direction === 'UP' ? 'up' : 'down'}" dir="ltr">
                                ${data.fairPriceImpact?.direction === 'UP' ? '+' : ''}${data.fairPriceImpact?.percentageEstimate || 0}%
                            </span>
                            <span class="svp-impact-confidence">(${data.fairPriceImpact?.confidence || 'LOW'} ${isAr ? 'ثقة' : 'confidence'})</span>
                        </div>
                    </div>
                    <p class="svp-impact-reasoning">"${escapeHtml(reasoning || '')}"</p>
                </div>

                ${tradingSignalsHtml}
                
                <div class="svp-ai-section">
                    <h4 class="svp-ai-section-title">${isAr ? '📝 الملخص' : '📝 Summary'}</h4>
                    <p class="svp-ai-summary-text">${escapeHtml(summary || 'No summary available.')}</p>
                </div>

                <div class="svp-cat-risk-grid">
                    <div class="svp-cat-box">
                        <h4>${isAr ? '🚀 المحفزات' : '🚀 Catalysts'}</h4>
                        <ul>${(catalysts || []).map(c => `<li>• ${escapeHtml(c)}</li>`).join('')}</ul>
                    </div>
                    <div class="svp-risk-box">
                        <h4>${isAr ? '⚠️ المخاطر' : '⚠️ Risks'}</h4>
                        <ul>${(risks || []).map(r => `<li>• ${escapeHtml(r)}</li>`).join('')}</ul>
                    </div>
                </div>
                ${data.isSimulated ? '<div class="svp-simulated-badge">Simulated Result (No API Key)</div>' : ''}
            </div>
        `;
        $('#svp-ai-analysis').html(aiHtml).show();

        // Bind toggle button for instant switching
        $('#svp-translate-btn').on('click', function () {
            // Toggle language state and re-render
            data.isArabic = !data.isArabic;
            renderAIAnalysis(data);
        });
    }

    // --- Authentication System ---
    class SVPAuth {
        constructor() {
            this.init();
        }

        init() {
            this.bindEvents();
            this.checkAuth();
            this.setupAjax();
        }

        setupAjax() {
            $.ajaxSetup({
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', svpData.nonce);
                }
            });
        }

        bindEvents() {
            // Toggle between Login and Register
            $(document).on('click', '.svp-toggle-auth', (e) => {
                e.preventDefault();
                const target = $(e.currentTarget).data('target');
                $('.svp-auth-card').hide();
                $('#' + target).fadeIn();
            });

            // Login Form Submission
            $('#svp-login-form').on('submit', (e) => this.handleLogin(e));

            // Register Form Submission
            $('#svp-register-form').on('submit', (e) => this.handleRegister(e));

            // Logout
            $(document).on('click', '#svp-btn-logout, #svp-logout-btn', (e) => {
                e.preventDefault();
                this.logout();
            });

            // Settings Modal
            $(document).on('click', '#svp-btn-settings', () => this.openSettings());
            $(document).on('click', '#svp-settings-close, .svp-modal-overlay', () => this.closeSettings());
            $(document).on('submit', '#svp-settings-form', (e) => this.saveSettings(e));
        }

        openSettings() {
            $('#svp-settings-modal').show();
            this.loadSettings();
        }

        closeSettings() {
            $('#svp-settings-modal').hide();
            $('#svp-settings-status').removeClass('success error').text('').hide();
        }

        async loadSettings() {
            try {
                const response = await $.ajax({
                    url: svpData.restUrl + 'user/settings',
                    type: 'GET'
                });

                if (response.has_gemini_key) {
                    setUserGeminiKey(response.gemini_api_key);
                    $('#svp-gemini-api-key').attr('placeholder', response.gemini_api_key_masked + ' (saved)');
                }
            } catch (err) {
                console.error('SVP: Failed to load settings', err);
            }
        }

        async saveSettings(e) {
            e.preventDefault();
            const form = $(e.currentTarget);
            const btn = form.find('button[type="submit"]');
            const status = $('#svp-settings-status');

            this.setLoading(btn, true);
            status.removeClass('success error').text('');

            const geminiKey = $('#svp-gemini-api-key').val();

            if (!geminiKey) {
                status.addClass('error').text('Please enter a Gemini API key').show();
                this.setLoading(btn, false);
                return;
            }

            try {
                const response = await $.ajax({
                    url: svpData.restUrl + 'user/settings',
                    type: 'POST',
                    data: { gemini_api_key: geminiKey }
                });

                if (response.success) {
                    status.addClass('success').text('Settings saved successfully!').show();
                    $('#svp-gemini-api-key').val('').attr('placeholder', '********' + geminiKey.slice(-4) + ' (saved)');

                    setUserGeminiKey(geminiKey);

                    if (typeof svpData !== 'undefined') {
                        svpData.hasUserGeminiKey = true;
                    }

                    setTimeout(() => this.closeSettings(), 1500);
                }
            } catch (err) {
                console.error('SVP: Failed to save settings', err);
                status.addClass('error').text('Failed to save settings. Please try again.').show();
            } finally {
                this.setLoading(btn, false);
            }
        }

        async handleLogin(e) {
            e.preventDefault();
            const form = $(e.currentTarget);
            const btn = form.find('button[type="submit"]');
            const msg = form.find('.svp-auth-message');

            this.setLoading(btn, true);
            msg.removeClass('error success').text('');

            const data = {
                action: 'svp_login_user',
                nonce: svpData.nonce,
                username: form.find('input[name="username"]').val(),
                password: form.find('input[name="password"]').val()
            };

            try {
                const response = await $.post(svpData.ajaxUrl, data);

                if (response.success) {
                    msg.addClass('success').text('Login successful! Redirecting...');
                    window.location.href = svpData.homeUrl + '/stock/';
                } else {
                    throw new Error(response.data.message || 'Login failed');
                }

            } catch (err) {
                let errorMsg = 'Login failed.';
                if (err.message) {
                    errorMsg = err.message;
                } else if (err.responseJSON && err.responseJSON.data && err.responseJSON.data.message) {
                    errorMsg = err.responseJSON.data.message;
                }
                msg.addClass('error').text(errorMsg);
                this.setLoading(btn, false);
            }
        }

        async handleRegister(e) {
            e.preventDefault();
            const form = $(e.currentTarget);
            const btn = form.find('button[type="submit"]');
            const msg = form.find('.svp-auth-message');

            this.setLoading(btn, true);
            msg.removeClass('error success').text('');

            const data = {
                action: 'svp_register_user',
                nonce: svpData.nonce,
                username: form.find('input[name="username"]').val(),
                email: form.find('input[name="email"]').val(),
                password: form.find('input[name="password"]').val()
            };

            try {
                const response = await $.post(svpData.ajaxUrl, data);

                if (response.success) {
                    msg.addClass('success').text('Registration successful! Redirecting...');
                    window.location.href = svpData.homeUrl + '/stock/';
                } else {
                    throw new Error(response.data.message || 'Registration failed');
                }

            } catch (err) {
                let errorMsg = 'Registration failed.';
                if (err.message) {
                    errorMsg = err.message;
                } else if (err.responseJSON && err.responseJSON.data && err.responseJSON.data.message) {
                    errorMsg = err.responseJSON.data.message;
                }
                msg.addClass('error').text(errorMsg);
                this.setLoading(btn, false);
            }
        }

        checkAuth() {
            this.renderUserProfile();
        }

        renderUserProfile() {
            const profileEl = $('#svp-user-profile');
            const usernameEl = $('#svp-username-display');
            const logoutBtn = $('#svp-btn-logout');
            const loginBtn = $('#svp-btn-login');

            if (svpData.isLoggedIn) {
                usernameEl.text(svpData.displayName || 'User');
                profileEl.css('display', 'flex');
                loginBtn.hide();
            } else {
                profileEl.hide();
                loginBtn.show();
            }
        }

        logout() {
            $.post(svpData.ajaxUrl, {
                action: 'svp_logout_user',
                nonce: svpData.nonce
            }).always(() => {
                window.location.href = svpData.homeUrl + '/stock/';
            });
        }

        setLoading(btn, isLoading) {
            if (isLoading) {
                btn.prop('disabled', true);
                btn.find('.svp-btn-text').hide();
                btn.find('.svp-btn-loader').show();
            } else {
                btn.prop('disabled', false);
                btn.find('.svp-btn-text').show();
                btn.find('.svp-btn-loader').hide();
            }
        }
    }

    // Initialize Auth
    new SVPAuth();

})(jQuery);
