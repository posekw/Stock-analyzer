<?php
/**
 * Plugin Name: Stock Valuation Pro
 * Plugin URI: https://example.com/stock-valuation-pro
 * Description: A comprehensive stock valuation plugin with DCF analysis, technical analysis, relative valuation, and news feeds.
 * Version: 1.1.1
 * Author: Stock Valuation Team
 * Author URI: https://example.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: stock-valuation-pro
 * Domain Path: /languages
 * GitHub Plugin URI: posekw/Stock-analyzer
 * GitHub Branch: main
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('SVP_VERSION', '1.1.0.' . time()); // Dev cache busting
define('SVP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SVP_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SVP_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main Plugin Class
 */
class StockValuationPro
{

    private static $instance = null;
    private $options;

    /**
     * Get singleton instance
     */
    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->options = get_option('svp_options', $this->get_default_options());

        // Initialize hooks
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // Register shortcodes
        add_shortcode('stock_valuation', array($this, 'render_main_valuation'));
        add_shortcode('stock_technicals', array($this, 'render_technicals'));
        add_shortcode('stock_relative', array($this, 'render_relative_valuation'));
        add_shortcode('stock_news', array($this, 'render_news'));
        add_shortcode('stock_dashboard', array($this, 'render_full_dashboard'));
        add_shortcode('stock_auth', array($this, 'render_auth'));

        // AJAX handlers
        add_action('wp_ajax_svp_fetch_stock_data', array($this, 'ajax_fetch_stock_data'));
        add_action('wp_ajax_nopriv_svp_fetch_stock_data', array($this, 'ajax_fetch_stock_data'));
        add_action('wp_ajax_svp_calculate_valuation', array($this, 'ajax_calculate_valuation'));
        add_action('wp_ajax_nopriv_svp_calculate_valuation', array($this, 'ajax_calculate_valuation'));
        add_action('wp_ajax_svp_fetch_technicals', array($this, 'ajax_fetch_technicals'));
        add_action('wp_ajax_nopriv_svp_fetch_technicals', array($this, 'ajax_fetch_technicals'));
        add_action('wp_ajax_svp_fetch_news', array($this, 'ajax_fetch_news'));
        add_action('wp_ajax_nopriv_svp_fetch_news', array($this, 'ajax_fetch_news'));

        // AI Analysis
        add_action('wp_ajax_svp_analyze_news', array($this, 'ajax_analyze_news'));
        add_action('wp_ajax_nopriv_svp_analyze_news', array($this, 'ajax_analyze_news'));
        add_action('wp_ajax_svp_translate_analysis', array($this, 'ajax_translate_analysis'));
        add_action('wp_ajax_nopriv_svp_translate_analysis', array($this, 'ajax_translate_analysis'));
        add_action('wp_ajax_svp_test_gemini', array($this, 'ajax_test_gemini'));

        // Register REST API routes
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    /**
     * Get default options
     */
    private function get_default_options()
    {
        return array(
            'enable_dcf_valuation' => true,
            'enable_relative_valuation' => true,
            'enable_technical_analysis' => true,
            'enable_news_feed' => true,
            'enable_ai_analysis' => true,
            'api_key' => '',
            'gemini_api_key' => '',
            'cache_duration' => 3600,
            'default_wacc' => 10,
            'default_growth' => 8,
            'default_terminal_growth' => 2.5,
            'theme_mode' => 'dark',
            'accent_color' => '#10b981',
        );
    }

    /**
     * Initialize plugin
     */
    public function init()
    {
        load_plugin_textdomain('stock-valuation-pro', false, dirname(SVP_PLUGIN_BASENAME) . '/languages');
    }

    /**
     * Enqueue frontend assets
     */
    public function enqueue_frontend_assets()
    {
        global $post;

        // Check if we are on a singular post/page and it contains one of our shortcodes
        if (!is_a($post, 'WP_Post')) {
            return;
        }

        $shortcodes = array(
            'stock_valuation',
            'stock_technicals',
            'stock_relative',
            'stock_news',
            'stock_dashboard',
            'stock_auth'
        );

        $found = false;
        foreach ($shortcodes as $shortcode) {
            if (has_shortcode($post->post_content, $shortcode)) {
                $found = true;
                break;
            }
        }

        // Allow filtering to enable assets on other pages (e.g. widgets)
        if (!apply_filters('svp_should_load_assets', $found, $post)) {
            return;
        }

        // Enqueue CSS with cache busting
        wp_enqueue_style(
            'stock-valuation-pro-style', // Renamed handle to avoid conflicts
            SVP_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            SVP_VERSION
        );

        // Enqueue Chart.js
        wp_enqueue_script(
            'svp-chart-js',
            'https://cdn.jsdelivr.net/npm/chart.js',
            array(),
            '4.4.1',
            true
        );

        // Enqueue Frontend JS
        wp_enqueue_script(
            'stock-valuation-pro-script', // Renamed handle
            SVP_PLUGIN_URL . 'assets/js/frontend.js',
            array('jquery', 'svp-chart-js'),
            SVP_VERSION,
            true
        );

        // Localize script
        wp_localize_script('stock-valuation-pro-script', 'svpData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('svp/v1/'),
            'nonce' => wp_create_nonce('svp_nonce'),
            'options' => $this->get_public_options(),
            'geminiApiKey' => isset($this->options['gemini_api_key']) ? $this->options['gemini_api_key'] : '',
            'homeUrl' => home_url(),
        ));
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook)
    {
        if (strpos($hook, 'stock-valuation') === false) {
            return;
        }

        wp_enqueue_style(
            'svp-admin-style',
            SVP_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            SVP_VERSION
        );

        wp_enqueue_script(
            'svp-admin-script',
            SVP_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            SVP_VERSION,
            true
        );
    }

    /**
     * Get public-safe options
     */
    private function get_public_options()
    {
        return array(
            'enable_dcf_valuation' => $this->options['enable_dcf_valuation'],
            'enable_relative_valuation' => $this->options['enable_relative_valuation'],
            'enable_technical_analysis' => $this->options['enable_technical_analysis'],
            'enable_news_feed' => $this->options['enable_news_feed'],
            'enable_ai_analysis' => $this->options['enable_ai_analysis'],
            'default_wacc' => $this->options['default_wacc'],
            'default_growth' => $this->options['default_growth'],
            'default_terminal_growth' => $this->options['default_terminal_growth'],
            'theme_mode' => $this->options['theme_mode'],
            'accent_color' => $this->options['accent_color'],
        );
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu()
    {
        add_menu_page(
            __('Stock Valuation Pro', 'stock-valuation-pro'),
            __('Stock Valuation', 'stock-valuation-pro'),
            'manage_options',
            'stock-valuation-pro',
            array($this, 'render_admin_page'),
            'dashicons-chart-line',
            30
        );

        add_submenu_page(
            'stock-valuation-pro',
            __('Settings', 'stock-valuation-pro'),
            __('Settings', 'stock-valuation-pro'),
            'manage_options',
            'stock-valuation-settings',
            array($this, 'render_settings_page')
        );

        add_submenu_page(
            'stock-valuation-pro',
            __('Shortcodes', 'stock-valuation-pro'),
            __('Shortcodes', 'stock-valuation-pro'),
            'manage_options',
            'stock-valuation-shortcodes',
            array($this, 'render_shortcodes_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings()
    {
        register_setting('svp_options_group', 'svp_options', array($this, 'sanitize_options'));

        // Feature Toggles Section
        add_settings_section(
            'svp_features_section',
            __('Feature Toggles', 'stock-valuation-pro'),
            array($this, 'render_features_section'),
            'stock-valuation-settings'
        );

        add_settings_field(
            'enable_dcf_valuation',
            __('DCF Valuation', 'stock-valuation-pro'),
            array($this, 'render_checkbox_field'),
            'stock-valuation-settings',
            'svp_features_section',
            array('field' => 'enable_dcf_valuation', 'description' => 'Enable Discounted Cash Flow valuation module')
        );

        add_settings_field(
            'enable_relative_valuation',
            __('Relative Valuation', 'stock-valuation-pro'),
            array($this, 'render_checkbox_field'),
            'stock-valuation-settings',
            'svp_features_section',
            array('field' => 'enable_relative_valuation', 'description' => 'Enable peer comparison and relative valuation')
        );

        add_settings_field(
            'enable_technical_analysis',
            __('Technical Analysis', 'stock-valuation-pro'),
            array($this, 'render_checkbox_field'),
            'stock-valuation-settings',
            'svp_features_section',
            array('field' => 'enable_technical_analysis', 'description' => 'Enable charts, indicators and technical signals')
        );

        add_settings_field(
            'enable_news_feed',
            __('News Feed', 'stock-valuation-pro'),
            array($this, 'render_checkbox_field'),
            'stock-valuation-settings',
            'svp_features_section',
            array('field' => 'enable_news_feed', 'description' => 'Enable stock news and sentiment analysis')
        );

        add_settings_field(
            'enable_ai_analysis',
            __('AI Analysis', 'stock-valuation-pro'),
            array($this, 'render_checkbox_field'),
            'stock-valuation-settings',
            'svp_features_section',
            array('field' => 'enable_ai_analysis', 'description' => 'Enable AI-powered stock analysis (requires API key)')
        );

        // API Keys Section
        add_settings_section(
            'svp_api_section',
            __('API Configuration', 'stock-valuation-pro'),
            array($this, 'render_api_section'),
            'stock-valuation-settings'
        );

        add_settings_field(
            'api_key',
            __('Financial Data API Key', 'stock-valuation-pro'),
            array($this, 'render_text_field'),
            'stock-valuation-settings',
            'svp_api_section',
            array('field' => 'api_key', 'type' => 'password', 'description' => 'API key for Yahoo Finance or Financial Modeling Prep')
        );

        add_settings_field(
            'gemini_api_key',
            __('Google Gemini API Key', 'stock-valuation-pro'),
            array($this, 'render_gemini_api_key_field'),
            'stock-valuation-settings',
            'svp_api_section',
            array('field' => 'gemini_api_key', 'type' => 'password', 'description' => 'API key for AI-powered analysis')
        );

        // Defaults Section
        add_settings_section(
            'svp_defaults_section',
            __('Default Values', 'stock-valuation-pro'),
            array($this, 'render_defaults_section'),
            'stock-valuation-settings'
        );

        add_settings_field(
            'default_wacc',
            __('Default WACC (%)', 'stock-valuation-pro'),
            array($this, 'render_number_field'),
            'stock-valuation-settings',
            'svp_defaults_section',
            array('field' => 'default_wacc', 'min' => 5, 'max' => 20, 'step' => 0.5)
        );

        add_settings_field(
            'default_growth',
            __('Default Growth Rate (%)', 'stock-valuation-pro'),
            array($this, 'render_number_field'),
            'stock-valuation-settings',
            'svp_defaults_section',
            array('field' => 'default_growth', 'min' => 0, 'max' => 30, 'step' => 0.5)
        );

        add_settings_field(
            'default_terminal_growth',
            __('Default Terminal Growth (%)', 'stock-valuation-pro'),
            array($this, 'render_number_field'),
            'stock-valuation-settings',
            'svp_defaults_section',
            array('field' => 'default_terminal_growth', 'min' => 0, 'max' => 5, 'step' => 0.25)
        );

        // Appearance Section
        add_settings_section(
            'svp_appearance_section',
            __('Appearance', 'stock-valuation-pro'),
            array($this, 'render_appearance_section'),
            'stock-valuation-settings'
        );

        add_settings_field(
            'theme_mode',
            __('Theme Mode', 'stock-valuation-pro'),
            array($this, 'render_select_field'),
            'stock-valuation-settings',
            'svp_appearance_section',
            array('field' => 'theme_mode', 'options' => array('dark' => 'Dark', 'light' => 'Light', 'auto' => 'Auto (System)'))
        );

        add_settings_field(
            'accent_color',
            __('Accent Color', 'stock-valuation-pro'),
            array($this, 'render_color_field'),
            'stock-valuation-settings',
            'svp_appearance_section',
            array('field' => 'accent_color')
        );
    }

    /**
     * Render settings sections
     */
    public function render_features_section()
    {
        echo '<p>' . __('Enable or disable specific features of the plugin.', 'stock-valuation-pro') . '</p>';
    }

    public function render_api_section()
    {
        echo '<p>' . __('Configure API keys for data providers and AI services.', 'stock-valuation-pro') . '</p>';
    }

    public function render_defaults_section()
    {
        echo '<p>' . __('Set default values for valuation calculations.', 'stock-valuation-pro') . '</p>';
    }

    public function render_appearance_section()
    {
        echo '<p>' . __('Customize the look and feel of the valuation widgets.', 'stock-valuation-pro') . '</p>';
    }

    /**
     * Render form fields
     */
    public function render_checkbox_field($args)
    {
        $field = $args['field'];
        $checked = !empty($this->options[$field]) ? 'checked' : '';
        $description = isset($args['description']) ? $args['description'] : '';
        ?>
        <label>
            <input type="checkbox" name="svp_options[<?php echo esc_attr($field); ?>]" value="1" <?php echo $checked; ?>>
            <?php echo esc_html($description); ?>
        </label>
        <?php
    }


    public function render_gemini_api_key_field($args)
    {
        $field = $args['field'];
        $type = isset($args['type']) ? $args['type'] : 'text';
        $value = isset($this->options[$field]) ? $this->options[$field] : '';
        $description = isset($args['description']) ? $args['description'] : '';
        ?>
        <div style="display:flex; align-items:center; gap:10px;">
            <input type="<?php echo esc_attr($type); ?>" name="svp_options[<?php echo esc_attr($field); ?>]"
                id="svp_gemini_api_key" value="<?php echo esc_attr($value); ?>" class="regular-text">
            <button type="button" class="button button-secondary" id="svp_test_gemini">Base Connection Test</button>
        </div>
        <p class="description"><?php echo esc_html($description); ?></p>
        <div id="svp_gemini_test_result" style="margin-top:5px; font-weight:bold;"></div>
        <script>     jQuery(document).ready(function ($) { $('#svp_test_gemini').click(function () { var btn = $(this); var key = $('#svp_gemini_api_key').val(); if (!key) { alert('Please enter an API Key first and Save Settings.'); return; } btn.prop('disabled', true).text('Testing...'); $('#svp_gemini_test_result').html(''); $.post(ajaxurl, { action: 'svp_test_gemini', api_key: key }, function (res) { btn.prop('disabled', false).text('Base Connection Test'); if (res.success) { $('#svp_gemini_test_result').css('color', 'green').html('Build success! Found models: ' + res.data.models.join(', ')); } else { $('#svp_gemini_test_result').css('color', 'red').html('Error: ' + (res.data || 'Unknown error')); } }).fail(function () { btn.prop('disabled', false).text('Base Connection Test'); $('#svp_gemini_test_result').css('color', 'red').text('Request failed.'); }); }); });
        </script>
        <?php
    }

    public function render_text_field($args)
    {
        $field = $args['field'];
        $type = isset($args['type']) ? $args['type'] : 'text';
        $value = isset($this->options[$field]) ? $this->options[$field] : '';
        $description = isset($args['description']) ? $args['description'] : '';
        ?>
        <input type="<?php echo esc_attr($type); ?>" name="svp_options[<?php echo esc_attr($field); ?>]"
            value="<?php echo esc_attr($value); ?>" class="regular-text">
        <?php if ($description): ?>
            <p class="description"><?php echo esc_html($description); ?></p>
        <?php endif;
    }

    public function render_number_field($args)
    {
        $field = $args['field'];
        $value = isset($this->options[$field]) ? $this->options[$field] : 0;
        $min = isset($args['min']) ? $args['min'] : 0;
        $max = isset($args['max']) ? $args['max'] : 100;
        $step = isset($args['step']) ? $args['step'] : 1;
        ?>
        <input type="number" name="svp_options[<?php echo esc_attr($field); ?>]" value="<?php echo esc_attr($value); ?>"
            min="<?php echo esc_attr($min); ?>" max="<?php echo esc_attr($max); ?>" step="<?php echo esc_attr($step); ?>"
            class="small-text">
        <?php
    }

    public function render_select_field($args)
    {
        $field = $args['field'];
        $options = isset($args['options']) ? $args['options'] : array();
        $value = isset($this->options[$field]) ? $this->options[$field] : '';
        ?>
        <select name="svp_options[<?php echo esc_attr($field); ?>]">
            <?php foreach ($options as $key => $label): ?>
                <option value="<?php echo esc_attr($key); ?>" <?php selected($value, $key); ?>>
                    <?php echo esc_html($label); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <?php
    }

    public function render_color_field($args)
    {
        $field = $args['field'];
        $value = isset($this->options[$field]) ? $this->options[$field] : '#10b981';
        ?>
        <input type="color" name="svp_options[<?php echo esc_attr($field); ?>]" value="<?php echo esc_attr($value); ?>">
        <?php
    }

    /**
     * Sanitize options
     */
    public function sanitize_options($input)
    {
        $sanitized = array();

        // Checkboxes
        $checkboxes = array('enable_dcf_valuation', 'enable_relative_valuation', 'enable_technical_analysis', 'enable_news_feed', 'enable_ai_analysis');
        foreach ($checkboxes as $checkbox) {
            $sanitized[$checkbox] = !empty($input[$checkbox]) ? true : false;
        }

        // Text fields
        $sanitized['api_key'] = sanitize_text_field($input['api_key'] ?? '');
        $sanitized['gemini_api_key'] = sanitize_text_field($input['gemini_api_key'] ?? '');

        // Number fields
        $sanitized['default_wacc'] = floatval($input['default_wacc'] ?? 10);
        $sanitized['default_growth'] = floatval($input['default_growth'] ?? 8);
        $sanitized['default_terminal_growth'] = floatval($input['default_terminal_growth'] ?? 2.5);
        $sanitized['cache_duration'] = intval($input['cache_duration'] ?? 3600);

        // Select fields
        $sanitized['theme_mode'] = in_array($input['theme_mode'] ?? '', array('dark', 'light', 'auto')) ? $input['theme_mode'] : 'dark';

        // Color field
        $sanitized['accent_color'] = sanitize_hex_color($input['accent_color'] ?? '#10b981');

        return $sanitized;
    }

    /**
     * Render admin pages
     */
    public function render_admin_page()
    {
        include SVP_PLUGIN_DIR . 'templates/admin/dashboard.php';
    }

    public function render_settings_page()
    {
        include SVP_PLUGIN_DIR . 'templates/admin/settings.php';
    }

    public function render_shortcodes_page()
    {
        include SVP_PLUGIN_DIR . 'templates/admin/shortcodes.php';
    }

    /**
     * Shortcode renderers
     */
    public function render_main_valuation($atts)
    {
        if (!$this->options['enable_dcf_valuation']) {
            return '<div class="svp-disabled">' . __('DCF Valuation is disabled.', 'stock-valuation-pro') . '</div>';
        }

        $atts = shortcode_atts(array(
            'ticker' => '',
            'show_controls' => 'true',
        ), $atts);

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/valuation.php';
        return ob_get_clean();
    }

    public function render_technicals($atts)
    {
        if (!$this->options['enable_technical_analysis']) {
            return '<div class="svp-disabled">' . __('Technical Analysis is disabled.', 'stock-valuation-pro') . '</div>';
        }

        $atts = shortcode_atts(array(
            'ticker' => '',
            'timeframe' => '1Y',
        ), $atts);

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/technicals.php';
        return ob_get_clean();
    }

    public function render_relative_valuation($atts)
    {
        if (!$this->options['enable_relative_valuation']) {
            return '<div class="svp-disabled">' . __('Relative Valuation is disabled.', 'stock-valuation-pro') . '</div>';
        }

        $atts = shortcode_atts(array(
            'ticker' => '',
        ), $atts);

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/relative.php';
        return ob_get_clean();
    }

    public function render_news($atts)
    {
        if (!$this->options['enable_news_feed']) {
            return '<div class="svp-disabled">' . __('News Feed is disabled.', 'stock-valuation-pro') . '</div>';
        }

        $atts = shortcode_atts(array(
            'ticker' => '',
            'count' => 10,
        ), $atts);

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/news.php';
        return ob_get_clean();
    }

    public function render_full_dashboard($atts)
    {
        $atts = shortcode_atts(array(
            'ticker' => '',
        ), $atts);

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/dashboard.php';
        return ob_get_clean();
    }

    public function render_auth($atts)
    {
        if (is_user_logged_in()) {
            $user = wp_get_current_user();
            return '<div class="svp-auth-container"><div class="svp-auth-card" style="text-align: center;">' .
                '<h2>' . __('Welcome, ', 'stock-valuation-pro') . esc_html($user->display_name) . '</h2>' .
                '<p>' . __('You are already logged in.', 'stock-valuation-pro') . '</p>' .
                '<div class="svp-form-actions">' .
                '<a href="' . home_url() . '" class="svp-btn svp-btn-primary">' . __('Go to Dashboard', 'stock-valuation-pro') . '</a>' .
                '<a href="' . wp_logout_url(home_url()) . '" class="svp-btn svp-btn-secondary" style="margin-top: 10px;">' . __('Logout', 'stock-valuation-pro') . '</a>' .
                '</div>' .
                '</div></div>';
        }

        ob_start();
        include SVP_PLUGIN_DIR . 'templates/frontend/login.php';
        return ob_get_clean();
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes()
    {
        // Auth Routes
        register_rest_route('svp/v1', '/auth/login', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_auth_login'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('svp/v1', '/auth/register', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_auth_register'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('svp/v1', '/auth/me', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_auth_me'),
            'permission_callback' => array($this, 'check_api_permission'),
        ));

        // existing routes...
        register_rest_route('svp/v1', '/stock/(?P<ticker>[a-zA-Z0-9\.\-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_stock_data'),
            'permission_callback' => array($this, 'check_api_permission'),
        ));

        register_rest_route('svp/v1', '/valuation', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_calculate_valuation'),
            'permission_callback' => array($this, 'check_api_permission'),
        ));

        register_rest_route('svp/v1', '/technicals/(?P<ticker>[a-zA-Z0-9\.\-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_technicals'),
            'permission_callback' => array($this, 'check_api_permission'),
        ));

        register_rest_route('svp/v1', '/news/(?P<ticker>[a-zA-Z0-9\.\-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_news'),
            'permission_callback' => array($this, 'check_api_permission'),
        ));
    }

    /**
     * REST API: Login
     */
    public function rest_auth_login($request)
    {
        $username = sanitize_text_field($request['username']);
        $password = sanitize_text_field($request['password']);

        $user = wp_signon(array(
            'user_login' => $username,
            'user_password' => $password,
            'remember' => true
        ));

        if (is_wp_error($user)) {
            return new WP_Error('invalid_credentials', 'Invalid username or password', array('status' => 401));
        }

        require_once SVP_PLUGIN_DIR . 'includes/class-jwt-handler.php';
        $jwt = new SVP_JWT_Handler();
        $token = $jwt->generate_token($user->ID);

        return rest_ensure_response(array(
            'token' => $token,
            'user_email' => $user->user_email,
            'display_name' => $user->display_name
        ));
    }

    /**
     * REST API: Register
     */
    public function rest_auth_register($request)
    {
        $username = sanitize_text_field($request['username']);
        $email = sanitize_email($request['email']);
        $password = sanitize_text_field($request['password']);

        if (username_exists($username) || email_exists($email)) {
            return new WP_Error('user_exists', 'Username or Email already exists', array('status' => 400));
        }

        $user_id = wp_create_user($username, $password, $email);

        if (is_wp_error($user_id)) {
            return new WP_Error('registration_failed', $user_id->get_error_message(), array('status' => 500));
        }

        require_once SVP_PLUGIN_DIR . 'includes/class-jwt-handler.php';
        $jwt = new SVP_JWT_Handler();
        $token = $jwt->generate_token($user_id);
        $user = get_user_by('id', $user_id);

        return rest_ensure_response(array(
            'token' => $token,
            'user_email' => $user->user_email,
            'display_name' => $user->display_name
        ));
    }

    /**
     * REST API: Get Current User
     */
    public function rest_auth_me($request)
    {
        // User ID is already validated and set in check_api_permission if we strictly used it,
        // but here we manually re-validate to get the object or rely on permissions.
        // Since we don't pass the ID from permission callback easily, let's re-parse.
        // Actually, check_api_permission returns true/false.
        // So we strictly extract token again.

        $auth_header = $request->get_header('Authorization');
        if (!$auth_header)
            return new WP_Error('no_token', 'No token provided', array('status' => 401));

        list($token) = sscanf($auth_header, 'Bearer %s');

        require_once SVP_PLUGIN_DIR . 'includes/class-jwt-handler.php';
        $jwt = new SVP_JWT_Handler();
        $user_id = $jwt->validate_token($token);

        if (!$user_id) {
            return new WP_Error('invalid_token', 'Invalid Token', array('status' => 401));
        }

        $user = get_user_by('id', $user_id);

        return rest_ensure_response(array(
            'id' => $user->ID,
            'username' => $user->user_login,
            'email' => $user->user_email,
            'display_name' => $user->display_name
        ));
    }

    /**
     * Check API Permission (Enhanced for JWT)
     */
    public function check_api_permission($request)
    {
        // 1. Check Standard WP Cookie Auth
        if (is_user_logged_in()) {
            return true;
        }

        // 2. Check JWT Header
        $auth_header = $request->get_header('Authorization');
        if ($auth_header) {
            list($token) = sscanf($auth_header, 'Bearer %s');
            if ($token) {
                require_once SVP_PLUGIN_DIR . 'includes/class-jwt-handler.php';
                $jwt = new SVP_JWT_Handler();
                $user_id = $jwt->validate_token($token);
                if ($user_id) {
                    // Optional: Set current user context for this request
                    wp_set_current_user($user_id);
                    return true;
                }
            }
        }

        return false;
    }



    public function rest_calculate_valuation($request)
    {
        $params = $request->get_json_params();

        require_once SVP_PLUGIN_DIR . 'includes/class-valuation-engine.php';
        $engine = new SVP_Valuation_Engine();

        $result = $engine->calculate_comprehensive_valuation($params);

        return rest_ensure_response($result);
    }

    public function rest_get_technicals($request)
    {
        $ticker = strtoupper($request['ticker']);
        $timeframe = $request->get_param('timeframe') ?? '1Y';

        $data = $this->fetch_technicals_data($ticker, $timeframe);

        if (is_wp_error($data)) {
            return $data;
        }

        return rest_ensure_response($data);
    }

    public function rest_get_news($request)
    {
        $ticker = strtoupper($request['ticker']);
        $count = intval($request->get_param('count') ?? 10);

        $data = $this->fetch_news_data($ticker, $count);

        if (is_wp_error($data)) {
            return $data;
        }

        return rest_ensure_response($data);
    }

    /**
     * AJAX handlers
     */
    public function ajax_fetch_stock_data()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $ticker = sanitize_text_field($_POST['ticker'] ?? '');

        if (empty($ticker)) {
            wp_send_json_error(array('message' => 'Ticker is required'));
        }

        $data = $this->fetch_stock_data($ticker);

        if (is_wp_error($data)) {
            wp_send_json_error(array('message' => $data->get_error_message()));
        }

        wp_send_json_success($data);
    }

    public function ajax_calculate_valuation()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $params = array(
            'freeCashFlow' => floatval($_POST['freeCashFlow'] ?? 0),
            'sharesOutstanding' => floatval($_POST['sharesOutstanding'] ?? 0),
            'currentPrice' => floatval($_POST['currentPrice'] ?? 0),
            'beta' => floatval($_POST['beta'] ?? 1),
            'growthRate' => floatval($_POST['growthRate'] ?? $this->options['default_growth']),
            'wacc' => floatval($_POST['wacc'] ?? $this->options['default_wacc']),
            'terminalGrowth' => floatval($_POST['terminalGrowth'] ?? $this->options['default_terminal_growth']),
            'eps' => floatval($_POST['eps'] ?? 0),
            'bookValue' => floatval($_POST['bookValue'] ?? 0),
            'bookValuePerShare' => floatval($_POST['bookValue'] ?? 0),
            'dividend' => floatval($_POST['dividend'] ?? 0),
            'dividendPerShare' => floatval($_POST['dividend'] ?? 0),
            'dividendGrowthRate' => 5,
            'dividendYield' => 0,
            'netIncome' => floatval($_POST['freeCashFlow'] ?? 0) * 1.2, // Approximate
        );

        require_once SVP_PLUGIN_DIR . 'includes/class-valuation-engine.php';
        $engine = new SVP_Valuation_Engine();

        // Calculate comprehensive valuation with all methods
        $comprehensive = $engine->calculate_comprehensive_valuation($params);

        // Also get DCF result for direct details
        $dcf = $engine->calculate_dcf($params);

        // Build response in expected format
        $methods = array();
        $dcfFairValue = 0;
        $grahamNumber = 0;
        $lynchFairValue = 0;
        $epvFairValue = 0;
        $ddmFairValue = null;
        $impliedGrowth = 0;

        foreach ($comprehensive['methods'] as $method) {
            $methodName = $method['method'] ?? '';
            $fairValue = floatval($method['fairValue'] ?? 0);

            // Track specific values
            if (strpos($methodName, 'DCF') !== false && $methodName !== 'Reverse DCF') {
                $dcfFairValue = $fairValue;
            }
            if ($methodName === 'Graham Number') {
                $grahamNumber = $fairValue;
            }
            if (strpos($methodName, 'Lynch') !== false) {
                $lynchFairValue = $fairValue;
            }
            if ($methodName === 'Earnings Power Value' || $methodName === 'EPV') {
                $epvFairValue = $fairValue;
            }
            if ($methodName === 'Dividend Discount Model') {
                $ddmFairValue = $fairValue;
            }
            if ($methodName === 'Reverse DCF' && isset($method['impliedGrowth'])) {
                $impliedGrowth = $method['impliedGrowth'];
            }

            // Add confidence based on method
            $confidence = 'medium';
            if ($methodName === 'DCF')
                $confidence = 'high';
            if ($methodName === 'Graham Number')
                $confidence = 'high';
            if ($methodName === 'Reverse DCF')
                $confidence = 'low';

            $methods[] = array(
                'method' => $methodName,
                'fairValue' => $fairValue,
                'upside' => floatval($method['upside'] ?? 0),
                'confidence' => $confidence,
                'details' => $method['note'] ?? '',
            );
        }

        $result = array(
            'dcfFairValue' => $dcfFairValue ?: ($dcf['fairValue'] ?? 0),
            'grahamNumber' => $grahamNumber,
            'lynchFairValue' => $lynchFairValue,
            'epvFairValue' => $epvFairValue,
            'ddmFairValue' => $ddmFairValue,
            'averageFairValue' => $comprehensive['synthesis']['averageFairValue'] ?? 0,
            'medianFairValue' => $comprehensive['synthesis']['medianFairValue'] ?? 0,
            'conservativeFairValue' => $comprehensive['synthesis']['conservativeFairValue'] ?? 0,
            'impliedGrowth' => $impliedGrowth,
            'upside' => $comprehensive['synthesis']['upside'] ?? 0,
            'verdict' => $comprehensive['synthesis']['verdict'] ?? 'HOLD',
            'methods' => $methods,
            'dcfDetails' => $dcf,
        );

        wp_send_json_success($result);
    }

    public function ajax_fetch_technicals()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $ticker = sanitize_text_field($_POST['ticker'] ?? '');
        $timeframe = sanitize_text_field($_POST['timeframe'] ?? '1Y');

        if (empty($ticker)) {
            wp_send_json_error(array('message' => 'Ticker is required'));
        }

        $data = $this->fetch_technicals_data($ticker, $timeframe);

        if (is_wp_error($data)) {
            wp_send_json_error(array('message' => $data->get_error_message()));
        }

        wp_send_json_success($data);
    }

    public function ajax_fetch_news()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $ticker = sanitize_text_field($_POST['ticker'] ?? '');
        $count = intval($_POST['count'] ?? 10);

        if (empty($ticker)) {
            wp_send_json_error(array('message' => 'Ticker is required'));
        }

        $data = $this->fetch_news_data($ticker, $count);

        if (is_wp_error($data)) {
            wp_send_json_error(array('message' => $data->get_error_message()));
        }

        wp_send_json_success($data);
    }

    public function ajax_analyze_news()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $news = isset($_POST['news']) ? $_POST['news'] : array();
        $ticker = isset($_POST['ticker']) ? sanitize_text_field($_POST['ticker']) : 'UNKNOWN';
        $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;

        if (empty($news)) {
            wp_send_json_error('No news provided');
        }

        $apiKey = isset($this->options['gemini_api_key']) ? $this->options['gemini_api_key'] : '';

        if (empty($apiKey)) {
            wp_send_json_success($this->generate_simulated_analysis($news, $ticker, 'API Key not configured'));
            return;
        }

        // Format news content
        $newsContent = '';
        foreach ($news as $index => $article) {
            $title = isset($article['title']) ? $article['title'] : '';
            $publisher = isset($article['publisher']) ? $article['publisher'] : '';
            $date = isset($article['publishTime']) ? date('Y-m-d', intval($article['publishTime']) / 1000) : '';
            if (isset($article['publishTime']) && strlen((string) $article['publishTime']) > 11) {
                $date = date('Y-m-d', intval($article['publishTime']) / 1000);
            }
            $newsContent .= "[" . ($index + 1) . "] " . $title . "\n   Source: " . $publisher . " | Date: " . $date . "\n\n";
        }

        $prompt = $this->get_analysis_prompt($ticker, $price, $newsContent);

        try {
            $analysis = $this->call_gemini_api($prompt, $apiKey);
            $analysis['analyzedAt'] = current_time('mysql');
            if (empty($analysis['model'])) {
                $analysis['model'] = 'Gemini (Unknown)';
            }
            wp_send_json_success($analysis);
        } catch (Exception $e) {
            wp_send_json_success($this->generate_simulated_analysis($news, $ticker, $e->getMessage()));
        }
    }

    /**
     * AJAX: Translate AI Analysis to Arabic
     * Uses the same approach as the main web app - passes full JSON for translation
     */
    public function ajax_translate_analysis()
    {
        check_ajax_referer('svp_nonce', 'nonce');

        $analysis = isset($_POST['analysis']) ? $_POST['analysis'] : array();

        if (empty($analysis)) {
            wp_send_json_error('No analysis data provided');
        }

        $apiKey = isset($this->options['gemini_api_key']) ? $this->options['gemini_api_key'] : '';

        if (empty($apiKey)) {
            wp_send_json_error('API Key not configured');
        }

        // Build translation prompt same as main web app
        $analysisJson = json_encode($analysis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $prompt = "You are a professional financial translator. Translate the following stock analysis JSON content into professional Arabic.
    
IMPORTANT RULES:
1. Translate 'summary', 'keyInsights', 'risks', 'catalysts', 'fairPriceImpact.reasoning', and 'tradingSignal.strategy' into Arabic.
2. DO NOT translate 'sentiment' (keep as BULLISH/BEARISH/NEUTRAL).
3. DO NOT translate 'fairPriceImpact.direction' (keep as UP/DOWN/NEUTRAL).
4. DO NOT translate 'fairPriceImpact.confidence'.
5. Keep numbers and percentages as is.
6. Return ONLY the JSON object.

Input JSON:
{$analysisJson}";

        try {
            // Use the same API call that works for analysis
            $translatedData = $this->call_gemini_api($prompt, $apiKey);

            // Merge translated fields with original data
            $result = $analysis;
            $result['isArabic'] = true;
            $result['model'] = (isset($analysis['model']) ? $analysis['model'] : 'Gemini') . ' (العربية)';

            // Apply translated fields
            if (isset($translatedData['summary'])) {
                $result['summary'] = $translatedData['summary'];
            }
            if (isset($translatedData['keyInsights'])) {
                $result['keyInsights'] = $translatedData['keyInsights'];
            }
            if (isset($translatedData['risks'])) {
                $result['risks'] = $translatedData['risks'];
            }
            if (isset($translatedData['catalysts'])) {
                $result['catalysts'] = $translatedData['catalysts'];
            }
            if (isset($translatedData['fairPriceImpact']['reasoning'])) {
                if (!isset($result['fairPriceImpact']))
                    $result['fairPriceImpact'] = array();
                $result['fairPriceImpact']['reasoning'] = $translatedData['fairPriceImpact']['reasoning'];
            }
            if (isset($translatedData['tradingSignal']['strategy'])) {
                if (!isset($result['tradingSignal']))
                    $result['tradingSignal'] = array();
                $result['tradingSignal']['strategy'] = $translatedData['tradingSignal']['strategy'];
            }

            wp_send_json_success($result);
        } catch (Exception $e) {
            wp_send_json_error('Translation failed: ' . $e->getMessage());
        }
    }

    private function get_analysis_prompt($ticker, $currentPrice, $newsContent)
    {
        return "You are a senior equity research analyst. Analyze the provided news articles for {$ticker}.

CURRENT DATA:
Price: $" . ($currentPrice > 0 ? number_format($currentPrice, 2) : 'Unknown') . "

INSTRUCTIONS:
1. Analyze news impact on fair value.
2. Estimate Fair Value Range & Technical Levels.
3. Provide sentiment, insights, risks, catalysts.
4. **CRITICAL:** Provide \"summary\", \"keyInsights\", \"risks\", \"catalysts\", \"fairPriceImpact.reasoning\", and \"tradingSignal.strategy\" in BOTH **English** and **Arabic**.

FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown):
{
  \"sentiment\": \"BULLISH\" | \"BEARISH\" | \"NEUTRAL\",
  \"sentimentScore\": <number -100 to 100>,
  \"fairPriceImpact\": {
    \"direction\": \"UP\" | \"DOWN\" | \"NEUTRAL\",
    \"percentageEstimate\": <number>,
    \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\",
    \"reasoning\": \"English reasoning...\",
    \"reasoning_ar\": \"Arabic reasoning...\"
  },
  \"tradingSignal\": {
    \"fairValueRange\": { \"min\": <num>, \"max\": <num> },
    \"supportLevel\": { \"min\": <num>, \"max\": <num> },
    \"resistanceLevel\": { \"min\": <num>, \"max\": <num> },
    \"strategy\": \"English strategy...\",
    \"strategy_ar\": \"Arabic strategy...\"
  },
  \"keyInsights\": [\"English insight 1...\"],
  \"keyInsights_ar\": [\"Arabic insight 1...\"],
  \"risks\": [\"English risk 1...\"],
  \"risks_ar\": [\"Arabic risk 1...\"],
  \"catalysts\": [\"English catalyst 1...\"],
  \"catalysts_ar\": [\"Arabic catalyst 1...\"],
  \"summary\": \"English summary...\",
  \"summary_ar\": \"Arabic summary...\"
}

NEWS:
{$newsContent}";
    }

    public function ajax_test_gemini()
    {
        if (!current_user_can('manage_options'))
            wp_send_json_error('Permission denied');
        $apiKey = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : '';
        if (!$apiKey)
            wp_send_json_error('Missing API Key');

        $models = $this->discover_gemini_models($apiKey);

        if (empty($models)) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}";
            $response = wp_remote_get($url);
            if (is_wp_error($response))
                wp_send_json_error($response->get_error_message());
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            wp_send_json_error("API returned code $code. Body: " . substr($body, 0, 200));
        }
        wp_send_json_success(array('models' => $models));
    }

    private function discover_gemini_models($apiKey)
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}";
        $response = wp_remote_get($url);

        $validModels = [];

        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (isset($data['models']) && is_array($data['models'])) {
                foreach ($data['models'] as $model) {
                    if (
                        isset($model['supportedGenerationMethods']) &&
                        in_array('generateContent', $model['supportedGenerationMethods'])
                    ) {
                        $name = str_replace('models/', '', $model['name']);
                        $validModels[] = $name;
                    }
                }
            }
        }

        if (empty($validModels)) {
            return [];
        }

        // Sort discovered models by preference
        usort($validModels, function ($a, $b) {
            $score = function ($name) {
                if (strpos($name, 'gemini-3-flash') !== false)
                    return 30;
                if (strpos($name, 'gemini-2.5-flash') !== false)
                    return 25;
                if (strpos($name, 'gemini-2.0-flash') !== false)
                    return 20;
                if (strpos($name, 'gemini-1.5-flash') !== false)
                    return 10;
                if (strpos($name, 'gemini-1.5-pro') !== false)
                    return 5;
                return 0;
            };
            return $score($b) - $score($a);
        });

        // FORCE ADD Gemini 3 Flash (User Request)
        // We prepend these to ensure they are the very first attempt.
        $priorityModels = ['gemini-3-flash', 'gemini-2.0-flash-exp'];
        foreach (array_reverse($priorityModels) as $pModel) {
            array_unshift($validModels, $pModel);
        }

        return array_values(array_unique($validModels));
    }

    private function call_gemini_api($prompt, $apiKey)
    {
        // 1. Try Dynamic Discovery first
        $models = $this->discover_gemini_models($apiKey);

        // 2. Fallback if discovery failed (e.g. permission error listing models)
        if (empty($models)) {
            $models = [
                'gemini-3-flash', // Priority 1 (Released Dec 17, 2025)
                'gemini-2.0-flash-exp', // Priority 2
                'gemini-1.5-flash',
                'gemini-1.5-flash-002',
                'gemini-1.5-pro'
            ];
        }

        $errors = [];
        $firstModel = !empty($models) ? $models[0] : '';
        $firstError = '';

        foreach ($models as $model) {
            try {
                // Use v1alpha for Gemini 3 models as they are newly released
                $apiVersion = (strpos($model, 'gemini-3-flash') !== false) ? 'v1alpha' : 'v1beta';
                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

                $body = json_encode(array(
                    'contents' => array(
                        array('parts' => array(array('text' => $prompt)))
                    ),
                    'generationConfig' => array(
                        'temperature' => 0.3,
                        'maxOutputTokens' => 4000
                    )
                ));

                $response = wp_remote_post($url, array(
                    'body' => $body,
                    'headers' => array('Content-Type' => 'application/json'),
                    'timeout' => 45
                ));

                if (is_wp_error($response)) {
                    throw new Exception($response->get_error_message());
                }

                $code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                if ($code !== 200) {
                    $msg = isset($data['error']['message']) ? $data['error']['message'] : 'Unknown API Error';
                    // Check for rate limit
                    if (strpos(strtolower($msg), 'quota') !== false || $code === 429) {
                        throw new Exception("Rate Limited: $msg");
                    }
                    throw new Exception("Model $model failed: $msg");
                }

                $text = isset($data['candidates'][0]['content']['parts'][0]['text']) ? $data['candidates'][0]['content']['parts'][0]['text'] : '';

                $text = trim($text);
                // Clean markdown code blocks
                if (strpos($text, '```json') !== false) {
                    $text = str_replace('```json', '', $text);
                    $text = str_replace('```', '', $text);
                } else if (strpos($text, '```') !== false) {
                    $text = str_replace('```', '', $text);
                }

                if (substr($text, 0, 1) !== '{') {
                    preg_match('/\{[\s\S]*\}/', $text, $matches);
                    if (!empty($matches)) {
                        $text = $matches[0];
                    }
                }

                $json = json_decode($text, true);
                if (!$json) {
                    throw new Exception("Failed to parse JSON for $model");
                }

                // Add model name for UI to display (clean, no error messages)
                $json['model'] = $model;
                return $json;

            } catch (Exception $e) {
                $errors[] = $e->getMessage();
                if ($model === $firstModel) {
                    $firstError = $e->getMessage();
                }
                continue; // Try next model
            }
        }

        // If we get here, all models failed.
        // Return detailed error info for debugging.
        // Prioritize showing Rate Limit errors if any occurred, as that's actionable (Wait).
        $rateLimitError = null;
        foreach ($errors as $err) {
            if (strpos($err, 'Rate Limited') !== false) {
                $rateLimitError = $err;
                break;
            }
        }

        if ($rateLimitError) {
            throw new Exception("Quotas Exceeded. Please wait 1 minute and try again. (" . $rateLimitError . ")");
        }

        $errorMsg = "All " . count($models) . " models failed.";
        // Append discovered list for debugging context
        $errorMsg .= " (Tried: " . implode(', ', $models) . ")";
        $errorMsg .= " Details: " . implode(" | ", array_unique($errors));

        throw new Exception($errorMsg);
    }

    private function generate_simulated_analysis($news, $ticker, $reason)
    {
        $score = 0;
        $insights = array();
        $bullish = ['up', 'rise', 'growth', 'profit', 'beat', 'record', 'buy', 'strong'];
        $bearish = ['down', 'drop', 'loss', 'miss', 'sell', 'weak', 'decline', 'crash'];

        foreach ($news as $article) {
            $title = strtolower(isset($article['title']) ? $article['title'] : '');
            foreach ($bullish as $k) {
                if (strpos($title, $k) !== false) {
                    $score += 10;
                    if (count($insights) < 3)
                        $insights[] = "Positive signal: \"{$article['title']}\"";
                    break;
                }
            }
            foreach ($bearish as $k) {
                if (strpos($title, $k) !== false) {
                    $score -= 10;
                    if (count($insights) < 3)
                        $insights[] = "Negative signal: \"{$article['title']}\"";
                    break;
                }
            }
        }

        $score = max(-100, min(100, $score));
        $sentiment = $score >= 20 ? 'BULLISH' : ($score <= -20 ? 'BEARISH' : 'NEUTRAL');

        return array(
            'summary' => "Analysis generated locally (Fallback Mode).\n\nReason: $reason.\n\nBased on keyword scanning of " . count($news) . " headlines.",
            'sentiment' => $sentiment,
            'sentimentScore' => $score,
            'fairPriceImpact' => array(
                'direction' => $score >= 0 ? 'UP' : 'DOWN',
                'percentageEstimate' => abs($score / 10),
                'confidence' => 'LOW',
                'reasoning' => 'Fallback mode keyword matching.'
            ),
            'keyInsights' => empty($insights) ? ['No specific keywords found.'] : $insights,
            'risks' => ['Analysis limited to headlines due to API issues.'],
            'catalysts' => ['Reconnect API for deeper analysis.'],
            'analyzedAt' => current_time('mysql'),
            'model' => 'PHP Simulation (Fallback)',
            'isSimulated' => true
        );
    }

    /**
     * Data fetching methods
     */
    private function fetch_stock_data($ticker)
    {
        $cache_key = 'svp_stock_' . md5($ticker);
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        require_once SVP_PLUGIN_DIR . 'includes/class-stock-api.php';
        $api = new SVP_Stock_API($this->options['api_key']);

        $data = $api->get_stock_data($ticker);

        if (!is_wp_error($data)) {
            set_transient($cache_key, $data, $this->options['cache_duration']);
        }

        return $data;
    }

    private function fetch_technicals_data($ticker, $timeframe)
    {
        $cache_key = 'svp_technicals_' . md5($ticker . $timeframe);
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        require_once SVP_PLUGIN_DIR . 'includes/class-stock-api.php';
        $api = new SVP_Stock_API($this->options['api_key']);

        $data = $api->get_technicals($ticker, $timeframe);

        if (!is_wp_error($data)) {
            set_transient($cache_key, $data, $this->options['cache_duration']);
        }

        return $data;
    }

    private function fetch_news_data($ticker, $count)
    {
        $cache_key = 'svp_news_' . md5($ticker . $count);
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        require_once SVP_PLUGIN_DIR . 'includes/class-stock-api.php';
        $api = new SVP_Stock_API($this->options['api_key']);

        $data = $api->get_news($ticker, $count);

        if (!is_wp_error($data)) {
            set_transient($cache_key, $data, 1800); // 30 min cache for news
        }

        return $data;
    }
}

// Initialize plugin
StockValuationPro::get_instance();

// Activation hook
register_activation_hook(__FILE__, function () {
    // Set default options
    if (!get_option('svp_options')) {
        add_option('svp_options', array(
            'enable_dcf_valuation' => true,
            'enable_relative_valuation' => true,
            'enable_technical_analysis' => true,
            'enable_news_feed' => true,
            'enable_ai_analysis' => true,
            'api_key' => '',
            'gemini_api_key' => '',
            'cache_duration' => 3600,
            'default_wacc' => 10,
            'default_growth' => 8,
            'default_terminal_growth' => 2.5,
            'theme_mode' => 'dark',
            'accent_color' => '#10b981',
        ));
    }

    // Flush rewrite rules
    flush_rewrite_rules();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});
