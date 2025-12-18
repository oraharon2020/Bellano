<?php
/**
 * Featured Categories Module
 * Allows selecting which categories appear on homepage
 */

if (!defined('ABSPATH')) {
    exit;
}

class BellanoNext_Featured_Categories {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register REST API endpoint
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Add AJAX handlers
        add_action('wp_ajax_bellano_save_featured_categories', array($this, 'ajax_save_categories'));
    }
    
    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        add_submenu_page(
            'bellanonext-settings',
            'קטגוריות מומלצות',
            'קטגוריות מומלצות',
            'manage_options',
            'bellanonext-featured-categories',
            array($this, 'render_admin_page')
        );
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('bellano/v1', '/featured-categories', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_featured_categories'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Get featured categories for REST API
     */
    public function get_featured_categories() {
        $featured_ids = get_option('bellano_featured_categories', array());
        
        if (empty($featured_ids)) {
            return new WP_REST_Response(array('categories' => array()), 200);
        }
        
        $categories = array();
        
        foreach ($featured_ids as $cat_id) {
            $term = get_term($cat_id, 'product_cat');
            
            if (!$term || is_wp_error($term)) {
                continue;
            }
            
            $thumbnail_id = get_term_meta($cat_id, 'thumbnail_id', true);
            $image_url = '';
            
            if ($thumbnail_id) {
                $image_url = wp_get_attachment_image_url($thumbnail_id, 'large');
            }
            
            $categories[] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
                'description' => $term->description,
                'count' => $term->count,
                'image' => array(
                    'sourceUrl' => $image_url,
                ),
            );
        }
        
        return new WP_REST_Response(array('categories' => $categories), 200);
    }
    
    /**
     * AJAX handler to save featured categories
     */
    public function ajax_save_categories() {
        check_ajax_referer('bellano_featured_categories', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('אין לך הרשאות לביצוע פעולה זו');
        }
        
        $categories = isset($_POST['categories']) ? array_map('intval', $_POST['categories']) : array();
        
        update_option('bellano_featured_categories', $categories);
        
        // Trigger revalidation of homepage
        $this->trigger_revalidation();
        
        wp_send_json_success('הקטגוריות נשמרו בהצלחה');
    }
    
    /**
     * Trigger Next.js revalidation
     */
    private function trigger_revalidation() {
        $nextjs_url = get_option('bellanonext_url', '');
        $revalidate_secret = get_option('bellanonext_revalidate_secret', '');
        
        if (empty($nextjs_url) || empty($revalidate_secret)) {
            return;
        }
        
        $url = trailingslashit($nextjs_url) . 'api/revalidate?secret=' . $revalidate_secret . '&path=/';
        
        wp_remote_get($url, array(
            'timeout' => 5,
            'blocking' => false,
        ));
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        $featured_ids = get_option('bellano_featured_categories', array());
        
        // Get all product categories
        $categories = get_terms(array(
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
            'parent' => 0, // Only parent categories
        ));
        
        ?>
        <div class="wrap">
            <h1>קטגוריות מומלצות בעמוד הבית</h1>
            <p class="description">בחרו עד 8 קטגוריות שיוצגו בסקציית "מה אתם מחפשים?" בעמוד הבית. גררו לשינוי הסדר.</p>
            
            <div id="featured-categories-app">
                <div class="categories-container" style="display: flex; gap: 30px; margin-top: 20px;">
                    <!-- Available Categories -->
                    <div class="available-categories" style="flex: 1;">
                        <h3>קטגוריות זמינות</h3>
                        <div id="available-list" style="background: #f9f9f9; padding: 15px; border-radius: 8px; min-height: 300px;">
                            <?php foreach ($categories as $cat): 
                                if (in_array($cat->term_id, $featured_ids)) continue;
                                $thumbnail_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
                                $image_url = $thumbnail_id ? wp_get_attachment_image_url($thumbnail_id, 'thumbnail') : '';
                            ?>
                            <div class="category-item" data-id="<?php echo esc_attr($cat->term_id); ?>" 
                                 style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 6px; cursor: move; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <?php if ($image_url): ?>
                                <img src="<?php echo esc_url($image_url); ?>" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                                <?php else: ?>
                                <div style="width: 40px; height: 40px; background: #ddd; border-radius: 4px;"></div>
                                <?php endif; ?>
                                <span style="flex: 1;"><?php echo esc_html($cat->name); ?></span>
                                <span style="color: #999; font-size: 12px;"><?php echo $cat->count; ?> מוצרים</span>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    
                    <!-- Featured Categories -->
                    <div class="featured-categories" style="flex: 1;">
                        <h3>קטגוריות נבחרות (עד 8)</h3>
                        <div id="featured-list" style="background: #e8f4e8; padding: 15px; border-radius: 8px; min-height: 300px; border: 2px dashed #4CAF50;">
                            <?php foreach ($featured_ids as $cat_id): 
                                $cat = get_term($cat_id, 'product_cat');
                                if (!$cat || is_wp_error($cat)) continue;
                                $thumbnail_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
                                $image_url = $thumbnail_id ? wp_get_attachment_image_url($thumbnail_id, 'thumbnail') : '';
                            ?>
                            <div class="category-item" data-id="<?php echo esc_attr($cat->term_id); ?>" 
                                 style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 6px; cursor: move; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <?php if ($image_url): ?>
                                <img src="<?php echo esc_url($image_url); ?>" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                                <?php else: ?>
                                <div style="width: 40px; height: 40px; background: #ddd; border-radius: 4px;"></div>
                                <?php endif; ?>
                                <span style="flex: 1;"><?php echo esc_html($cat->name); ?></span>
                                <span style="color: #999; font-size: 12px;"><?php echo $cat->count; ?> מוצרים</span>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="button" id="save-featured-categories" class="button button-primary button-large">
                        שמור קטגוריות
                    </button>
                    <span id="save-status" style="margin-right: 15px;"></span>
                </div>
            </div>
            
            <!-- Preview -->
            <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <h3>תצוגה מקדימה</h3>
                <p class="description">כך הקטגוריות יוצגו בעמוד הבית (2 בשורה במובייל, 4 בשורה בדסקטופ)</p>
                <div id="preview-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px;">
                    <!-- Will be populated by JS -->
                </div>
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
                    // Limit to 8 items
                    var items = evt.to.querySelectorAll('.category-item');
                    if (items.length > 8) {
                        evt.from.appendChild(evt.item);
                        alert('ניתן לבחור עד 8 קטגוריות');
                    }
                    updatePreview();
                },
                onSort: function() {
                    updatePreview();
                }
            });
            
            // Update preview
            function updatePreview() {
                var items = $('#featured-list .category-item');
                var preview = $('#preview-grid');
                preview.empty();
                
                items.each(function() {
                    var img = $(this).find('img').attr('src') || '';
                    var name = $(this).find('span').first().text();
                    
                    preview.append(
                        '<div style="aspect-ratio: 3/4; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent), url(' + img + ') center/cover; border-radius: 8px; display: flex; align-items: flex-end; padding: 10px;">' +
                        '<span style="color: white; font-weight: bold; font-size: 14px;">' + name + '</span>' +
                        '</div>'
                    );
                });
            }
            
            // Initial preview
            updatePreview();
            
            // Save button
            $('#save-featured-categories').on('click', function() {
                var button = $(this);
                var status = $('#save-status');
                
                button.prop('disabled', true).text('שומר...');
                
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
                            status.html('<span style="color: green;">✓ ' + response.data + '</span>');
                        } else {
                            status.html('<span style="color: red;">✗ ' + response.data + '</span>');
                        }
                        button.prop('disabled', false).text('שמור קטגוריות');
                        
                        setTimeout(function() {
                            status.html('');
                        }, 3000);
                    },
                    error: function() {
                        status.html('<span style="color: red;">✗ שגיאה בשמירה</span>');
                        button.prop('disabled', false).text('שמור קטגוריות');
                    }
                });
            });
        });
        </script>
        
        <style>
            .sortable-ghost {
                opacity: 0.4;
                background: #c8ebfb;
            }
            .category-item:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
        </style>
        <?php
    }
}

// Initialize
BellanoNext_Featured_Categories::get_instance();
