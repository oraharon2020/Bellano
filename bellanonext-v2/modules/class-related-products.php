<?php
/**
 * Related Products (Complete The Look) Module
 * Allows selecting specific products to show as "complete the look" bundle
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bellano_Related_Products {
    
    public function __construct() {
        add_action('add_meta_boxes', array($this, 'add_meta_box'));
        add_action('save_post_product', array($this, 'save_meta_box'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        // Expose in REST API
        add_action('rest_api_init', array($this, 'register_rest_field'));
    }
    
    /**
     * Register REST API field for products
     */
    public function register_rest_field() {
        register_rest_field('product', 'bellano_related', array(
            'get_callback' => function($product) {
                return self::get_related_products_data($product['id']);
            },
            'schema' => array(
                'description' => 'Related products for Complete The Look bundle',
                'type' => 'object',
            ),
        ));
    }
    
    /**
     * Add meta box to product edit page
     */
    public function add_meta_box() {
        add_meta_box(
            'bellano_related_products',
            '✨ השלם את הלוק - מוצרים משלימים',
            array($this, 'render_meta_box'),
            'product',
            'normal',
            'high'
        );
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_scripts($hook) {
        global $post;
        
        if ($hook !== 'post.php' && $hook !== 'post-new.php') {
            return;
        }
        
        if (!$post || $post->post_type !== 'product') {
            return;
        }
        
        wp_enqueue_script('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', array('jquery'), '4.1.0', true);
        wp_enqueue_style('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css', array(), '4.1.0');
        
        wp_add_inline_style('select2', '
            .bellano-related-products-wrap {
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            .bellano-related-products-wrap .select2-container {
                width: 100% !important;
            }
            .bellano-related-products-wrap .select2-selection--multiple {
                min-height: 100px;
                border: 2px dashed #ddd;
                border-radius: 8px;
            }
            .bellano-related-products-wrap .select2-selection--multiple:hover {
                border-color: #2271b1;
            }
            .bellano-related-products-wrap .select2-selection__choice {
                background: #2271b1;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                margin: 5px;
            }
            .bellano-related-products-wrap .select2-selection__choice__remove {
                color: white;
                margin-left: 8px;
            }
            .bellano-related-info {
                margin-top: 15px;
                padding: 12px;
                background: #fff3cd;
                border-radius: 6px;
                font-size: 13px;
                color: #856404;
            }
            .bellano-bundle-settings {
                margin-top: 15px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                border: 1px solid #ddd;
            }
            .bellano-bundle-settings label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }
            .bellano-bundle-settings input[type="number"] {
                width: 80px;
            }
        ');
    }
    
    /**
     * Render meta box content
     */
    public function render_meta_box($post) {
        wp_nonce_field('bellano_related_products_nonce', 'bellano_related_products_nonce');
        
        $selected_products = get_post_meta($post->ID, '_bellano_related_products', true);
        $selected_products = !empty($selected_products) ? $selected_products : array();
        
        $bundle_discount = get_post_meta($post->ID, '_bellano_bundle_discount', true);
        $bundle_discount = !empty($bundle_discount) ? $bundle_discount : '10';
        
        $bundle_enabled = get_post_meta($post->ID, '_bellano_bundle_enabled', true);
        $bundle_enabled = $bundle_enabled !== '0'; // Default to enabled
        
        // Get all products for selection
        $products = wc_get_products(array(
            'limit' => -1,
            'status' => 'publish',
            'exclude' => array($post->ID),
            'orderby' => 'title',
            'order' => 'ASC',
        ));
        
        ?>
        <div class="bellano-related-products-wrap">
            <p style="margin-bottom: 10px; font-weight: 600;">בחר מוצרים שמשלימים את המוצר הזה:</p>
            
            <select id="bellano_related_products" name="bellano_related_products[]" multiple="multiple" style="width: 100%;">
                <?php foreach ($products as $product) : ?>
                    <option value="<?php echo esc_attr($product->get_id()); ?>" 
                            <?php selected(in_array($product->get_id(), $selected_products)); ?>>
                        <?php echo esc_html($product->get_name()); ?> - ₪<?php echo esc_html($product->get_price()); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            
            <div class="bellano-bundle-settings">
                <label>
                    <input type="checkbox" name="bellano_bundle_enabled" value="1" <?php checked($bundle_enabled); ?>>
                    <strong>הפעל "השלם את הלוק"</strong>
                </label>
                
                <label>
                    <span>אחוז הנחה לקנייה יחד:</span>
                    <input type="number" name="bellano_bundle_discount" value="<?php echo esc_attr($bundle_discount); ?>" min="0" max="50" step="1">
                    <span>%</span>
                </label>
            </div>
            
            <div class="bellano-related-info">
                💡 <strong>טיפ:</strong> בחר 2-4 מוצרים שמתאימים ליצירת לוק שלם. הלקוח יוכל להוסיף את כל המוצרים לסל עם הנחת באנדל.
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#bellano_related_products').select2({
                placeholder: 'חפש והוסף מוצרים...',
                allowClear: true,
                dir: 'rtl',
                language: {
                    noResults: function() { return 'לא נמצאו מוצרים'; },
                    searching: function() { return 'מחפש...'; }
                }
            });
        });
        </script>
        <?php
    }
    
    /**
     * Save meta box data
     */
    public function save_meta_box($post_id) {
        if (!isset($_POST['bellano_related_products_nonce']) || 
            !wp_verify_nonce($_POST['bellano_related_products_nonce'], 'bellano_related_products_nonce')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save related products
        $related_products = isset($_POST['bellano_related_products']) ? 
            array_map('intval', $_POST['bellano_related_products']) : array();
        update_post_meta($post_id, '_bellano_related_products', $related_products);
        
        // Save bundle settings
        $bundle_enabled = isset($_POST['bellano_bundle_enabled']) ? '1' : '0';
        update_post_meta($post_id, '_bellano_bundle_enabled', $bundle_enabled);
        
        $bundle_discount = isset($_POST['bellano_bundle_discount']) ? 
            intval($_POST['bellano_bundle_discount']) : 10;
        $bundle_discount = max(0, min(50, $bundle_discount)); // Clamp between 0-50
        update_post_meta($post_id, '_bellano_bundle_discount', $bundle_discount);
    }
    
    /**
     * Get related products data for a product
     */
    public static function get_related_products_data($product_id) {
        $enabled = get_post_meta($product_id, '_bellano_bundle_enabled', true);
        if ($enabled === '0') {
            return null;
        }
        
        $related_ids = get_post_meta($product_id, '_bellano_related_products', true);
        if (empty($related_ids) || !is_array($related_ids)) {
            return null;
        }
        
        $discount = get_post_meta($product_id, '_bellano_bundle_discount', true);
        $discount = !empty($discount) ? intval($discount) : 10;
        
        $products = array();
        foreach ($related_ids as $id) {
            $product = wc_get_product($id);
            if ($product && $product->get_status() === 'publish') {
                $products[] = array(
                    'id' => $product->get_id(),
                    'name' => $product->get_name(),
                    'slug' => $product->get_slug(),
                    'price' => $product->get_price(),
                    'regular_price' => $product->get_regular_price(),
                    'image' => wp_get_attachment_url($product->get_image_id()),
                );
            }
        }
        
        if (empty($products)) {
            return null;
        }
        
        return array(
            'enabled' => true,
            'discount' => $discount,
            'products' => $products,
        );
    }
}

// Initialize
new Bellano_Related_Products();
