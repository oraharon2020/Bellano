<?php
/**
 * Plugin Name: Bellano Homepage Settings
 * Description: הגדרות דף הבית לאתר בלאנו - באנרים, סרטונים ותוכן
 * Version: 2.0
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
        
        <style>
            .banner-item { background: #fff; padding: 20px; margin: 10px 0; border: 1px solid #ccc; border-radius: 8px; }
            .media-type-selector { display: flex; gap: 10px; margin-bottom: 15px; }
            .media-type-selector label { display: flex; align-items: center; gap: 5px; cursor: pointer; padding: 8px 16px; border: 2px solid #ddd; border-radius: 5px; }
            .media-type-selector input:checked + span { font-weight: bold; }
            .media-type-selector input:checked ~ span { color: #0073aa; }
            .media-type-selector label:has(input:checked) { border-color: #0073aa; background: #f0f7fc; }
            .video-fields, .image-fields { transition: all 0.3s; }
            .video-preview { max-width: 300px; margin-top: 10px; border-radius: 8px; }
            .image-preview { max-width: 200px; margin-top: 10px; border-radius: 8px; }
        </style>
        
        <form method="post" action="options.php">
            <?php settings_fields('bellano_homepage'); ?>
            
            <h2>באנרים</h2>
            <p>הוסיפו באנרים לסליידר בדף הבית. תומך בתמונות וסרטונים!</p>
            
            <div id="banners-container">
                <?php foreach ($banners as $index => $banner): 
                    $mediaType = $banner['mediaType'] ?? 'image';
                ?>
                <div class="banner-item">
                    <h3>באנר <?php echo $index + 1; ?> <button type="button" class="button remove-banner" style="float: left; color: red;">הסר</button></h3>
                    
                    <table class="form-table">
                        <!-- Media Type Selector -->
                        <tr>
                            <th><label>סוג מדיה</label></th>
                            <td>
                                <div class="media-type-selector">
                                    <label>
                                        <input type="radio" name="bellano_banners[<?php echo $index; ?>][mediaType]" value="image" <?php checked($mediaType, 'image'); ?> class="media-type-radio" />
                                        <span>🖼️ תמונה</span>
                                    </label>
                                    <label>
                                        <input type="radio" name="bellano_banners[<?php echo $index; ?>][mediaType]" value="video" <?php checked($mediaType, 'video'); ?> class="media-type-radio" />
                                        <span>🎬 סרטון</span>
                                    </label>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Image Fields -->
                        <tr class="image-fields" style="<?php echo $mediaType === 'video' ? 'display:none;' : ''; ?>">
                            <th><label>תמונה (דסקטופ)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][image]" value="<?php echo esc_attr($banner['image'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-image">בחר תמונה</button>
                                <?php if (!empty($banner['image'])): ?>
                                    <br><img src="<?php echo esc_attr($banner['image']); ?>" class="image-preview" />
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr class="image-fields" style="<?php echo $mediaType === 'video' ? 'display:none;' : ''; ?>">
                            <th><label>תמונה (מובייל)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][mobileImage]" value="<?php echo esc_attr($banner['mobileImage'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-image">בחר תמונה</button>
                            </td>
                        </tr>
                        
                        <!-- Video Fields -->
                        <tr class="video-fields" style="<?php echo $mediaType === 'image' ? 'display:none;' : ''; ?>">
                            <th><label>סרטון (דסקטופ)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][video]" value="<?php echo esc_attr($banner['video'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-video">בחר סרטון</button>
                                <p class="description">MP4 מומלץ. עד 20MB לביצועים אופטימליים.</p>
                                <?php if (!empty($banner['video'])): ?>
                                    <br><video src="<?php echo esc_attr($banner['video']); ?>" class="video-preview" controls muted></video>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr class="video-fields" style="<?php echo $mediaType === 'image' ? 'display:none;' : ''; ?>">
                            <th><label>סרטון (מובייל)</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][mobileVideo]" value="<?php echo esc_attr($banner['mobileVideo'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-video">בחר סרטון</button>
                                <p class="description">סרטון קצר יותר/קל יותר למובייל (אופציונלי)</p>
                            </td>
                        </tr>
                        <tr class="video-fields" style="<?php echo $mediaType === 'image' ? 'display:none;' : ''; ?>">
                            <th><label>תמונת פולבק</label></th>
                            <td>
                                <input type="text" name="bellano_banners[<?php echo $index; ?>][videoPoster]" value="<?php echo esc_attr($banner['videoPoster'] ?? ''); ?>" class="regular-text" />
                                <button type="button" class="button upload-image">בחר תמונה</button>
                                <p class="description">תמונה שתוצג בזמן טעינת הסרטון</p>
                            </td>
                        </tr>
                        <tr class="video-fields" style="<?php echo $mediaType === 'image' ? 'display:none;' : ''; ?>">
                            <th><label>הגדרות סרטון</label></th>
                            <td>
                                <label><input type="checkbox" name="bellano_banners[<?php echo $index; ?>][videoAutoplay]" value="1" <?php checked($banner['videoAutoplay'] ?? true, true); ?> /> הפעלה אוטומטית</label><br>
                                <label><input type="checkbox" name="bellano_banners[<?php echo $index; ?>][videoLoop]" value="1" <?php checked($banner['videoLoop'] ?? true, true); ?> /> לופ (חזרה)</label><br>
                                <label><input type="checkbox" name="bellano_banners[<?php echo $index; ?>][videoMuted]" value="1" <?php checked($banner['videoMuted'] ?? true, true); ?> /> ללא קול (מומלץ)</label>
                            </td>
                        </tr>
                        
                        <!-- Common Fields -->
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
                            <th><label>צבע טקסט</label></th>
                            <td>
                                <select name="bellano_banners[<?php echo $index; ?>][textColor]">
                                    <option value="white" <?php selected($banner['textColor'] ?? 'white', 'white'); ?>>לבן</option>
                                    <option value="black" <?php selected($banner['textColor'] ?? 'white', 'black'); ?>>שחור</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th><label>פעיל</label></th>
                            <td><input type="checkbox" name="bellano_banners[<?php echo $index; ?>][active]" value="1" <?php checked($banner['active'] ?? true, true); ?> /></td>
                        </tr>
                    </table>
                </div>
                <?php endforeach; ?>
            </div>
            
            <button type="button" id="add-banner" class="button button-secondary" style="margin-top: 15px;">+ הוסף באנר</button>
            
            <p class="submit">
                <input type="submit" class="button button-primary" value="שמור שינויים" />
            </p>
        </form>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        var bannerIndex = <?php echo count($banners); ?>;
        
        // Toggle media type fields
        $(document).on('change', '.media-type-radio', function() {
            var container = $(this).closest('.banner-item');
            var isVideo = $(this).val() === 'video';
            container.find('.image-fields').toggle(!isVideo);
            container.find('.video-fields').toggle(isVideo);
        });
        
        // Add banner
        $('#add-banner').click(function() {
            var html = `
            <div class="banner-item">
                <h3>באנר ${bannerIndex + 1} <button type="button" class="button remove-banner" style="float: left; color: red;">הסר</button></h3>
                <table class="form-table">
                    <tr>
                        <th><label>סוג מדיה</label></th>
                        <td>
                            <div class="media-type-selector">
                                <label>
                                    <input type="radio" name="bellano_banners[${bannerIndex}][mediaType]" value="image" checked class="media-type-radio" />
                                    <span>🖼️ תמונה</span>
                                </label>
                                <label>
                                    <input type="radio" name="bellano_banners[${bannerIndex}][mediaType]" value="video" class="media-type-radio" />
                                    <span>🎬 סרטון</span>
                                </label>
                            </div>
                        </td>
                    </tr>
                    <tr class="image-fields"><th><label>תמונה (דסקטופ)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][image]" class="regular-text" /><button type="button" class="button upload-image">בחר תמונה</button></td></tr>
                    <tr class="image-fields"><th><label>תמונה (מובייל)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][mobileImage]" class="regular-text" /><button type="button" class="button upload-image">בחר תמונה</button></td></tr>
                    <tr class="video-fields" style="display:none;"><th><label>סרטון (דסקטופ)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][video]" class="regular-text" /><button type="button" class="button upload-video">בחר סרטון</button><p class="description">MP4 מומלץ</p></td></tr>
                    <tr class="video-fields" style="display:none;"><th><label>סרטון (מובייל)</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][mobileVideo]" class="regular-text" /><button type="button" class="button upload-video">בחר סרטון</button></td></tr>
                    <tr class="video-fields" style="display:none;"><th><label>תמונת פולבק</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][videoPoster]" class="regular-text" /><button type="button" class="button upload-image">בחר תמונה</button></td></tr>
                    <tr class="video-fields" style="display:none;"><th><label>הגדרות סרטון</label></th><td><label><input type="checkbox" name="bellano_banners[${bannerIndex}][videoAutoplay]" value="1" checked /> הפעלה אוטומטית</label><br><label><input type="checkbox" name="bellano_banners[${bannerIndex}][videoLoop]" value="1" checked /> לופ</label><br><label><input type="checkbox" name="bellano_banners[${bannerIndex}][videoMuted]" value="1" checked /> ללא קול</label></td></tr>
                    <tr><th><label>כותרת</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][title]" class="regular-text" /></td></tr>
                    <tr><th><label>תת כותרת</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][subtitle]" class="regular-text" /></td></tr>
                    <tr><th><label>טקסט כפתור</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][buttonText]" class="regular-text" /></td></tr>
                    <tr><th><label>קישור כפתור</label></th><td><input type="text" name="bellano_banners[${bannerIndex}][buttonLink]" class="regular-text" placeholder="/categories" /></td></tr>
                    <tr><th><label>צבע טקסט</label></th><td><select name="bellano_banners[${bannerIndex}][textColor]"><option value="white">לבן</option><option value="black">שחור</option></select></td></tr>
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
        
        // Media uploader - Images
        $(document).on('click', '.upload-image', function(e) {
            e.preventDefault();
            var button = $(this);
            var input = button.prev('input');
            
            var frame = wp.media({
                title: 'בחר תמונה',
                button: { text: 'בחר' },
                multiple: false,
                library: { type: 'image' }
            });
            
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                input.val(attachment.url);
            });
            
            frame.open();
        });
        
        // Media uploader - Videos
        $(document).on('click', '.upload-video', function(e) {
            e.preventDefault();
            var button = $(this);
            var input = button.prev('input');
            
            var frame = wp.media({
                title: 'בחר סרטון',
                button: { text: 'בחר' },
                multiple: false,
                library: { type: 'video' }
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
            
            // Re-index array and format data
            $active_banners = array_values(array_map(function($banner) {
                return [
                    'mediaType' => $banner['mediaType'] ?? 'image',
                    'image' => $banner['image'] ?? '',
                    'mobileImage' => $banner['mobileImage'] ?? '',
                    'video' => $banner['video'] ?? '',
                    'mobileVideo' => $banner['mobileVideo'] ?? '',
                    'videoPoster' => $banner['videoPoster'] ?? '',
                    'videoAutoplay' => isset($banner['videoAutoplay']) ? (bool)$banner['videoAutoplay'] : true,
                    'videoLoop' => isset($banner['videoLoop']) ? (bool)$banner['videoLoop'] : true,
                    'videoMuted' => isset($banner['videoMuted']) ? (bool)$banner['videoMuted'] : true,
                    'title' => $banner['title'] ?? '',
                    'subtitle' => $banner['subtitle'] ?? '',
                    'buttonText' => $banner['buttonText'] ?? '',
                    'buttonLink' => $banner['buttonLink'] ?? '',
                    'textColor' => $banner['textColor'] ?? 'white',
                ];
            }, $active_banners));
            
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
