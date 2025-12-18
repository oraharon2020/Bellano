<?php
/**
 * Bellano Admin Pages Module
 * Handles admin menu and page rendering
 */

if (!defined('ABSPATH')) exit;

class Bellano_Admin_Pages {
    
    public function add_admin_menu() {
        add_menu_page(
            'הגדרות בלאנו',
            'בלאנו',
            'manage_options',
            'bellano-settings',
            [$this, 'render_admin_page'],
            'dashicons-admin-generic',
            30
        );
    }
    
    public function render_admin_page() {
        $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'homepage';
        $plugin = Bellano_Settings::get_instance();
        ?>
        <div class="wrap bellano-admin" dir="rtl">
            <h1>⚙️ הגדרות בלאנו</h1>
            
            <?php $this->render_styles(); ?>
            
            <nav class="bellano-tabs">
                <a href="?page=bellano-settings&tab=homepage" class="<?php echo $active_tab === 'homepage' ? 'active' : ''; ?>">
                    🏠 עריכת דף בית
                </a>
                <a href="?page=bellano-settings&tab=banners" class="<?php echo $active_tab === 'banners' ? 'active' : ''; ?>">
                    🖼️ באנרים
                </a>
                <a href="?page=bellano-settings&tab=faq" class="<?php echo $active_tab === 'faq' ? 'active' : ''; ?>">
                    ❓ שאלות נפוצות
                </a>
                <a href="?page=bellano-settings&tab=upgrades" class="<?php echo $active_tab === 'upgrades' ? 'active' : ''; ?>">
                    ⬆️ שדרוגים
                </a>
                <a href="?page=bellano-settings&tab=videos" class="<?php echo $active_tab === 'videos' ? 'active' : ''; ?>">
                    🎬 סרטונים
                </a>
                <a href="?page=bellano-settings&tab=cache" class="<?php echo $active_tab === 'cache' ? 'active' : ''; ?>">
                    🗑️ ניקוי קאש
                </a>
            </nav>
            
            <?php
            switch ($active_tab) {
                case 'homepage':
                    $this->render_homepage_tab();
                    break;
                case 'banners':
                    $plugin->banners->render_tab();
                    break;
                case 'faq':
                    $plugin->faq->render_tab();
                    break;
                case 'upgrades':
                    $plugin->upgrades->render_tab();
                    break;
                case 'videos':
                    $plugin->product_video->render_tab();
                    break;
                case 'cache':
                    $plugin->cache->render_tab();
                    break;
                default:
                    $this->render_homepage_tab();
            }
            ?>
        </div>
        <?php
    }
    
    /**
     * Render Homepage Edit Tab
     */
    public function render_homepage_tab() {
        $featured_ids = get_option('bellano_featured_categories', array());
        if (!is_array($featured_ids)) {
            $featured_ids = array();
        }
        
        // Get all product categories - check if WooCommerce is active
        $categories = array();
        if (taxonomy_exists('product_cat')) {
            $terms = get_terms(array(
                'taxonomy' => 'product_cat',
                'hide_empty' => false,
                'parent' => 0,
            ));
            if (!is_wp_error($terms)) {
                $categories = $terms;
            }
        }
        ?>
        <div class="bellano-card">
            <h2>🏷️ קטגוריות מומלצות</h2>
            <p class="description">בחרו עד 8 קטגוריות שיוצגו בסקציית "מה אתם מחפשים?" בעמוד הבית. גררו לשינוי הסדר.</p>
            
            <div class="categories-container" style="display: flex; gap: 30px; margin-top: 20px;">
                <!-- Available Categories -->
                <div class="available-categories" style="flex: 1;">
                    <h4 style="margin-bottom: 10px;">קטגוריות זמינות</h4>
                    <div id="available-list" style="background: #f9f9f9; padding: 15px; border-radius: 8px; min-height: 200px; border: 2px dashed #ddd;">
                        <?php foreach ($categories as $cat): 
                            if (in_array($cat->term_id, $featured_ids)) continue;
                            $thumbnail_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
                            $image_url = $thumbnail_id ? wp_get_attachment_image_url($thumbnail_id, 'thumbnail') : '';
                        ?>
                        <div class="category-item" data-id="<?php echo esc_attr($cat->term_id); ?>" 
                             style="background: white; padding: 10px 12px; margin-bottom: 6px; border-radius: 6px; cursor: move; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e5e5e5;">
                            <?php if ($image_url): ?>
                            <img src="<?php echo esc_url($image_url); ?>" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;">
                            <?php else: ?>
                            <div style="width: 36px; height: 36px; background: #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">📷</div>
                            <?php endif; ?>
                            <span style="flex: 1; font-weight: 500;"><?php echo esc_html($cat->name); ?></span>
                            <span style="color: #999; font-size: 11px;"><?php echo $cat->count; ?> מוצרים</span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                
                <!-- Featured Categories -->
                <div class="featured-categories" style="flex: 1;">
                    <h4 style="margin-bottom: 10px;">✓ קטגוריות נבחרות (עד 8)</h4>
                    <div id="featured-list" style="background: #e8f5e9; padding: 15px; border-radius: 8px; min-height: 200px; border: 2px dashed #4CAF50;">
                        <?php foreach ($featured_ids as $cat_id): 
                            $cat = get_term($cat_id, 'product_cat');
                            if (!$cat || is_wp_error($cat)) continue;
                            $thumbnail_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
                            $image_url = $thumbnail_id ? wp_get_attachment_image_url($thumbnail_id, 'thumbnail') : '';
                        ?>
                        <div class="category-item" data-id="<?php echo esc_attr($cat->term_id); ?>" 
                             style="background: white; padding: 10px 12px; margin-bottom: 6px; border-radius: 6px; cursor: move; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #4CAF50;">
                            <?php if ($image_url): ?>
                            <img src="<?php echo esc_url($image_url); ?>" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;">
                            <?php else: ?>
                            <div style="width: 36px; height: 36px; background: #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">📷</div>
                            <?php endif; ?>
                            <span style="flex: 1; font-weight: 500;"><?php echo esc_html($cat->name); ?></span>
                            <span style="color: #999; font-size: 11px;"><?php echo $cat->count; ?> מוצרים</span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; align-items: center; gap: 15px;">
                <button type="button" id="save-featured-categories" class="button button-primary">
                    💾 שמור קטגוריות
                </button>
                <span id="save-status"></span>
            </div>
        </div>
        
        <!-- Preview -->
        <div class="bellano-card">
            <h2>👁️ תצוגה מקדימה</h2>
            <p class="description">כך הקטגוריות יוצגו בעמוד הבית (2 בשורה במובייל, 4 בשורה בדסקטופ)</p>
            <div id="preview-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 15px; max-width: 800px;">
                <!-- Will be populated by JS -->
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
        <script>
        jQuery(document).ready(function($) {
            // Initialize Sortable for both lists
            new Sortable(document.getElementById('available-list'), {
                group: 'categories',
                animation: 150,
                ghostClass: 'sortable-ghost'
            });
            
            new Sortable(document.getElementById('featured-list'), {
                group: 'categories',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onAdd: function(evt) {
                    var items = evt.to.querySelectorAll('.category-item');
                    if (items.length > 8) {
                        evt.from.appendChild(evt.item);
                        alert('ניתן לבחור עד 8 קטגוריות');
                    }
                    updatePreview();
                },
                onSort: function() {
                    updatePreview();
                },
                onRemove: function() {
                    updatePreview();
                }
            });
            
            function updatePreview() {
                var items = $('#featured-list .category-item');
                var preview = $('#preview-grid');
                preview.empty();
                
                items.each(function() {
                    var img = $(this).find('img').attr('src') || '';
                    var name = $(this).find('span').first().text();
                    
                    var bgStyle = img ? 
                        'background: linear-gradient(to top, rgba(0,0,0,0.7), transparent), url(' + img + ') center/cover;' : 
                        'background: linear-gradient(to top, rgba(0,0,0,0.7), #ccc);';
                    
                    preview.append(
                        '<div style="aspect-ratio: 3/4; ' + bgStyle + ' border-radius: 8px; display: flex; align-items: flex-end; padding: 10px;">' +
                        '<span style="color: white; font-weight: bold; font-size: 13px;">' + name + '</span>' +
                        '</div>'
                    );
                });
                
                if (items.length === 0) {
                    preview.html('<p style="grid-column: 1/-1; color: #999; text-align: center;">גררו קטגוריות לרשימה הנבחרת כדי לראות תצוגה מקדימה</p>');
                }
            }
            
            updatePreview();
            
            $('#save-featured-categories').on('click', function() {
                var button = $(this);
                var status = $('#save-status');
                
                button.prop('disabled', true).html('⏳ שומר...');
                
                var categories = [];
                $('#featured-list .category-item').each(function() {
                    categories.push($(this).data('id'));
                });
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bellano_save_featured_categories',
                        nonce: '<?php echo wp_create_nonce('bellano_featured_categories'); ?>',
                        categories: categories
                    },
                    success: function(response) {
                        if (response.success) {
                            status.html('<span style="color: #4CAF50;">✓ ' + response.data + '</span>');
                        } else {
                            status.html('<span style="color: #f44336;">✗ ' + response.data + '</span>');
                        }
                        button.prop('disabled', false).html('💾 שמור קטגוריות');
                        setTimeout(function() { status.html(''); }, 3000);
                    },
                    error: function() {
                        status.html('<span style="color: #f44336;">✗ שגיאה בשמירה</span>');
                        button.prop('disabled', false).html('💾 שמור קטגוריות');
                    }
                });
            });
        });
        </script>
        
        <style>
            .sortable-ghost { opacity: 0.4; background: #c8ebfb !important; }
            .category-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; }
        </style>
        <?php
    }
    
    private function render_styles() {
        ?>
        <style>
            .bellano-admin { max-width: 1200px; }
            .bellano-tabs { display: flex; gap: 0; margin: 20px 0; border-bottom: 2px solid #0073aa; flex-wrap: wrap; }
            .bellano-tabs a { 
                padding: 12px 24px; 
                text-decoration: none; 
                color: #333; 
                background: #f1f1f1;
                border: 1px solid #ccc;
                border-bottom: none;
                border-radius: 5px 5px 0 0;
                margin-left: -1px;
                font-weight: 500;
            }
            .bellano-tabs a.active { 
                background: #0073aa; 
                color: #fff; 
                border-color: #0073aa;
            }
            .bellano-tabs a:hover:not(.active) { background: #e0e0e0; }
            .bellano-card { 
                background: #fff; 
                padding: 20px; 
                margin: 15px 0; 
                border: 1px solid #ccc; 
                border-radius: 8px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .bellano-card h2 { margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #eee; }
            .media-preview { max-width: 200px; margin-top: 10px; border-radius: 8px; }
            .quick-actions { display: flex; gap: 10px; flex-wrap: wrap; }
            .quick-actions button { padding: 10px 20px; }
        </style>
        <?php
    }
}
