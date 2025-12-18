<?php
/**
 * Bellano Auth Module
 * Handles admin authentication for sales reps (cross-domain)
 */

if (!defined('ABSPATH')) exit;

class Bellano_Auth {
    
    /**
     * Check if the current user is an administrator
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
     * Logout - invalidate token
     */
    public function admin_logout($request) {
        $params = $request->get_json_params();
        $token = isset($params['token']) ? $params['token'] : '';
        
        if (empty($token)) {
            return new WP_REST_Response(['success' => true], 200);
        }
        
        // Find user with this token
        $users = get_users([
            'meta_key' => '_bellano_admin_token',
            'meta_value' => $token,
            'number' => 1
        ]);
        
        if (!empty($users)) {
            $user = $users[0];
            delete_user_meta($user->ID, '_bellano_admin_token');
            delete_user_meta($user->ID, '_bellano_admin_token_expires');
        }
        
        return new WP_REST_Response(['success' => true], 200);
    }
    
    /**
     * Verify token and return user ID (internal use)
     * @param string $token The admin token
     * @return int|false User ID if valid, false otherwise
     */
    public function verify_token($token) {
        if (empty($token)) {
            return false;
        }
        
        // Find user with this token
        $users = get_users([
            'meta_key' => '_bellano_admin_token',
            'meta_value' => $token,
            'number' => 1
        ]);
        
        if (empty($users)) {
            return false;
        }
        
        $user = $users[0];
        
        // Check if token expired
        $expires = get_user_meta($user->ID, '_bellano_admin_token_expires', true);
        if ($expires && $expires < time()) {
            delete_user_meta($user->ID, '_bellano_admin_token');
            delete_user_meta($user->ID, '_bellano_admin_token_expires');
            return false;
        }
        
        return $user->ID;
    }
}
