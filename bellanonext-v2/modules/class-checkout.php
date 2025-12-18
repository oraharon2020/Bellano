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
}
