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
        // Log the request for debugging
        error_log('SVP: save_api_key called');
        error_log('SVP: User logged in (WP): ' . (is_user_logged_in() ? 'yes' : 'no'));
        error_log('SVP: Current user ID: ' . get_current_user_id());
        error_log('SVP: Nonce from request: ' . (isset($_POST['nonce']) ? $_POST['nonce'] : 'MISSING'));

        // Verify nonce (false means don't die on failure)
        $nonce_check = check_ajax_referer('svp_nonce', 'nonce', false);
        if (!$nonce_check) {
            error_log('SVP: Nonce verification failed');
            wp_send_json_error(array('message' => 'Security check failed. Please refresh the page and try again.'));
            return;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            error_log('SVP: User not logged in');
            wp_send_json_error(array('message' => 'You must be logged in to WordPress'), 401);
            return;
        }

        // Get the API key from POST data
        $api_key = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : '';

        if (empty($api_key)) {
            error_log('SVP: API key is empty');
            wp_send_json_error(array('message' => 'API key cannot be empty'));
            return;
        }

        // Save to WordPress user meta
        $user_id = get_current_user_id();
        $result = update_user_meta($user_id, 'svp_gemini_api_key', $api_key);

        error_log('SVP: API key saved for user ' . $user_id . ', result: ' . ($result ? 'success' : 'failed'));

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
        // Log the request for debugging
        error_log('SVP: get_api_key called');
        error_log('SVP: User logged in (WP): ' . (is_user_logged_in() ? 'yes' : 'no'));
        error_log('SVP: Current user ID: ' . get_current_user_id());

        // Verify nonce (false means don't die on failure)
        $nonce_check = check_ajax_referer('svp_nonce', 'nonce', false);
        if (!$nonce_check) {
            error_log('SVP: Nonce verification failed');
            wp_send_json_error(array(
                'has_key' => false,
                'message' => 'Security check failed. Please refresh the page.'
            ));
            return;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            error_log('SVP: User not logged in to WordPress');
            wp_send_json_error(array(
                'has_key' => false,
                'message' => 'Not logged in to WordPress'
            ));
            return;
        }

        // Get API key from user meta
        $user_id = get_current_user_id();
        $api_key = get_user_meta($user_id, 'svp_gemini_api_key', true);

        $has_key = !empty($api_key);
        $masked_key = $has_key ? '********' . substr($api_key, -4) : '';

        error_log('SVP: API key retrieved for user ' . $user_id . ', has_key: ' . ($has_key ? 'yes' : 'no'));

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
