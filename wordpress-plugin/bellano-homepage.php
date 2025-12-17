<?php
/**
 * Plugin Name: Bellano Homepage Settings
 * Description: הגדרות דף הבית לאתר בלאנו - באנרים ותוכן
 * Version: 1.0
 * Author: Bellano
 * Text Domain: bellano-homepage
 */

if (!defined('ABSPATH')) exit;

// Add admin menu
add_action('admin_menu', function() {
    add_menu_page(
        'הגדרות דף הבית',
        'דף הבית',
        'manage_options',
        'bellano-homepage',
        'bellano_homepage_settings_page',
        'dashicons-admin-home',
        30
    );
});

// Register settings
add_action('admin_init', function() {
    register_setting('bellano_homepage', 'bellano_banners');
    register_setting('bellano_homepage', 'bellano_homepage_sections');
});

// Settings page HTML
function bellano_homepage_settings_page() {
    $banners = get_option('bellano_banners', []);
    if (!is_array($banners)) $banners = [];
    ?>
    <div class="wrap" dir="rtl">
        <h1>הגדרות דף הבית</h1>
        
        <form method="post" action="options.php">
            <?php settings_fields('bellano_homepage'); ?>
            
            <h2>באנרים</h2>
            <p>הוסיפו באנרים לסליידר בדף הבית. גררו לשינוי סדר.</p>
            
            <div id="banners-container">
                <?php foreach ($banners as $index => $banner): ?>
                <div class="banner-item" style="background: #fff; padding: 20px; margin: 10px 0; border: 1px solid #ccc; border-radius: 8px;">
                    <h3>באנר <?php echo $index + 1; ?> <button type="button" class="button remove-banner" style="float: left; color: red;">הסר</button></h3>
                    
                    <table class="form-table">
                        <tr>
                            <th><label>תמונה (דסקטופ)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][image]" value="<?php echo esc_attr($banner['image'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-image">בחר תמונה</button>
                            </td>
                        </tr>
                        <tr>
                            <th><label>תמונה (מובייל)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][mobileImage]" value="<?php echo esc_attr($banner['mobileImage'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-image">בחר תמונה</button>
                            </td>
                        </tr>
                        <tr>
                            <th><label>כותרת</label></th>
                            <td><input type="text" name="bellano_banners[<?php echo $index; ?>][title]" value="<?php echo esc_attr($banner['title'] ?? ''); ?>" class="regular-text" /></td>
                        </tr>
                        <tr>
                            <th><label>תת כותרת</label></th>
                            <td><input type="text" name="bellano_banners[<?php echo $index; ?>][subtitle]" value="<?php echo esc_attr($banner['subtitle'] ?? ''); ?>" class="regular-text" /></td>
                        </tr>
                        <tr>
                            <th><label>טקסט כפתור</label></th>
                            <td><input type="text" name="bellano_banners[<?php echo $index; ?>][buttonText]" value="<?php echo esc_attr($banner['buttonText'] ?? ''); ?>" class="regular-text" /></td>
                        </tr>
                        <tr>
                            <th><label>קישור כפתור</label></th>
                            <td><input type="text" name="bellano_banners[<?php echo $index; ?>][buttonLink]" value="<?php echo esc_attr($banner['buttonLink'] ?? ''); ?>" class="regular-text" placeholder="/categories" /></td>
                        </tr>
                        <tr>
                            <th><label>פעיל</label></th>
                            <td><input type="checkbox" name="bellano_banners[<?php echo $index; ?>][active]" value="1" <?php checked($banner['active'] ?? true, true); ?> /></td>
                        </tr>
                    </table>
                </div>
                <?php endforeach; ?>
            </div>
            
            <button type="button" id="add-banner" class="button button-secondary">+ הוסף באנר</button>
            
            <p class="submit">
                <input type="submit" class="button button-primary" value="שמור שינויים" />
            </p>
        </form>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        var bannerIndex = <?php echo count($banners); ?>;
        
        // Add banner
        $('#add-banner').click(function() {
            var html = `
            <div class="banner-item" style="background: #fff; padding: 20px; margin: 10px 0; border: 1px solid #ccc; border-radius: 8px;">
                <h3>באנר ${bannerIndex + 1} <button type="button" class="button remove-banner" style="float: left; color: red;">הסר</button></h3>
                <table class="form-table">
                    <tr><th><label>תמונה (דסקטופ)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][image]" class="regular-text" /><button type="button" class="button upload-image">בחר תמונה</button></td></tr>
                    <tr><th><label>תמונה (מובייל)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][mobileImage]" class="regular-text" /><button type="button" class="button upload-image">בחר תמונה</button></td></tr>
                    <tr><th><label>כותרת</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][title]" class="regular-text" /></td></tr>
                    <tr><th><label>תת כותרת</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][subtitle]" class="regular-text" /></td></tr>
                    <tr><th><label>טקסט כפתור</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][buttonText]" class="regular-text" /></td></tr>
                    <tr><th><label>קישור כפתור</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][buttonLink]" class="regular-text" placeholder="/categories" /></td></tr>
                    <tr><th><label>פעיל</label></th><td><input type="checkbox" name="bellano_banners[${bannerIndex}][active]" value="1" checked /></td></tr>
                </table>
            </div>`;
            $('#banners-container').append(html);
            bannerIndex++;
        });
        
        // Remove banner
        $(document).on('click', '.remove-banner', function() {
            $(this).closest('.banner-item').remove();
        });
        
        // Media uploader
        $(document).on('click', '.upload-image', function(e) {
            e.preventDefault();
            var button = $(this);
            var input = button.prev('input');
            
            var frame = wp.media({
                title: 'בחר תמונה',
                button: { text: 'בחר' },
                multiple: false
            });
            
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                input.val(attachment.url);
            });
            
            frame.open();
        });
    });
    </script>
    <?php
}

// Enqueue media uploader
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook === 'toplevel_page_bellano-homepage') {
        wp_enqueue_media();
    }
});

// REST API endpoint for banners
add_action('rest_api_init', function() {
    register_rest_route('bellano/v1', '/homepage', [
        'methods' => 'GET',
        'callback' => function() {
            $banners = get_option('bellano_banners', []);
            
            // Filter only active banners
            $active_banners = array_filter($banners, function($banner) {
                return isset($banner['active']) && $banner['active'];
            });
            
            // Re-index array
            $active_banners = array_values($active_banners);
            
            return [
                'banners' => $active_banners,
                'settings' => [
                    'autoPlay' => true,
                    'autoPlayInterval' => 5000,
                    'showDots' => true,
                    'showArrows' => true,
                ]
            ];
        },
        'permission_callback' => '__return_true'
    ]);
});
