# Stock Valuation Pro - Architecture

## Overview
A WordPress plugin providing AI-powered stock analysis with DCF valuation, technicals, news feed, and personalized watchlist.

## Data Storage

### User Meta Keys
| Key | Type | Description |
|-----|------|-------------|
| `svp_user_banned` | `bool` | Whether user is banned |
| `svp_watchlist` | `array` | User's saved stock tickers (JSON array) |
| `svp_gemini_api_key` | `string` | User's personal Gemini API key |

## AJAX Endpoints

### Watchlist (requires login)
| Action | Method | Description |
|--------|--------|-------------|
| `svp_get_watchlist` | POST | Get user's watchlist array |
| `svp_add_to_watchlist` | POST | Add ticker to watchlist |
| `svp_remove_from_watchlist` | POST | Remove ticker from watchlist |

### Admin (requires `manage_options`)
| Action | Method | Description |
|--------|--------|-------------|
| `svp_admin_ban_user` | POST | Ban/unban a user |
| `svp_admin_delete_user` | POST | Delete a user |

## Key Files

| File | Purpose |
|------|---------|
| `stock-valuation-pro.php` | Main plugin, AJAX handlers, REST routes |
| `templates/frontend/dashboard.php` | Main frontend template |
| `assets/js/frontend.js` | All frontend JavaScript |
| `assets/css/frontend.css` | All frontend styles |
| `includes/class-jwt-handler.php` | JWT authentication |

## Authentication
Users can login via:
1. WordPress native login (sessions)
2. JWT tokens via REST API (`/svp/v1/auth/login`)
