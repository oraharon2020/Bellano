<?php
/**
 * Plugin Name: Bellano Product FAQ
 * Description: מערכת שאלות ותשובות למוצרים עם טמפלטים
 * Version: 1.0.0
 * Author: Bellano
 * Text Domain: bellano-faq
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bellano_Product_FAQ {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('add_meta_boxes', array($this, 'add_product_metabox'));
        add_action('save_post_product', array($this, 'save_product_faq'));
        add_action('admin_enqueue_scripts', array($this, 'admin_scripts'));
        
        // REST API
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    /**
     * Admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            'שאלות ותשובות למוצרים',
            'שאלות מוצרים',
            'manage_options',
            'bellano-product-faq',
            array($this, 'render_admin_page'),
            'dashicons-editor-help',
            57
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('bellano_faq_settings', 'bellano_faq_templates');
        register_setting('bellano_faq_settings', 'bellano_faq_default_template');
    }
    
    /**
     * Get default templates
     */
    public static function get_default_templates() {
        return array(
            'imported' => array(
                'name' => 'מוצר מיובא',
                'faqs' => array(
                    array(
                        'question' => 'מה זמן האספקה?',
                        'answer' => 'זמן האספקה למוצרים מיובאים הוא בין 14-21 ימי עסקים, בהתאם לזמינות במלאי.'
                    ),
                    array(
                        'question' => 'מה האחריות על המוצר?',
                        'answer' => 'אחריות של שנה מיום הקנייה על פגמים במבנה ובייצור. האחריות אינה כוללת בלאי טבעי או נזק שנגרם משימוש לא נכון.'
                    ),
                    array(
                        'question' => 'האם המוצר מגיע מורכב?',
                        'answer' => 'המוצר מגיע ארוז ודורש הרכבה קלה. הוראות הרכבה מפורטות מצורפות לאריזה. ניתן להזמין שירות הרכבה בתוספת תשלום.'
                    ),
                    array(
                        'question' => 'מה מדיניות ההחזרות?',
                        'answer' => 'ניתן להחזיר את המוצר תוך 14 יום מיום הקבלה, כל עוד המוצר באריזתו המקורית ולא נעשה בו שימוש.'
                    ),
                    array(
                        'question' => 'האם המשלוח כולל הכנסה לבית?',
                        'answer' => 'כן, המשלוח כולל הובלה והכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית.'
                    ),
                )
            ),
            'local' => array(
                'name' => 'ייצור מקומי',
                'faqs' => array(
                    array(
                        'question' => 'מה זמן האספקה?',
                        'answer' => 'זמן הייצור הוא כ-21-30 ימי עסקים. המוצר מיוצר בהזמנה אישית בדיוק לפי הצבע והמידות שבחרתם.'
                    ),
                    array(
                        'question' => 'מה האחריות על המוצר?',
                        'answer' => 'אחריות של 3 שנים מיום הקנייה על המבנה והייצור. אנו גאים באיכות המוצרים שלנו ועומדים מאחוריהם.'
                    ),
                    array(
                        'question' => 'האם ניתן להזמין במידות מיוחדות?',
                        'answer' => 'בהחלט! המוצר מיוצר בארץ וניתן להתאים אותו למידות ספציפיות. צרו קשר לקבלת הצעת מחיר.'
                    ),
                    array(
                        'question' => 'מה מדיניות ההחזרות?',
                        'answer' => 'מכיוון שהמוצר מיוצר בהזמנה אישית, לא ניתן לבטל לאחר תחילת הייצור. ניתן לבטל תוך 24 שעות מההזמנה.'
                    ),
                    array(
                        'question' => 'האם המשלוח כולל הרכבה?',
                        'answer' => 'כן, המשלוח כולל הובלה, הכנסה והרכבה מלאה בביתכם ללא עלות נוספת.'
                    ),
                )
            ),
            'upholstery' => array(
                'name' => 'ריפוד (כורסאות/ספות)',
                'faqs' => array(
                    array(
                        'question' => 'מה זמן האספקה?',
                        'answer' => 'זמן הייצור לפריטי ריפוד הוא כ-30-45 ימי עסקים, בהתאם לסוג הבד והמורכבות.'
                    ),
                    array(
                        'question' => 'מה האחריות על המוצר?',
                        'answer' => 'אחריות של שנתיים על השלד והמנגנונים, ושנה על הריפוד. האחריות אינה כוללת בלאי טבעי של הבד.'
                    ),
                    array(
                        'question' => 'האם ניתן לבחור בד אחר?',
                        'answer' => 'בהחלט! יש לנו מגוון רחב של בדים ועורות. מוזמנים להגיע לאולם התצוגה לראות את הדוגמאות או לבקש משלוח דוגמיות.'
                    ),
                    array(
                        'question' => 'איך מתחזקים את הריפוד?',
                        'answer' => 'מומלץ לנקות כתמים מיד עם מטלית לחה. לניקוי יסודי יש להשתמש בתכשיר ייעודי לבדים. הימנעו מחשיפה ישירה לשמש.'
                    ),
                    array(
                        'question' => 'האם ניתן להחליף ריפוד בעתיד?',
                        'answer' => 'כן, אנו מציעים שירות ריפוד מחדש לכל המוצרים שנרכשו אצלנו. צרו קשר לקבלת הצעת מחיר.'
                    ),
                )
            ),
        );
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        $templates = get_option('bellano_faq_templates', self::get_default_templates());
        $default_template = get_option('bellano_faq_default_template', 'imported');
        
        // Save templates
        if (isset($_POST['save_templates']) && check_admin_referer('bellano_faq_save')) {
            if (isset($_POST['templates'])) {
                $templates = $this->sanitize_templates($_POST['templates']);
                update_option('bellano_faq_templates', $templates);
            }
            if (isset($_POST['default_template'])) {
                update_option('bellano_faq_default_template', sanitize_text_field($_POST['default_template']));
                $default_template = $_POST['default_template'];
            }
            echo '<div class="notice notice-success"><p>הטמפלטים נשמרו בהצלחה!</p></div>';
        }
        
        // Reset to defaults
        if (isset($_POST['reset_defaults']) && check_admin_referer('bellano_faq_save')) {
            $templates = self::get_default_templates();
            update_option('bellano_faq_templates', $templates);
            update_option('bellano_faq_default_template', 'imported');
            $default_template = 'imported';
            echo '<div class="notice notice-success"><p>הטמפלטים אופסו לברירת המחדל!</p></div>';
        }
        ?>
        <div class="wrap">
            <h1>שאלות ותשובות למוצרים</h1>
            
            <form method="post">
                <?php wp_nonce_field('bellano_faq_save'); ?>
                
                <h2>טמפלט ברירת מחדל</h2>
                <p>
                    <select name="default_template" id="default_template">
                        <?php foreach ($templates as $key => $template): ?>
                            <option value="<?php echo esc_attr($key); ?>" <?php selected($default_template, $key); ?>>
                                <?php echo esc_html($template['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <span class="description">טמפלט זה ישמש למוצרים שלא הוגדר להם טמפלט ספציפי</span>
                </p>
                
                <hr>
                
                <h2>עריכת טמפלטים</h2>
                
                <div id="faq-templates">
                    <?php foreach ($templates as $template_key => $template): ?>
                        <div class="faq-template" data-template="<?php echo esc_attr($template_key); ?>">
                            <h3>
                                <span class="template-name"><?php echo esc_html($template['name']); ?></span>
                                <button type="button" class="button toggle-template">פתח/סגור</button>
                            </h3>
                            
                            <div class="template-content" style="display: none;">
                                <p>
                                    <label>שם הטמפלט:</label>
                                    <input type="text" name="templates[<?php echo esc_attr($template_key); ?>][name]" 
                                           value="<?php echo esc_attr($template['name']); ?>" class="regular-text">
                                </p>
                                
                                <div class="faq-items">
                                    <?php foreach ($template['faqs'] as $index => $faq): ?>
                                        <div class="faq-item">
                                            <p>
                                                <label>שאלה:</label>
                                                <input type="text" 
                                                       name="templates[<?php echo esc_attr($template_key); ?>][faqs][<?php echo $index; ?>][question]" 
                                                       value="<?php echo esc_attr($faq['question']); ?>" 
                                                       class="large-text">
                                            </p>
                                            <p>
                                                <label>תשובה:</label>
                                                <textarea name="templates[<?php echo esc_attr($template_key); ?>][faqs][<?php echo $index; ?>][answer]" 
                                                          rows="3" class="large-text"><?php echo esc_textarea($faq['answer']); ?></textarea>
                                            </p>
                                            <button type="button" class="button remove-faq">הסר שאלה</button>
                                            <hr>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                                
                                <button type="button" class="button add-faq" data-template="<?php echo esc_attr($template_key); ?>">
                                    + הוסף שאלה
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <hr>
                
                <p>
                    <input type="submit" name="save_templates" class="button button-primary" value="שמור שינויים">
                    <input type="submit" name="reset_defaults" class="button" value="אפס לברירת מחדל" 
                           onclick="return confirm('האם אתה בטוח? כל השינויים יימחקו.');">
                </p>
            </form>
        </div>
        
        <style>
            .faq-template {
                background: #fff;
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid #ccd0d4;
                border-radius: 4px;
            }
            .faq-template h3 {
                margin: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .faq-item {
                background: #f9f9f9;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            .faq-item label {
                display: block;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .faq-items {
                margin: 15px 0;
            }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            // Toggle template
            $('.toggle-template').on('click', function() {
                $(this).closest('.faq-template').find('.template-content').slideToggle();
            });
            
            // Remove FAQ
            $(document).on('click', '.remove-faq', function() {
                $(this).closest('.faq-item').remove();
            });
            
            // Add FAQ
            $('.add-faq').on('click', function() {
                var template = $(this).data('template');
                var $items = $(this).siblings('.faq-items');
                var index = $items.find('.faq-item').length;
                
                var html = '<div class="faq-item">' +
                    '<p><label>שאלה:</label>' +
                    '<input type="text" name="templates[' + template + '][faqs][' + index + '][question]" class="large-text"></p>' +
                    '<p><label>תשובה:</label>' +
                    '<textarea name="templates[' + template + '][faqs][' + index + '][answer]" rows="3" class="large-text"></textarea></p>' +
                    '<button type="button" class="button remove-faq">הסר שאלה</button><hr>' +
                    '</div>';
                
                $items.append(html);
            });
        });
        </script>
        <?php
    }
    
    /**
     * Sanitize templates
     */
    private function sanitize_templates($templates) {
        $sanitized = array();
        
        foreach ($templates as $key => $template) {
            $sanitized[$key] = array(
                'name' => sanitize_text_field($template['name']),
                'faqs' => array()
            );
            
            if (!empty($template['faqs'])) {
                foreach ($template['faqs'] as $faq) {
                    if (!empty($faq['question'])) {
                        $sanitized[$key]['faqs'][] = array(
                            'question' => sanitize_text_field($faq['question']),
                            'answer' => wp_kses_post($faq['answer'])
                        );
                    }
                }
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Add product metabox
     */
    public function add_product_metabox() {
        add_meta_box(
            'bellano_product_faq',
            'שאלות ותשובות',
            array($this, 'render_product_metabox'),
            'product',
            'normal',
            'default'
        );
    }
    
    /**
     * Render product metabox
     */
    public function render_product_metabox($post) {
        wp_nonce_field('bellano_product_faq', 'bellano_faq_nonce');
        
        $templates = get_option('bellano_faq_templates', self::get_default_templates());
        $default_template = get_option('bellano_faq_default_template', 'imported');
        
        $product_template = get_post_meta($post->ID, '_bellano_faq_template', true);
        $use_custom = get_post_meta($post->ID, '_bellano_faq_custom', true);
        $custom_faqs = get_post_meta($post->ID, '_bellano_faq_items', true);
        
        if (empty($product_template)) {
            $product_template = $default_template;
        }
        ?>
        <div id="bellano-faq-metabox">
            <p>
                <label>
                    <input type="checkbox" name="bellano_faq_custom" value="1" <?php checked($use_custom, '1'); ?>>
                    השתמש בשאלות מותאמות אישית (במקום טמפלט)
                </label>
            </p>
            
            <div id="template-select" style="<?php echo $use_custom ? 'display:none;' : ''; ?>">
                <p>
                    <label>בחר טמפלט:</label>
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
                    הטמפלט הנבחר יציג את השאלות והתשובות המוגדרות בהגדרות הכלליות.
                    <a href="<?php echo admin_url('admin.php?page=bellano-product-faq'); ?>" target="_blank">ערוך טמפלטים</a>
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
                            <button type="button" class="button remove-custom-faq">הסר</button>
                            <hr>
                        </div>
                    <?php 
                        endforeach;
                    endif; 
                    ?>
                </div>
                <button type="button" class="button" id="add-custom-faq">+ הוסף שאלה</button>
            </div>
        </div>
        
        <style>
            #bellano-faq-metabox .custom-faq-item {
                background: #f9f9f9;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            #bellano-faq-metabox label {
                font-weight: 600;
            }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            // Toggle custom/template
            $('input[name="bellano_faq_custom"]').on('change', function() {
                if ($(this).is(':checked')) {
                    $('#template-select').hide();
                    $('#custom-faqs').show();
                } else {
                    $('#template-select').show();
                    $('#custom-faqs').hide();
                }
            });
            
            // Add custom FAQ
            $('#add-custom-faq').on('click', function() {
                var index = $('#custom-faq-items .custom-faq-item').length;
                var html = '<div class="custom-faq-item">' +
                    '<p><label>שאלה:</label>' +
                    '<input type="text" name="bellano_custom_faqs[' + index + '][question]" class="large-text"></p>' +
                    '<p><label>תשובה:</label>' +
                    '<textarea name="bellano_custom_faqs[' + index + '][answer]" rows="2" class="large-text"></textarea></p>' +
                    '<button type="button" class="button remove-custom-faq">הסר</button><hr>' +
                    '</div>';
                $('#custom-faq-items').append(html);
            });
            
            // Remove custom FAQ
            $(document).on('click', '.remove-custom-faq', function() {
                $(this).closest('.custom-faq-item').remove();
            });
        });
        </script>
        <?php
    }
    
    /**
     * Save product FAQ
     */
    public function save_product_faq($post_id) {
        if (!isset($_POST['bellano_faq_nonce']) || !wp_verify_nonce($_POST['bellano_faq_nonce'], 'bellano_product_faq')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save template selection
        if (isset($_POST['bellano_faq_template'])) {
            update_post_meta($post_id, '_bellano_faq_template', sanitize_text_field($_POST['bellano_faq_template']));
        }
        
        // Save custom toggle
        $use_custom = isset($_POST['bellano_faq_custom']) ? '1' : '';
        update_post_meta($post_id, '_bellano_faq_custom', $use_custom);
        
        // Save custom FAQs
        if (isset($_POST['bellano_custom_faqs']) && is_array($_POST['bellano_custom_faqs'])) {
            $custom_faqs = array();
            foreach ($_POST['bellano_custom_faqs'] as $faq) {
                if (!empty($faq['question'])) {
                    $custom_faqs[] = array(
                        'question' => sanitize_text_field($faq['question']),
                        'answer' => wp_kses_post($faq['answer'])
                    );
                }
            }
            update_post_meta($post_id, '_bellano_faq_items', $custom_faqs);
        }
    }
    
    /**
     * Admin scripts
     */
    public function admin_scripts($hook) {
        if ($hook !== 'toplevel_page_bellano-product-faq' && get_post_type() !== 'product') {
            return;
        }
        wp_enqueue_script('jquery');
    }
    
    /**
     * Register REST routes
     */
    public function register_rest_routes() {
        register_rest_route('bellano/v1', '/product-faq/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_faq'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('bellano/v1', '/faq-templates', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_faq_templates'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Get product FAQ via REST
     */
    public function get_product_faq($request) {
        $product_id = $request['id'];
        
        $use_custom = get_post_meta($product_id, '_bellano_faq_custom', true);
        
        if ($use_custom === '1') {
            // Return custom FAQs
            $custom_faqs = get_post_meta($product_id, '_bellano_faq_items', true);
            return array(
                'type' => 'custom',
                'faqs' => !empty($custom_faqs) ? $custom_faqs : array()
            );
        }
        
        // Return template FAQs
        $templates = get_option('bellano_faq_templates', self::get_default_templates());
        $default_template = get_option('bellano_faq_default_template', 'imported');
        $product_template = get_post_meta($product_id, '_bellano_faq_template', true);
        
        if (empty($product_template)) {
            $product_template = $default_template;
        }
        
        $template_data = isset($templates[$product_template]) ? $templates[$product_template] : $templates[$default_template];
        
        return array(
            'type' => 'template',
            'template' => $product_template,
            'template_name' => $template_data['name'],
            'faqs' => $template_data['faqs']
        );
    }
    
    /**
     * Get all FAQ templates
     */
    public function get_faq_templates() {
        $templates = get_option('bellano_faq_templates', self::get_default_templates());
        $default_template = get_option('bellano_faq_default_template', 'imported');
        
        return array(
            'templates' => $templates,
            'default' => $default_template
        );
    }
}

// Initialize
Bellano_Product_FAQ::get_instance();
