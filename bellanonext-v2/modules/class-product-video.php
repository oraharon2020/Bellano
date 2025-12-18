<?php
/**
 * Bellano Product Video Module
 * Handles video uploads for products
 */

if (!defined('ABSPATH')) exit;

class Bellano_Product_Video {
    
    public function render_tab() {
        ?>
        <div class="bellano-card">
            <h2>🎬 סרטוני מוצרים</h2>
            <p>ניתן להוסיף סרטון לכל מוצר דרך עמוד העריכה של המוצר.</p>
            <p>הסרטון יופיע בצד שמאל של עמוד המוצר, ליד תיאור המוצר והמפרט הטכני.</p>
            
            <h3>📌 הוראות:</h3>
            <ol style="line-height: 2;">
                <li>היכנס לעריכת מוצר ב-WooCommerce</li>
                <li>גלול למטה לתיבה "🎬 סרטון מוצר"</li>
                <li>העלה סרטון (MP4 מומלץ) או הדבק קישור ליוטיוב</li>
                <li>העלה תמונת תצוגה (thumbnail) - זו התמונה שתוצג לפני הפעלת הסרטון</li>
                <li>שמור את המוצר</li>
            </ol>
            
            <h3>📐 המלצות:</h3>
            <ul style="line-height: 2;">
                <li><strong>יחס תמונה:</strong> 4:3 או 16:9 (מתאים לתמונה הראשית)</li>
                <li><strong>רזולוציה מומלצת:</strong> 1280x720 (720p) או 1920x1080 (1080p)</li>
                <li><strong>משקל מקסימלי:</strong> עד 50MB לקבצי MP4</li>
                <li><strong>פורמטים נתמכים:</strong> MP4, WebM, YouTube URL</li>
            </ul>
        </div>
        
        <div class="bellano-card">
            <h2>📊 מוצרים עם סרטון</h2>
            <?php $this->render_products_with_video(); ?>
        </div>
        <?php
    }
    
    private function render_products_with_video() {
        $products = get_posts([
            'post_type' => 'product',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => '_bellano_product_video',
                    'value' => '',
                    'compare' => '!='
                ]
            ]
        ]);
        
        if (empty($products)) {
            echo '<p>אין מוצרים עם סרטון כרגע.</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>מוצר</th><th>סוג סרטון</th><th>פעולות</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($products as $product) {
            $video_url = get_post_meta($product->ID, '_bellano_product_video', true);
            $video_type = $this->get_video_type($video_url);
            
            echo '<tr>';
            echo '<td><a href="' . get_edit_post_link($product->ID) . '">' . esc_html($product->post_title) . '</a></td>';
            echo '<td>' . esc_html($video_type) . '</td>';
            echo '<td><a href="' . get_edit_post_link($product->ID) . '" class="button">ערוך</a></td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
    }
    
    private function get_video_type($url) {
        if (strpos($url, 'youtube.com') !== false || strpos($url, 'youtu.be') !== false) {
            return '🔴 YouTube';
        }
        if (strpos($url, '.mp4') !== false) {
            return '📁 MP4';
        }
        if (strpos($url, '.webm') !== false) {
            return '📁 WebM';
        }
        return '🔗 קישור';
    }
    
    /**
     * Add product metabox for video
     */
    public function add_product_metabox() {
        add_meta_box(
            'bellano_product_video',
            '🎬 סרטון מוצר',
            [$this, 'render_product_metabox'],
            'product',
            'normal',
            'default'
        );
    }
    
    public function render_product_metabox($post) {
        wp_nonce_field('bellano_product_video', 'bellano_video_nonce');
        
        $video_url = get_post_meta($post->ID, '_bellano_product_video', true);
        $video_thumbnail = get_post_meta($post->ID, '_bellano_product_video_thumbnail', true);
        ?>
        <style>
            .bellano-video-metabox { padding: 15px 0; }
            .bellano-video-metabox label { font-weight: 600; display: block; margin-bottom: 5px; }
            .bellano-video-metabox .field-row { margin-bottom: 20px; }
            .bellano-video-metabox .media-preview { max-width: 300px; margin-top: 10px; border-radius: 8px; }
            .bellano-video-metabox input[type="text"] { width: 100%; }
        </style>
        
        <div class="bellano-video-metabox">
            <div class="field-row">
                <label>🔗 קישור לסרטון</label>
                <input type="text" name="bellano_product_video" id="bellano_video_url_field" 
                       value="<?php echo esc_attr($video_url); ?>" 
                       placeholder="https://... או העלה קובץ">
                <p>
                    <button type="button" class="button bellano-upload-video-btn">📤 העלה סרטון</button>
                    <?php if ($video_url): ?>
                        <button type="button" class="button bellano-remove-video-btn">🗑️ הסר</button>
                    <?php endif; ?>
                </p>
                <p class="description">תומך ב-MP4, WebM, או קישור YouTube</p>
                
                <?php if ($video_url): ?>
                    <div class="bellano-video-preview">
                        <?php if (strpos($video_url, 'youtube.com') !== false || strpos($video_url, 'youtu.be') !== false): ?>
                            <p>✅ סרטון YouTube מוגדר</p>
                        <?php else: ?>
                            <video src="<?php echo esc_url($video_url); ?>" class="media-preview" controls style="max-width:300px;"></video>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
            
            <div class="field-row">
                <label>🖼️ תמונת תצוגה (Thumbnail)</label>
                <input type="text" name="bellano_product_video_thumbnail" id="bellano_video_thumb_field" 
                       value="<?php echo esc_attr($video_thumbnail); ?>" 
                       placeholder="תמונה שתוצג לפני הפעלת הסרטון">
                <p>
                    <button type="button" class="button bellano-upload-thumb-btn">📤 העלה תמונה</button>
                    <?php if ($video_thumbnail): ?>
                        <button type="button" class="button bellano-remove-thumb-btn">🗑️ הסר</button>
                    <?php endif; ?>
                </p>
                <p class="description">מומלץ: יחס תמונה 4:3, רזולוציה 800x600 לפחות</p>
                
                <?php if ($video_thumbnail): ?>
                    <img src="<?php echo esc_url($video_thumbnail); ?>" class="media-preview bellano-thumb-preview">
                <?php endif; ?>
            </div>
        </div>
        
        <script>
        (function($) {
            $(document).ready(function() {
                // Upload video - using unique class
                $(document).on('click', '.bellano-upload-video-btn', function(e) {
                    e.preventDefault();
                    var $input = $('#bellano_video_url_field');
                    var $container = $(this).closest('.field-row');
                    
                    var frame = wp.media({
                        title: 'בחר סרטון',
                        library: { type: 'video' },
                        multiple: false
                    });
                    
                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        console.log('Bellano Video selected:', attachment.url);
                        $input.val(attachment.url);
                        $container.find('.bellano-video-preview').remove();
                        $container.append('<div class="bellano-video-preview"><video src="' + attachment.url + '" class="media-preview" controls style="max-width:300px;"></video></div>');
                    });
                    
                    frame.open();
                });
                
                // Remove video
                $(document).on('click', '.bellano-remove-video-btn', function() {
                    $('#bellano_video_url_field').val('');
                    $(this).closest('.field-row').find('.bellano-video-preview').remove();
                    $(this).remove();
                });
                
                // Upload thumbnail
                $(document).on('click', '.bellano-upload-thumb-btn', function(e) {
                    e.preventDefault();
                    var $input = $('#bellano_video_thumb_field');
                    var $container = $(this).closest('.field-row');
                    
                    var frame = wp.media({
                        title: 'בחר תמונת תצוגה',
                        library: { type: 'image' },
                        multiple: false
                    });
                    
                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        console.log('Bellano Thumbnail selected:', attachment.url);
                        $input.val(attachment.url);
                        $container.find('.bellano-thumb-preview').remove();
                        $container.append('<img src="' + attachment.url + '" class="media-preview bellano-thumb-preview" style="display:block; margin-top:10px;">');
                    });
                    
                    frame.open();
                });
                
                // Remove thumbnail
                $(document).on('click', '.bellano-remove-thumb-btn', function() {
                    $('#bellano_video_thumb_field').val('');
                    $(this).closest('.field-row').find('.bellano-thumb-preview').remove();
                    $(this).remove();
                });
            });
        })(jQuery);
        </script>
        <?php
    }
    
    public function save_product_video($post_id) {
        // Check nonce - but only verify if it exists (might be called from another save)
        if (isset($_POST['bellano_video_nonce'])) {
            if (!wp_verify_nonce($_POST['bellano_video_nonce'], 'bellano_product_video')) {
                return;
            }
        } else {
            // If nonce doesn't exist, the metabox wasn't submitted - skip
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check user can edit
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Debug log
        error_log('Bellano Video Save - POST data: ' . print_r($_POST, true));
        
        // Save video URL
        if (isset($_POST['bellano_product_video'])) {
            $video_url = esc_url_raw($_POST['bellano_product_video']);
            error_log('Bellano Video Save - Video URL: ' . $video_url);
            if (!empty($video_url)) {
                update_post_meta($post_id, '_bellano_product_video', $video_url);
            } else {
                delete_post_meta($post_id, '_bellano_product_video');
            }
        }
        
        // Save thumbnail URL
        if (isset($_POST['bellano_product_video_thumbnail'])) {
            $thumbnail_url = esc_url_raw($_POST['bellano_product_video_thumbnail']);
            if (!empty($thumbnail_url)) {
                update_post_meta($post_id, '_bellano_product_video_thumbnail', $thumbnail_url);
            } else {
                delete_post_meta($post_id, '_bellano_product_video_thumbnail');
            }
        }
    }
    
    /**
     * Get product video data for REST API
     */
    public function get_product_video($product_id) {
        $video_url = get_post_meta($product_id, '_bellano_product_video', true);
        $video_thumbnail = get_post_meta($product_id, '_bellano_product_video_thumbnail', true);
        
        if (empty($video_url)) {
            return null;
        }
        
        // Determine video type
        $video_type = 'file';
        $youtube_id = null;
        
        if (strpos($video_url, 'youtube.com') !== false) {
            $video_type = 'youtube';
            parse_str(parse_url($video_url, PHP_URL_QUERY), $params);
            $youtube_id = $params['v'] ?? null;
        } elseif (strpos($video_url, 'youtu.be') !== false) {
            $video_type = 'youtube';
            $youtube_id = basename(parse_url($video_url, PHP_URL_PATH));
        }
        
        return [
            'url' => $video_url,
            'thumbnail' => $video_thumbnail,
            'type' => $video_type,
            'youtubeId' => $youtube_id,
        ];
    }
}
