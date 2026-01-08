<?php
/**
 * Authentication Class
 * Handles user registration, login, logout, and authentication
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'class-svp-session.php';

class SVP_Auth
{

    private $session;

    public function __construct()
    {
        $this->session = new SVP_Session();
    }

    /**
     * Register a new user
     */
    public function register($username, $email, $password)
    {
        global $wpdb;

        // Validate inputs
        $username = sanitize_text_field($username);
        $email = sanitize_email($email);

        if (empty($username) || empty($email) || empty($password)) {
            return array('success' => false, 'message' => 'Please fill in all fields.');
        }

        if (!is_email($email)) {
            return array('success' => false, 'message' => 'Invalid email address.');
        }

        if (strlen($password) < 8) {
            return array('success' => false, 'message' => 'Password must be at least 8 characters.');
        }

        // Check if username exists
        $table = $wpdb->prefix . 'svp_users';
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE username = %s OR email = %s",
            $username,
            $email
        ));

        if ($exists) {
            return array('success' => false, 'message' => 'Username or email already exists.');
        }

        // Hash password
        $password_hash = password_hash($password, PASSWORD_BCRYPT);

        // Insert user
        $inserted = $wpdb->insert(
            $table,
            array(
                'username' => $username,
                'email' => $email,
                'password_hash' => $password_hash,
                'created_at' => current_time('mysql'),
                'is_banned' => 0,
                'is_deleted' => 0
            ),
            array('%s', '%s', '%s', '%s', '%d', '%d')
        );

        if (!$inserted) {
            return array('success' => false, 'message' => 'Registration failed. Please try again.');
        }

        $user_id = $wpdb->insert_id;

        // Create session
        $token = $this->session->create_session($user_id);

        if (!$token) {
            return array('success' => false, 'message' => 'Registration successful but login failed.');
        }

        return array(
            'success' => true,
            'message' => 'Registration successful!',
            'user_id' => $user_id,
            'redirect_url' => home_url('/stock/')
        );
    }

    /**
     * Login a user
     */
    public function login($username_or_email, $password)
    {
        global $wpdb;

        $username_or_email = sanitize_text_field($username_or_email);

        if (empty($username_or_email) || empty($password)) {
            return array('success' => false, 'message' => 'Please fill in all fields.');
        }

        // Get user
        $table = $wpdb->prefix . 'svp_users';
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table 
             WHERE (username = %s OR email = %s) 
             AND is_deleted = 0",
            $username_or_email,
            $username_or_email
        ));

        if (!$user) {
            return array('success' => false, 'message' => 'Invalid username/email or password.');
        }

        // Check if banned
        if ($user->is_banned) {
            return array('success' => false, 'message' => 'Your account has been banned.');
        }

        // Verify password
        if (!password_verify($password, $user->password_hash)) {
            return array('success' => false, 'message' => 'Invalid username/email or password.');
        }

        // Update last login
        $wpdb->update(
            $table,
            array('last_login' => current_time('mysql')),
            array('id' => $user->id),
            array('%s'),
            array('%d')
        );

        // Create session
        $token = $this->session->create_session($user->id);

        if (!$token) {
            return array('success' => false, 'message' => 'Login failed. Please try again.');
        }

        return array(
            'success' => true,
            'message' => 'Login successful!',
            'redirect_url' => home_url('/stock/')
        );
    }

    /**
     * Logout current user
     */
    public function logout()
    {
        $this->session->destroy_session();

        return array(
            'success' => true,
            'message' => 'Logged out successfully.',
            'redirect_url' => home_url('/stock/')
        );
    }

    /**
     * Get current authenticated user
     */
    public function get_current_user()
    {
        $user_id = $this->session->validate_session();

        if (!$user_id) {
            return null;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'svp_users';

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT id, username, email, created_at, last_login 
             FROM $table 
             WHERE id = %d 
             AND is_banned = 0 
             AND is_deleted = 0",
            $user_id
        ));

        return $user;
    }

    /**
     * Get current user ID
     */
    public function get_current_user_id()
    {
        return $this->session->validate_session();
    }

    /**
     * Check if user is logged in
     */
    public function is_logged_in()
    {
        return $this->get_current_user_id() !== null;
    }
}
