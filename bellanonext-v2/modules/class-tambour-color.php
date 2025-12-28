<?php
/**
 * Tambour Color Module
 * Allows customers to request a custom Tambour paint color for products
 * Admin can enable/disable per product and set custom price
 */

if (!defined('ABSPATH')) exit;

class Bellano_Tambour_Color {
    
    public function __construct() {
        // Add metabox to product edit page
        add_action('add_meta_boxes', [$this, 'add_product_metabox']);
        
        // Save using WooCommerce hook
        add_action('woocommerce_process_product_meta', [$this, 'save_tambour_settings'], 10, 1);
        
        // Expose in REST API
        add_action('rest_api_init', [$this, 'register_rest_field']);
        
        // Frontend: Add field to product page
        add_action('woocommerce_before_add_to_cart_button', [$this, 'display_tambour_field'], 15);
        
        // Add custom data to cart item
        add_filter('woocommerce_add_cart_item_data', [$this, 'add_cart_item_data'], 10, 3);
        
        // Display in cart
        add_filter('woocommerce_get_item_data', [$this, 'display_cart_item_data'], 10, 2);
        
        // Adjust price in cart
        add_action('woocommerce_before_calculate_totals', [$this, 'adjust_cart_price'], 20, 1);
        
        // Save to order
        add_action('woocommerce_checkout_create_order_line_item', [$this, 'save_to_order_item'], 10, 4);
        
        // Display in admin order
        add_action('woocommerce_admin_order_item_headers', [$this, 'admin_order_item_header']);
    }
    
    /**
     * Add metabox (sidebar location)
     */
    public function add_product_metabox() {
        add_meta_box(
            'bellano_tambour_metabox',
            '🎨 צבע טמבור',
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
        $enabled = get_post_meta($post->ID, '_bellano_tambour_enabled', true);
        $price = get_post_meta($post->ID, '_bellano_tambour_price', true);
        
        // Default price if not set
        if ($price === '') {
            $price = 300;
        }
        
        wp_nonce_field('bellano_tambour_nonce', 'bellano_tambour_nonce');
        ?>
        <div style="padding: 10px 0;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border-radius: 6px; background: <?php echo $enabled ? '#dbeafe' : '#f3f4f6'; ?>; margin-bottom: 12px;">
                <input type="checkbox" name="_bellano_tambour_enabled" value="1" <?php checked($enabled, '1'); ?> style="margin-left: 8px; width: 18px; height: 18px;">
                <div>
                    <span style="font-size: 14px; font-weight: 600; color: <?php echo $enabled ? '#1d4ed8' : '#374151'; ?>;">
                        <?php echo $enabled ? '✅ מופעל' : 'הפעל צבע טמבור'; ?>
                    </span>
                    <p style="margin: 2px 0 0 0; color: #666; font-size: 11px;">אפשר ללקוח לבחור צבע טמבור</p>
                </div>
            </label>
            
            <div style="background: #fefce8; padding: 12px; border-radius: 6px; border: 1px solid #fef08a;">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #854d0e; font-size: 13px;">
                    💰 תוספת מחיר לצבע טמבור
                </label>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input 
                        type="number" 
                        name="_bellano_tambour_price" 
                        value="<?php echo esc_attr($price); ?>" 
                        min="0" 
                        step="10"
                        style="width: 100px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 16px; font-weight: 600;"
                    >
                    <span style="font-size: 14px; color: #666;">₪</span>
                </div>
                <p style="margin: 8px 0 0 0; color: #92400e; font-size: 11px;">
                    מחיר התוספת כשלקוח בוחר צבע טמבור
                </p>
            </div>
        </div>
        
        <p style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-radius: 4px; font-size: 11px; color: #166534; line-height: 1.5;">
            💡 <strong>איך זה עובד:</strong><br>
            כשמופעל, הלקוח יראה שדה להקלדת מספר צבע טמבור.<br>
            אם ימלא - המחיר יתווסף להזמנה.
        </p>
        <?php
    }
    
    /**
     * Save tambour settings
     */
    public function save_tambour_settings($post_id) {
        if (!isset($_POST['bellano_tambour_nonce']) || 
            !wp_verify_nonce($_POST['bellano_tambour_nonce'], 'bellano_tambour_nonce')) {
            return;
        }
        
        // Save enabled status
        $enabled = isset($_POST['_bellano_tambour_enabled']) ? '1' : '0';
        update_post_meta($post_id, '_bellano_tambour_enabled', $enabled);
        
        // Save price
        if (isset($_POST['_bellano_tambour_price'])) {
            $price = absint($_POST['_bellano_tambour_price']);
            update_post_meta($post_id, '_bellano_tambour_price', $price);
        }
    }
    
    /**
     * Register REST API field for products
     */
    public function register_rest_field() {
        register_rest_field('product', 'bellano_tambour', [
            'get_callback' => function($product) {
                $enabled = get_post_meta($product['id'], '_bellano_tambour_enabled', true);
                $price = get_post_meta($product['id'], '_bellano_tambour_price', true);
                
                return [
                    'enabled' => $enabled === '1',
                    'price' => $price !== '' ? (int) $price : 300,
                ];
            },
            'schema' => [
                'description' => 'Tambour color settings',
                'type' => 'object',
                'properties' => [
                    'enabled' => ['type' => 'boolean'],
                    'price' => ['type' => 'integer'],
                ],
            ],
        ]);
    }
    
    /**
     * Display tambour field on product page (WooCommerce frontend)
     */
    public function display_tambour_field() {
        global $product;
        
        if (!$product) return;
        
        $enabled = get_post_meta($product->get_id(), '_bellano_tambour_enabled', true);
        if ($enabled !== '1') return;
        
        $price = get_post_meta($product->get_id(), '_bellano_tambour_price', true);
        $price = $price !== '' ? (int) $price : 300;
        
        ?>
        <div class="bellano-tambour-field" style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; border: 2px solid #f59e0b;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 20px;">🎨</span>
                <label style="font-weight: 600; color: #92400e; font-size: 15px;">
                    צבע טמבור מיוחד
                    <span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 20px; font-size: 12px; margin-right: 8px;">
                        +<?php echo number_format($price); ?>₪
                    </span>
                </label>
            </div>
            <input 
                type="text" 
                name="bellano_tambour_color" 
                id="bellano_tambour_color"
                placeholder="הקלד מספר צבע טמבור (לדוגמה: 2534)"
                style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 14px; direction: rtl;"
            >
            <p style="margin: 8px 0 0 0; color: #78716c; font-size: 12px;">
                💡 אופציונלי - השאר ריק אם לא צריך צבע מיוחד
            </p>
        </div>
        <?php
    }
    
    /**
     * Add tambour data to cart item
     */
    public function add_cart_item_data($cart_item_data, $product_id, $variation_id) {
        if (isset($_POST['bellano_tambour_color']) && !empty($_POST['bellano_tambour_color'])) {
            $color = sanitize_text_field($_POST['bellano_tambour_color']);
            $price = get_post_meta($product_id, '_bellano_tambour_price', true);
            
            $cart_item_data['bellano_tambour'] = [
                'color' => $color,
                'price' => $price !== '' ? (int) $price : 300,
            ];
            
            // Make cart item unique
            $cart_item_data['unique_key'] = md5(microtime() . rand());
        }
        
        return $cart_item_data;
    }
    
    /**
     * Display tambour data in cart
     */
    public function display_cart_item_data($item_data, $cart_item) {
        if (isset($cart_item['bellano_tambour'])) {
            $item_data[] = [
                'key' => '🎨 צבע טמבור',
                'value' => $cart_item['bellano_tambour']['color'] . ' (+' . number_format($cart_item['bellano_tambour']['price']) . '₪)',
            ];
        }
        
        return $item_data;
    }
    
    /**
     * Adjust cart item price
     */
    public function adjust_cart_price($cart) {
        if (is_admin() && !defined('DOING_AJAX')) return;
        if (did_action('woocommerce_before_calculate_totals') >= 2) return;
        
        foreach ($cart->get_cart() as $cart_item) {
            if (isset($cart_item['bellano_tambour'])) {
                $additional_price = $cart_item['bellano_tambour']['price'];
                $original_price = $cart_item['data']->get_price();
                $cart_item['data']->set_price($original_price + $additional_price);
            }
        }
    }
    
    /**
     * Save tambour data to order item
     */
    public function save_to_order_item($item, $cart_item_key, $values, $order) {
        if (isset($values['bellano_tambour'])) {
            $item->add_meta_data('_bellano_tambour_color', $values['bellano_tambour']['color']);
            $item->add_meta_data('_bellano_tambour_price', $values['bellano_tambour']['price']);
            $item->add_meta_data('צבע טמבור', $values['bellano_tambour']['color'] . ' (+' . number_format($values['bellano_tambour']['price']) . '₪)');
        }
    }
    
    /**
     * Admin order item header
     */
    public function admin_order_item_header() {
        // Tambour info will show in item meta
    }
    
    /**
     * Static helper: Check if product has tambour enabled
     */
    public static function is_enabled($product_id) {
        return get_post_meta($product_id, '_bellano_tambour_enabled', true) === '1';
    }
    
    /**
     * Static helper: Get tambour price for product
     */
    public static function get_price($product_id) {
        $price = get_post_meta($product_id, '_bellano_tambour_price', true);
        return $price !== '' ? (int) $price : 300;
    }
}
