<?php
/**
 * Bellano Banners Module
 * Handles homepage banners
 */

if (!defined('ABSPATH')) exit;

class Bellano_Banners {
    
    public function render_tab() {
        $banners = get_option('bellano_banners', []);
        if (!is_array($banners)) $banners = [];
        ?>
        <form method="post" action="options.php" id="banners-form">
            <?php settings_fields('bellano_settings'); ?>
            
            <div class="bellano-card">
                <h2>🖼️ באנרים לדף הבית</h2>
                <p>גרור את הבאנרים לשינוי הסדר. ניתן להוסיף תמונות או סרטונים.</p>
                
                <div id="banners-container">
                    <?php 
                    if (!empty($banners)) {
                        foreach ($banners as $index => $banner) {
                            $this->render_banner_item($index, $banner);
                        }
                    }
                    ?>
                </div>
                
                <button type="button" id="add-banner" class="button button-secondary" style="margin-top: 15px;">
                    ➕ הוסף באנר חדש
                </button>
            </div>
            
            <?php submit_button('💾 שמור באנרים', 'primary', 'submit', true, ['style' => 'font-size: 16px; padding: 8px 24px;']); ?>
        </form>
        
        <?php $this->render_scripts(count($banners)); ?>
        <?php
    }
    
    private function render_banner_item($index, $banner = []) {
        $mediaType = $banner['mediaType'] ?? 'image';
        ?>
        <div class="banner-item">
            <style>
                .banner-item { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    margin: 15px 0; 
                    border: 1px solid #ddd; 
                    border-radius: 8px; 
                }
                .banner-item.collapsed .banner-content { display: none; }
                .banner-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    cursor: pointer;
                }
                .banner-header h3 { margin: 0; }
            </style>
            <div class="banner-header">
                <h3>באנר #<span class="banner-number"><?php echo is_numeric($index) ? $index + 1 : $index; ?></span></h3>
                <button type="button" class="button remove-banner">🗑️ מחק</button>
            </div>
            <div class="banner-content">
                <table class="form-table">
                    <!-- Active -->
                    <tr>
                        <th>פעיל</th>
                        <td>
                            <label>
                                <input type="checkbox" name="bellano_banners[<?php echo $index; ?>][active]" value="1" <?php checked($banner['active'] ?? true); ?>>
                                הצג באנר זה
                            </label>
                        </td>
                    </tr>
                    
                    <!-- Media Type -->
                    <tr>
                        <th>סוג מדיה</th>
                        <td>
                            <label style="margin-left: 20px;">
                                <input type="radio" name="bellano_banners[<?php echo $index; ?>][mediaType]" value="image" class="media-type-radio" <?php checked($mediaType, 'image'); ?>>
                                🖼️ תמונה
                            </label>
                            <label>
                                <input type="radio" name="bellano_banners[<?php echo $index; ?>][mediaType]" value="video" class="media-type-radio" <?php checked($mediaType, 'video'); ?>>
                                🎬 סרטון
                            </label>
                        </td>
                    </tr>
                    
                    <!-- Image Fields -->
                    <tr class="image-fields" style="<?php echo $mediaType !== 'image' ? 'display:none;' : ''; ?>">
                        <th>תמונה (דסקטופ)</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][image]" value="<?php echo esc_attr($banner['image'] ?? ''); ?>" class="regular-text">
                            <button type="button" class="button upload-media" data-target="bellano_banners[<?php echo $index; ?>][image]">בחר תמונה</button>
                            <?php if (!empty($banner['image'])): ?>
                                <img src="<?php echo esc_url($banner['image']); ?>" class="media-preview">
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr class="image-fields" style="<?php echo $mediaType !== 'image' ? 'display:none;' : ''; ?>">
                        <th>תמונה (מובייל)</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][mobileImage]" value="<?php echo esc_attr($banner['mobileImage'] ?? ''); ?>" class="regular-text">
                            <button type="button" class="button upload-media" data-target="bellano_banners[<?php echo $index; ?>][mobileImage]">בחר תמונה</button>
                        </td>
                    </tr>
                    
                    <!-- Video Fields -->
                    <tr class="video-fields" style="<?php echo $mediaType !== 'video' ? 'display:none;' : ''; ?>">
                        <th>סרטון (דסקטופ)</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][video]" value="<?php echo esc_attr($banner['video'] ?? ''); ?>" class="regular-text">
                            <button type="button" class="button upload-media" data-target="bellano_banners[<?php echo $index; ?>][video]" data-media-type="video">בחר סרטון</button>
                        </td>
                    </tr>
                    <tr class="video-fields" style="<?php echo $mediaType !== 'video' ? 'display:none;' : ''; ?>">
                        <th>סרטון (מובייל)</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][mobileVideo]" value="<?php echo esc_attr($banner['mobileVideo'] ?? ''); ?>" class="regular-text">
                            <button type="button" class="button upload-media" data-target="bellano_banners[<?php echo $index; ?>][mobileVideo]" data-media-type="video">בחר סרטון</button>
                        </td>
                    </tr>
                    <tr class="video-fields" style="<?php echo $mediaType !== 'video' ? 'display:none;' : ''; ?>">
                        <th>תמונת פוסטר</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][videoPoster]" value="<?php echo esc_attr($banner['videoPoster'] ?? ''); ?>" class="regular-text">
                            <button type="button" class="button upload-media" data-target="bellano_banners[<?php echo $index; ?>][videoPoster]">בחר תמונה</button>
                        </td>
                    </tr>
                    
                    <!-- Text -->
                    <tr>
                        <th>כותרת</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][title]" value="<?php echo esc_attr($banner['title'] ?? ''); ?>" class="regular-text">
                            <select name="bellano_banners[<?php echo $index; ?>][titleFont]">
                                <option value="hebrew" <?php selected($banner['titleFont'] ?? 'hebrew', 'hebrew'); ?>>עברית (Ping)</option>
                                <option value="english" <?php selected($banner['titleFont'] ?? '', 'english'); ?>>אנגלית (Amandine)</option>
                            </select>
                            <select name="bellano_banners[<?php echo $index; ?>][titleWeight]">
                                <option value="light" <?php selected($banner['titleWeight'] ?? '', 'light'); ?>>דק (300)</option>
                                <option value="normal" <?php selected($banner['titleWeight'] ?? '', 'normal'); ?>>רגיל (400)</option>
                                <option value="bold" <?php selected($banner['titleWeight'] ?? 'bold', 'bold'); ?>>בולט (700)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>תת כותרת</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][subtitle]" value="<?php echo esc_attr($banner['subtitle'] ?? ''); ?>" class="regular-text">
                            <select name="bellano_banners[<?php echo $index; ?>][subtitleFont]">
                                <option value="hebrew" <?php selected($banner['subtitleFont'] ?? 'hebrew', 'hebrew'); ?>>עברית</option>
                                <option value="english" <?php selected($banner['subtitleFont'] ?? '', 'english'); ?>>אנגלית</option>
                            </select>
                            <select name="bellano_banners[<?php echo $index; ?>][subtitleWeight]">
                                <option value="light" <?php selected($banner['subtitleWeight'] ?? '', 'light'); ?>>דק (300)</option>
                                <option value="normal" <?php selected($banner['subtitleWeight'] ?? 'normal', 'normal'); ?>>רגיל (400)</option>
                                <option value="bold" <?php selected($banner['subtitleWeight'] ?? '', 'bold'); ?>>בולט (700)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>כפתור</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][buttonText]" value="<?php echo esc_attr($banner['buttonText'] ?? ''); ?>" placeholder="טקסט" style="width: 150px;">
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][buttonLink]" value="<?php echo esc_attr($banner['buttonLink'] ?? ''); ?>" placeholder="קישור" style="width: 200px;">
                            <select name="bellano_banners[<?php echo $index; ?>][buttonFont]">
                                <option value="hebrew" <?php selected($banner['buttonFont'] ?? 'hebrew', 'hebrew'); ?>>עברית</option>
                                <option value="english" <?php selected($banner['buttonFont'] ?? '', 'english'); ?>>אנגלית</option>
                            </select>
                            <select name="bellano_banners[<?php echo $index; ?>][buttonWeight]">
                                <option value="light" <?php selected($banner['buttonWeight'] ?? '', 'light'); ?>>דק (300)</option>
                                <option value="normal" <?php selected($banner['buttonWeight'] ?? 'normal', 'normal'); ?>>רגיל (400)</option>
                                <option value="bold" <?php selected($banner['buttonWeight'] ?? '', 'bold'); ?>>בולט (700)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>מיקום טקסט</th>
                        <td>
                            <select name="bellano_banners[<?php echo $index; ?>][textPosition]">
                                <option value="center" <?php selected($banner['textPosition'] ?? 'center', 'center'); ?>>מרכז</option>
                                <option value="top" <?php selected($banner['textPosition'] ?? '', 'top'); ?>>למעלה</option>
                                <option value="bottom" <?php selected($banner['textPosition'] ?? '', 'bottom'); ?>>למטה</option>
                            </select>
                            <select name="bellano_banners[<?php echo $index; ?>][textColor]">
                                <option value="white" <?php selected($banner['textColor'] ?? 'white', 'white'); ?>>לבן</option>
                                <option value="black" <?php selected($banner['textColor'] ?? '', 'black'); ?>>שחור</option>
                            </select>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        <?php
    }
    
    private function get_banner_template($index) {
        ob_start();
        $this->render_banner_item($index, []);
        return ob_get_clean();
    }
    
    private function render_scripts($banner_count) {
        ?>
        <script>
        jQuery(document).ready(function($) {
            var bannerIndex = <?php echo $banner_count; ?>;
            
            // Sortable
            $('#banners-container').sortable({
                handle: '.banner-header',
                update: function() { updateBannerIndexes(); }
            });
            
            // Add banner
            $('#add-banner').click(function() {
                var template = `<?php echo $this->get_banner_template('__INDEX__'); ?>`;
                $('#banners-container').append(template.replace(/__INDEX__/g, bannerIndex));
                bannerIndex++;
            });
            
            // Remove banner
            $(document).on('click', '.remove-banner', function() {
                if (confirm('האם למחוק את הבאנר?')) {
                    $(this).closest('.banner-item').remove();
                    updateBannerIndexes();
                }
            });
            
            // Toggle collapse
            $(document).on('click', '.banner-header', function(e) {
                if (!$(e.target).hasClass('remove-banner')) {
                    $(this).closest('.banner-item').toggleClass('collapsed');
                }
            });
            
            // Media type toggle
            $(document).on('change', '.media-type-radio', function() {
                var container = $(this).closest('.banner-item');
                var type = $(this).val();
                container.find('.image-fields').toggle(type === 'image');
                container.find('.video-fields').toggle(type === 'video');
            });
            
            // Media upload
            $(document).on('click', '.upload-media', function(e) {
                e.preventDefault();
                var button = $(this);
                var targetInput = button.data('target');
                var mediaType = button.data('media-type') || 'image';
                
                var frame = wp.media({
                    title: 'בחר ' + (mediaType === 'video' ? 'סרטון' : 'תמונה'),
                    library: { type: mediaType },
                    multiple: false
                });
                
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('input[name="' + targetInput + '"]').val(attachment.url);
                    button.siblings('.media-preview').remove();
                    if (mediaType === 'video') {
                        button.after('<video src="' + attachment.url + '" class="media-preview" controls style="max-width:300px;"></video>');
                    } else {
                        button.after('<img src="' + attachment.url + '" class="media-preview">');
                    }
                });
                
                frame.open();
            });
            
            function updateBannerIndexes() {
                $('#banners-container .banner-item').each(function(index) {
                    $(this).find('input, select, textarea').each(function() {
                        var name = $(this).attr('name');
                        if (name) {
                            $(this).attr('name', name.replace(/\[\d+\]/, '[' + index + ']'));
                        }
                    });
                    $(this).find('.banner-number').text(index + 1);
                });
            }
        });
        </script>
        <?php
    }
    
    /**
     * Get homepage banners data for REST API
     */
    public function get_homepage_data() {
        $banners = get_option('bellano_banners', []);
        if (!is_array($banners)) $banners = [];
        
        $active_banners = array_values(array_filter($banners, function($b) {
            return !empty($b['active']);
        }));
        
        $active_banners = array_map(function($banner) {
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
                'titleFont' => $banner['titleFont'] ?? 'hebrew',
                'titleWeight' => $banner['titleWeight'] ?? 'bold',
                'subtitle' => $banner['subtitle'] ?? '',
                'subtitleFont' => $banner['subtitleFont'] ?? 'hebrew',
                'subtitleWeight' => $banner['subtitleWeight'] ?? 'normal',
                'buttonText' => $banner['buttonText'] ?? '',
                'buttonFont' => $banner['buttonFont'] ?? 'english',
                'buttonWeight' => $banner['buttonWeight'] ?? 'normal',
                'buttonLink' => $banner['buttonLink'] ?? '',
                'textColor' => $banner['textColor'] ?? 'white',
                'textPosition' => $banner['textPosition'] ?? 'center',
            ];
        }, $active_banners);
        
        return [
            'banners' => $active_banners,
            'settings' => [
                'autoPlay' => true,
                'autoPlayInterval' => 5000,
                'showDots' => true,
                'showArrows' => true,
            ]
        ];
    }
}
