<?php
/**
 * Frontend Technical Analysis Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$ticker = isset($atts['ticker']) ? strtoupper(sanitize_text_field($atts['ticker'])) : '';
$timeframe = isset($atts['timeframe']) ? sanitize_text_field($atts['timeframe']) : '1Y';
?>

<div class="svp-container svp-technicals-container" data-ticker="<?php echo esc_attr($ticker); ?>">
    <div class="svp-content">

        <!-- Header -->
        <div class="svp-header">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                <div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Technical Analysis</h2>
                    <p style="color: var(--svp-text-muted); margin: 0.25rem 0 0 0; font-size: 0.875rem;">
                        Advanced charts & indicators for <span class="svp-ticker-symbol"
                            style="color: var(--svp-accent); font-weight: 600;"><?php echo $ticker ?: '...'; ?></span>
                    </p>
                </div>
                <button class="svp-btn svp-btn-primary svp-analyze-btn">
                    <span>📊</span>
                    Analyze
                </button>
            </div>


        </div>

        <!-- Loading State -->
        <div class="svp-loading" style="display: none;">
            <div class="svp-spinner"></div>
            <span>Loading technical data...</span>
        </div>

        <!-- Content -->
        <div class="svp-technicals-content" style="display: none;">

            <!-- Chart -->
            <div class="svp-card" style="margin-top: 1.5rem;">

                <div class="svp-chart-container">
                    <canvas id="svp-price-chart" class="svp-chart-canvas"></canvas>
                </div>
            </div>

            <!-- Indicators Grid -->
            <div class="svp-grid svp-grid-2" style="margin-top: 1.5rem;">

                <!-- RSI Card -->
                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📊</span>
                            RSI Indicator
                        </h3>
                    </div>
                    <div
                        style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <div>
                            <span class="svp-rsi-value" style="font-size: 2rem; font-weight: 700;">—</span>
                            <span style="color: var(--svp-text-muted);">/ 100</span>
                        </div>
                        <span class="svp-rsi-signal"
                            style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: var(--svp-bg-secondary);">—</span>
                    </div>
                    <div class="svp-progress-bar">
                        <div class="svp-progress-fill svp-rsi-fill medium" style="width: 50%;"></div>
                    </div>
                    <div
                        style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.7rem; color: var(--svp-text-muted);">
                        <span>0 (Oversold)</span>
                        <span>50</span>
                        <span>100 (Overbought)</span>
                    </div>
                </div>

                <!-- Moving Averages Card -->
                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📈</span>
                            Moving Averages
                        </h3>
                    </div>
                    <div style="display: grid; gap: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--svp-text-muted);">SMA 20</span>
                            <span class="svp-sma20" style="font-family: monospace; color: var(--svp-warning);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--svp-text-muted);">SMA 50</span>
                            <span class="svp-sma50" style="font-family: monospace; color: var(--svp-blue);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--svp-text-muted);">SMA 200</span>
                            <span class="svp-sma200" style="font-family: monospace; color: var(--svp-pink);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--svp-text-muted);">EMA 12</span>
                            <span class="svp-ema12" style="font-family: monospace; color: var(--svp-cyan);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--svp-text-muted);">EMA 26</span>
                            <span class="svp-ema26" style="font-family: monospace; color: var(--svp-purple);">—</span>
                        </div>
                    </div>
                </div>

                <!-- Support/Resistance Card -->
                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">🎯</span>
                            Support & Resistance
                        </h3>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <h4 style="font-size: 0.75rem; color: var(--svp-text-muted); margin: 0 0 0.5rem 0;">RESISTANCE
                        </h4>
                        <div class="svp-resistance-levels" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="color: var(--svp-danger);">—</span>
                        </div>
                    </div>
                    <div>
                        <h4 style="font-size: 0.75rem; color: var(--svp-text-muted); margin: 0 0 0.5rem 0;">SUPPORT</h4>
                        <div class="svp-support-levels" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="color: var(--svp-success);">—</span>
                        </div>
                    </div>
                </div>

                <!-- Pivot Points Card -->
                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📐</span>
                            Pivot Points
                        </h3>
                    </div>
                    <div
                        style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.875rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">R3</span>
                            <span class="svp-r3" style="color: var(--svp-danger);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">S1</span>
                            <span class="svp-s1" style="color: var(--svp-success);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">R2</span>
                            <span class="svp-r2" style="color: var(--svp-danger);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">S2</span>
                            <span class="svp-s2" style="color: var(--svp-success);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">R1</span>
                            <span class="svp-r1" style="color: var(--svp-danger);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--svp-text-muted);">S3</span>
                            <span class="svp-s3" style="color: var(--svp-success);">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; grid-column: span 2;">
                            <span style="color: var(--svp-text-muted);">Pivot</span>
                            <span class="svp-pivot" style="color: var(--svp-purple); font-weight: 700;">—</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div class="svp-empty svp-technicals-empty">
            <div class="svp-empty-icon">📈</div>
            <div class="svp-empty-title">Ready for Analysis</div>
            <p class="svp-empty-text">Click "Analyze" to fetch technical indicators, price charts with
                support/resistance levels, and trading signals.</p>
        </div>

    </div>
</div>