<?php
/**
 * Frontend News Template
 */

if (!defined('ABSPATH')) {
    exit;
}

$ticker = isset($atts['ticker']) ? strtoupper(sanitize_text_field($atts['ticker'])) : '';
$count = isset($atts['count']) ? intval($atts['count']) : 10;
?>

<div class="svp-container svp-news-container" data-ticker="<?php echo esc_attr($ticker); ?>"
    data-count="<?php echo esc_attr($count); ?>">
    <div class="svp-content">

        <!-- Header -->
        <div class="svp-header">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">News & Sentiment</h2>
                    <p style="color: var(--svp-text-muted); margin: 0.25rem 0 0 0; font-size: 0.875rem;">
                        Latest news for <span class="svp-ticker-symbol"
                            style="color: var(--svp-accent); font-weight: 600;"><?php echo $ticker ?: '...'; ?></span>
                    </p>
                </div>
                <button class="svp-btn svp-btn-primary svp-fetch-news-btn">
                    <span>📰</span>
                    Refresh News
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div class="svp-loading" style="display: none;">
            <div class="svp-spinner"></div>
            <span>Loading news...</span>
        </div>

        <!-- News Content -->
        <div class="svp-news-content-wrapper" style="display: none;">
            <div class="svp-news-list">
                <!-- News items will be inserted here -->
            </div>
        </div>

        <!-- Empty State -->
        <div class="svp-empty svp-news-empty">
            <div class="svp-empty-icon">📰</div>
            <div class="svp-empty-title">No News Yet</div>
            <p class="svp-empty-text">Click "Refresh News" to fetch the latest articles related to your selected stock.
            </p>
        </div>

    </div>
</div>