/**
 * Stock Valuation Pro - Admin JavaScript
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        // Copy shortcode to clipboard
        $(document).on('click', '.svp-copy-btn', function () {
            const $btn = $(this);
            const shortcode = $btn.closest('li').find('.shortcode-code').text();

            navigator.clipboard.writeText(shortcode).then(function () {
                const originalText = $btn.text();
                $btn.text('Copied!');
                setTimeout(function () {
                    $btn.text(originalText);
                }, 2000);
            });
        });

        // Toggle switch visual update
        $('.svp-switch input').on('change', function () {
            const $switch = $(this).closest('.svp-switch');
            if ($(this).is(':checked')) {
                $switch.find('.slider').css('background-color', '#10b981');
            } else {
                $switch.find('.slider').css('background-color', '#ccc');
            }
        });

        // API key visibility toggle
        $('.svp-toggle-password').on('click', function () {
            const $input = $(this).prev('input');
            const type = $input.attr('type') === 'password' ? 'text' : 'password';
            $input.attr('type', type);
            $(this).find('.dashicons').toggleClass('dashicons-visibility dashicons-hidden');
        });
    });

})(jQuery);
