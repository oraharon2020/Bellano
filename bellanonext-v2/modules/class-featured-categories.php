<?php
/**
 * Featured Categories Module
 * Allows selecting which categories appear on homepage
 */

if (!defined('ABSPATH')) {
    exit;
}

class BellanoNext_Featured_Categories {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Register REST API endpoint
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Add AJAX handlers
        add_action('wp_ajax_bellano_save_featured_categories', array($this, 'ajax_save_categories'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('bellano/v1', '/featured-categories', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_featured_categories'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Get featured categories for REST API
     */
    public function get_featured_categories() {
        $featured_ids = get_option('bellano_featured_categories', array());
        
        if (empty($featured_ids)) {
            return new WP_REST_Response(array('categories' => array()), 200);
        }
        
        $categories = array();
        
        foreach ($featured_ids as $cat_id) {
            $term = get_term($cat_id, 'product_cat');
            
            if (!$term || is_wp_error($term)) {
                continue;
            }
            
            $thumbnail_id = get_term_meta($cat_id, 'thumbnail_id', true);
            $image_url = '';
            
            if ($thumbnail_id) {
                $image_url = wp_get_attachment_image_url($thumbnail_id, 'large');
            }
            
            $categories[] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
                'description' => $term->description,
                'count' => $term->count,
                'image' => array(
                    'sourceUrl' => $image_url,
                ),
            );
        }
        
        return new WP_REST_Response(array('categories' => $categories), 200);
    }
    
    /**
     * AJAX handler to save featured categories
     */
    public function ajax_save_categories() {
        check_ajax_referer('bellano_featured_categories', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('אין לך הרשאות לביצוע פעולה זו');
        }
        
        $categories = isset($_POST['categories']) ? array_map('intval', $_POST['categories']) : array();
        
        update_option('bellano_featured_categories', $categories);
        
        // Trigger revalidation of homepage
        $this->trigger_revalidation();
        
        wp_send_json_success('הקטגוריות נשמרו בהצלחה');
    }
    
    /**
     * Trigger Next.js revalidation
     */
    private function trigger_revalidation() {
        $nextjs_url = get_option('bellanonext_url', '');
        $revalidate_secret = get_option('bellanonext_revalidate_secret', '');
        
        if (empty($nextjs_url) || empty($revalidate_secret)) {
            return;
        }
        
        $url = trailingslashit($nextjs_url) . 'api/revalidate?secret=' . $revalidate_secret . '&path=/';
        
        wp_remote_get($url, array(
            'timeout' => 5,
            'blocking' => false,
        ));
    }
}

// Initialize
BellanoNext_Featured_Categories::get_instance();
