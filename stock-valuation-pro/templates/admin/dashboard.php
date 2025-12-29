<?php
/**
 * Admin Dashboard Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$options = get_option('svp_options', array());
?>

<div class="wrap svp-admin-wrap">
    <div class="svp-admin-header">
        <h1>
            <span class="dashicons dashicons-chart-line"></span>
            Stock Valuation Pro
        </h1>
        <span class="version">v<?php echo SVP_VERSION; ?></span>
    </div>

    <!-- Stats Grid -->
    <div class="svp-stats-grid">
        <div class="svp-stat-card">
            <div class="icon">📊</div>
            <div class="number"><?php echo $options['enable_dcf_valuation'] ? '✓' : '✗'; ?></div>
            <div class="label">DCF Valuation</div>
        </div>
        <div class="svp-stat-card">
            <div class="icon">📈</div>
            <div class="number"><?php echo $options['enable_technical_analysis'] ? '✓' : '✗'; ?></div>
            <div class="label">Technical Analysis</div>
        </div>
        <div class="svp-stat-card">
            <div class="icon">⚖️</div>
            <div class="number"><?php echo $options['enable_relative_valuation'] ? '✓' : '✗'; ?></div>
            <div class="label">Relative Valuation</div>
        </div>
        <div class="svp-stat-card">
            <div class="icon">📰</div>
            <div class="number"><?php echo $options['enable_news_feed'] ? '✓' : '✗'; ?></div>
            <div class="label">News Feed</div>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
        <div>
            <!-- Quick Start -->
            <div class="svp-admin-card">
                <h2><span class="dashicons dashicons-welcome-learn-more"></span> Quick Start</h2>
                <p>Add stock valuation widgets to your pages using shortcodes. Here are the most common ones:</p>

                <ul class="svp-shortcode-list">
                    <li>
                        <code class="shortcode-code">[stock_dashboard]</code>
                        <div class="shortcode-desc">
                            <h4>Full Dashboard</h4>
                            <p>Complete valuation dashboard with all features</p>
                        </div>
                        <button class="svp-copy-btn">Copy</button>
                    </li>
                    <li>
                        <code class="shortcode-code">[stock_valuation ticker="AAPL"]</code>
                        <div class="shortcode-desc">
                            <h4>DCF Valuation</h4>
                            <p>Discounted Cash Flow analysis widget</p>
                        </div>
                        <button class="svp-copy-btn">Copy</button>
                    </li>
                    <li>
                        <code class="shortcode-code">[stock_technicals ticker="AAPL"]</code>
                        <div class="shortcode-desc">
                            <h4>Technical Analysis</h4>
                            <p>Charts and technical indicators</p>
                        </div>
                        <button class="svp-copy-btn">Copy</button>
                    </li>
                </ul>

                <p><a href="<?php echo admin_url('admin.php?page=stock-valuation-shortcodes'); ?>">View all shortcodes
                        →</a></p>
            </div>

            <!-- API Status -->
            <div class="svp-admin-card">
                <h2><span class="dashicons dashicons-cloud"></span> API Status</h2>
                <table class="widefat">
                    <tbody>
                        <tr>
                            <td><strong>Yahoo Finance API</strong></td>
                            <td><span style="color: #10b981;">● Active</span> (Free tier)</td>
                        </tr>
                        <tr>
                            <td><strong>Financial Data API Key</strong></td>
                            <td>
                                <?php if (!empty($options['api_key'])): ?>
                                    <span style="color: #10b981;">● Configured</span>
                                <?php else: ?>
                                    <span style="color: #f59e0b;">● Not Set</span> - <a
                                        href="<?php echo admin_url('admin.php?page=stock-valuation-settings'); ?>">Configure</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Gemini AI API Key</strong></td>
                            <td>
                                <?php if (!empty($options['gemini_api_key'])): ?>
                                    <span style="color: #10b981;">● Configured</span>
                                <?php else: ?>
                                    <span style="color: #f59e0b;">● Not Set</span> - <a
                                        href="<?php echo admin_url('admin.php?page=stock-valuation-settings'); ?>">Configure</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div>
            <!-- Quick Links -->
            <div class="svp-admin-card">
                <h2><span class="dashicons dashicons-admin-links"></span> Quick Links</h2>
                <div class="svp-quick-links" style="flex-direction: column;">
                    <a href="<?php echo admin_url('admin.php?page=stock-valuation-settings'); ?>"
                        class="svp-quick-link">
                        <span class="icon">⚙️</span>
                        <span class="text">Settings</span>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=stock-valuation-shortcodes'); ?>"
                        class="svp-quick-link">
                        <span class="icon">📝</span>
                        <span class="text">Shortcodes</span>
                    </a>
                    <a href="https://docs.example.com/stock-valuation-pro" target="_blank" class="svp-quick-link">
                        <span class="icon">📖</span>
                        <span class="text">Documentation</span>
                    </a>
                </div>
            </div>

            <!-- Support -->
            <div class="svp-admin-card">
                <h2><span class="dashicons dashicons-sos"></span> Need Help?</h2>
                <p>Check out our documentation or contact support if you need assistance.</p>
                <p>
                    <a href="https://example.com/support" target="_blank" class="button button-primary">Get Support</a>
                </p>
            </div>
        </div>
    </div>
</div>