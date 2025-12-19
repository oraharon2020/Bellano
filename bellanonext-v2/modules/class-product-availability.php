<?php
/**
 * Product Availability Module
 * Adds "In Stock" / "Custom Order" badge to products
 */

if (!defined('ABSPATH')) exit;

class Bellano_Product_Availability {
    
    public function __construct() {
        // Add metabox to product edit page (sidebar)
        add_action('add_meta_boxes', [$this, 'add_product_metabox']);
        
        // Save using WooCommerce hook (works for both metabox and woo field)
        add_action('woocommerce_process_product_meta', [$this, 'save_availability'], 10, 1);
        
        // Expose in REST API
        add_action('rest_api_init', [$this, 'register_rest_field']);
    }
    
    /**
     * Add metabox (sidebar location - easy to use)
     */
    public function add_product_metabox() {
        add_meta_box(
            'bellano_availability_metabox',
            '🏷️ סוג זמינות מוצר',
            [$this, 'render_metabox'],
            'product',
            'side',
            'high'
        );
    }
    
    /**
     * Render the metabox
     */
    public function render_metabox($post) {
        $availability_type = get_post_meta($post->ID, '_bellano_availability_type', true) ?: 'in_stock';
        ?>
        <div style="padding: 10px 0;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 8px; border-radius: 6px; background: <?php echo $availability_type === 'in_stock' ? '#dcfce7' : '#f3f4f6'; ?>; margin-bottom: 8px;">
                <input type="radio" name="_bellano_availability_type" value="in_stock" <?php checked($availability_type, 'in_stock'); ?> style="margin-left: 8px;">
                <div>
                    <span style="font-size: 14px; font-weight: 500; color: #166534;">🟢 במלאי</span>
                    <p style="margin: 2px 0 0 0; color: #666; font-size: 11px;">מוצר זמין - ניתן לביטול</p>
                </div>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer; padding: 8px; border-radius: 6px; background: <?php echo $availability_type === 'custom_order' ? '#fef3c7' : '#f3f4f6'; ?>;">
                <input type="radio" name="_bellano_availability_type" value="custom_order" <?php checked($availability_type, 'custom_order'); ?> style="margin-left: 8px;">
                <div>
                    <span style="font-size: 14px; font-weight: 500; color: #92400e;">🟠 בהזמנה אישית</span>
                    <p style="margin: 2px 0 0 0; color: #666; font-size: 11px;">מוצר בהתאמה - לא ניתן לביטול</p>
                </div>
            </label>
        </div>
        <?php
    }
    
    /**
     * Save availability (using WooCommerce hook - more reliable)
     */
    public function save_availability($post_id) {
        if (isset($_POST['_bellano_availability_type'])) {
            $value = sanitize_text_field($_POST['_bellano_availability_type']);
            update_post_meta($post_id, '_bellano_availability_type', $value);
        }
    }
    
    /**
     * Register REST API field for products
     */
    public function register_rest_field() {
        register_rest_field('product', 'bellano_availability', [
            'get_callback' => function($product) {
                $type = get_post_meta($product['id'], '_bellano_availability_type', true);
                return $type ?: 'in_stock';
            },
            'schema' => [
                'description' => 'Product availability type (in_stock or custom_order)',
                'type' => 'string',
                'enum' => ['in_stock', 'custom_order'],
            ],
        ]);
    }
    
    /**
     * Get availability type for a product
     */
    public static function get_availability($product_id) {
        $type = get_post_meta($product_id, '_bellano_availability_type', true);
        return $type ?: 'in_stock';
    }
}
