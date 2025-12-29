<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="svp-app svp-auth-container">
    <div class="svp-auth-wrapper">
        <!-- Login Form -->
        <div class="svp-auth-card" id="svp-login-card">
            <div class="svp-auth-header">
                <h2><?php _e('Welcome Back', 'stock-valuation-pro'); ?></h2>
                <p><?php _e('Sign in to access your stock analysis.', 'stock-valuation-pro'); ?></p>
            </div>
            <form id="svp-login-form" class="svp-auth-form">
                <div class="svp-form-group">
                    <label for="svp-login-username"><?php _e('Username or Email', 'stock-valuation-pro'); ?></label>
                    <input type="text" id="svp-login-username" name="username" required>
                </div>
                <div class="svp-form-group">
                    <label for="svp-login-password"><?php _e('Password', 'stock-valuation-pro'); ?></label>
                    <input type="password" id="svp-login-password" name="password" required>
                </div>
                <div class="svp-form-actions">
                    <button type="submit" class="svp-btn svp-btn-primary svp-btn-block">
                        <span class="svp-btn-text"><?php _e('Sign In', 'stock-valuation-pro'); ?></span>
                        <span class="svp-btn-loader"></span>
                    </button>
                </div>
                <p class="svp-auth-footer">
                    <?php _e('Don\'t have an account?', 'stock-valuation-pro'); ?>
                    <a href="#" class="svp-toggle-auth"
                        data-target="svp-register-card"><?php _e('Sign Up', 'stock-valuation-pro'); ?></a>
                </p>
                <div class="svp-auth-message"></div>
            </form>
        </div>

        <!-- Register Form -->
        <div class="svp-auth-card" id="svp-register-card" style="display: none;">
            <div class="svp-auth-header">
                <h2><?php _e('Create Account', 'stock-valuation-pro'); ?></h2>
                <p><?php _e('Join us to start valuing stocks like a pro.', 'stock-valuation-pro'); ?></p>
            </div>
            <form id="svp-register-form" class="svp-auth-form">
                <div class="svp-form-group">
                    <label for="svp-register-username"><?php _e('Username', 'stock-valuation-pro'); ?></label>
                    <input type="text" id="svp-register-username" name="username" required>
                </div>
                <div class="svp-form-group">
                    <label for="svp-register-email"><?php _e('Email Address', 'stock-valuation-pro'); ?></label>
                    <input type="email" id="svp-register-email" name="email" required>
                </div>
                <div class="svp-form-group">
                    <label for="svp-register-password"><?php _e('Password', 'stock-valuation-pro'); ?></label>
                    <input type="password" id="svp-register-password" name="password" required>
                </div>
                <div class="svp-form-actions">
                    <button type="submit" class="svp-btn svp-btn-primary svp-btn-block">
                        <span class="svp-btn-text"><?php _e('Create Account', 'stock-valuation-pro'); ?></span>
                        <span class="svp-btn-loader"></span>
                    </button>
                </div>
                <p class="svp-auth-footer">
                    <?php _e('Already have an account?', 'stock-valuation-pro'); ?>
                    <a href="#" class="svp-toggle-auth"
                        data-target="svp-login-card"><?php _e('Sign In', 'stock-valuation-pro'); ?></a>
                </p>
                <div class="svp-auth-message"></div>
            </form>
        </div>
    </div>
</div>