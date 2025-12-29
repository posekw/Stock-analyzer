<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Lightweight JWT Handler (HS256)
 * No external dependencies required.
 */
class SVP_JWT_Handler
{
    private $secret;

    public function __construct()
    {
        // Get secret from options or wp-config, fallback to a generated one
        $this->secret = defined('SVP_JWT_SECRET') ? SVP_JWT_SECRET : get_option('svp_jwt_secret');

        if (empty($this->secret)) {
            $this->secret = wp_generate_password(64, true, true);
            update_option('svp_jwt_secret', $this->secret);
        }
    }

    /**
     * Generate a JWT for a user
     */
    public function generate_token($user_id)
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'iss' => get_bloginfo('url'),
            'iat' => time(),
            'exp' => time() + (7 * 24 * 60 * 60), // 7 days
            'data' => ['user_id' => $user_id]
        ]);

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this->secret, true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Validate a token and return user ID
     */
    public function validate_token($token)
    {
        $parts = explode('.', $token);
        if (count($parts) != 3) {
            return false;
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        $signature = $this->base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this->secret, true);

        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }

        $payload = json_decode($this->base64UrlDecode($base64UrlPayload), true);

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Expired
        }

        return isset($payload['data']['user_id']) ? $payload['data']['user_id'] : false;
    }

    // --- Helpers ---

    private function base64UrlEncode($data)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private function base64UrlDecode($data)
    {
        $urlUnsafeData = str_replace(['-', '_'], ['+', '/'], $data);
        $paddedData = str_pad($urlUnsafeData, strlen($data) % 4, '=', STR_PAD_RIGHT);
        return base64_decode($paddedData);
    }
}
