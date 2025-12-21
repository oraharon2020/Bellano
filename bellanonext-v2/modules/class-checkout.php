<?php
/**
 * Bellano Checkout Module
 * Handles WooCommerce cart and Meshulam payment integration
 */

if (!defined('ABSPATH')) exit;

class Bellano_Checkout {
    
    /**
     * Get Meshulam configuration for Next.js checkout
     */
    public function get_meshulam_config() {
        $userId = get_option('meshulam_bit_payment_code', 'e1ee96ba76032485');
        
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
     */
    public function handle_meshulam_webhook($request) {
        error_log('Bellano Meshulam Webhook received: ' . print_r($_POST, true));
        
        $data = $request->get_params();
        
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
        
        if ($status == 1) {
            $order->payment_complete($transaction_id);
            
            $order->add_order_note(sprintf(
                __('תשלום התקבל דרך משולם (Next.js Checkout). מספר אישור: %s', 'bellano-settings'),
                $transaction_id
            ));
            
            $order->update_meta_data('_meshulam_transaction_id', $transaction_id);
            $order->update_meta_data('_meshulam_approval_num', $approval_num);
            $order->update_meta_data('_paid_via', 'bellano_nextjs_checkout');
            $order->save();
            
            error_log('Bellano Meshulam Webhook: Order ' . $order_id . ' marked as paid');
            
            return new WP_REST_Response(['status' => 'success', 'order_id' => $order_id], 200);
        } else {
            $order->update_status('failed', __('תשלום משולם נכשל', 'bellano-settings'));
            
            error_log('Bellano Meshulam Webhook: Payment failed for order ' . $order_id);
            
            return new WP_REST_Response(['status' => 'failed', 'order_id' => $order_id], 200);
        }
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
