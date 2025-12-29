<?php
/**
 * Bellano Checkout Module
 * Handles WooCommerce cart and Meshulam payment integration
 */

if (!defined('ABSPATH')) exit;

class Bellano_Checkout {
    
    // Hardcoded fallback userId (in case Grow plugin resets)
    private $fallback_userId = '6f6cab2bd0c86083';
    
    /**
     * Constructor - register WC-API hooks
     */
    public function __construct() {
        // CRITICAL: Remove X-Frame-Options for WC-API requests (Meshulam uses iframe!)
        // This must run early, before WordPress sends headers
        add_action('init', [$this, 'remove_frame_options_for_wc_api'], 1);
        
        // Hook into the OFFICIAL Meshulam plugin's callbacks with HIGH priority
        // This way we intercept them BEFORE the official plugin and redirect to Next.js
        add_action('woocommerce_api_meshulam_payment_gateway_direct_j4execute', [$this, 'intercept_meshulam_success'], 1);
        add_action('woocommerce_api_meshulam_server_response_direct_j4execute', [$this, 'intercept_meshulam_notify'], 1);
        
        // Also keep our custom hooks as backup
        add_action('woocommerce_api_bellano_meshulam_success', [$this, 'handle_wc_api_success']);
        add_action('woocommerce_api_bellano_meshulam_notify', [$this, 'handle_wc_api_notify']);
    }
    
    /**
     * Remove X-Frame-Options header for WC-API requests
     * Meshulam loads the success URL in an iframe, so we need to allow it
     */
    public function remove_frame_options_for_wc_api() {
        if (isset($_GET['wc-api']) && strpos($_GET['wc-api'], 'meshulam') !== false) {
            // Remove X-Frame-Options header that blocks iframe loading
            header_remove('X-Frame-Options');
            
            // Also set headers to explicitly allow framing
            header('X-Frame-Options: ALLOWALL');
            
            // Remove any other restrictive headers
            remove_action('send_headers', 'send_frame_options_header');
            remove_action('admin_init', 'send_frame_options_header');
            
            error_log('Bellano: Removed X-Frame-Options for Meshulam callback');
        }
    }
    
    /**
     * Intercept official Meshulam success callback
     * Check if this order came from Next.js and redirect accordingly
     */
    public function intercept_meshulam_success() {
        error_log('Bellano Intercept Meshulam Success - GET: ' . print_r($_GET, true));
        
        $order_id = isset($_REQUEST['cField1']) ? intval($_REQUEST['cField1']) : 0;
        
        if ($order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                // Check if order was created via Next.js checkout
                $paid_via = $order->get_meta('_paid_via');
                $is_nextjs = ($paid_via === 'bellano_nextjs_checkout') || $order->get_meta('_bellano_nextjs_order');
                
                // Also check payment method - 'meshulam' is what we set in Next.js
                $payment_method = $order->get_payment_method();
                if ($payment_method === 'meshulam' || $is_nextjs) {
                    // This is a Next.js order - redirect to Next.js success page
                    $response_status = isset($_REQUEST['response']) ? sanitize_text_field($_REQUEST['response']) : '';
                    $nextjs_url = defined('BELLANO_NEXTJS_URL') ? BELLANO_NEXTJS_URL : 'https://www.bellano.co.il';
                    
                    if ($response_status === 'success') {
                        $redirect_url = $nextjs_url . '/checkout/success?order_id=' . $order_id;
                    } else {
                        $redirect_url = $nextjs_url . '/checkout?cancelled=true&order_id=' . $order_id;
                    }
                    
                    error_log('Bellano Intercept: Redirecting Next.js order to ' . $redirect_url);
                    
                    header('Content-Type: text/html; charset=utf-8');
                    echo '<html><head><script>window.top.location.href = "' . esc_js($redirect_url) . '";</script></head></html>';
                    exit;
                }
            }
        }
        
        // Not a Next.js order - let the official plugin handle it
        error_log('Bellano Intercept: Not a Next.js order, letting official plugin handle');
    }
    
    /**
     * Intercept official Meshulam notify callback
     */
    public function intercept_meshulam_notify() {
        error_log('Bellano Intercept Meshulam Notify - POST: ' . print_r($_POST, true));
        // Let the official plugin handle the webhook - it will update the order status
        // We don't need to do anything special here
    }
    
    /**
     * Handle success redirect via WC-API (like official Meshulam plugin)
     * URL: ?wc-api=bellano_meshulam_success
     */
    public function handle_wc_api_success() {
        error_log('Bellano WC-API Success - GET: ' . print_r($_GET, true));
        error_log('Bellano WC-API Success - POST: ' . print_r($_POST, true));
        
        $order_id = isset($_REQUEST['cField1']) ? intval($_REQUEST['cField1']) : 0;
        $response_status = isset($_REQUEST['response']) ? sanitize_text_field($_REQUEST['response']) : '';
        
        // Get Next.js site URL
        $nextjs_url = defined('BELLANO_NEXTJS_URL') ? BELLANO_NEXTJS_URL : 'https://www.bellano.co.il';
        
        if ($order_id && $response_status === 'success') {
            $redirect_url = $nextjs_url . '/checkout/success?order_id=' . $order_id;
        } elseif ($order_id) {
            $redirect_url = $nextjs_url . '/checkout?cancelled=true&order_id=' . $order_id;
        } else {
            $redirect_url = $nextjs_url;
        }
        
        error_log('Bellano WC-API Success: Redirecting to ' . $redirect_url);
        
        // Use window.top to break out of iframe (like Meshulam's official plugin)
        header('Content-Type: text/html; charset=utf-8');
        echo '<html><head><script>window.top.location.href = "' . esc_js($redirect_url) . '";</script></head></html>';
        exit;
    }
    
    /**
     * Handle notify webhook via WC-API (like official Meshulam plugin)
     * URL: ?wc-api=bellano_meshulam_notify
     */
    public function handle_wc_api_notify() {
        error_log('Bellano WC-API Notify - POST: ' . print_r($_POST, true));
        error_log('Bellano WC-API Notify - RAW: ' . file_get_contents('php://input'));
        
        $status = isset($_POST['status']) ? intval($_POST['status']) : 0;
        $order_id = 0;
        $transaction_id = '';
        $transaction_token = '';
        
        // Parse Meshulam format
        if (isset($_POST['data']['customFields']['cField1'])) {
            $order_id = intval($_POST['data']['customFields']['cField1']);
            $transaction_id = isset($_POST['data']['asmachta']) ? sanitize_text_field($_POST['data']['asmachta']) : '';
            $transaction_token = isset($_POST['data']['transactionToken']) ? sanitize_text_field($_POST['data']['transactionToken']) : '';
        } elseif (isset($_POST['cField1'])) {
            $order_id = intval($_POST['cField1']);
            $transaction_id = isset($_POST['asmachta']) ? sanitize_text_field($_POST['asmachta']) : '';
        }
        
        if (!$order_id) {
            error_log('Bellano WC-API Notify: No order ID found');
            echo 'error: no order id';
            exit;
        }
        
        $order = wc_get_order($order_id);
        if (!$order) {
            error_log('Bellano WC-API Notify: Order not found: ' . $order_id);
            echo 'error: order not found';
            exit;
        }
        
        // Check if already processed
        $current_status = $order->get_status();
        if (in_array($current_status, ['processing', 'completed'])) {
            error_log('Bellano WC-API Notify: Order already processed');
            echo 'ok: already processed';
            exit;
        }
        
        if ($status == 1) {
            $order->payment_complete($transaction_id);
            $order->add_order_note('תשלום התקבל בהצלחה (Next.js checkout)' . ($transaction_id ? " - אסמכתא: $transaction_id" : ''));
            if ($transaction_id) {
                $order->update_meta_data('_meshulam_transaction_id', $transaction_id);
            }
            if ($transaction_token) {
                $order->update_meta_data('_meshulam_transaction_token', $transaction_token);
            }
            $order->save();
            error_log('Bellano WC-API Notify: Order ' . $order_id . ' marked as paid');
            echo 'ok';
        } else {
            $order->update_status('failed', 'תשלום משולם נכשל');
            error_log('Bellano WC-API Notify: Payment failed for order ' . $order_id);
            echo 'failed';
        }
        exit;
    }
    
    /**
     * Get Meshulam configuration for Next.js checkout
     */
    public function get_meshulam_config() {
        $userId = get_option('meshulam_bit_payment_code', '');
        if (empty($userId)) {
            $userId = $this->fallback_userId;
        }
        
        // Get page codes for each payment method
        $pageCodes = [
            'credit_card' => get_option('meshulam_live_pagecode', '81e04dc34850'),
            'bit' => get_option('meshulam_bit_live_pagecode', ''),
            'apple_pay' => get_option('meshulam_apple_live_pagecode', ''),
            'google_pay' => get_option('meshulam_googlepay_live_pagecode', ''),
        ];
        
        return [
            'userId' => $userId,
            'pageCodes' => $pageCodes,
            'hasConfig' => !empty($userId),
        ];
    }
    
    /**
     * Handle Meshulam payment webhook
     * Meshulam sends data in format: status=1, data[customFields][cField1]=order_id, data[asmachta]=xxx
     */
    public function handle_meshulam_webhook($request) {
        // Log everything for debugging
        error_log('Bellano Meshulam Webhook - POST: ' . print_r($_POST, true));
        error_log('Bellano Meshulam Webhook - GET: ' . print_r($_GET, true));
        error_log('Bellano Meshulam Webhook - RAW: ' . file_get_contents('php://input'));
        
        $data = !empty($_POST) ? $_POST : $request->get_params();
        
        // Meshulam format: data[customFields][cField1] for order_id
        $order_id = 0;
        $status = isset($data['status']) ? intval($data['status']) : 0;
        $transaction_id = '';
        $transaction_token = '';
        $approval_num = '';
        
        // Try Meshulam nested format first: data[customFields][cField1]
        if (isset($data['data']['customFields']['cField1'])) {
            $order_id = intval($data['data']['customFields']['cField1']);
            $transaction_id = isset($data['data']['asmachta']) ? sanitize_text_field($data['data']['asmachta']) : '';
            $transaction_token = isset($data['data']['transactionToken']) ? sanitize_text_field($data['data']['transactionToken']) : '';
            $approval_num = isset($data['data']['cardSuffix']) ? sanitize_text_field($data['data']['cardSuffix']) : '';
        }
        // Fallback: flat format cField1 (our test format)
        elseif (isset($data['cField1'])) {
            $order_id = intval($data['cField1']);
            $transaction_id = isset($data['asmachta']) ? sanitize_text_field($data['asmachta']) : '';
        }
        
        // Log parsed values
        error_log("Bellano Meshulam Webhook - Parsed: order_id=$order_id, status=$status, transaction_id=$transaction_id");
        
        if (!$order_id) {
            error_log('Bellano Meshulam Webhook: No order ID found in any source');
            return new WP_REST_Response(['status' => 'error', 'message' => 'No order ID'], 400);
        }
        
        $order = wc_get_order($order_id);
        
        if (!$order) {
            error_log('Bellano Meshulam Webhook: Order not found: ' . $order_id);
            return new WP_REST_Response(['status' => 'error', 'message' => 'Order not found'], 404);
        }
        
        // Check if already processed
        $current_status = $order->get_status();
        if (in_array($current_status, ['processing', 'completed'])) {
            error_log('Bellano Meshulam Webhook: Order ' . $order_id . ' already processed, status: ' . $current_status);
            return new WP_REST_Response(['status' => 'success', 'message' => 'Already processed', 'order_id' => $order_id], 200);
        }
        
        if ($status == 1) {
            // Mark order as paid
            $order->payment_complete($transaction_id);
            
            // Add detailed order note
            $note = sprintf(
                'תשלום התקבל בהצלחה דרך משולם (צ\'קאאוט Next.js)%s%s',
                $transaction_id ? "\nמספר אסמכתא: " . $transaction_id : '',
                $approval_num ? "\n4 ספרות אחרונות: " . $approval_num : ''
            );
            $order->add_order_note($note);
            
            // Save meta data
            if ($transaction_id) {
                $order->update_meta_data('_meshulam_transaction_id', $transaction_id);
            }
            if ($transaction_token) {
                $order->update_meta_data('_meshulam_transaction_token', $transaction_token);
            }
            if ($approval_num) {
                $order->update_meta_data('_meshulam_approval_num', $approval_num);
            }
            $order->update_meta_data('_paid_via', 'bellano_nextjs_checkout');
            $order->update_meta_data('_payment_completed_at', current_time('mysql'));
            $order->save();
            
            error_log('Bellano Meshulam Webhook: Order ' . $order_id . ' marked as paid with transaction: ' . $transaction_id);
            
            return new WP_REST_Response(['status' => 'success', 'order_id' => $order_id], 200);
        } else {
            $order->update_status('failed', __('תשלום משולם נכשל - סטטוס: ' . $status, 'bellano-settings'));
            
            error_log('Bellano Meshulam Webhook: Payment failed for order ' . $order_id . ' with status: ' . $status);
            
            return new WP_REST_Response(['status' => 'failed', 'order_id' => $order_id], 200);
        }
    }
    
    /**
     * Handle Meshulam success redirect
     * This is the successUrl - Meshulam redirects user here after payment
     * We process the response and redirect to Next.js success page
     * Uses window.top because payment is in an iframe
     */
    public function handle_meshulam_success($request) {
        error_log('Bellano Meshulam Success - GET: ' . print_r($_GET, true));
        error_log('Bellano Meshulam Success - POST: ' . print_r($_POST, true));
        
        // Get order ID from request params
        $data = array_merge($_GET, $_POST, $request->get_params());
        
        $order_id = 0;
        $response_status = '';
        
        // Try different parameter formats
        if (isset($data['cField1'])) {
            $order_id = intval($data['cField1']);
        }
        if (isset($data['response'])) {
            $response_status = sanitize_text_field($data['response']);
        }
        
        // Get Next.js site URL
        $nextjs_url = defined('BELLANO_NEXTJS_URL') ? BELLANO_NEXTJS_URL : 'https://www.bellano.co.il';
        
        if ($order_id && $response_status === 'success') {
            // Payment successful - redirect to Next.js success page
            $redirect_url = $nextjs_url . '/checkout/success?order_id=' . $order_id;
        } elseif ($order_id) {
            // Payment failed or cancelled - redirect to checkout
            $redirect_url = $nextjs_url . '/checkout?cancelled=true&order_id=' . $order_id;
        } else {
            // No order ID - redirect to home
            $redirect_url = $nextjs_url;
        }
        
        error_log('Bellano Meshulam Success: Redirecting to ' . $redirect_url);
        
        // Use window.top to break out of iframe (like Meshulam's official plugin)
        header('Content-Type: text/html; charset=utf-8');
        echo '<html><head><script>window.top.location.href = "' . esc_js($redirect_url) . '";</script></head></html>';
        exit;
    }
    
    /**
     * Create checkout with cart items
     */
    public function create_checkout($request) {
        $items = $request->get_json_params();
        
        if (empty($items) || !is_array($items)) {
            return new WP_Error('no_items', 'No items provided', ['status' => 400]);
        }
        
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
            
            $product = wc_get_product($variation_id > 0 ? $variation_id : $product_id);
            if (!$product) {
                $errors[] = "Product {$product_id} not found";
                continue;
            }
            
            if (function_exists('WC') && WC()->cart) {
                $cart_item_key = WC()->cart->add_to_cart(
                    $product_id,
                    $quantity,
                    $variation_id,
                    [],
                    []
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
     * Generate checkout URL with all items
     */
    public function get_checkout_url($request) {
        $items = $request->get_json_params();
        
        if (empty($items) || !is_array($items)) {
            return new WP_Error('no_items', 'No items provided', ['status' => 400]);
        }
        
        // For single item
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
        
        // For multiple items
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
    
    /**
     * Proxy Meshulam API call (to avoid Imperva blocking Vercel)
     */
    public function proxy_meshulam_payment($request) {
        $data = $request->get_json_params();
        
        // Get Meshulam config
        $userId = get_option('meshulam_bit_payment_code', '');
        if (empty($userId)) {
            $userId = $this->fallback_userId;
        }
        $isSandbox = isset($data['sandbox']) && $data['sandbox'];
        $apiKey = $isSandbox ? '305a9a777e42' : 'ae67b1668109';
        $apiUrl = $isSandbox 
            ? 'https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess'
            : 'https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess';
        
        if (empty($userId)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Meshulam userId not configured'
            ], 500);
        }
        
        // Build form data
        $formData = [
            'pageCode' => sanitize_text_field($data['pageCode'] ?? ''),
            'apiKey' => $apiKey,
            'userId' => $userId,
            'sum' => floatval($data['sum'] ?? 0),
            'pageField[fullName]' => sanitize_text_field($data['fullName'] ?? ''),
            'pageField[phone]' => sanitize_text_field($data['phone'] ?? ''),
            'pageField[email]' => sanitize_email($data['email'] ?? ''),
            'paymentNum' => intval($data['payments'] ?? 1),
            'chargeType' => '1',
            'cField1' => sanitize_text_field($data['orderId'] ?? ''),
            'description' => sanitize_text_field($data['description'] ?? ''),
            'successUrl' => esc_url_raw($data['successUrl'] ?? ''),
            'cancelUrl' => esc_url_raw($data['cancelUrl'] ?? ''),
            'notifyUrl' => esc_url_raw($data['notifyUrl'] ?? ''),
        ];
        
        // Log the notifyUrl being sent
        error_log('Bellano Meshulam Proxy - notifyUrl being sent: ' . $formData['notifyUrl']);
        error_log('Bellano Meshulam Proxy - orderId: ' . $formData['cField1']);
        
        // Add product data if provided
        if (!empty($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $index => $item) {
                $formData["productData[{$index}][catalogNumber]"] = sanitize_text_field($item['sku'] ?? '');
                $formData["productData[{$index}][price]"] = floatval($item['price'] ?? 0);
                $formData["productData[{$index}][itemDescription]"] = sanitize_text_field($item['name'] ?? '');
                $formData["productData[{$index}][quantity]"] = intval($item['quantity'] ?? 1);
            }
        }
        
        // Make request to Meshulam
        $response = wp_remote_post($apiUrl, [
            'timeout' => 30,
            'body' => $formData,
            'headers' => [
                'Content-Type' => 'application/x-www-form-urlencoded',
            ],
        ]);
        
        if (is_wp_error($response)) {
            error_log('Meshulam proxy error: ' . $response->get_error_message());
            return new WP_REST_Response([
                'success' => false,
                'message' => 'שגיאה בחיבור למשולם'
            ], 502);
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        if (!$result) {
            error_log('Meshulam proxy: Invalid response - ' . substr($body, 0, 500));
            return new WP_REST_Response([
                'success' => false,
                'message' => 'תשובה לא תקינה ממשולם'
            ], 502);
        }
        
        if ($result['status'] !== 1 || empty($result['data']['url'])) {
            error_log('Meshulam proxy: API error - ' . json_encode($result));
            return new WP_REST_Response([
                'success' => false,
                'message' => $result['err']['message'] ?? 'שגיאה ביצירת תהליך התשלום'
            ], 400);
        }
        
        return new WP_REST_Response([
            'success' => true,
            'payment_url' => $result['data']['url'],
            'process_id' => $result['data']['processId'],
            'process_token' => $result['data']['processToken'],
        ], 200);
    }
    
    /**
     * Initialize hooks for order attributes display
     */
    public static function init_order_attributes_hooks() {
        // Fix variation attributes display for REST API orders
        add_action('woocommerce_rest_insert_shop_order_object', [__CLASS__, 'fix_order_variation_attributes'], 10, 3);
        
        // Ensure meta is displayed in emails
        add_filter('woocommerce_order_item_get_formatted_meta_data', [__CLASS__, 'format_order_item_meta'], 10, 2);
        
        // Hide bellano_attr_ prefix in admin and emails
        add_filter('woocommerce_order_item_display_meta_key', [__CLASS__, 'display_meta_key'], 10, 3);
        
        // Remove empty meta values from display and hide internal keys
        add_filter('woocommerce_hidden_order_itemmeta', [__CLASS__, 'hide_empty_meta_keys'], 10, 1);
    }
    
    /**
     * Hide empty pa_ attributes and internal meta keys
     */
    public static function hide_empty_meta_keys($hidden_meta) {
        // Add internal WooCommerce keys that should be hidden
        $hidden_meta[] = 'pa_width';
        $hidden_meta[] = 'pa_depth';
        $hidden_meta[] = 'pa_height';
        $hidden_meta[] = 'pa_length';
        $hidden_meta[] = '_reduced_stock';
        return $hidden_meta;
    }
    
    /**
     * Clean up the display key for bellano attributes
     */
    public static function display_meta_key($display_key, $meta, $item) {
        if (strpos($meta->key, 'bellano_attr_') === 0) {
            $display_key = str_replace('bellano_attr_', '', $meta->key);
            $display_key = str_replace('_', ' ', $display_key);
        }
        return $display_key;
    }

    /**
     * Fix variation attributes for orders created via REST API
     * This ensures attributes appear in emails just like native WooCommerce orders
     */
    public static function fix_order_variation_attributes($order, $request, $creating) {
        if (!$creating) {
            return;
        }
        
        $items = $order->get_items();
        
        foreach ($items as $item_id => $item) {
            $variation_id = $item->get_variation_id();
            
            if (!$variation_id) {
                continue;
            }
            
            // Get the variation product
            $variation = wc_get_product($variation_id);
            
            if (!$variation) {
                continue;
            }
            
            // Get variation attributes from the product
            $variation_attributes = $variation->get_variation_attributes();
            $parent_product = wc_get_product($item->get_product_id());
            
            if (!$parent_product) {
                continue;
            }
            
            // Track which attributes are already added
            $added_attributes = [];
            
            // First, add attributes from the variation itself
            foreach ($variation_attributes as $attribute_name => $attribute_value) {
                // Skip if empty (means "Any")
                if (empty($attribute_value)) {
                    continue;
                }
                
                // Get the attribute label
                $attribute_key = str_replace('attribute_', '', $attribute_name);
                $attribute_label = wc_attribute_label($attribute_key, $parent_product);
                
                // Get the term name if it's a taxonomy attribute
                if (taxonomy_exists($attribute_key)) {
                    $term = get_term_by('slug', $attribute_value, $attribute_key);
                    if ($term) {
                        $attribute_value = $term->name;
                    }
                }
                
                // Check if already exists
                $existing_meta = $item->get_meta($attribute_label);
                
                if (empty($existing_meta)) {
                    wc_add_order_item_meta($item_id, $attribute_label, $attribute_value);
                }
                
                $added_attributes[$attribute_label] = true;
            }
            
            // Then, add custom attributes from the request (for "Any" attributes)
            $request_items = $request->get_param('line_items');
            
            if ($request_items) {
                foreach ($request_items as $request_item) {
                    $req_variation_id = isset($request_item['variation_id']) ? $request_item['variation_id'] : 0;
                    
                    if ($req_variation_id == $variation_id && isset($request_item['meta_data'])) {
                        foreach ($request_item['meta_data'] as $meta) {
                            $key = isset($meta['key']) ? $meta['key'] : '';
                            $value = isset($meta['value']) ? $meta['value'] : '';
                            
                            // Skip hidden meta (starts with _)
                            if (strpos($key, '_') === 0) {
                                continue;
                            }
                            
                            // Skip if already added from variation
                            if (isset($added_attributes[$key])) {
                                continue;
                            }
                            
                            // Skip if already exists in item
                            $existing = $item->get_meta($key);
                            if (!empty($existing)) {
                                continue;
                            }
                            
                            // Add the meta
                            wc_add_order_item_meta($item_id, $key, $value);
                            $added_attributes[$key] = true;
                        }
                        break;
                    }
                }
            }
        }
        
        // Save the order
        $order->save();
    }
    
    /**
     * Ensure all meta data is properly formatted for display in emails
     */
    public static function format_order_item_meta($formatted_meta, $item) {
        // Remove duplicates and empty values - keep only unique display values
        $seen = [];
        $filtered_meta = [];
        
        foreach ($formatted_meta as $meta_id => $meta) {
            $key = $meta->display_key ?? $meta->key;
            $value = $meta->display_value ?? $meta->value;
            
            // Skip empty values
            if (empty($value) || $value === '') {
                continue;
            }
            
            // Skip internal WooCommerce meta keys
            if (strpos($meta->key, 'pa_width') === 0 || 
                strpos($meta->key, 'pa_depth') === 0 || 
                strpos($meta->key, 'pa_height') === 0 ||
                strpos($meta->key, 'pa_length') === 0) {
                continue;
            }
            
            // Handle Bellano custom attributes (convert bellano_attr_xxx to display name)
            if (strpos($meta->key, 'bellano_attr_') === 0) {
                // Extract the display key
                $display_key = str_replace('bellano_attr_', '', $meta->key);
                $display_key = str_replace('_', ' ', $display_key);
                
                // Update display values
                $meta->display_key = $display_key;
                $meta->display_value = $value;
                $key = $display_key;
            }
            
            // Create unique identifier
            $identifier = $key . ':' . $value;
            
            // Skip if we've seen this exact key:value pair
            if (isset($seen[$identifier])) {
                continue;
            }
            
            $seen[$identifier] = true;
            $filtered_meta[$meta_id] = $meta;
        }
        
        return $filtered_meta;
    }
}