<?php
/**
 * Admin Shortcodes Reference Template
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap svp-admin-wrap">
    <div class="svp-admin-header">
        <h1>
            <span class="dashicons dashicons-shortcode"></span>
            Shortcodes Reference
        </h1>
        <span class="version">v<?php echo SVP_VERSION; ?></span>
    </div>

    <div class="svp-admin-card">
        <h2><span class="dashicons dashicons-editor-code"></span> Available Shortcodes</h2>
        <p>Use these shortcodes to embed stock valuation widgets on any page or post.</p>

        <ul class="svp-shortcode-list">
            <!-- Full Dashboard -->
            <li>
                <code class="shortcode-code">[stock_dashboard]</code>
                <div class="shortcode-desc">
                    <h4>Full Dashboard</h4>
                    <p>Complete stock analysis dashboard with all features including valuation, technicals, and news.
                        Perfect for a dedicated analysis page.</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><code>ticker</code> - Pre-load with a specific stock (optional)</li>
                    </ul>
                    <p><strong>Example:</strong> <code>[stock_dashboard ticker="AAPL"]</code></p>
                </div>
                <button class="svp-copy-btn">Copy</button>
            </li>

            <!-- DCF Valuation -->
            <li>
                <code class="shortcode-code">[stock_valuation]</code>
                <div class="shortcode-desc">
                    <h4>DCF Valuation Widget</h4>
                    <p>Discounted Cash Flow analysis widget with adjustable assumptions and fair value calculation.</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><code>ticker</code> - Stock ticker symbol (optional)</li>
                        <li><code>show_controls</code> - Show/hide assumption sliders (default: "true")</li>
                    </ul>
                    <p><strong>Example:</strong> <code>[stock_valuation ticker="MSFT" show_controls="true"]</code></p>
                </div>
                <button class="svp-copy-btn">Copy</button>
            </li>

            <!-- Technical Analysis -->
            <li>
                <code class="shortcode-code">[stock_technicals]</code>
                <div class="shortcode-desc">
                    <h4>Technical Analysis Widget</h4>
                    <p>Price charts with technical indicators, moving averages, support/resistance levels, and RSI.</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><code>ticker</code> - Stock ticker symbol (optional)</li>
                        <li><code>timeframe</code> - Chart timeframe: 1M, 3M, 6M, 1Y, 2Y, 5Y (default: "1Y")</li>
                    </ul>
                    <p><strong>Example:</strong> <code>[stock_technicals ticker="GOOGL" timeframe="1Y"]</code></p>
                </div>
                <button class="svp-copy-btn">Copy</button>
            </li>

            <!-- Relative Valuation -->
            <li>
                <code class="shortcode-code">[stock_relative]</code>
                <div class="shortcode-desc">
                    <h4>Relative Valuation Widget</h4>
                    <p>Peer comparison and relative valuation metrics (P/E, P/B, EV/EBITDA comparisons).</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><code>ticker</code> - Stock ticker symbol (optional)</li>
                    </ul>
                    <p><strong>Example:</strong> <code>[stock_relative ticker="TSLA"]</code></p>
                </div>
                <button class="svp-copy-btn">Copy</button>
            </li>

            <!-- News Feed -->
            <li>
                <code class="shortcode-code">[stock_news]</code>
                <div class="shortcode-desc">
                    <h4>News Feed Widget</h4>
                    <p>Latest news articles related to the selected stock.</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        <li><code>ticker</code> - Stock ticker symbol (optional)</li>
                        <li><code>count</code> - Number of news items to display (default: 10)</li>
                    </ul>
                    <p><strong>Example:</strong> <code>[stock_news ticker="NVDA" count="5"]</code></p>
                </div>
                <button class="svp-copy-btn">Copy</button>
            </li>
        </ul>
    </div>

    <div class="svp-admin-card">
        <h2><span class="dashicons dashicons-info"></span> Usage Tips</h2>
        <ul style="list-style: disc; padding-left: 20px;">
            <li>All widgets support dynamic ticker search if no ticker is specified</li>
            <li>Widgets respect the feature toggles in Settings - disabled features won't render</li>
            <li>For best performance, cache stock data is stored for 1 hour by default</li>
            <li>The dark theme is enabled by default; you can change this in Settings</li>
            <li>Multiple widgets on the same page share the same ticker state</li>
        </ul>
    </div>

    <div class="svp-admin-card">
        <h2><span class="dashicons dashicons-editor-paste-text"></span> Quick Copy</h2>
        <p>Click to copy the shortcode you need:</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="button"
                onclick="navigator.clipboard.writeText('[stock_dashboard]')">[stock_dashboard]</button>
            <button class="button"
                onclick="navigator.clipboard.writeText('[stock_valuation]')">[stock_valuation]</button>
            <button class="button"
                onclick="navigator.clipboard.writeText('[stock_technicals]')">[stock_technicals]</button>
            <button class="button" onclick="navigator.clipboard.writeText('[stock_relative]')">[stock_relative]</button>
            <button class="button" onclick="navigator.clipboard.writeText('[stock_news]')">[stock_news]</button>
        </div>
    </div>
</div>