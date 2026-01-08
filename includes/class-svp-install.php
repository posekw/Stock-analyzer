<?php
/**
 * Database Installation Script
 * Creates custom tables for isolated plugin authentication
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_Install
{

    /**
     * Create custom database tables
     */
    public static function install()
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // Table names
        $users_table = $wpdb->prefix . 'svp_users';
        $sessions_table = $wpdb->prefix . 'svp_sessions';
        $watchlist_table = $wpdb->prefix . 'svp_watchlist';

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Create users table
        $sql_users = "CREATE TABLE $users_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            username varchar(60) NOT NULL,
            email varchar(100) NOT NULL,
            password_hash varchar(255) NOT NULL,
            gemini_api_key text DEFAULT NULL,
            created_at datetime NOT NULL,
            last_login datetime DEFAULT NULL,
            is_banned tinyint(1) DEFAULT 0,
            is_deleted tinyint(1) DEFAULT 0,
            PRIMARY KEY  (id),
            UNIQUE KEY username (username),
            UNIQUE KEY email (email),
            KEY is_banned (is_banned),
            KEY is_deleted (is_deleted)
        ) $charset_collate;";

        dbDelta($sql_users);

        // Explicitly check for gemini_api_key column to handle dbDelta quirks
        $row = $wpdb->get_results("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '" . DB_NAME . "' AND TABLE_NAME = '$users_table' AND COLUMN_NAME = 'gemini_api_key'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $users_table ADD COLUMN gemini_api_key text DEFAULT NULL");
        }

        // Create sessions table
        $sql_sessions = "CREATE TABLE $sessions_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            session_token varchar(255) NOT NULL,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            created_at datetime NOT NULL,
            expires_at datetime NOT NULL,
            last_activity datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY session_token (session_token),
            KEY user_id (user_id),
            KEY expires_at (expires_at)
        ) $charset_collate;";

        dbDelta($sql_sessions);

        // Create watchlist table (migrate existing if needed)
        $sql_watchlist = "CREATE TABLE $watchlist_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            ticker varchar(10) NOT NULL,
            added_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY user_ticker (user_id, ticker),
            KEY user_id (user_id)
        ) $charset_collate;";

        dbDelta($sql_watchlist);

        // Store database version
        add_option('svp_db_version', '1.0.0');
    }

    /**
     * Drop custom tables on uninstall
     */
    public static function uninstall()
    {
        global $wpdb;

        $tables = array(
            $wpdb->prefix . 'svp_users',
            $wpdb->prefix . 'svp_sessions',
            $wpdb->prefix . 'svp_watchlist'
        );

        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }

        delete_option('svp_db_version');
    }
}
