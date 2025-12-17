<?php
/**
 * Plugin Name: Bellano Cache Clear
 * Description: ניקוי קאש של אתר Next.js ב-Vercel
 * Version: 1.0
 * Author: Bellano
 * Text Domain: bellano-cache
 */

if (!defined('ABSPATH')) exit;

// Add submenu under Bellano Homepage (with lower priority to load after main plugin)
add_action('admin_menu', function() {
    // Check if parent menu exists
    global $menu;
    $parent_exists = false;
    foreach ($menu as $item) {
        if (isset($item[2]) && $item[2] === 'bellano-homepage') {
            $parent_exists = true;
            break;
        }
    }
    
    if ($parent_exists) {
        // Add as submenu under Bellano Homepage
        add_submenu_page(
            'bellano-homepage',
            'ניקוי קאש',
            'ניקוי קאש',
            'manage_options',
            'bellano-cache',
            'bellano_cache_settings_page'
        );
    } else {
        // Add as standalone menu if parent doesn't exist
        add_menu_page(
            'ניקוי קאש',
            'ניקוי קאש',
            'manage_options',
            'bellano-cache',
            'bellano_cache_settings_page',
            'dashicons-update',
            31
        );
    }
}, 20); // Priority 20 to run after bellano-homepage plugin (default is 10)

// Register settings
add_action('admin_init', function() {
    register_setting('bellano_cache', 'bellano_vercel_revalidate_url');
    register_setting('bellano_cache', 'bellano_vercel_revalidate_token');
});

// Settings page
function bellano_cache_settings_page() {
    $revalidate_url = get_option('bellano_vercel_revalidate_url', '');
    $revalidate_token = get_option('bellano_vercel_revalidate_token', '');
    
    // Handle cache clear action
    if (isset($_POST['clear_cache']) && wp_verify_nonce($_POST['_wpnonce'], 'bellano_clear_cache')) {
        $result = bellano_clear_vercel_cache();
        if ($result['success']) {
            echo '<div class="notice notice-success"><p>✅ הקאש נוקה בהצלחה!</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>❌ שגיאה: ' . esc_html($result['message']) . '</p></div>';
        }
    }
    
    // Handle clear specific path
    if (isset($_POST['clear_path']) && wp_verify_nonce($_POST['_wpnonce'], 'bellano_clear_cache')) {
        $path = sanitize_text_field($_POST['cache_path']);
        $result = bellano_clear_vercel_cache($path);
        if ($result['success']) {
            echo '<div class="notice notice-success"><p>✅ הקאש של ' . esc_html($path) . ' נוקה בהצלחה!</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>❌ שגיאה: ' . esc_html($result['message']) . '</p></div>';
        }
    }
    ?>
    <div class="wrap" dir="rtl">
        <h1>🗑️ ניקוי קאש - Vercel</h1>
        
        <style>
            .bellano-card { background: #fff; padding: 20px; margin: 15px 0; border: 1px solid #ccc; border-radius: 8px; }
            .bellano-card h2 { margin-top: 0; }
            .quick-actions { display: flex; gap: 10px; flex-wrap: wrap; }
            .quick-actions button { padding: 10px 20px; }
        </style>
        
        <!-- Settings -->
        <div class="bellano-card">
            <h2>⚙️ הגדרות</h2>
            <form method="post" action="options.php">
                <?php settings_fields('bellano_cache'); ?>
                <table class="form-table">
                    <tr>
                        <th><label>כתובת ה-Revalidate</label></th>
                        <td>
                            <input type="url" name="bellano_vercel_revalidate_url" value="<?php echo esc_attr($revalidate_url); ?>" class="regular-text" placeholder="https://bellano.vercel.app/api/revalidate" />
                            <p class="description">הכתובת של ה-API route לניקוי קאש (לדוגמה: https://your-site.vercel.app/api/revalidate)</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label>טוקן אבטחה</label></th>
                        <td>
                            <input type="text" name="bellano_vercel_revalidate_token" value="<?php echo esc_attr($revalidate_token); ?>" class="regular-text" />
                            <p class="description">טוקן סודי לאימות הבקשה (צריך להגדיר את אותו טוקן ב-Vercel Environment Variables)</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('שמור הגדרות'); ?>
            </form>
        </div>
        
        <!-- Quick Actions -->
        <div class="bellano-card">
            <h2>⚡ פעולות מהירות</h2>
            <form method="post">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <div class="quick-actions">
                    <button type="submit" name="clear_cache" value="all" class="button button-primary button-hero">
                        🗑️ נקה את כל הקאש
                    </button>
                </div>
            </form>
        </div>
        
        <!-- Clear Specific Path -->
        <div class="bellano-card">
            <h2>🎯 ניקוי נתיב ספציפי</h2>
            <form method="post">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <table class="form-table">
                    <tr>
                        <th><label>נתיב לניקוי</label></th>
                        <td>
                            <input type="text" name="cache_path" class="regular-text" placeholder="/" />
                            <p class="description">לדוגמה: / (דף הבית), /categories, /product/chair-name</p>
                        </td>
                    </tr>
                </table>
                <button type="submit" name="clear_path" class="button button-secondary">נקה נתיב ספציפי</button>
            </form>
        </div>
        
        <!-- Common Paths -->
        <div class="bellano-card">
            <h2>📍 נתיבים נפוצים</h2>
            <form method="post">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <div class="quick-actions">
                    <button type="submit" name="clear_path" class="button" onclick="this.form.cache_path.value='/'">
                        🏠 דף הבית
                        <input type="hidden" name="cache_path" value="/" />
                    </button>
                </div>
            </form>
            <form method="post" style="display: inline;">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <input type="hidden" name="cache_path" value="/categories" />
                <button type="submit" name="clear_path" class="button">📂 קטגוריות</button>
            </form>
            <form method="post" style="display: inline;">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <input type="hidden" name="cache_path" value="/about" />
                <button type="submit" name="clear_path" class="button">ℹ️ אודות</button>
            </form>
            <form method="post" style="display: inline;">
                <?php wp_nonce_field('bellano_clear_cache'); ?>
                <input type="hidden" name="cache_path" value="/contact" />
                <button type="submit" name="clear_path" class="button">📞 צור קשר</button>
            </form>
        </div>
        
        <!-- Auto Clear Info -->
        <div class="bellano-card">
            <h2>🤖 ניקוי אוטומטי</h2>
            <p>הקאש מתנקה אוטומטית כאשר:</p>
            <ul style="list-style: disc; padding-right: 20px;">
                <li>✅ מעדכנים באנר בדף הבית</li>
                <li>✅ מוסיפים/מעדכנים מוצר ב-WooCommerce</li>
                <li>✅ מעדכנים קטגוריה</li>
            </ul>
        </div>
    </div>
    <?php
}

/**
 * Clear Vercel cache
 * @param string $path - Specific path to revalidate (optional)
 * @return array - Result with success status and message
 */
function bellano_clear_vercel_cache($path = '/') {
    $revalidate_url = get_option('bellano_vercel_revalidate_url', '');
    $revalidate_token = get_option('bellano_vercel_revalidate_token', '');
    
    if (empty($revalidate_url)) {
        return ['success' => false, 'message' => 'לא הוגדרה כתובת Revalidate'];
    }
    
    if (empty($revalidate_token)) {
        return ['success' => false, 'message' => 'לא הוגדר טוקן אבטחה'];
    }
    
    $url = add_query_arg([
        'path' => $path,
        'token' => $revalidate_token
    ], $revalidate_url);
    
    $response = wp_remote_post($url, [
        'timeout' => 30,
        'headers' => [
            'Content-Type' => 'application/json',
        ]
    ]);
    
    if (is_wp_error($response)) {
        return ['success' => false, 'message' => $response->get_error_message()];
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    $code = wp_remote_retrieve_response_code($response);
    
    if ($code === 200 && isset($body['revalidated']) && $body['revalidated']) {
        return ['success' => true, 'message' => 'הקאש נוקה בהצלחה'];
    }
    
    return ['success' => false, 'message' => $body['message'] ?? 'שגיאה לא ידועה'];
}

// Auto-clear cache when homepage settings are updated
add_action('update_option_bellano_banners', function() {
    bellano_clear_vercel_cache('/');
});

// Auto-clear cache when WooCommerce product is updated
add_action('woocommerce_update_product', function($product_id) {
    $product = wc_get_product($product_id);
    if ($product) {
        bellano_clear_vercel_cache('/product/' . $product->get_slug());
        bellano_clear_vercel_cache('/'); // Also clear homepage (best sellers)
    }
});

// Auto-clear cache when WooCommerce category is updated
add_action('edited_product_cat', function($term_id) {
    $term = get_term($term_id, 'product_cat');
    if ($term && !is_wp_error($term)) {
        bellano_clear_vercel_cache('/category/' . $term->slug);
        bellano_clear_vercel_cache('/categories');
    }
});
