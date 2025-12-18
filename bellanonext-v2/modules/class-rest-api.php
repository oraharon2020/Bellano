<?php
/**
 * Bellano REST API Module
 * Registers all REST API routes
 */

if (!defined('ABSPATH')) exit;

class Bellano_REST_API {
    
    private $plugin;
    
    public function __construct($plugin) {
        $this->plugin = $plugin;
    }
    
    public function register_routes() {
        // Homepage banners
        register_rest_route('bellano/v1', '/homepage', [
            'methods' => 'GET',
            'callback' => [$this, 'get_homepage_data'],
            'permission_callback' => '__return_true'
        ]);
        
        // Product FAQ
        register_rest_route('bellano/v1', '/product-faq/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_product_faq'],
            'permission_callback' => '__return_true'
        ]);
        
        // FAQ Templates
        register_rest_route('bellano/v1', '/faq-templates', [
            'methods' => 'GET',
            'callback' => [$this, 'get_faq_templates'],
            'permission_callback' => '__return_true'
        ]);
        
        // Product Video
        register_rest_route('bellano/v1', '/product-video/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_product_video'],
            'permission_callback' => '__return_true'
        ]);
        
        // Cart - Create checkout with items
        register_rest_route('bellano/v1', '/create-checkout', [
            'methods' => 'POST',
            'callback' => [$this->plugin->checkout, 'create_checkout'],
            'permission_callback' => '__return_true'
        ]);
        
        // Cart - Get checkout URL for items
        register_rest_route('bellano/v1', '/checkout-url', [
            'methods' => 'POST',
            'callback' => [$this->plugin->checkout, 'get_checkout_url'],
            'permission_callback' => '__return_true'
        ]);
        
        // Meshulam webhook
        register_rest_route('bellano/v1', '/meshulam-webhook', [
            'methods' => 'POST',
            'callback' => [$this->plugin->checkout, 'handle_meshulam_webhook'],
            'permission_callback' => '__return_true'
        ]);
        
        // Meshulam config
        register_rest_route('bellano/v1', '/meshulam-config', [
            'methods' => 'GET',
            'callback' => [$this->plugin->checkout, 'get_meshulam_config'],
            'permission_callback' => '__return_true'
        ]);
        
        // Check admin
        register_rest_route('bellano/v1', '/check-admin', [
            'methods' => 'GET',
            'callback' => [$this->plugin->auth, 'check_user_is_admin'],
            'permission_callback' => '__return_true'
        ]);
        
        // Admin upgrades
        register_rest_route('bellano/v1', '/admin-upgrades', [
            'methods' => 'GET',
            'callback' => [$this, 'get_admin_upgrades'],
            'permission_callback' => function() {
                return current_user_can('administrator');
            }
        ]);
        
        // Admin login
        register_rest_route('bellano/v1', '/admin-login', [
            'methods' => 'POST',
            'callback' => [$this->plugin->auth, 'admin_login'],
            'permission_callback' => '__return_true'
        ]);
        
        // Verify admin token
        register_rest_route('bellano/v1', '/verify-admin-token', [
            'methods' => 'POST',
            'callback' => [$this->plugin->auth, 'verify_admin_token'],
            'permission_callback' => '__return_true'
        ]);
        
        // Admin logout
        register_rest_route('bellano/v1', '/admin-logout', [
            'methods' => 'POST',
            'callback' => [$this->plugin->auth, 'admin_logout'],
            'permission_callback' => '__return_true'
        ]);
        
        // Upload file (admin only)
        register_rest_route('bellano/v1', '/upload-file', [
            'methods' => 'POST',
            'callback' => [$this, 'upload_file'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    public function get_homepage_data() {
        return $this->plugin->banners->get_homepage_data();
    }
    
    public function get_product_faq($request) {
        $product_id = $request['id'];
        return $this->plugin->faq->get_product_faq($product_id);
    }
    
    public function get_faq_templates() {
        return $this->plugin->faq->get_templates();
    }
    
    public function get_product_video($request) {
        $product_id = $request['id'];
        $video_data = $this->plugin->product_video->get_product_video($product_id);
        
        if (!$video_data) {
            return new WP_REST_Response(['hasVideo' => false], 200);
        }
        
        return new WP_REST_Response([
            'hasVideo' => true,
            'video' => $video_data
        ], 200);
    }
    
    public function get_admin_upgrades() {
        return new WP_REST_Response([
            'upgrades' => $this->plugin->upgrades->get_upgrades()
        ], 200);
    }
    
    /**
     * Upload file to WordPress media library
     */
    public function upload_file($request) {
        $params = $request->get_json_params();
        
        $token = isset($params['token']) ? sanitize_text_field($params['token']) : '';
        $filename = isset($params['filename']) ? sanitize_file_name($params['filename']) : '';
        $file_type = isset($params['fileType']) ? sanitize_text_field($params['fileType']) : 'application/octet-stream';
        $file_data = isset($params['fileData']) ? $params['fileData'] : '';
        
        // Verify admin token
        if (empty($token)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'נדרש טוקן הזדהות'
            ], 401);
        }
        
        $user_id = $this->plugin->auth->verify_token($token);
        if (!$user_id || !user_can($user_id, 'administrator')) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'אין הרשאה להעלאת קבצים'
            ], 403);
        }
        
        if (empty($filename) || empty($file_data)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'חסרים נתונים להעלאה'
            ], 400);
        }
        
        // Decode base64 file data
        $decoded_data = base64_decode($file_data);
        if ($decoded_data === false) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'שגיאה בפענוח הקובץ'
            ], 400);
        }
        
        // Get WordPress upload directory
        $upload_dir = wp_upload_dir();
        
        // Create admin-uploads subfolder
        $target_dir = $upload_dir['basedir'] . '/admin-uploads/' . date('Y/m');
        if (!file_exists($target_dir)) {
            wp_mkdir_p($target_dir);
        }
        
        // Ensure unique filename
        $target_path = $target_dir . '/' . $filename;
        $counter = 1;
        $path_info = pathinfo($filename);
        while (file_exists($target_path)) {
            $new_filename = $path_info['filename'] . '-' . $counter . '.' . ($path_info['extension'] ?? '');
            $target_path = $target_dir . '/' . $new_filename;
            $counter++;
        }
        
        // Save file
        $result = file_put_contents($target_path, $decoded_data);
        if ($result === false) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'שגיאה בשמירת הקובץ'
            ], 500);
        }
        
        // Get URL
        $file_url = str_replace($upload_dir['basedir'], $upload_dir['baseurl'], $target_path);
        
        return new WP_REST_Response([
            'success' => true,
            'url' => $file_url,
            'filename' => basename($target_path)
        ], 200);
    }
}
