# Gemini API Key System - Complete Rebuild Documentation

## Overview
This document describes the completely new Gemini API key system implemented to replace the problematic REST API based approach.

## Architecture

### Backend (PHP)

#### New Class: SVP_User_Settings

**Location**: `includes/class-svp-user-settings.php`

**Purpose**: Handles all Gemini API key storage and retrieval using WordPress AJAX endpoints

**AJAX Endpoints**:
1. `wp_ajax_svp_save_api_key` - Saves user's API key
2. `wp_ajax_svp_get_api_key` - Retrieves user's API key

**Storage Method**: WordPress user meta (`svp_gemini_api_key`)

**Security**: Uses WordPress nonce verification (`svp_nonce`)

### Frontend (JavaScript)

**AJAX URL**: `svpData.ajaxUrl` (WordPress admin-ajax.php)

**Required Data**:
- `action`: Either `svp_save_api_key` or `svp_get_api_key`
- `nonce`: `svpData.nonce`
- `api_key`: The Gemini API key (for save operation)

## How It Works

### Saving API Key

1. User fills in API key in settings modal
2. JavaScript sends AJAX POST to `admin-ajax.php` with:
   - `action=svp_save_api_key`
   - `nonce=svpData.nonce`
   - `api_key=<user_key>`
3. Backend validates nonce and user login status
4. Key saved to WordPress user meta
5. Success response returned

### Loading API Key

1. Settings modal opens
2. JavaScript sends AJAX GET to `admin-ajax.php` with:
   - `action=svp_get_api_key`
   - `nonce=svpData.nonce`
3. Backend retrieves key from user meta
4. Returns masked version for display

### Using API Key in Analysis

The `ajax_analyze_news` function:
1. Gets current WordPress user ID
2. Retrieves their API key from user meta
3. Falls back to site-wide key if not set
4. Uses key for Gemini API call

## Migration Notes

### What Changed
- **Removed**: REST API `/user/settings` endpoint (deprecated but kept for backwards compatibility)
- **Added**: New AJAX endpoints `svp_save_api_key` and `svp_get_api_key`
- **Changed**: Frontend JavaScript now uses AJAX admin-ajax.php instead of REST API
- **Improved**: Permission checking now uses `is_user_logged_in()` 

### What Stayed The Same
- Storage location: WordPress user meta `svp_gemini_api_key`
- Fallback mechanism to site-wide key
- Per-user key isolation

## Testing Checklist

- [ ] User can save API key
- [ ] User can view masked key after saving
- [ ] API key persists across sessions
- [ ] AI analysis uses user's key
- [ ] Fallback to site-wide key works when user has no key
- [ ] Nonce verification blocks unauthorized requests
- [ ] Non-logged-in users get proper error messages

## Files Modified

1. `includes/class-svp-user-settings.php` - NEW FILE
2. `stock-valuation-pro.php` - Added include for new class
3. `assets/js/frontend.js` - TO BE UPDATED with new AJAX calls
4. `stock-valuation-pro.php` - `ajax_analyze_news` - Already using user meta
5. `stock-valuation-pro.php` - `check_api_permission` - Fixed to allow all logged-in users

## Next Steps

1. Update `frontend.js` to use new AJAX endpoints
2. Test complete flow end-to-end
3. Deploy to production
