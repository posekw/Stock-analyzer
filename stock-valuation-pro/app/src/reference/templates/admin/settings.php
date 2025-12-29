<?php
/**
 * Admin Settings Template
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap svp-admin-wrap">
    <div class="svp-admin-header">
        <h1>
            <span class="dashicons dashicons-admin-generic"></span>
            Settings
        </h1>
        <span class="version">v<?php echo SVP_VERSION; ?></span>
    </div>

    <div class="svp-admin-card">
        <form method="post" action="options.php" class="svp-settings-form">
            <?php
            settings_fields('svp_options_group');
            do_settings_sections('stock-valuation-settings');
            submit_button('Save Settings');
            ?>
        </form>
    </div>
</div>