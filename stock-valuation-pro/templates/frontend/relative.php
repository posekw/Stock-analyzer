<?php
/**
 * Frontend Relative Valuation Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$ticker = isset($atts['ticker']) ? strtoupper(sanitize_text_field($atts['ticker'])) : '';
?>

<div class="svp-container svp-relative-container" data-ticker="<?php echo esc_attr($ticker); ?>">
    <div class="svp-content">

        <!-- Header -->
        <div class="svp-header">
            <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem 0;">Relative Valuation</h2>
            <p style="color: var(--svp-text-muted); margin: 0; font-size: 0.875rem;">
                Compare valuation metrics with industry peers for <span class="svp-ticker-symbol"
                    style="color: var(--svp-accent); font-weight: 600;"><?php echo $ticker ?: '...'; ?></span>
            </p>
        </div>

        <!-- Loading State -->
        <div class="svp-loading" style="display: none;">
            <div class="svp-spinner"></div>
            <span>Loading relative valuation data...</span>
        </div>

        <!-- Content -->
        <div class="svp-relative-content">

            <!-- Multiple Valuation Methods -->
            <div class="svp-card" style="margin-top: 1.5rem;">
                <div class="svp-card-header">
                    <h3 class="svp-card-title">
                        <span class="icon">⚖️</span>
                        Valuation Metrics
                    </h3>
                </div>

                <table class="svp-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Current</th>
                            <th>Industry Avg</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody class="svp-relative-metrics">
                        <tr>
                            <td>P/E Ratio</td>
                            <td class="svp-pe-current">—</td>
                            <td class="svp-pe-avg">—</td>
                            <td><span class="svp-pe-status">—</span></td>
                        </tr>
                        <tr>
                            <td>P/B Ratio</td>
                            <td class="svp-pb-current">—</td>
                            <td class="svp-pb-avg">—</td>
                            <td><span class="svp-pb-status">—</span></td>
                        </tr>
                        <tr>
                            <td>P/S Ratio</td>
                            <td class="svp-ps-current">—</td>
                            <td class="svp-ps-avg">—</td>
                            <td><span class="svp-ps-status">—</span></td>
                        </tr>
                        <tr>
                            <td>EV/EBITDA</td>
                            <td class="svp-ev-current">—</td>
                            <td class="svp-ev-avg">—</td>
                            <td><span class="svp-ev-status">—</span></td>
                        </tr>
                        <tr>
                            <td>PEG Ratio</td>
                            <td class="svp-peg-current">—</td>
                            <td class="svp-peg-avg">—</td>
                            <td><span class="svp-peg-status">—</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Multi-Method Fair Value -->
            <div class="svp-grid svp-grid-3" style="margin-top: 1.5rem;">
                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📊</span>
                            DCF Value
                        </h3>
                    </div>
                    <div style="text-align: center;">
                        <div class="svp-dcf-value"
                            style="font-size: 1.75rem; font-weight: 700; color: var(--svp-accent);">$0.00</div>
                        <div class="svp-dcf-upside" style="font-size: 0.875rem; color: var(--svp-text-muted);">+0%</div>
                    </div>
                </div>

                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">🏛️</span>
                            Graham Number
                        </h3>
                    </div>
                    <div style="text-align: center;">
                        <div class="svp-graham-value"
                            style="font-size: 1.75rem; font-weight: 700; color: var(--svp-purple);">$0.00</div>
                        <div class="svp-graham-upside" style="font-size: 0.875rem; color: var(--svp-text-muted);">+0%
                        </div>
                    </div>
                </div>

                <div class="svp-card">
                    <div class="svp-card-header">
                        <h3 class="svp-card-title">
                            <span class="icon">📈</span>
                            Lynch Value
                        </h3>
                    </div>
                    <div style="text-align: center;">
                        <div class="svp-lynch-value"
                            style="font-size: 1.75rem; font-weight: 700; color: var(--svp-cyan);">$0.00</div>
                        <div class="svp-lynch-upside" style="font-size: 0.875rem; color: var(--svp-text-muted);">+0%
                        </div>
                    </div>
                </div>
            </div>

            <!-- Synthesis -->
            <div class="svp-card" style="margin-top: 1.5rem;">
                <div class="svp-card-header">
                    <h3 class="svp-card-title">
                        <span class="icon">🎯</span>
                        Fair Value Synthesis
                    </h3>
                </div>

                <div class="svp-grid svp-grid-3" style="text-align: center;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--svp-text-muted); margin-bottom: 0.25rem;">AVERAGE
                        </div>
                        <div class="svp-avg-fair-value" style="font-size: 1.5rem; font-weight: 700;">$0.00</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--svp-text-muted); margin-bottom: 0.25rem;">MEDIAN
                        </div>
                        <div class="svp-median-fair-value"
                            style="font-size: 1.5rem; font-weight: 700; color: var(--svp-accent);">$0.00</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--svp-text-muted); margin-bottom: 0.25rem;">
                            CONSERVATIVE</div>
                        <div class="svp-conservative-fair-value"
                            style="font-size: 1.5rem; font-weight: 700; color: var(--svp-success);">$0.00</div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 1.5rem;">
                    <span class="svp-verdict svp-verdict-hold">HOLD</span>
                </div>
            </div>

        </div>
    </div>
</div>