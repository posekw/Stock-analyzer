<?php
/**
 * Frontend Valuation Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$ticker = isset($atts['ticker']) ? strtoupper(sanitize_text_field($atts['ticker'])) : '';
$show_controls = isset($atts['show_controls']) && $atts['show_controls'] === 'false' ? false : true;
$options = get_option('svp_options', array());
?>

<div class="svp-container svp-valuation-container" data-ticker="<?php echo esc_attr($ticker); ?>">
    <div class="svp-content">

        <!-- Header with Search -->
        <div class="svp-header">
            <form class="svp-search-form">
                <div class="svp-search-container">
                    <span class="svp-search-icon">🔍</span>
                    <input type="text" class="svp-search-input"
                        placeholder="Enter stock ticker (e.g., AAPL, MSFT, GOOGL)"
                        value="<?php echo esc_attr($ticker); ?>">
                </div>
            </form>

            <div class="svp-ticker-display">
                <span class="svp-ticker-symbol"><?php echo $ticker ?: 'STOCK'; ?></span>
                <span class="svp-ticker-price">$0.00</span>
                <span class="svp-ticker-change positive">+0.00%</span>
            </div>
        </div>

        <!-- Main Grid -->
        <div class="svp-grid svp-grid-7-5">

            <!-- Left Column: Controls & Info -->
            <div>
                <?php if ($show_controls): ?>
                    <!-- Valuation Controls Card -->
                    <div class="svp-card">
                        <div class="svp-card-header">
                            <h3 class="svp-card-title">
                                <span class="icon">⚙️</span>
                                Valuation Assumptions
                            </h3>
                        </div>

                        <div class="svp-form-group">
                            <label class="svp-label">Discount Rate (WACC)</label>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <input type="range" class="svp-range svp-wacc-slider" min="6" max="18" step="0.5"
                                    value="<?php echo esc_attr($options['default_wacc'] ?? 10); ?>">
                                <span
                                    class="svp-range-value svp-wacc-value"><?php echo esc_html($options['default_wacc'] ?? 10); ?>%</span>
                            </div>
                        </div>

                        <div class="svp-form-group">
                            <label class="svp-label">Revenue Growth Rate</label>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <input type="range" class="svp-range svp-growth-slider" min="0" max="30" step="0.5"
                                    value="<?php echo esc_attr($options['default_growth'] ?? 8); ?>">
                                <span
                                    class="svp-range-value svp-growth-value"><?php echo esc_html($options['default_growth'] ?? 8); ?>%</span>
                            </div>
                        </div>

                        <div class="svp-form-group">
                            <label class="svp-label">Terminal Growth Rate</label>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <input type="range" class="svp-range svp-terminal-slider" min="0" max="5" step="0.25"
                                    value="<?php echo esc_attr($options['default_terminal_growth'] ?? 2.5); ?>">
                                <span
                                    class="svp-range-value svp-terminal-value"><?php echo esc_html($options['default_terminal_growth'] ?? 2.5); ?>%</span>
                            </div>
                        </div>

                        <button class="svp-btn svp-btn-primary svp-calculate-btn" style="width: 100%; margin-top: 1rem;">
                            <span>📊</span>
                            Calculate Fair Value
                        </button>
                    </div>
                <?php endif; ?>

                <!-- Key Metrics Card -->
                <div class="svp-card" style="margin-top: 1.5rem;">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📈</span>
                            Key Metrics
                        </h3>
                    </div>

                    <div class="svp-grid svp-grid-2" style="gap: 1rem;">
                        <div class="svp-metric">
                            <span class="svp-metric-label">Market Cap</span>
                            <span class="svp-metric-value svp-market-cap">—</span>
                        </div>
                        <div class="svp-metric">
                            <span class="svp-metric-label">P/E Ratio</span>
                            <span class="svp-metric-value svp-pe-ratio">—</span>
                        </div>
                        <div class="svp-metric">
                            <span class="svp-metric-label">Beta</span>
                            <span class="svp-metric-value svp-beta">—</span>
                        </div>
                        <div class="svp-metric">
                            <span class="svp-metric-label">Dividend Yield</span>
                            <span class="svp-metric-value svp-dividend-yield">—</span>
                        </div>
                        <div class="svp-metric">
                            <span class="svp-metric-label">Free Cash Flow</span>
                            <span class="svp-metric-value svp-fcf">—</span>
                        </div>
                        <div class="svp-metric">
                            <span class="svp-metric-label">FCF/Share</span>
                            <span class="svp-metric-value svp-fcf-per-share">—</span>
                        </div>
                    </div>
                </div>

                <!-- How It Works -->
                <div class="svp-card" style="margin-top: 1.5rem;">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">💡</span>
                            How it works
                        </h3>
                    </div>
                    <p style="color: var(--svp-text-muted); font-size: 0.875rem; margin: 0;">
                        This model uses a Discounted Cash Flow (DCF) analysis to estimate the intrinsic value of an
                        investment.
                        Adjust the assumptions above to see how they impact the fair value based on projected future
                        free cash flows.
                    </p>
                </div>
            </div>

            <!-- Right Column: Results -->
            <div>
                <div class="svp-card svp-valuation-result" style="position: sticky; top: 2rem;">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">🎯</span>
                            Fair Value Estimate
                        </h3>
                    </div>

                    <div class="svp-fair-value">
                        <div class="svp-fair-value-amount">$0.00</div>
                        <div class="svp-fair-value-label">Intrinsic Value per Share</div>
                        <div class="svp-upside positive">+0% ↑</div>
                    </div>

                    <div style="text-align: center; margin-top: 1.5rem;">
                        <span class="svp-verdict svp-verdict-hold">HOLD</span>
                    </div>

                    <!-- Assumptions Summary -->
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--svp-border);">
                        <h4 style="font-size: 0.75rem; color: var(--svp-text-muted); margin: 0 0 0.75rem 0;">ASSUMPTIONS
                            USED</h4>
                        <div
                            style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.75rem;">
                            <div>
                                <span style="color: var(--svp-text-muted);">WACC</span>
                                <div class="svp-assumption-wacc" style="font-weight: 600;">—</div>
                            </div>
                            <div>
                                <span style="color: var(--svp-text-muted);">Growth</span>
                                <div class="svp-assumption-growth" style="font-weight: 600;">—</div>
                            </div>
                            <div>
                                <span style="color: var(--svp-text-muted);">Terminal</span>
                                <div class="svp-assumption-terminal" style="font-weight: 600;">—</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>