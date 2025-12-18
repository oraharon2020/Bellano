<?php
/**
 * Plugin Name: Bellano Settings
 * Description: הגדרות מרכזיות לאתר בלאנו - באנרים, קאש, שאלות נפוצות, סרטונים ועוד
 * Version: 2.0.0
 * Author: Bellano
 * Text Domain: bellano-settings
 */

if (!defined('ABSPATH')) exit;

// Define plugin constants
define('BELLANO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BELLANO_PLUGIN_URL', plugin_dir_url(__FILE__));

// Load modules
require_once BELLANO_PLUGIN_DIR . 'modules/class-admin-pages.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-banners.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-faq.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-cache.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-upgrades.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-auth.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-product-video.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-rest-api.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-checkout.php';
require_once BELLANO_PLUGIN_DIR . 'modules/class-featured-categories.php';

/**
 * Main plugin class
 */
class Bellano_Settings {
    
    private static $instance = null;
    
    // Module instances
    public $admin_pages;
    public $banners;
    public $faq;
    public $cache;
    public $upgrades;
    public $auth;
    public $product_video;
    public $rest_api;
    public $checkout;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Initialize modules
        $this->admin_pages = new Bellano_Admin_Pages();
        $this->banners = new Bellano_Banners();
        $this->faq = new Bellano_FAQ();
        $this->cache = new Bellano_Cache();
        $this->upgrades = new Bellano_Upgrades();
        $this->auth = new Bellano_Auth();
        $this->product_video = new Bellano_Product_Video();
        $this->rest_api = new Bellano_REST_API($this);
        $this->checkout = new Bellano_Checkout();
        
        // Register hooks
        add_action('admin_menu', [$this->admin_pages, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'admin_scripts']);
        add_action('rest_api_init', [$this->rest_api, 'register_routes']);
        
        // Product metaboxes
        add_action('add_meta_boxes', [$this->faq, 'add_product_metabox']);
        add_action('add_meta_boxes', [$this->product_video, 'add_product_metabox']);
        add_action('save_post_product', [$this->faq, 'save_product_faq']);
        add_action('save_post_product', [$this->product_video, 'save_product_video']);
        
        // Auto-clear cache hooks
        add_action('update_option_bellano_banners', [$this->cache, 'clear_homepage_cache']);
        add_action('woocommerce_update_product', [$this->cache, 'clear_product_cache']);
        add_action('edited_product_cat', [$this->cache, 'clear_category_cache']);
    }
    
    public function register_settings() {
        // Banners
        register_setting('bellano_settings', 'bellano_banners');
        // Cache
        register_setting('bellano_settings', 'bellano_vercel_revalidate_url');
        register_setting('bellano_settings', 'bellano_vercel_revalidate_token');
        // FAQ
        register_setting('bellano_settings', 'bellano_faq_templates');
        register_setting('bellano_settings', 'bellano_faq_default_template');
    }
    
    public function admin_scripts($hook) {
        if (strpos($hook, 'bellano') === false && $hook !== 'post.php' && $hook !== 'post-new.php') {
            return;
        }
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
    }
}

// Handle multi-item cart URL
add_action('template_redirect', function() {
    if (isset($_GET['bellano_cart'])) {
        $cart_data = json_decode(base64_decode($_GET['bellano_cart']), true);
        
        if (!empty($cart_data) && is_array($cart_data) && function_exists('WC') && WC()->cart) {
            WC()->cart->empty_cart();
            
            foreach ($cart_data as $item) {
                $product_id = intval($item['id']);
                $quantity = isset($item['qty']) ? intval($item['qty']) : 1;
                
                $product = wc_get_product($product_id);
                if ($product) {
                    if ($product->is_type('variation')) {
                        WC()->cart->add_to_cart($product->get_parent_id(), $quantity, $product_id);
                    } else {
                        WC()->cart->add_to_cart($product_id, $quantity);
                    }
                }
            }
            
            wp_redirect(wc_get_checkout_url());
            exit;
        }
    }
});

// Initialize
Bellano_Settings::get_instance();
