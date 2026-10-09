// Runs in the page's world: CSS can't stop Fluent's Web Animations API calls.

(function () {
    'use strict';

    const nativeAnimate = Element.prototype.animate;

    Element.prototype.animate = function (keyframes, options) {
        if (document.documentElement.dataset.tftAnimations === 'off') {
            options = typeof options === 'number' ? 0 : { ...options, duration: 0 };
        }
        return nativeAnimate.call(this, keyframes, options);
    };
})();
