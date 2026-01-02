<?php
/**
 * Frontend Full Dashboard Template
 * Matches the exact layout and features of the original Next.js app
 */

if (!defined('ABSPATH')) {
    exit;
}

$ticker = isset($atts['ticker']) ? strtoupper(sanitize_text_field($atts['ticker'])) : '';
$options = get_option('svp_options', array());

// Determine default active section
$active_section = 'dcf';
if (empty($options['enable_dcf_valuation'])) {
    if (!empty($options['enable_relative_valuation']))
        $active_section = 'relative';
    elseif (!empty($options['enable_news_feed']))
        $active_section = 'news';
    elseif (!empty($options['enable_technical_analysis']))
        $active_section = 'technicals';
}
?>

<div class="svp-app" id="svp-dashboard" data-ticker="<?php echo esc_attr($ticker); ?>">
    <!-- Background Ambience -->
    <div class="svp-bg-ambience">
        <div class="svp-bg-blur-1"></div>
        <div class="svp-bg-blur-2"></div>
    </div>

    <!-- Fixed Navigation Bar -->
    <nav class="svp-nav">
        <div class="svp-nav-inner">
            <!-- Logo -->
            <a href="#" class="svp-nav-logo">
                <div class="svp-nav-logo-icon">AI</div>
                <span class="svp-nav-logo-text">Stock AI</span>
            </a>

            <!-- Navigation Links -->
            <div class="svp-nav-links">
                <?php if (!empty($options['enable_dcf_valuation'])): ?>
                    <button class="svp-nav-link <?php echo $active_section === 'dcf' ? 'active' : ''; ?>"
                        data-section="dcf">DCF</button>
                <?php endif; ?>

                <?php if (!empty($options['enable_relative_valuation'])): ?>
                    <button class="svp-nav-link <?php echo $active_section === 'relative' ? 'active' : ''; ?>"
                        data-section="relative">Relative</button>
                <?php endif; ?>

                <?php if (!empty($options['enable_news_feed'])): ?>
                    <button class="svp-nav-link <?php echo $active_section === 'news' ? 'active' : ''; ?>"
                        data-section="news">AI Analyzer</button>
                <?php endif; ?>

                <?php if (!empty($options['enable_technical_analysis'])): ?>
                    <button class="svp-nav-link <?php echo $active_section === 'technicals' ? 'active' : ''; ?>"
                        data-section="technicals">Technicals</button>
                <?php endif; ?>
            </div>
            <div class="svp-nav-ticker">
                <span class="svp-nav-ticker-label">Ticker</span>
                <input type="text" class="svp-nav-ticker-input" id="svp-ticker-input"
                    value="<?php echo esc_attr($ticker); ?>" placeholder="AAPL" maxlength="5">
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="svp-main">

        <!-- === DCF SECTION === -->
        <?php if (!empty($options['enable_dcf_valuation'])): ?>
            <section id="svp-section-dcf" class="svp-section <?php echo $active_section === 'dcf' ? 'active' : ''; ?>">
                <!-- Page Header -->
                <div class="svp-page-header">
                    <div>
                        <h1 class="svp-page-title">Comprehensive Valuation</h1>
                        <p class="svp-page-subtitle">
                            Multi-method analysis for <span class="svp-ticker-highlight"
                                id="svp-current-ticker"><?php echo $ticker ?: '...'; ?></span>
                            <span class="svp-company-name" id="svp-company-name"></span>
                        </p>
                    </div>
                    <button class="svp-btn-primary" id="svp-fetch-btn">
                        <span>📊</span>
                        <span>Get FMP Data</span>
                    </button>
                </div>

                <!-- Loading State -->
                <div class="svp-loading" id="svp-loading" style="display: none;">
                    <div class="svp-spinner"></div>
                    <p class="svp-loading-text">Analyzing...</p>
                </div>

                <!-- Valuation Results (Hidden Initially) -->
                <div id="svp-valuation-results" style="display: none;">
                    <!-- Main Verdict Card -->
                    <div class="svp-card-gradient svp-mb-6">
                        <div class="svp-flex svp-justify-between svp-items-center svp-mb-6">
                            <div>
                                <div class="svp-flex svp-items-center svp-gap-4">
                                    <span class="svp-verdict" id="svp-verdict">HOLD</span>
                                    <span class="svp-upside positive" id="svp-total-upside">+0%</span>
                                </div>
                                <p class="svp-page-subtitle svp-mt-4">
                                    Based on <span id="svp-methods-count">0</span> valuation methods
                                </p>
                            </div>
                            <div class="svp-text-right">
                                <p class="svp-card-header">Current Price</p>
                                <p class="svp-card-value" id="svp-current-price">$0.00</p>
                            </div>
                        </div>

                        <!-- Fair Value Grid -->
                        <div class="svp-fair-value-grid">
                            <div class="svp-fair-value-card">
                                <p class="svp-fair-value-label">Average Fair Value</p>
                                <p class="svp-fair-value-amount emerald" id="svp-avg-fair-value">$0.00</p>
                            </div>
                            <div class="svp-fair-value-card">
                                <p class="svp-fair-value-label">Conservative Value</p>
                                <p class="svp-fair-value-amount blue" id="svp-conservative-value">$0.00</p>
                            </div>
                            <div class="svp-fair-value-card">
                                <p class="svp-fair-value-label">DCF Fair Value</p>
                                <p class="svp-fair-value-amount purple" id="svp-dcf-value">$0.00</p>
                            </div>
                            <div class="svp-fair-value-card">
                                <p class="svp-fair-value-label">Implied Growth</p>
                                <p class="svp-fair-value-amount amber" id="svp-implied-growth">0%</p>
                            </div>
                        </div>

                        <!-- All Valuation Methods -->
                        <div>
                            <h3 class="svp-section-title">All Valuation Methods</h3>
                            <div class="svp-methods-grid" id="svp-methods-grid">
                                <!-- Methods will be inserted here -->
                            </div>
                        </div>
                    </div>

                    <!-- Quick Stats -->
                    <div class="svp-quick-stats" id="svp-quick-stats">
                        <div class="svp-quick-stat">
                            <p class="svp-quick-stat-label">Graham Number</p>
                            <p class="svp-quick-stat-value" id="svp-graham">$0.00</p>
                        </div>
                        <div class="svp-quick-stat">
                            <p class="svp-quick-stat-label">Lynch Fair Value</p>
                            <p class="svp-quick-stat-value" id="svp-lynch">$0.00</p>
                        </div>
                        <div class="svp-quick-stat">
                            <p class="svp-quick-stat-label">EPV</p>
                            <p class="svp-quick-stat-value" id="svp-epv">$0.00</p>
                        </div>
                        <div class="svp-quick-stat">
                            <p class="svp-quick-stat-label">DDM</p>
                            <p class="svp-quick-stat-value" id="svp-ddm">N/A</p>
                        </div>
                    </div>
                </div>

                <!-- Controls Section -->
                <div class="svp-grid-12 svp-mt-6">
                    <!-- Left Column: Assumptions -->
                    <div class="svp-col-5">
                        <!-- Suggestions Banner -->
                        <div class="svp-suggestions-banner" id="svp-suggestions" style="display: none;">
                            <div class="svp-suggestions-header">
                                <div>
                                    <div class="svp-suggestions-title">
                                        <span>✨</span>
                                        <span>Smart Suggestions</span>
                                    </div>
                                    <p class="svp-suggestions-subtitle">
                                        Based on <span id="svp-suggestion-company">Company</span> (<span
                                            id="svp-suggestion-sector">Sector</span>)
                                    </p>
                                </div>
                                <button class="svp-btn-primary" id="svp-apply-suggestions"
                                    style="padding: 8px 16px; font-size: 13px;">
                                    <span>🎯</span>
                                    <span>Apply All</span>
                                </button>
                            </div>
                            <div class="svp-suggestion-chips">
                                <div class="svp-suggestion-chip" id="svp-suggest-growth">
                                    <div class="svp-suggestion-chip-header">
                                        <span class="svp-suggestion-chip-label">Growth</span>
                                        <span class="svp-suggestion-chip-value" id="svp-suggest-growth-val">0%</span>
                                    </div>
                                    <p class="svp-suggestion-chip-source" id="svp-suggest-growth-src">Source</p>
                                </div>
                                <div class="svp-suggestion-chip" id="svp-suggest-wacc">
                                    <div class="svp-suggestion-chip-header">
                                        <span class="svp-suggestion-chip-label">WACC</span>
                                        <span class="svp-suggestion-chip-value" id="svp-suggest-wacc-val">0%</span>
                                    </div>
                                    <p class="svp-suggestion-chip-source" id="svp-suggest-wacc-src">Source</p>
                                </div>
                                <div class="svp-suggestion-chip" id="svp-suggest-terminal">
                                    <div class="svp-suggestion-chip-header">
                                        <span class="svp-suggestion-chip-label">Terminal</span>
                                        <span class="svp-suggestion-chip-value" id="svp-suggest-terminal-val">0%</span>
                                    </div>
                                    <p class="svp-suggestion-chip-source" id="svp-suggest-terminal-src">Source</p>
                                </div>
                            </div>
                        </div>

                        <!-- Main Assumptions Card -->
                        <div class="svp-assumptions-card">
                            <div class="svp-assumptions-title">
                                <span>Assumptions</span>
                                <button class="svp-reset-btn" id="svp-reset-defaults">Reset to Defaults</button>
                            </div>

                            <!-- FCF Per Share Input -->
                            <div class="svp-input-group">
                                <label class="svp-input-label">Current FCF Per Share ($)</label>
                                <div class="svp-input-wrapper">
                                    <span class="svp-input-prefix">$</span>
                                    <input type="number" class="svp-input" id="svp-fcf-input" value="0" step="0.01">
                                </div>
                                <p class="svp-input-hint">Free Cash Flow per share (trailing 12 months)</p>
                            </div>

                            <!-- Growth Rate Slider -->
                            <div class="svp-slider-group">
                                <div class="svp-slider-header">
                                    <div>
                                        <p class="svp-slider-label">FCF Growth Rate (%)</p>
                                        <p class="svp-slider-desc">Annual growth in Free Cash Flow</p>
                                    </div>
                                    <div class="svp-slider-values">
                                        <span class="svp-slider-suggested" id="svp-growth-suggested"></span>
                                        <span class="svp-slider-current"
                                            id="svp-growth-display"><?php echo esc_html($options['default_growth'] ?? 8); ?></span>
                                    </div>
                                </div>
                                <div class="svp-slider-wrapper">
                                    <input type="range" class="svp-slider" id="svp-growth-slider" min="0" max="30"
                                        step="0.5" value="<?php echo esc_attr($options['default_growth'] ?? 8); ?>">
                                </div>
                            </div>

                            <!-- Terminal Growth Slider -->
                            <div class="svp-slider-group">
                                <div class="svp-slider-header">
                                    <div>
                                        <p class="svp-slider-label">Terminal Growth (%)</p>
                                        <p class="svp-slider-desc">Long-term perpetual growth (usually 2-3%)</p>
                                    </div>
                                    <div class="svp-slider-values">
                                        <span class="svp-slider-suggested" id="svp-terminal-suggested"></span>
                                        <span class="svp-slider-current"
                                            id="svp-terminal-display"><?php echo esc_html($options['default_terminal_growth'] ?? 2.5); ?></span>
                                    </div>
                                </div>
                                <div class="svp-slider-wrapper">
                                    <input type="range" class="svp-slider" id="svp-terminal-slider" min="0" max="5"
                                        step="0.1"
                                        value="<?php echo esc_attr($options['default_terminal_growth'] ?? 2.5); ?>">
                                </div>
                            </div>

                            <!-- WACC Slider -->
                            <div class="svp-slider-group">
                                <div class="svp-slider-header">
                                    <div>
                                        <p class="svp-slider-label">Discount Rate / WACC (%)</p>
                                        <p class="svp-slider-desc">Your required annual return</p>
                                    </div>
                                    <div class="svp-slider-values">
                                        <span class="svp-slider-suggested" id="svp-wacc-suggested"></span>
                                        <span class="svp-slider-current"
                                            id="svp-wacc-display"><?php echo esc_html($options['default_wacc'] ?? 10); ?></span>
                                    </div>
                                </div>
                                <div class="svp-slider-wrapper">
                                    <input type="range" class="svp-slider" id="svp-wacc-slider" min="6" max="15" step="0.1"
                                        value="<?php echo esc_attr($options['default_wacc'] ?? 10); ?>">
                                </div>
                            </div>

                            <!-- Info Box -->
                            <div class="svp-info-box">
                                <h4>How it works</h4>
                                <p>This DCF model projects Free Cash Flow for 5 years (with growth declining toward terminal
                                    rate), then calculates a terminal value using the Gordon Growth Model. All values are
                                    discounted back at your WACC to determine today's fair value.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Key Metrics -->
                    <div class="svp-col-7">
                        <div class="svp-card">
                            <h3 class="svp-section-title">📈 Key Fundamentals</h3>
                            <div class="svp-grid-3" id="svp-fundamentals">
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Market Cap</p>
                                    <p class="svp-fair-value-amount" id="svp-market-cap">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">P/E Ratio</p>
                                    <p class="svp-fair-value-amount" id="svp-pe-ratio">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Beta</p>
                                    <p class="svp-fair-value-amount" id="svp-beta">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Dividend Yield</p>
                                    <p class="svp-fair-value-amount" id="svp-dividend-yield">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Free Cash Flow</p>
                                    <p class="svp-fair-value-amount emerald" id="svp-fcf">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">FCF/Share</p>
                                    <p class="svp-fair-value-amount emerald" id="svp-fcf-per-share">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Revenue Growth</p>
                                    <p class="svp-fair-value-amount" id="svp-revenue-growth">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">Profit Margin</p>
                                    <p class="svp-fair-value-amount" id="svp-profit-margin">—</p>
                                </div>
                                <div class="svp-fair-value-card">
                                    <p class="svp-fair-value-label">ROE</p>
                                    <p class="svp-fair-value-amount" id="svp-roe">—</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        <?php endif; ?>

        <!-- === TECHNICALS SECTION === -->
        <?php if (!empty($options['enable_technical_analysis'])): ?>
            <section id="svp-section-technicals"
                class="svp-section <?php echo $active_section === 'technicals' ? 'active' : ''; ?>" <?php echo $active_section !== 'technicals' ? 'style="display: none;"' : ''; ?>>
                <div class="svp-page-header">
                    <div>
                        <h1 class="svp-page-title">Technical Analysis</h1>
                        <p class="svp-page-subtitle">
                            Advanced charts, support/resistance & indicators for <span
                                class="svp-ticker-highlight svp-current-ticker"><?php echo $ticker ?: '...'; ?></span>
                        </p>
                    </div>
                    <button class="svp-btn-primary" id="svp-fetch-technicals">
                        <span>📊</span>
                        <span>Analyze</span>
                    </button>
                </div>

                <div class="svp-timeframe-buttons" id="svp-timeframe-buttons">
                    <button class="svp-timeframe-btn" data-tf="1M">1M</button>
                    <button class="svp-timeframe-btn" data-tf="3M">3M</button>
                    <button class="svp-timeframe-btn" data-tf="6M">6M</button>
                    <button class="svp-timeframe-btn active" data-tf="1Y">1Y</button>
                    <button class="svp-timeframe-btn" data-tf="2Y">2Y</button>
                    <button class="svp-timeframe-btn" data-tf="5Y">5Y</button>
                </div>

                <!-- Technical Loading -->
                <div class="svp-loading" id="svp-tech-loading" style="display: none;">
                    <div class="svp-spinner"></div>
                    <p class="svp-loading-text">Loading technical data...</p>
                </div>

                <!-- Technical Content -->
                <div id="svp-tech-content" style="display: none;">
                    <!-- Chart -->
                    <div class="svp-card svp-mb-6">
                        <div class="svp-flex svp-justify-between svp-items-center svp-mb-4">
                            <h3 class="svp-section-title" style="margin: 0;">📈 Price Chart</h3>
                            <span class="svp-card-value emerald" id="svp-tech-price">$0.00</span>
                        </div>
                        <div class="svp-chart-container">
                            <canvas id="svp-price-chart"></canvas>
                        </div>
                    </div>

                    <!-- 2 Column Layout -->
                    <div class="svp-grid-12">
                        <!-- Left: Indicators -->
                        <div class="svp-col-5 svp-space-y-6">
                            <!-- RSI Card -->
                            <div class="svp-indicator-card">
                                <h3 class="svp-indicator-title">📊 RSI Indicator</h3>
                                <div class="svp-rsi-display">
                                    <div>
                                        <span class="svp-rsi-value" id="svp-rsi-value">50</span>
                                        <span class="svp-rsi-scale">/ 100</span>
                                    </div>
                                    <span class="svp-rsi-signal neutral" id="svp-rsi-signal">NEUTRAL</span>
                                </div>
                                <div class="svp-rsi-bar">
                                    <div class="svp-rsi-fill neutral" id="svp-rsi-fill" style="width: 50%;"></div>
                                </div>
                                <div class="svp-rsi-labels">
                                    <span>0 (Oversold)</span>
                                    <span>50</span>
                                    <span>100 (Overbought)</span>
                                </div>
                            </div>

                            <!-- Moving Averages -->
                            <div class="svp-indicator-card">
                                <h3 class="svp-indicator-title">📈 Moving Averages</h3>
                                <div class="svp-ma-list" id="svp-ma-list">
                                    <div class="svp-ma-item">
                                        <span class="svp-ma-label">SMA 20</span>
                                        <span class="svp-ma-value yellow" id="svp-sma20">N/A</span>
                                    </div>
                                    <div class="svp-ma-item">
                                        <span class="svp-ma-label">SMA 50</span>
                                        <span class="svp-ma-value blue" id="svp-sma50">N/A</span>
                                    </div>
                                    <div class="svp-ma-item">
                                        <span class="svp-ma-label">SMA 200</span>
                                        <span class="svp-ma-value pink" id="svp-sma200">N/A</span>
                                    </div>
                                    <div class="svp-ma-item">
                                        <span class="svp-ma-label">EMA 12</span>
                                        <span class="svp-ma-value cyan" id="svp-ema12">N/A</span>
                                    </div>
                                    <div class="svp-ma-item">
                                        <span class="svp-ma-label">EMA 26</span>
                                        <span class="svp-ma-value purple" id="svp-ema26">N/A</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Pivot Points -->
                            <div class="svp-indicator-card">
                                <h3 class="svp-indicator-title">📐 Pivot Points</h3>
                                <div class="svp-pivot-grid">
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">R3</span>
                                        <span class="svp-pivot-value resistance" id="svp-r3">$0</span>
                                    </div>
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">S1</span>
                                        <span class="svp-pivot-value support" id="svp-s1">$0</span>
                                    </div>
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">R2</span>
                                        <span class="svp-pivot-value resistance" id="svp-r2">$0</span>
                                    </div>
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">S2</span>
                                        <span class="svp-pivot-value support" id="svp-s2">$0</span>
                                    </div>
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">R1</span>
                                        <span class="svp-pivot-value resistance" id="svp-r1">$0</span>
                                    </div>
                                    <div class="svp-pivot-item">
                                        <span class="svp-pivot-label">S3</span>
                                        <span class="svp-pivot-value support" id="svp-s3">$0</span>
                                    </div>
                                    <div class="svp-pivot-item" style="grid-column: span 2;">
                                        <span class="svp-pivot-label">Pivot</span>
                                        <span class="svp-pivot-value pivot" id="svp-pivot">$0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Support/Resistance -->
                        <div class="svp-col-7 svp-space-y-6">
                            <!-- Support/Resistance -->
                            <div class="svp-indicator-card">
                                <h3 class="svp-indicator-title">🎯 Support & Resistance</h3>
                                <div class="svp-mb-4">
                                    <p class="svp-card-header">RESISTANCE</p>
                                    <div class="svp-sr-pills" id="svp-resistance-levels">
                                        <span class="svp-sr-pill resistance">—</span>
                                    </div>
                                </div>
                                <div>
                                    <p class="svp-card-header">SUPPORT</p>
                                    <div class="svp-sr-pills" id="svp-support-levels">
                                        <span class="svp-sr-pill support">—</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Data Info -->
                            <div class="svp-card" style="background: rgba(39,39,42,0.3);">
                                <div class="svp-flex svp-justify-between"
                                    style="font-size: 14px; color: var(--svp-text-zinc-500);">
                                    <span>Data Points: <span id="svp-data-points">0</span> (<span
                                            id="svp-timeframe-display">1Y</span>)</span>
                                    <span>Currency: USD</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div class="svp-empty" id="svp-tech-empty">
                    <div class="svp-empty-icon">📈</div>
                    <h2 class="svp-empty-title">Ready for Analysis</h2>
                    <p class="svp-empty-text">Click "Analyze" to fetch technical indicators, price charts with
                        support/resistance levels, and trading signals.</p>
                    <div class="svp-mt-6 svp-timeframe-buttons" style="justify-content: center;">
                        <span class="svp-timeframe-btn">1M</span>
                        <span class="svp-timeframe-btn">6M</span>
                        <span class="svp-timeframe-btn active">1Y</span>
                        <span class="svp-timeframe-btn">3Y</span>
                        <span class="svp-timeframe-btn">5Y</span>
                    </div>
                </div>
            </section>
        <?php endif; ?>

        <!-- === NEWS SECTION === -->
        <?php if (!empty($options['enable_news_feed'])): ?>
            <section id="svp-section-news" class="svp-section <?php echo $active_section === 'news' ? 'active' : ''; ?>"
                <?php echo $active_section !== 'news' ? 'style="display: none;"' : ''; ?>>
                <div class="svp-page-header">
                    <div>
                        <h1 class="svp-page-title">AI Analyzer</h1>
                        <p class="svp-page-subtitle">
                            Market news and AI analysis for <span
                                class="svp-ticker-highlight svp-current-ticker"><?php echo $ticker ?: '...'; ?></span>
                        </p>
                    </div>
                    <div class="svp-flex svp-gap-4">
                        <button class="svp-btn-primary" id="svp-fetch-analyze-btn">
                            <span>🤖</span>
                            <span>AI Analyzer</span>
                        </button>
                    </div>
                </div>

                <!-- AI Analysis Card -->
                <div id="svp-ai-analysis" style="display: none;"></div>

                <!-- News Loading -->
                <div class="svp-loading" id="svp-news-loading" style="display: none;">
                    <div class="svp-spinner"></div>
                    <p class="svp-loading-text">Loading news...</p>
                </div>

                <!-- News Grid -->
                <div id="svp-news-container">
                    <h3 class="svp-section-title svp-mb-4"><span id="svp-news-count">0</span> Articles</h3>
                    <div class="svp-news-grid" id="svp-news-grid">
                        <!-- News cards inserted here -->
                    </div>
                </div>

                <!-- Empty State -->
                <div class="svp-empty" id="svp-news-empty">
                    <div class="svp-empty-icon">📰</div>
                    <h2 class="svp-empty-title">Ready to Explore</h2>
                    <p class="svp-empty-text">Click "Fetch News" to get the latest articles for your ticker</p>
                    <p class="svp-page-subtitle svp-mt-4">💡 Then use "Analyze with AI" for intelligent insights</p>
                </div>
            </section>
        <?php endif; ?>

        <!-- === RELATIVE SECTION === -->
        <?php if (!empty($options['enable_relative_valuation'])): ?>
            <section id="svp-section-relative"
                class="svp-section <?php echo $active_section === 'relative' ? 'active' : ''; ?>" <?php echo $active_section !== 'relative' ? 'style="display: none;"' : ''; ?>>
                <div class="svp-page-header">
                    <div>
                        <h1 class="svp-page-title">Relative Valuation</h1>
                        <p class="svp-page-subtitle">
                            Peer comparison for <span
                                class="svp-ticker-highlight svp-current-ticker"><?php echo $ticker ?: '...'; ?></span>
                        </p>
                    </div>
                </div>
                <div class="svp-card">
                    <p style="color: var(--svp-text-zinc-500);">Relative valuation metrics will be shown here once you fetch
                        stock data from the DCF section.</p>
                </div>
            </section>
        <?php endif; ?>

    </main>
</div>