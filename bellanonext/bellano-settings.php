<?php
/**
 * Plugin Name: Bellano Settings
 * Description: הגדרות מרכזיות לאתר בלאנו - באנרים, קאש ושאלות נפוצות למוצרים
 * Version: 1.0.0
 * Author: Bellano
 * Text Domain: bellano-settings
 */

if (!defined('ABSPATH')) exit;

class Bellano_Settings {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'admin_scripts']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('add_meta_boxes', [$this, 'add_product_metabox']);
        add_action('save_post_product', [$this, 'save_product_faq']);
        
        // Auto-clear hooks
        add_action('update_option_bellano_banners', [$this, 'clear_homepage_cache']);
        add_action('woocommerce_update_product', [$this, 'clear_product_cache']);
        add_action('edited_product_cat', [$this, 'clear_category_cache']);
    }
    
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
    
    public function register_settings() {
        // Banners
        register_setting('bellano_settings', 'bellano_banners');
        // Cache
        register_setting('bellano_settings', 'bellano_vercel_revalidate_url');
        register_setting('bellano_settings', 'bellano_vercel_revalidate_token');
        // FAQ
        register_setting('bellano_settings', 'bellano_faq_templates');
        register_setting('bellano_settings', 'bellano_faq_default_template');
    }
    
    public function admin_scripts($hook) {
        if (strpos($hook, 'bellano') === false && $hook !== 'post.php' && $hook !== 'post-new.php') {
            return;
        }
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
    }
    
    public function render_admin_page() {
        $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'banners';
        ?>
        <div class="wrap bellano-admin" dir="rtl">
            <h1>⚙️ הגדרות בלאנו</h1>
            
            <style>
                .bellano-admin { max-width: 1200px; }
                .bellano-tabs { display: flex; gap: 0; margin: 20px 0; border-bottom: 2px solid #0073aa; }
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
                .quick-actions { display: flex; gap: 10px; flex-wrap: wrap; }
                .quick-actions button { padding: 10px 20px; }
                .faq-item { 
                    background: #f9f9f9; 
                    padding: 15px; 
                    margin: 10px 0; 
                    border-radius: 5px; 
                    border: 1px solid #ddd;
                }
                .media-preview { max-width: 200px; margin-top: 10px; border-radius: 8px; }
                .template-section { margin: 20px 0; padding: 20px; background: #f0f0f1; border-radius: 8px; }
                .template-section h3 { margin-top: 0; }
            </style>
            
            <nav class="bellano-tabs">
                <a href="?page=bellano-settings&tab=banners" class="<?php echo $active_tab === 'banners' ? 'active' : ''; ?>">
                    🖼️ באנרים
                </a>
                <a href="?page=bellano-settings&tab=faq" class="<?php echo $active_tab === 'faq' ? 'active' : ''; ?>">
                    ❓ שאלות נפוצות
                </a>
                <a href="?page=bellano-settings&tab=upgrades" class="<?php echo $active_tab === 'upgrades' ? 'active' : ''; ?>">
                    ⬆️ שדרוגים
                </a>
                <a href="?page=bellano-settings&tab=cache" class="<?php echo $active_tab === 'cache' ? 'active' : ''; ?>">
                    🗑️ ניקוי קאש
                </a>
            </nav>
            
            <?php
            switch ($active_tab) {
                case 'faq':
                    $this->render_faq_tab();
                    break;
                case 'upgrades':
                    $this->render_upgrades_tab();
                    break;
                case 'cache':
                    $this->render_cache_tab();
                    break;
                default:
                    $this->render_banners_tab();
            }
            ?>
        </div>
        <?php
    }
    
    // ========================================
    // BANNERS TAB
    // ========================================
    
    private function render_banners_tab() {
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
        
        <script>
        jQuery(document).ready(function($) {
            var bannerIndex = <?php echo count($banners); ?>;
            
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
    
    private function render_banner_item($index, $banner = []) {
        $mediaType = $banner['mediaType'] ?? 'image';
        ?>
        <div class="banner-item">
            <div class="banner-header">
                <h3>באנר #<span class="banner-number"><?php echo $index + 1; ?></span></h3>
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
                                <option value="normal" <?php selected($banner['titleWeight'] ?? '', 'normal'); ?>>רגיל</option>
                                <option value="bold" <?php selected($banner['titleWeight'] ?? 'bold', 'bold'); ?>>בולט</option>
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
                        </td>
                    </tr>
                    <tr>
                        <th>כפתור</th>
                        <td>
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][buttonText]" value="<?php echo esc_attr($banner['buttonText'] ?? ''); ?>" placeholder="טקסט" style="width: 150px;">
                            <input type="text" name="bellano_banners[<?php echo $index; ?>][buttonLink]" value="<?php echo esc_attr($banner['buttonLink'] ?? ''); ?>" placeholder="קישור" style="width: 200px;">
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
    
    // ========================================
    // FAQ TAB
    // ========================================
    
    private function render_faq_tab() {
        $templates = get_option('bellano_faq_templates', $this->get_default_faq_templates());
        $default_template = get_option('bellano_faq_default_template', 'standard');
        
        // Handle save
        if (isset($_POST['save_faq']) && check_admin_referer('bellano_faq_save')) {
            if (isset($_POST['templates'])) {
                $templates = $this->sanitize_faq_templates($_POST['templates']);
                update_option('bellano_faq_templates', $templates);
            }
            if (isset($_POST['default_template'])) {
                update_option('bellano_faq_default_template', sanitize_text_field($_POST['default_template']));
                $default_template = $_POST['default_template'];
            }
            echo '<div class="notice notice-success"><p>✅ השאלות נשמרו בהצלחה!</p></div>';
        }
        ?>
        <form method="post">
            <?php wp_nonce_field('bellano_faq_save'); ?>
            
            <div class="bellano-card">
                <h2>❓ תבניות שאלות נפוצות</h2>
                <p>הגדר תבניות שאלות ותשובות שיופיעו בדפי המוצרים. ניתן לבחור תבנית שונה לכל מוצר.</p>
                
                <p>
                    <label><strong>תבנית ברירת מחדל:</strong></label>
                    <select name="default_template">
                        <?php foreach ($templates as $key => $template): ?>
                            <option value="<?php echo esc_attr($key); ?>" <?php selected($default_template, $key); ?>>
                                <?php echo esc_html($template['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </p>
            </div>
            
            <?php foreach ($templates as $key => $template): ?>
                <div class="bellano-card template-section">
                    <h3>📋 <?php echo esc_html($template['name']); ?></h3>
                    <input type="hidden" name="templates[<?php echo $key; ?>][name]" value="<?php echo esc_attr($template['name']); ?>">
                    
                    <div class="faq-items" data-template="<?php echo $key; ?>">
                        <?php 
                        if (!empty($template['faqs'])):
                            foreach ($template['faqs'] as $faqIndex => $faq): 
                        ?>
                            <div class="faq-item">
                                <p>
                                    <label>שאלה:</label><br>
                                    <input type="text" name="templates[<?php echo $key; ?>][faqs][<?php echo $faqIndex; ?>][question]" 
                                           value="<?php echo esc_attr($faq['question']); ?>" class="large-text">
                                </p>
                                <p>
                                    <label>תשובה:</label><br>
                                    <textarea name="templates[<?php echo $key; ?>][faqs][<?php echo $faqIndex; ?>][answer]" 
                                              rows="2" class="large-text"><?php echo esc_textarea($faq['answer']); ?></textarea>
                                </p>
                                <button type="button" class="button remove-faq">🗑️ הסר</button>
                            </div>
                        <?php 
                            endforeach;
                        endif; 
                        ?>
                    </div>
                    <button type="button" class="button add-faq" data-template="<?php echo $key; ?>">➕ הוסף שאלה</button>
                </div>
            <?php endforeach; ?>
            
            <button type="submit" name="save_faq" class="button button-primary button-hero">💾 שמור שאלות נפוצות</button>
        </form>
        
        <script>
        jQuery(document).ready(function($) {
            // Add FAQ
            $('.add-faq').click(function() {
                var template = $(this).data('template');
                var container = $(this).siblings('.faq-items');
                var index = container.children().length;
                
                container.append(`
                    <div class="faq-item">
                        <p>
                            <label>שאלה:</label><br>
                            <input type="text" name="templates[${template}][faqs][${index}][question]" class="large-text">
                        </p>
                        <p>
                            <label>תשובה:</label><br>
                            <textarea name="templates[${template}][faqs][${index}][answer]" rows="2" class="large-text"></textarea>
                        </p>
                        <button type="button" class="button remove-faq">🗑️ הסר</button>
                    </div>
                `);
            });
            
            // Remove FAQ
            $(document).on('click', '.remove-faq', function() {
                $(this).closest('.faq-item').remove();
            });
        });
        </script>
        <?php
    }
    
    public function get_default_faq_templates() {
        return [
            'standard' => [
                'name' => 'רהיטים מעץ (ברירת מחדל)',
                'faqs' => [
                    ['question' => 'זמני אספקה', 'answer' => 'זמני האספקה נעים בין 12-26 ימי עסקים, בהתאם לסוג המוצר והזמינות במלאי. מוצרים בהתאמה אישית עשויים לדרוש זמן ייצור ארוך יותר. נציג שירות יצור אתכם קשר לתיאום מועד אספקה נוח.'],
                    ['question' => 'אחריות המוצרים', 'answer' => 'שנה אחריות מלאה על המוצר מיום הקנייה. האחריות מכסה פגמים במבנה ובייצור. האחריות אינה כוללת בלאי טבעי, נזק שנגרם משימוש לא נכון, או נזקי הובלה לאחר מסירת המוצר.'],
                    ['question' => 'נקיון ותחזוקת המוצרים', 'answer' => 'מומלץ לנקות את המוצר באופן קבוע עם מטלית רכה ויבשה. להסרת כתמים, השתמשו במטלית לחה עם מעט סבון עדין. הימנעו משימוש בחומרי ניקוי אגרסיביים או שוחקים. מומלץ להרחיק את המוצר ממקורות חום ישירים ומלחות גבוהה.'],
                    ['question' => 'אפשרויות תשלום', 'answer' => 'אנו מציעים מגוון אפשרויות תשלום נוחות: תשלום מאובטח בכרטיס אשראי, עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית. כל התשלומים מאובטחים בתקן PCI DSS.'],
                    ['question' => 'משלוח והובלה', 'answer' => 'משלוח חינם עד הבית! ההובלה כוללת הכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית. נציג יתאם אתכם מועד אספקה נוח מראש.'],
                ]
            ],
            'custom' => [
                'name' => 'ייצור בהתאמה אישית',
                'faqs' => [
                    ['question' => 'זמני אספקה', 'answer' => 'זמני הייצור למוצרים בהתאמה אישית הם כ-21-30 ימי עסקים. המוצר מיוצר בהזמנה אישית בדיוק לפי הצבע והמידות שבחרתם. נציג שירות יצור אתכם קשר לתיאום מועד אספקה.'],
                    ['question' => 'אחריות המוצרים', 'answer' => 'שנה אחריות מלאה על המוצר מיום הקנייה. האחריות מכסה פגמים במבנה ובייצור. אנו גאים באיכות המוצרים שלנו ועומדים מאחוריהם לאורך זמן.'],
                    ['question' => 'האם ניתן להזמין במידות מיוחדות?', 'answer' => 'בהחלט! המוצר מיוצר בארץ וניתן להתאים אותו למידות ספציפיות לפי הצורך שלכם. צרו קשר לקבלת הצעת מחיר מותאמת.'],
                    ['question' => 'נקיון ותחזוקת המוצרים', 'answer' => 'מומלץ לנקות את המוצר באופן קבוע עם מטלית רכה ויבשה. להסרת כתמים, השתמשו במטלית לחה עם מעט סבון עדין. הימנעו משימוש בחומרי ניקוי אגרסיביים.'],
                    ['question' => 'אפשרויות תשלום', 'answer' => 'אנו מציעים מגוון אפשרויות תשלום נוחות: תשלום מאובטח בכרטיס אשראי, עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית.'],
                    ['question' => 'משלוח והובלה', 'answer' => 'משלוח חינם עד הבית! ההובלה כוללת הכנסה והרכבה מלאה בביתכם ללא עלות נוספת.'],
                    ['question' => 'מדיניות ביטולים', 'answer' => 'מכיוון שהמוצר מיוצר בהזמנה אישית, ניתן לבטל תוך 24 שעות מרגע ביצוע ההזמנה. לאחר תחילת הייצור לא ניתן לבטל את ההזמנה.'],
                ]
            ],
            'upholstery' => [
                'name' => 'ריפוד (כורסאות/מיטות)',
                'faqs' => [
                    ['question' => 'זמני אספקה', 'answer' => 'זמני הייצור לפריטי ריפוד הם כ-30-45 ימי עסקים, בהתאם לסוג הבד והמורכבות. המוצר מיוצר בהזמנה אישית לפי בחירתכם.'],
                    ['question' => 'אחריות המוצרים', 'answer' => 'שנתיים אחריות על השלד והמנגנונים, ושנה על הריפוד. האחריות אינה כוללת בלאי טבעי של הבד או נזק שנגרם משימוש לא נכון.'],
                    ['question' => 'האם ניתן לבחור בד אחר?', 'answer' => 'בהחלט! יש לנו מגוון רחב של בדים ועורות. מוזמנים להגיע לאולם התצוגה לראות את הדוגמאות או לבקש משלוח דוגמיות לבית.'],
                    ['question' => 'נקיון ותחזוקת הריפוד', 'answer' => 'מומלץ לנקות כתמים מיד עם מטלית לחה. לניקוי יסודי יש להשתמש בתכשיר ייעודי לבדים. הימנעו מחשיפה ישירה לשמש ממושכת.'],
                    ['question' => 'אפשרויות תשלום', 'answer' => 'אנו מציעים מגוון אפשרויות תשלום נוחות: תשלום מאובטח בכרטיס אשראי, עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית.'],
                    ['question' => 'משלוח והובלה', 'answer' => 'משלוח חינם עד הבית! ההובלה כוללת הכנסה והרכבה מלאה בביתכם ללא עלות נוספת.'],
                ]
            ],
        ];
    }
    
    private function sanitize_faq_templates($templates) {
        $sanitized = [];
        foreach ($templates as $key => $template) {
            $sanitized[$key] = [
                'name' => sanitize_text_field($template['name']),
                'faqs' => []
            ];
            if (!empty($template['faqs'])) {
                foreach ($template['faqs'] as $faq) {
                    if (!empty($faq['question'])) {
                        $sanitized[$key]['faqs'][] = [
                            'question' => sanitize_text_field($faq['question']),
                            'answer' => sanitize_textarea_field($faq['answer'])
                        ];
                    }
                }
            }
        }
        return $sanitized;
    }
    
    // ========================================
    // UPGRADES TAB
    // ========================================
    
    private function render_upgrades_tab() {
        // Handle form submission
        if (isset($_POST['save_upgrades']) && check_admin_referer('bellano_upgrades_action')) {
            $upgrades = [];
            if (!empty($_POST['upgrades']) && is_array($_POST['upgrades'])) {
                foreach ($_POST['upgrades'] as $upgrade) {
                    if (!empty($upgrade['name']) && isset($upgrade['price'])) {
                        $upgrades[] = [
                            'name' => sanitize_text_field($upgrade['name']),
                            'price' => floatval($upgrade['price']),
                        ];
                    }
                }
            }
            update_option('bellano_admin_upgrades', $upgrades);
            echo '<div class="notice notice-success"><p>✅ השדרוגים נשמרו בהצלחה!</p></div>';
        }
        
        $upgrades = get_option('bellano_admin_upgrades', []);
        if (!is_array($upgrades)) $upgrades = [];
        ?>
        <form method="post">
            <?php wp_nonce_field('bellano_upgrades_action'); ?>
            
            <div class="bellano-card">
                <h2>⬆️ שדרוגים למכירות</h2>
                <p>הגדר שדרוגים זמינים שנציגי מכירות יכולים להוסיף למוצרים. השדרוגים יופיעו בתיבת "שינוי נתונים - למנהלים" בעמוד המוצר.</p>
                
                <div id="upgrades-container">
                    <?php foreach ($upgrades as $index => $upgrade): ?>
                    <div class="upgrade-item" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid #ddd; display: flex; gap: 15px; align-items: center;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">שם השדרוג</label>
                            <input type="text" name="upgrades[<?php echo $index; ?>][name]" value="<?php echo esc_attr($upgrade['name']); ?>" class="regular-text" style="width: 100%;">
                        </div>
                        <div style="width: 150px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">מחיר (₪)</label>
                            <input type="number" name="upgrades[<?php echo $index; ?>][price]" value="<?php echo esc_attr($upgrade['price']); ?>" step="0.01" min="0" style="width: 100%;">
                        </div>
                        <button type="button" class="button remove-upgrade" style="margin-top: 20px;">❌</button>
                    </div>
                    <?php endforeach; ?>
                </div>
                
                <button type="button" id="add-upgrade" class="button button-secondary" style="margin-top: 15px;">
                    ➕ הוסף שדרוג
                </button>
            </div>
            
            <p>
                <input type="submit" name="save_upgrades" class="button button-primary" value="💾 שמור שדרוגים" style="font-size: 16px; padding: 8px 24px;">
            </p>
        </form>
        
        <script>
        jQuery(document).ready(function($) {
            var upgradeIndex = <?php echo count($upgrades); ?>;
            
            $('#add-upgrade').on('click', function() {
                var html = `
                    <div class="upgrade-item" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid #ddd; display: flex; gap: 15px; align-items: center;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">שם השדרוג</label>
                            <input type="text" name="upgrades[${upgradeIndex}][name]" class="regular-text" style="width: 100%;" placeholder="למשל: התקנה">
                        </div>
                        <div style="width: 150px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">מחיר (₪)</label>
                            <input type="number" name="upgrades[${upgradeIndex}][price]" step="0.01" min="0" style="width: 100%;" placeholder="0">
                        </div>
                        <button type="button" class="button remove-upgrade" style="margin-top: 20px;">❌</button>
                    </div>
                `;
                $('#upgrades-container').append(html);
                upgradeIndex++;
            });
            
            $(document).on('click', '.remove-upgrade', function() {
                $(this).closest('.upgrade-item').remove();
            });
        });
        </script>
        <?php
    }
    
    // ========================================
    // CACHE TAB
    // ========================================
    
    private function render_cache_tab() {
        $revalidate_url = get_option('bellano_vercel_revalidate_url', '');
        $revalidate_token = get_option('bellano_vercel_revalidate_token', '');
        
        // Handle cache clear
        if (isset($_POST['clear_cache']) && check_admin_referer('bellano_cache_action')) {
            $result = $this->clear_vercel_cache('/');
            if ($result['success']) {
                echo '<div class="notice notice-success"><p>✅ הקאש נוקה בהצלחה!</p></div>';
            } else {
                echo '<div class="notice notice-error"><p>❌ שגיאה: ' . esc_html($result['message']) . '</p></div>';
            }
        }
        
        // Handle clear specific path
        if (isset($_POST['clear_path']) && check_admin_referer('bellano_cache_action')) {
            $path = sanitize_text_field($_POST['cache_path']);
            $result = $this->clear_vercel_cache($path);
            if ($result['success']) {
                echo '<div class="notice notice-success"><p>✅ הקאש של ' . esc_html($path) . ' נוקה בהצלחה!</p></div>';
            } else {
                echo '<div class="notice notice-error"><p>❌ שגיאה: ' . esc_html($result['message']) . '</p></div>';
            }
        }
        ?>
        <div class="bellano-card">
            <h2>⚙️ הגדרות Vercel</h2>
            <form method="post" action="options.php">
                <?php settings_fields('bellano_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th><label>כתובת ה-Revalidate</label></th>
                        <td>
                            <input type="url" name="bellano_vercel_revalidate_url" value="<?php echo esc_attr($revalidate_url); ?>" class="regular-text" placeholder="https://bellano.vercel.app/api/revalidate">
                            <p class="description">הכתובת של ה-API route לניקוי קאש</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label>טוקן אבטחה</label></th>
                        <td>
                            <input type="text" name="bellano_vercel_revalidate_token" value="<?php echo esc_attr($revalidate_token); ?>" class="regular-text">
                            <p class="description">טוקן סודי לאימות הבקשה</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('💾 שמור הגדרות'); ?>
            </form>
        </div>
        
        <div class="bellano-card">
            <h2>⚡ פעולות מהירות</h2>
            <form method="post">
                <?php wp_nonce_field('bellano_cache_action'); ?>
                <div class="quick-actions">
                    <button type="submit" name="clear_cache" value="all" class="button button-primary button-hero">
                        🗑️ נקה את כל הקאש
                    </button>
                </div>
            </form>
        </div>
        
        <div class="bellano-card">
            <h2>🎯 ניקוי נתיב ספציפי</h2>
            <form method="post">
                <?php wp_nonce_field('bellano_cache_action'); ?>
                <input type="text" name="cache_path" class="regular-text" placeholder="/" value="/">
                <button type="submit" name="clear_path" class="button button-secondary">נקה נתיב</button>
                <p class="description">לדוגמה: / (דף הבית), /categories, /product/chair-name</p>
            </form>
        </div>
        
        <div class="bellano-card">
            <h2>📍 נתיבים נפוצים</h2>
            <div class="quick-actions">
                <?php 
                $paths = [
                    '/' => '🏠 דף הבית',
                    '/categories' => '📂 קטגוריות',
                    '/about' => 'ℹ️ אודות',
                    '/contact' => '📞 צור קשר',
                ];
                foreach ($paths as $path => $label): 
                ?>
                    <form method="post" style="display: inline;">
                        <?php wp_nonce_field('bellano_cache_action'); ?>
                        <input type="hidden" name="cache_path" value="<?php echo esc_attr($path); ?>">
                        <button type="submit" name="clear_path" class="button"><?php echo $label; ?></button>
                    </form>
                <?php endforeach; ?>
            </div>
        </div>
        
        <div class="bellano-card">
            <h2>🤖 ניקוי אוטומטי</h2>
            <p>הקאש מתנקה אוטומטית כאשר:</p>
            <ul style="list-style: disc; padding-right: 20px;">
                <li>✅ מעדכנים באנר בדף הבית</li>
                <li>✅ מוסיפים/מעדכנים מוצר ב-WooCommerce</li>
                <li>✅ מעדכנים קטגוריה</li>
            </ul>
        </div>
        <?php
    }
    
    public function clear_vercel_cache($path = '/') {
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
            'headers' => ['Content-Type' => 'application/json']
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
    
    // Auto-clear hooks
    public function clear_homepage_cache() {
        $this->clear_vercel_cache('/');
    }
    
    public function clear_product_cache($product_id) {
        $product = wc_get_product($product_id);
        if ($product) {
            $this->clear_vercel_cache('/product/' . $product->get_slug());
            $this->clear_vercel_cache('/');
        }
    }
    
    public function clear_category_cache($term_id) {
        $term = get_term($term_id, 'product_cat');
        if ($term && !is_wp_error($term)) {
            $this->clear_vercel_cache('/category/' . $term->slug);
            $this->clear_vercel_cache('/categories');
        }
    }
    
    // ========================================
    // PRODUCT METABOX (FAQ per product)
    // ========================================
    
    public function add_product_metabox() {
        add_meta_box(
            'bellano_product_faq',
            '❓ שאלות ותשובות',
            [$this, 'render_product_metabox'],
            'product',
            'normal',
            'default'
        );
    }
    
    public function render_product_metabox($post) {
        wp_nonce_field('bellano_product_faq', 'bellano_faq_nonce');
        
        $templates = get_option('bellano_faq_templates', $this->get_default_faq_templates());
        $default_template = get_option('bellano_faq_default_template', 'standard');
        
        $product_template = get_post_meta($post->ID, '_bellano_faq_template', true);
        $use_custom = get_post_meta($post->ID, '_bellano_faq_custom', true);
        $custom_faqs = get_post_meta($post->ID, '_bellano_faq_items', true);
        
        if (empty($product_template)) {
            $product_template = $default_template;
        }
        ?>
        <style>
            .bellano-metabox label { font-weight: 600; }
            .bellano-metabox .custom-faq-item { background: #f9f9f9; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
        
        <div class="bellano-metabox">
            <p>
                <label>
                    <input type="checkbox" name="bellano_faq_custom" value="1" <?php checked($use_custom, '1'); ?> id="use-custom-toggle">
                    השתמש בשאלות מותאמות אישית (במקום תבנית)
                </label>
            </p>
            
            <div id="template-select" style="<?php echo $use_custom ? 'display:none;' : ''; ?>">
                <p>
                    <label>בחר תבנית:</label>
                    <select name="bellano_faq_template">
                        <?php foreach ($templates as $key => $template): ?>
                            <option value="<?php echo esc_attr($key); ?>" <?php selected($product_template, $key); ?>>
                                <?php echo esc_html($template['name']); ?>
                                <?php if ($key === $default_template) echo ' (ברירת מחדל)'; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </p>
                <p class="description">
                    <a href="<?php echo admin_url('admin.php?page=bellano-settings&tab=faq'); ?>" target="_blank">ערוך תבניות →</a>
                </p>
            </div>
            
            <div id="custom-faqs" style="<?php echo $use_custom ? '' : 'display:none;'; ?>">
                <h4>שאלות מותאמות אישית:</h4>
                <div id="custom-faq-items">
                    <?php 
                    if (!empty($custom_faqs) && is_array($custom_faqs)):
                        foreach ($custom_faqs as $index => $faq): 
                    ?>
                        <div class="custom-faq-item">
                            <p>
                                <label>שאלה:</label>
                                <input type="text" name="bellano_custom_faqs[<?php echo $index; ?>][question]" 
                                       value="<?php echo esc_attr($faq['question']); ?>" class="large-text">
                            </p>
                            <p>
                                <label>תשובה:</label>
                                <textarea name="bellano_custom_faqs[<?php echo $index; ?>][answer]" 
                                          rows="2" class="large-text"><?php echo esc_textarea($faq['answer']); ?></textarea>
                            </p>
                            <button type="button" class="button remove-custom-faq">🗑️ הסר</button>
                        </div>
                    <?php 
                        endforeach;
                    endif; 
                    ?>
                </div>
                <button type="button" class="button" id="add-custom-faq">➕ הוסף שאלה</button>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#use-custom-toggle').change(function() {
                $('#template-select').toggle(!this.checked);
                $('#custom-faqs').toggle(this.checked);
            });
            
            var faqIndex = <?php echo !empty($custom_faqs) ? count($custom_faqs) : 0; ?>;
            
            $('#add-custom-faq').click(function() {
                $('#custom-faq-items').append(`
                    <div class="custom-faq-item">
                        <p>
                            <label>שאלה:</label>
                            <input type="text" name="bellano_custom_faqs[${faqIndex}][question]" class="large-text">
                        </p>
                        <p>
                            <label>תשובה:</label>
                            <textarea name="bellano_custom_faqs[${faqIndex}][answer]" rows="2" class="large-text"></textarea>
                        </p>
                        <button type="button" class="button remove-custom-faq">🗑️ הסר</button>
                    </div>
                `);
                faqIndex++;
            });
            
            $(document).on('click', '.remove-custom-faq', function() {
                $(this).closest('.custom-faq-item').remove();
            });
        });
        </script>
        <?php
    }
    
    public function save_product_faq($post_id) {
        if (!isset($_POST['bellano_faq_nonce']) || !wp_verify_nonce($_POST['bellano_faq_nonce'], 'bellano_product_faq')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Save template choice
        if (isset($_POST['bellano_faq_template'])) {
            update_post_meta($post_id, '_bellano_faq_template', sanitize_text_field($_POST['bellano_faq_template']));
        }
        
        // Save custom toggle
        update_post_meta($post_id, '_bellano_faq_custom', isset($_POST['bellano_faq_custom']) ? '1' : '');
        
        // Save custom FAQs
        if (isset($_POST['bellano_custom_faqs']) && is_array($_POST['bellano_custom_faqs'])) {
            $custom_faqs = [];
            foreach ($_POST['bellano_custom_faqs'] as $faq) {
                if (!empty($faq['question'])) {
                    $custom_faqs[] = [
                        'question' => sanitize_text_field($faq['question']),
                        'answer' => sanitize_textarea_field($faq['answer'])
                    ];
                }
            }
            update_post_meta($post_id, '_bellano_faq_items', $custom_faqs);
        } else {
            delete_post_meta($post_id, '_bellano_faq_items');
        }
    }
    
    // ========================================
    // REST API
    // ========================================
    
    public function register_rest_routes() {
        // Homepage banners
        register_rest_route('bellano/v1', '/homepage', [
            'methods' => 'GET',
            'callback' => [$this, 'get_homepage_data'],
            'permission_callback' => '__return_true'
        ]);
        
        // Product FAQ
        register_rest_route('bellano/v1', '/product-faq/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_product_faq'],
            'permission_callback' => '__return_true'
        ]);
        
        // FAQ Templates
        register_rest_route('bellano/v1', '/faq-templates', [
            'methods' => 'GET',
            'callback' => [$this, 'get_faq_templates'],
            'permission_callback' => '__return_true'
        ]);
        
        // Cart - Create checkout with items
        register_rest_route('bellano/v1', '/create-checkout', [
            'methods' => 'POST',
            'callback' => [$this, 'create_checkout'],
            'permission_callback' => '__return_true'
        ]);
        
        // Cart - Get checkout URL for items
        register_rest_route('bellano/v1', '/checkout-url', [
            'methods' => 'POST',
            'callback' => [$this, 'get_checkout_url'],
            'permission_callback' => '__return_true'
        ]);
        
        // Meshulam webhook - Called after payment
        register_rest_route('bellano/v1', '/meshulam-webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_meshulam_webhook'],
            'permission_callback' => '__return_true'
        ]);
        
        // Meshulam config - Get userId for Next.js checkout
        register_rest_route('bellano/v1', '/meshulam-config', [
            'methods' => 'GET',
            'callback' => [$this, 'get_meshulam_config'],
            'permission_callback' => '__return_true'
        ]);
        
        // Check if current user is admin (for sales rep features)
        register_rest_route('bellano/v1', '/check-admin', [
            'methods' => 'GET',
            'callback' => [$this, 'check_user_is_admin'],
            'permission_callback' => '__return_true'
        ]);
        
        // Get admin upgrades list
        register_rest_route('bellano/v1', '/admin-upgrades', [
            'methods' => 'GET',
            'callback' => [$this, 'get_admin_upgrades'],
            'permission_callback' => function() {
                return current_user_can('administrator');
            }
        ]);
        
        // Admin login - authenticate and return token
        register_rest_route('bellano/v1', '/admin-login', [
            'methods' => 'POST',
            'callback' => [$this, 'admin_login'],
            'permission_callback' => '__return_true'
        ]);
        
        // Verify admin token
        register_rest_route('bellano/v1', '/verify-admin-token', [
            'methods' => 'POST',
            'callback' => [$this, 'verify_admin_token'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    /**
     * Check if the current user is an administrator
     * Used for admin/sales rep fields on product pages
     */
    public function check_user_is_admin() {
        $is_admin = current_user_can('administrator');
        $user = wp_get_current_user();
        
        $response = [
            'isAdmin' => $is_admin,
            'userId' => $user->ID,
            'userName' => $is_admin ? $user->display_name : '',
        ];
        
        // If admin, also return available upgrades
        if ($is_admin) {
            $upgrades = get_option('bellano_admin_upgrades', []);
            if (!is_array($upgrades)) {
                $upgrades = [];
            }
            $response['upgrades'] = $upgrades;
        }
        
        return new WP_REST_Response($response, 200);
    }
    
    /**
     * Get admin upgrades list (for logged-in admins)
     */
    public function get_admin_upgrades() {
        $upgrades = get_option('bellano_admin_upgrades', []);
        return new WP_REST_Response(['upgrades' => $upgrades], 200);
    }
    
    /**
     * Admin login - authenticate user and return a token
     */
    public function admin_login($request) {
        $params = $request->get_json_params();
        $username = isset($params['username']) ? sanitize_text_field($params['username']) : '';
        $password = isset($params['password']) ? $params['password'] : '';
        
        if (empty($username) || empty($password)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'נא להזין שם משתמש וסיסמה'
            ], 400);
        }
        
        // Authenticate user
        $user = wp_authenticate($username, $password);
        
        if (is_wp_error($user)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'שם משתמש או סיסמה שגויים'
            ], 401);
        }
        
        // Check if user is admin
        if (!user_can($user, 'administrator')) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'אין לך הרשאות מנהל'
            ], 403);
        }
        
        // Generate a simple token (user_id + timestamp + secret hash)
        $token_data = $user->ID . '|' . time() . '|' . wp_generate_password(32, false);
        $token = base64_encode($token_data);
        
        // Store token in user meta (valid for 24 hours)
        update_user_meta($user->ID, '_bellano_admin_token', $token);
        update_user_meta($user->ID, '_bellano_admin_token_expires', time() + (24 * 60 * 60));
        
        // Get upgrades
        $upgrades = get_option('bellano_admin_upgrades', []);
        if (!is_array($upgrades)) {
            $upgrades = [];
        }
        
        return new WP_REST_Response([
            'success' => true,
            'token' => $token,
            'userName' => $user->display_name,
            'upgrades' => $upgrades,
        ], 200);
    }
    
    /**
     * Verify admin token
     */
    public function verify_admin_token($request) {
        $params = $request->get_json_params();
        $token = isset($params['token']) ? $params['token'] : '';
        
        if (empty($token)) {
            return new WP_REST_Response(['valid' => false], 200);
        }
        
        // Find user with this token
        $users = get_users([
            'meta_key' => '_bellano_admin_token',
            'meta_value' => $token,
            'number' => 1
        ]);
        
        if (empty($users)) {
            return new WP_REST_Response(['valid' => false], 200);
        }
        
        $user = $users[0];
        
        // Check if token expired
        $expires = get_user_meta($user->ID, '_bellano_admin_token_expires', true);
        if ($expires && $expires < time()) {
            // Token expired
            delete_user_meta($user->ID, '_bellano_admin_token');
            delete_user_meta($user->ID, '_bellano_admin_token_expires');
            return new WP_REST_Response(['valid' => false, 'message' => 'Token expired'], 200);
        }
        
        // Check if still admin
        if (!user_can($user, 'administrator')) {
            return new WP_REST_Response(['valid' => false], 200);
        }
        
        // Get upgrades
        $upgrades = get_option('bellano_admin_upgrades', []);
        if (!is_array($upgrades)) {
            $upgrades = [];
        }
        
        return new WP_REST_Response([
            'valid' => true,
            'userId' => $user->ID,
            'userName' => $user->display_name,
            'upgrades' => $upgrades,
        ], 200);
    }
    
    /**
     * Get Meshulam configuration for Next.js checkout
     * Returns the userId which is stored in WordPress
     */
    public function get_meshulam_config() {
        $userId = get_option('meshulam_bit_payment_code', '');
        
        return [
            'userId' => $userId,
            'hasConfig' => !empty($userId),
        ];
    }
    
    /**
     * Handle Meshulam payment webhook
     * This is called by Meshulam after a successful payment
     */
    public function handle_meshulam_webhook($request) {
        // Log the webhook for debugging
        error_log('Bellano Meshulam Webhook received: ' . print_r($_POST, true));
        
        // Get payment data from Meshulam
        $data = $request->get_params();
        
        // Extract order ID from cField1 (we stored it there during payment creation)
        $order_id = isset($data['cField1']) ? intval($data['cField1']) : 0;
        $status = isset($data['status']) ? intval($data['status']) : 0;
        $transaction_id = isset($data['asmachta']) ? sanitize_text_field($data['asmachta']) : '';
        $approval_num = isset($data['cardNum']) ? sanitize_text_field($data['cardNum']) : '';
        
        if (!$order_id) {
            error_log('Bellano Meshulam Webhook: No order ID found');
            return new WP_REST_Response(['status' => 'error', 'message' => 'No order ID'], 400);
        }
        
        $order = wc_get_order($order_id);
        
        if (!$order) {
            error_log('Bellano Meshulam Webhook: Order not found: ' . $order_id);
            return new WP_REST_Response(['status' => 'error', 'message' => 'Order not found'], 404);
        }
        
        // Status 1 = Success
        if ($status == 1) {
            // Mark order as paid
            $order->payment_complete($transaction_id);
            
            // Add order note
            $order->add_order_note(sprintf(
                __('תשלום התקבל דרך משולם (Next.js Checkout). מספר אישור: %s', 'bellano-settings'),
                $transaction_id
            ));
            
            // Update meta data
            $order->update_meta_data('_meshulam_transaction_id', $transaction_id);
            $order->update_meta_data('_meshulam_approval_num', $approval_num);
            $order->update_meta_data('_paid_via', 'bellano_nextjs_checkout');
            $order->save();
            
            error_log('Bellano Meshulam Webhook: Order ' . $order_id . ' marked as paid');
            
            return new WP_REST_Response(['status' => 'success', 'order_id' => $order_id], 200);
        } else {
            // Payment failed
            $order->update_status('failed', __('תשלום משולם נכשל', 'bellano-settings'));
            
            error_log('Bellano Meshulam Webhook: Payment failed for order ' . $order_id);
            
            return new WP_REST_Response(['status' => 'failed', 'order_id' => $order_id], 200);
        }
    }
    
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
    
    public function get_product_faq($request) {
        $product_id = $request['id'];
        
        $use_custom = get_post_meta($product_id, '_bellano_faq_custom', true);
        
        if ($use_custom === '1') {
            $custom_faqs = get_post_meta($product_id, '_bellano_faq_items', true);
            return [
                'type' => 'custom',
                'faqs' => is_array($custom_faqs) ? $custom_faqs : []
            ];
        }
        
        $template_key = get_post_meta($product_id, '_bellano_faq_template', true);
        $templates = get_option('bellano_faq_templates', $this->get_default_faq_templates());
        $default_template = get_option('bellano_faq_default_template', 'standard');
        
        if (empty($template_key)) {
            $template_key = $default_template;
        }
        
        $faqs = isset($templates[$template_key]['faqs']) ? $templates[$template_key]['faqs'] : [];
        
        return [
            'type' => 'template',
            'template' => $template_key,
            'faqs' => $faqs
        ];
    }
    
    public function get_faq_templates() {
        $templates = get_option('bellano_faq_templates', $this->get_default_faq_templates());
        $default_template = get_option('bellano_faq_default_template', 'standard');
        
        return [
            'templates' => $templates,
            'default' => $default_template
        ];
    }
    
    /**
     * Create checkout with cart items
     * Receives items from Next.js and returns a checkout URL
     */
    public function create_checkout($request) {
        $items = $request->get_json_params();
        
        if (empty($items) || !is_array($items)) {
            return new WP_Error('no_items', 'No items provided', ['status' => 400]);
        }
        
        // Clear any existing cart
        if (function_exists('WC') && WC()->cart) {
            WC()->cart->empty_cart();
        }
        
        $added_items = [];
        $errors = [];
        
        foreach ($items as $item) {
            $product_id = isset($item['product_id']) ? intval($item['product_id']) : 0;
            $variation_id = isset($item['variation_id']) ? intval($item['variation_id']) : 0;
            $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
            
            if ($product_id <= 0) {
                $errors[] = 'Invalid product ID';
                continue;
            }
            
            // Check if product exists
            $product = wc_get_product($variation_id > 0 ? $variation_id : $product_id);
            if (!$product) {
                $errors[] = "Product {$product_id} not found";
                continue;
            }
            
            // Add to cart
            if (function_exists('WC') && WC()->cart) {
                $cart_item_key = WC()->cart->add_to_cart(
                    $product_id,
                    $quantity,
                    $variation_id,
                    [], // variation attributes
                    [] // cart item data
                );
                
                if ($cart_item_key) {
                    $added_items[] = [
                        'product_id' => $product_id,
                        'variation_id' => $variation_id,
                        'quantity' => $quantity,
                        'cart_key' => $cart_item_key
                    ];
                } else {
                    $errors[] = "Failed to add product {$product_id} to cart";
                }
            }
        }
        
        // Get checkout URL
        $checkout_url = wc_get_checkout_url();
        
        return [
            'success' => count($added_items) > 0,
            'checkout_url' => $checkout_url,
            'cart_url' => wc_get_cart_url(),
            'added_items' => $added_items,
            'errors' => $errors,
            'cart_total' => WC()->cart ? WC()->cart->get_cart_contents_total() : 0,
            'cart_count' => WC()->cart ? WC()->cart->get_cart_contents_count() : 0
        ];
    }
    
    /**
     * Generate checkout URL with all items (no session needed)
     * Uses WooCommerce's add-to-cart URL structure
     */
    public function get_checkout_url($request) {
        $items = $request->get_json_params();
        
        if (empty($items) || !is_array($items)) {
            return new WP_Error('no_items', 'No items provided', ['status' => 400]);
        }
        
        // For single item - simple URL
        if (count($items) === 1) {
            $item = $items[0];
            $product_id = isset($item['variation_id']) && $item['variation_id'] > 0 
                ? intval($item['variation_id']) 
                : intval($item['product_id']);
            $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
            
            $checkout_url = add_query_arg([
                'add-to-cart' => $product_id,
                'quantity' => $quantity
            ], wc_get_checkout_url());
            
            return [
                'success' => true,
                'checkout_url' => $checkout_url,
                'method' => 'single'
            ];
        }
        
        // For multiple items - create a special URL that our handler will process
        $encoded_items = [];
        foreach ($items as $item) {
            $encoded_items[] = [
                'id' => isset($item['variation_id']) && $item['variation_id'] > 0 
                    ? intval($item['variation_id']) 
                    : intval($item['product_id']),
                'qty' => isset($item['quantity']) ? intval($item['quantity']) : 1
            ];
        }
        
        $checkout_url = add_query_arg([
            'bellano_cart' => base64_encode(json_encode($encoded_items))
        ], home_url('/'));
        
        return [
            'success' => true,
            'checkout_url' => $checkout_url,
            'method' => 'multi',
            'items_count' => count($items)
        ];
    }
}

// Handle multi-item cart URL
add_action('template_redirect', function() {
    if (isset($_GET['bellano_cart'])) {
        $cart_data = json_decode(base64_decode($_GET['bellano_cart']), true);
        
        if (!empty($cart_data) && is_array($cart_data) && function_exists('WC') && WC()->cart) {
            // Clear existing cart
            WC()->cart->empty_cart();
            
            // Add all items
            foreach ($cart_data as $item) {
                $product_id = intval($item['id']);
                $quantity = isset($item['qty']) ? intval($item['qty']) : 1;
                
                // Check if it's a variation
                $product = wc_get_product($product_id);
                if ($product) {
                    if ($product->is_type('variation')) {
                        WC()->cart->add_to_cart($product->get_parent_id(), $quantity, $product_id);
                    } else {
                        WC()->cart->add_to_cart($product_id, $quantity);
                    }
                }
            }
            
            // Redirect to checkout
            wp_redirect(wc_get_checkout_url());
            exit;
        }
    }
});

// Initialize
Bellano_Settings::get_instance();
