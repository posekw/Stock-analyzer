<?php
/**
 * Admin Users Management Template
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get all users registered through the plugin
$users = get_users(array(
    'role__in' => array('subscriber', 'author', 'editor'),
    'orderby' => 'registered',
    'order' => 'DESC'
));
?>

<div class="wrap svp-admin-wrap">
    <div class="svp-admin-header">
        <h1>
            <span class="dashicons dashicons-admin-users"></span>
            User Management
        </h1>
        <span class="version">v
            <?php echo SVP_VERSION; ?>
        </span>
    </div>

    <div class="svp-admin-card">
        <div class="svp-users-stats">
            <p>Total Users: <strong>
                    <?php echo count($users); ?>
                </strong></p>
        </div>

        <table class="wp-list-table widefat fixed striped svp-users-table">
            <thead>
                <tr>
                    <th class="column-id">ID</th>
                    <th class="column-username">Username</th>
                    <th class="column-email">Email</th>
                    <th class="column-registered">Registered</th>
                    <th class="column-status">Status</th>
                    <th class="column-api-key">Has API Key</th>
                    <th class="column-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($users)): ?>
                    <tr>
                        <td colspan="7" class="no-users">No users found.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($users as $user):
                        $is_banned = get_user_meta($user->ID, 'svp_user_banned', true);
                        $has_api_key = !empty(get_user_meta($user->ID, 'svp_gemini_api_key', true));
                        ?>
                        <tr data-user-id="<?php echo esc_attr($user->ID); ?>">
                            <td class="column-id">
                                <?php echo esc_html($user->ID); ?>
                            </td>
                            <td class="column-username">
                                <strong>
                                    <?php echo esc_html($user->user_login); ?>
                                </strong>
                                <?php if ($user->display_name !== $user->user_login): ?>
                                    <br><small>
                                        <?php echo esc_html($user->display_name); ?>
                                    </small>
                                <?php endif; ?>
                            </td>
                            <td class="column-email">
                                <?php echo esc_html($user->user_email); ?>
                            </td>
                            <td class="column-registered">
                                <?php echo esc_html(date('M j, Y', strtotime($user->user_registered))); ?>
                            </td>
                            <td class="column-status">
                                <?php if ($is_banned): ?>
                                    <span class="svp-status svp-status-banned">Banned</span>
                                <?php else: ?>
                                    <span class="svp-status svp-status-active">Active</span>
                                <?php endif; ?>
                            </td>
                            <td class="column-api-key">
                                <?php if ($has_api_key): ?>
                                    <span class="svp-badge svp-badge-yes">Yes</span>
                                <?php else: ?>
                                    <span class="svp-badge svp-badge-no">No</span>
                                <?php endif; ?>
                            </td>
                            <td class="column-actions">
                                <?php if ($is_banned): ?>
                                    <button class="button svp-unban-user" data-user-id="<?php echo esc_attr($user->ID); ?>">
                                        <span class="dashicons dashicons-yes"></span> Unban
                                    </button>
                                <?php else: ?>
                                    <button class="button svp-ban-user" data-user-id="<?php echo esc_attr($user->ID); ?>">
                                        <span class="dashicons dashicons-dismiss"></span> Ban
                                    </button>
                                <?php endif; ?>
                                <button class="button button-link-delete svp-delete-user"
                                    data-user-id="<?php echo esc_attr($user->ID); ?>">
                                    <span class="dashicons dashicons-trash"></span> Delete
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<style>
    .svp-users-stats {
        margin-bottom: 20px;
        padding: 10px 15px;
        background: #f0f0f1;
        border-radius: 4px;
    }

    .svp-users-table .column-id {
        width: 60px;
    }

    .svp-users-table .column-status {
        width: 80px;
    }

    .svp-users-table .column-api-key {
        width: 100px;
    }

    .svp-users-table .column-actions {
        width: 180px;
    }

    .svp-status {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 500;
    }

    .svp-status-active {
        background: #d4edda;
        color: #155724;
    }

    .svp-status-banned {
        background: #f8d7da;
        color: #721c24;
    }

    .svp-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
    }

    .svp-badge-yes {
        background: #cce5ff;
        color: #004085;
    }

    .svp-badge-no {
        background: #e2e3e5;
        color: #6c757d;
    }

    .svp-users-table .button {
        margin-right: 5px;
    }

    .svp-users-table .button .dashicons {
        font-size: 14px;
        width: 14px;
        height: 14px;
        margin-right: 3px;
        vertical-align: -2px;
    }

    .no-users {
        text-align: center;
        padding: 20px !important;
        color: #666;
    }
</style>

<script>
    jQuery(document).ready(function ($) {
        // Ban user
        $('.svp-ban-user').on('click', function () {
            var userId = $(this).data('user-id');
            var row = $(this).closest('tr');

            if (!confirm('Are you sure you want to ban this user? They will not be able to log in.')) {
                return;
            }

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'svp_admin_ban_user',
                    user_id: userId,
                    ban: 1,
                    _ajax_nonce: '<?php echo wp_create_nonce('svp_admin_nonce'); ?>'
            },
                success: function (response) {
                    if (response.success) {
                        location.reload();
                    } else {
                        alert('Failed to ban user: ' + response.data);
                    }
                }
            });
        });

        // Unban user
        $('.svp-unban-user').on('click', function () {
            var userId = $(this).data('user-id');

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'svp_admin_ban_user',
                    user_id: userId,
                    ban: 0,
                    _ajax_nonce: '<?php echo wp_create_nonce('svp_admin_nonce'); ?>'
            },
                success: function (response) {
                    if (response.success) {
                        location.reload();
                    } else {
                        alert('Failed to unban user: ' + response.data);
                    }
                }
            });
        });

        // Delete user
        $('.svp-delete-user').on('click', function () {
            var userId = $(this).data('user-id');
            var row = $(this).closest('tr');

            if (!confirm('Are you sure you want to DELETE this user? This action cannot be undone!')) {
                return;
            }

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'svp_admin_delete_user',
                    user_id: userId,
                    _ajax_nonce: '<?php echo wp_create_nonce('svp_admin_nonce'); ?>'
            },
                success: function (response) {
                    if (response.success) {
                        row.fadeOut(300, function () { $(this).remove(); });
                    } else {
                        alert('Failed to delete user: ' + response.data);
                    }
                }
            });
        });
    });
</script>