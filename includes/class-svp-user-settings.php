<?php
/**
 * User Settings Manager
 * Handles Gemini API key storage per user (both WordPress and custom auth)
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_User_Settings
{
    private $auth;

    public function __construct($auth_instance)
    {
        $this->auth = $auth_instance;

        // AJAX endpoints for logged-in users (both WP and custom auth)
        add_action('wp_ajax_svp_save_api_key', array($this, 'save_api_key'));
        add_action('wp_ajax_svp_get_api_key', array($this, 'get_api_key'));
        add_action('wp_ajax_nopriv_svp_save_api_key', array($this, 'save_api_key')); // For non-WP logged in users
        add_action('wp_ajax_nopriv_svp_get_api_key', array($this, 'get_api_key')); // For non-WP logged in users
    }

    /**
     * Save API Key via AJAX
     */
    public function save_api_key()
    {
        global $wpdb;

        // Log the request for debugging
        error_log('SVP: save_api_key called');
        error_log('SVP: Custom Auth logged in: ' . ($this->auth->is_logged_in() ? 'yes' : 'no'));
        error_log('SVP: Custom Auth user ID: ' . $this->auth->get_current_user_id());
        error_log('SVP: WP logged in: ' . (is_user_logged_in() ? 'yes' : 'no'));
        error_log('SVP: WP user ID: ' . get_current_user_id());

        // Verify nonce (false means don't die on failure)
        $nonce_check = check_ajax_referer('svp_nonce', 'nonce', false);
        if (!$nonce_check) {
            error_log('SVP: Nonce verification failed');
            wp_send_json_error(array('message' => 'Security check failed. Please refresh the page and try again.'));
            return;
        }

        // Check if user is logged in (either WordPress or custom auth)
        $is_wp_user = is_user_logged_in();
        $is_custom_user = $this->auth->is_logged_in();

        if (!$is_wp_user && !$is_custom_user) {
            error_log('SVP: User not logged in (neither WP nor custom)');
            wp_send_json_error(array('message' => 'You must be logged in'));
            return;
        }

        // Get the API key from POST data
        $api_key = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : '';

        if (empty($api_key)) {
            error_log('SVP: API key is empty');
            wp_send_json_error(array('message' => 'API key cannot be empty'));
            return;
        }

        // Save based on which auth system is being used
        if ($is_custom_user) {
            // Custom auth user - save to svp_users table
            $user_id = $this->auth->get_current_user_id();
            $table = $wpdb->prefix . 'svp_users';

            $result = $wpdb->update(
                $table,
                array('gemini_api_key' => $api_key),
                array('id' => $user_id),
                array('%s'),
                array('%d')
            );

            error_log('SVP: API key saved for custom user ' . $user_id . ', result: ' . print_r($result, true));
        } else {
            // WordPress user - save to user meta
            $user_id = get_current_user_id();
            $result = update_user_meta($user_id, 'svp_gemini_api_key', $api_key);

            error_log('SVP: API key saved for WP user ' . $user_id . ', result: ' . ($result ? 'success' : 'failed'));
        }

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
        global $wpdb;

        // Log the request for debugging
        error_log('SVP: get_api_key called');
        error_log('SVP: Custom Auth logged in: ' . ($this->auth->is_logged_in() ? 'yes' : 'no'));
        error_log('SVP: WP logged in: ' . (is_user_logged_in() ? 'yes' : 'no'));

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

        // Check if user is logged in (either WordPress or custom auth)
        $is_wp_user = is_user_logged_in();
        $is_custom_user = $this->auth->is_logged_in();

        if (!$is_wp_user && !$is_custom_user) {
            error_log('SVP: User not logged in');
            wp_send_json_error(array(
                'has_key' => false,
                'message' => 'Not logged in'
            ));
            return;
        }

        // Get API key based on which auth system is being used
        $api_key = '';
        if ($is_custom_user) {
            // Custom auth user - get from svp_users table
            $user_id = $this->auth->get_current_user_id();
            $table = $wpdb->prefix . 'svp_users';
            $api_key = $wpdb->get_var($wpdb->prepare(
                "SELECT gemini_api_key FROM $table WHERE id = %d",
                $user_id
            ));
            error_log('SVP: Retrieved API key for custom user ' . $user_id);
        } else {
            // WordPress user - get from user meta
            $user_id = get_current_user_id();
            $api_key = get_user_meta($user_id, 'svp_gemini_api_key', true);
            error_log('SVP: Retrieved API key for WP user ' . $user_id);
        }

        $has_key = !empty($api_key);
        $masked_key = $has_key ? '********' . substr($api_key, -4) : '';

        error_log('SVP: has_key: ' . ($has_key ? 'yes' : 'no'));

        wp_send_json_success(array(
            'has_key' => $has_key,
            'api_key' => $api_key,
            'masked_key' => $masked_key
        ));
    }

    /**
     * Get API key for a specific user (for internal use)
     */
    public static function get_user_api_key($user_id = null, $is_custom_user = false)
    {
        global $wpdb;

        if ($is_custom_user && $user_id) {
            // Custom auth user
            $table = $wpdb->prefix . 'svp_users';
            return $wpdb->get_var($wpdb->prepare(
                "SELECT gemini_api_key FROM $table WHERE id = %d",
                $user_id
            ));
        } else {
            // WordPress user
            if ($user_id === null) {
                $user_id = get_current_user_id();
            }

            if (!$user_id) {
                return '';
            }

            return get_user_meta($user_id, 'svp_gemini_api_key', true);
        }
    }
}
