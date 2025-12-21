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
        
        // Meshulam payment proxy (for Vercel - bypasses Imperva blocking)
        register_rest_route('bellano/v1', '/meshulam-proxy', [
            'methods' => 'POST',
            'callback' => [$this->plugin->checkout, 'proxy_meshulam_payment'],
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
        
        // Color swatches - get attribute term images
        register_rest_route('bellano/v1', '/color-swatches', [
            'methods' => 'GET',
            'callback' => [$this, 'get_color_swatches'],
            'permission_callback' => '__return_true'
        ]);
        
        // Full product data - single API call for everything
        // Support Hebrew slugs with [^/]+ pattern
        register_rest_route('bellano/v1', '/product-full/(?P<slug>[^/]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_full_product_data'],
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
    
    /**
     * Get color swatches (attribute term images)
     * Returns all color terms with their swatch images
     */
    public function get_color_swatches() {
        $swatches = [];
        
        // Get the color attribute (pa_color-product with ID 2)
        $attribute_taxonomies = wc_get_attribute_taxonomies();
        
        foreach ($attribute_taxonomies as $attribute) {
            // Only get image type attributes (color swatches)
            if ($attribute->attribute_type !== 'image') {
                continue;
            }
            
            $taxonomy = 'pa_' . $attribute->attribute_name;
            $terms = get_terms([
                'taxonomy' => $taxonomy,
                'hide_empty' => false
            ]);
            
            if (is_wp_error($terms)) {
                continue;
            }
            
            foreach ($terms as $term) {
                // Get the swatch image - try different meta keys used by various plugins
                $image_id = get_term_meta($term->term_id, 'product_attribute_image', true);
                if (!$image_id) {
                    $image_id = get_term_meta($term->term_id, 'image', true);
                }
                if (!$image_id) {
                    $image_id = get_term_meta($term->term_id, 'pa_color_image', true);
                }
                if (!$image_id) {
                    // Try variation swatches plugin meta
                    $image_id = get_term_meta($term->term_id, 'product_attribute_color', true);
                }
                
                // Get color value (hex) if set
                $color = get_term_meta($term->term_id, 'product_attribute_color', true);
                if (!$color) {
                    $color = get_term_meta($term->term_id, 'color', true);
                }
                
                $swatch_data = [
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'attribute' => $attribute->attribute_label,
                    'attribute_slug' => $taxonomy
                ];
                
                if ($image_id && is_numeric($image_id)) {
                    $image_url = wp_get_attachment_image_url($image_id, 'thumbnail');
                    if ($image_url) {
                        $swatch_data['image'] = $image_url;
                    }
                } elseif ($image_id && filter_var($image_id, FILTER_VALIDATE_URL)) {
                    // Some plugins store URL directly
                    $swatch_data['image'] = $image_id;
                }
                
                if ($color) {
                    $swatch_data['color'] = $color;
                }
                
                $swatches[$term->slug] = $swatch_data;
            }
        }
        
        return new WP_REST_Response([
            'success' => true,
            'swatches' => $swatches
        ], 200);
    }
    
    /**
     * Get full product data in a single API call
     * Returns: product, variations, FAQs, video, swatches, and Yoast SEO
     */
    public function get_full_product_data($request) {
        // URL decode the slug to handle Hebrew characters
        $slug = urldecode($request['slug']);
        $slug = sanitize_title($slug);
        
        // Get the product by slug
        $args = [
            'post_type' => 'product',
            'name' => $slug,
            'posts_per_page' => 1,
            'post_status' => 'publish'
        ];
        $query = new WP_Query($args);
        
        if (!$query->have_posts()) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }
        
        $post = $query->posts[0];
        $product = wc_get_product($post->ID);
        
        if (!$product) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }
        
        $product_id = $product->get_id();
        
        // Build WooCommerce REST API style response
        $product_data = $this->format_product_for_api($product);
        
        // Get variations if variable product
        $variations = [];
        if ($product->is_type('variable')) {
            $variation_ids = $product->get_children();
            foreach ($variation_ids as $variation_id) {
                $variation = wc_get_product($variation_id);
                if ($variation) {
                    $variations[] = $this->format_variation_for_api($variation);
                }
            }
        }
        
        // Get FAQs
        $faqs = $this->plugin->faq->get_product_faq($product_id);
        
        // Get Video
        $video = $this->plugin->product_video->get_product_video($product_id);
        
        // Get Color Swatches (cached)
        static $cached_swatches = null;
        if ($cached_swatches === null) {
            $swatches_response = $this->get_color_swatches();
            $cached_swatches = $swatches_response->get_data()['swatches'] ?? [];
        }
        
        // Get Yoast SEO data
        $yoast_data = null;
        if (function_exists('YoastSEO')) {
            $meta = YoastSEO()->meta->for_post($product_id);
            if ($meta) {
                $yoast_data = [
                    'title' => $meta->title ?? '',
                    'description' => $meta->description ?? '',
                    'canonical' => $meta->canonical ?? '',
                    'og_title' => $meta->open_graph_title ?? '',
                    'og_description' => $meta->open_graph_description ?? '',
                    'og_image' => $meta->open_graph_images[0]['url'] ?? '',
                    'og_type' => $meta->open_graph_type ?? 'product',
                    'twitter_title' => $meta->twitter_title ?? '',
                    'twitter_description' => $meta->twitter_description ?? '',
                    'twitter_image' => $meta->twitter_image ?? '',
                    'schema' => $meta->schema ?? null,
                ];
            }
        }
        
        return new WP_REST_Response([
            'success' => true,
            'product' => $product_data,
            'variations' => $variations,
            'faqs' => $faqs['faqs'] ?? [],
            'video' => $video,
            'swatches' => $cached_swatches,
            'seo' => $yoast_data
        ], 200);
    }
    
    /**
     * Format product for API response (WooCommerce REST API style)
     */
    private function format_product_for_api($product) {
        $data = [
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'type' => $product->get_type(),
            'status' => $product->get_status(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'sku' => $product->get_sku(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'price_html' => $product->get_price_html(),
            'on_sale' => $product->is_on_sale(),
            'stock_status' => $product->get_stock_status(),
            'stock_quantity' => $product->get_stock_quantity(),
            'manage_stock' => $product->get_manage_stock(),
            'weight' => $product->get_weight(),
            'dimensions' => [
                'length' => $product->get_length(),
                'width' => $product->get_width(),
                'height' => $product->get_height(),
            ],
            'categories' => [],
            'tags' => [],
            'images' => [],
            'attributes' => [],
            'variations' => $product->is_type('variable') ? $product->get_children() : [],
            'meta_data' => [],
        ];
        
        // Categories
        foreach ($product->get_category_ids() as $cat_id) {
            $term = get_term($cat_id, 'product_cat');
            if ($term && !is_wp_error($term)) {
                $data['categories'][] = [
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                ];
            }
        }
        
        // Images
        $image_id = $product->get_image_id();
        if ($image_id) {
            $data['images'][] = [
                'id' => $image_id,
                'src' => wp_get_attachment_url($image_id),
                'name' => get_the_title($image_id),
                'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true),
            ];
        }
        foreach ($product->get_gallery_image_ids() as $gallery_id) {
            $data['images'][] = [
                'id' => $gallery_id,
                'src' => wp_get_attachment_url($gallery_id),
                'name' => get_the_title($gallery_id),
                'alt' => get_post_meta($gallery_id, '_wp_attachment_image_alt', true),
            ];
        }
        
        // Attributes
        foreach ($product->get_attributes() as $attr) {
            // Get the attribute label (Hebrew name) instead of slug
            $attr_name = $attr->get_name();
            $attr_label = wc_attribute_label($attr_name);
            
            $attribute_data = [
                'id' => $attr->get_id(),
                'name' => $attr_label,
                'slug' => $attr_name,
                'position' => $attr->get_position(),
                'visible' => $attr->get_visible(),
                'variation' => $attr->get_variation(),
                'options' => [],
            ];
            
            if ($attr->is_taxonomy()) {
                $terms = wc_get_product_terms($product->get_id(), $attr->get_name(), ['fields' => 'all']);
                foreach ($terms as $term) {
                    $attribute_data['options'][] = $term->name;
                }
            } else {
                $attribute_data['options'] = $attr->get_options();
            }
            
            $data['attributes'][] = $attribute_data;
        }
        
        // Custom meta
        $meta_keys = ['_bellano_availability_type', '_custom_order_time'];
        foreach ($meta_keys as $key) {
            $value = get_post_meta($product->get_id(), $key, true);
            if ($value) {
                $data['meta_data'][] = [
                    'key' => $key,
                    'value' => $value,
                ];
            }
        }
        
        // Add bellano_availability as a direct field
        $data['bellano_availability'] = get_post_meta($product->get_id(), '_bellano_availability_type', true) ?: 'in_stock';
        
        return $data;
    }
    
    /**
     * Format variation for API response
     */
    private function format_variation_for_api($variation) {
        $data = [
            'id' => $variation->get_id(),
            'sku' => $variation->get_sku(),
            'price' => $variation->get_price(),
            'regular_price' => $variation->get_regular_price(),
            'sale_price' => $variation->get_sale_price(),
            'on_sale' => $variation->is_on_sale(),
            'stock_status' => $variation->get_stock_status(),
            'stock_quantity' => $variation->get_stock_quantity(),
            'manage_stock' => $variation->get_manage_stock(),
            'weight' => $variation->get_weight(),
            'dimensions' => [
                'length' => $variation->get_length(),
                'width' => $variation->get_width(),
                'height' => $variation->get_height(),
            ],
            'image' => null,
            'attributes' => [],
        ];
        
        // Image
        $image_id = $variation->get_image_id();
        if ($image_id) {
            $data['image'] = [
                'id' => $image_id,
                'src' => wp_get_attachment_url($image_id),
                'name' => get_the_title($image_id),
                'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true),
            ];
        }
        
        // Attributes
        foreach ($variation->get_variation_attributes() as $attr_name => $attr_value) {
            // Remove "attribute_" prefix to get taxonomy name
            $taxonomy = str_replace('attribute_', '', $attr_name);
            
            // Get the label (Hebrew name) using WooCommerce function
            $attr_label = wc_attribute_label($taxonomy);
            
            // Get the term name (Hebrew) instead of slug
            $option_label = $attr_value;
            if ($attr_value && taxonomy_exists($taxonomy)) {
                $term = get_term_by('slug', $attr_value, $taxonomy);
                if ($term && !is_wp_error($term)) {
                    $option_label = $term->name;
                }
            }
            
            $data['attributes'][] = [
                'name' => $attr_label,
                'slug' => $taxonomy,
                'option' => $option_label,
            ];
        }
        
        return $data;
    }
}
