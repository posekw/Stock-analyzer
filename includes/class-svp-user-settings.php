<?php
/**
 * User Settings Manager
 * Handles Gemini API key storage per WordPress user
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_User_Settings
{

    public function __construct()
    {
        // AJAX endpoints for logged-in users
        add_action('wp_ajax_svp_save_api_key', array($this, 'save_api_key'));
        add_action('wp_ajax_svp_get_api_key', array($this, 'get_api_key'));
    }

    /**
     * Save API Key via AJAX
     */
    public function save_api_key()
    {
        // Verify nonce
        check_ajax_referer('svp_nonce', 'nonce');

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'You must be logged in'), 401);
        }

        // Get the API key from POST data
        $api_key = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : '';

        if (empty($api_key)) {
            wp_send_json_error(array('message' => 'API key cannot be empty'));
        }

        // Save to WordPress user meta
        $user_id = get_current_user_id();
        update_user_meta($user_id, 'svp_gemini_api_key', $api_key);

        wp_send_json_success(array(
            'message' => 'API key saved successfully',
            'masked_key' => '********' . substr($api_key, -4)
        ));
    }

    /**
     * Get API Key via AJAX
     */
    public function get_api_key()
    {
        // Verify nonce
        check_ajax_referer('svp_nonce', 'nonce');

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error(array(
                'has_key' => false,
                'message' => 'Not logged in'
            ));
        }

        // Get API key from user meta
        $user_id = get_current_user_id();
        $api_key = get_user_meta($user_id, 'svp_gemini_api_key', true);

        $has_key = !empty($api_key);
        $masked_key = $has_key ? '********' . substr($api_key, -4) : '';

        wp_send_json_success(array(
            'has_key' => $has_key,
            'api_key' => $api_key,
            'masked_key' => $masked_key
        ));
    }

    /**
     * Get API key for a specific user (for internal use)
     */
    public static function get_user_api_key($user_id = null)
    {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }

        if (!$user_id) {
            return '';
        }

        return get_user_meta($user_id, 'svp_gemini_api_key', true);
    }
}

// Initialize
new SVP_User_Settings();
