<?php
/**
 * Session Management Class
 * Handles session tokens, cookies, and validation
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_Session
{

    private $cookie_name = 'svp_session';
    private $session_duration = 2592000; // 30 days in seconds

    /**
     * Generate a secure random token
     */
    public function generate_token()
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Create a new session
     */
    public function create_session($user_id)
    {
        global $wpdb;

        $token = $this->generate_token();
        $table = $wpdb->prefix . 'svp_sessions';

        $inserted = $wpdb->insert(
            $table,
            array(
                'user_id' => $user_id,
                'session_token' => $token,
                'ip_address' => $this->get_client_ip(),
                'user_agent' => $this->get_user_agent(),
                'created_at' => current_time('mysql'),
                'expires_at' => date('Y-m-d H:i:s', time() + $this->session_duration),
                'last_activity' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s', '%s')
        );

        if ($inserted) {
            $this->set_cookie($token);
            return $token;
        }

        return false;
    }

    /**
     * Validate session and return user ID
     */
    public function validate_session()
    {
        if (!isset($_COOKIE[$this->cookie_name])) {
            return null;
        }

        global $wpdb;
        $token = sanitize_text_field($_COOKIE[$this->cookie_name]);
        $table = $wpdb->prefix . 'svp_sessions';

        $session = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table 
             WHERE session_token = %s 
             AND expires_at > NOW()",
            $token
        ));

        if (!$session) {
            $this->clear_cookie();
            return null;
        }

        // Update last activity
        $wpdb->update(
            $table,
            array('last_activity' => current_time('mysql')),
            array('id' => $session->id),
            array('%s'),
            array('%d')
        );

        return $session->user_id;
    }

    /**
     * Destroy a session
     */
    public function destroy_session($token = null)
    {
        global $wpdb;

        if (!$token && isset($_COOKIE[$this->cookie_name])) {
            $token = sanitize_text_field($_COOKIE[$this->cookie_name]);
        }

        if ($token) {
            $table = $wpdb->prefix . 'svp_sessions';
            $wpdb->delete(
                $table,
                array('session_token' => $token),
                array('%s')
            );
        }

        $this->clear_cookie();
    }

    /**
     * Cleanup expired sessions (called via cron)
     */
    public static function cleanup_expired_sessions()
    {
        global $wpdb;
        $table = $wpdb->prefix . 'svp_sessions';

        $wpdb->query(
            "DELETE FROM $table WHERE expires_at < NOW()"
        );
    }

    /**
     * Set session cookie
     */
    private function set_cookie($token)
    {
        setcookie(
            $this->cookie_name,
            $token,
            array(
                'expires' => time() + $this->session_duration,
                'path' => '/',
                'domain' => '',
                'secure' => is_ssl(),
                'httponly' => true,
                'samesite' => 'Lax'
            )
        );
    }

    /**
     * Clear session cookie
     */
    private function clear_cookie()
    {
        setcookie(
            $this->cookie_name,
            '',
            array(
                'expires' => time() - 3600,
                'path' => '/',
                'domain' => '',
                'secure' => is_ssl(),
                'httponly' => true,
                'samesite' => 'Lax'
            )
        );
    }

    /**
     * Get client IP address
     */
    private function get_client_ip()
    {
        $ip = '';

        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        }

        return sanitize_text_field($ip);
    }

    /**
     * Get user agent
     */
    private function get_user_agent()
    {
        return isset($_SERVER['HTTP_USER_AGENT'])
            ? substr(sanitize_text_field($_SERVER['HTTP_USER_AGENT']), 0, 255)
            : '';
    }
}
