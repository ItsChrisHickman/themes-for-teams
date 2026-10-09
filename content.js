// Themes for Teams content script

(function () {
    'use strict';

    const ext = typeof browser !== 'undefined' ? browser : chrome;

    // Cross-browser storage helper
    function storageGet(keys) {
        return new Promise((resolve) => {
            if (ext.storage.sync.get.length > 1) {
                // Chrome-style callback
                ext.storage.sync.get(keys, resolve);
            } else {
                // Firefox-style promise
                ext.storage.sync.get(keys).then(resolve);
            }
        });
    }

    function storageSet(items) {
        return new Promise((resolve) => {
            if (ext.storage.sync.set.length > 1) {
                // Chrome-style callback
                ext.storage.sync.set(items, resolve);
            } else {
                // Firefox-style promise
                ext.storage.sync.set(items).then(resolve);
            }
        });
    }

    // Font selection function
    function injectFont(font) {

        // Remove any previously injected font
        const oldFontStyle = document.getElementById('teams-font-style');
        if (oldFontStyle) {
            oldFontStyle.remove();
        }

        // Remove any previously injected font link
        const oldFontLink = document.getElementById('teams-font-link');
        if (oldFontLink) {
            oldFontLink.remove();
        }

        // Skip if default font
        if (font === 'default' || !font) {
            return;
        }

        const baseFamily = globalThis.TFT_SETTINGS.fontStack(font);
        if (!baseFamily) return;

        const fontFamily = baseFamily + ', -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

        // Inject Google Fonts link for Lato
        if (font === 'lato') {
            const link = document.createElement('link');
            link.id = 'teams-font-link';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css?family=Lato:400,700&display=swap';
            document.head.appendChild(link);
        }

        // Create CSS for font override
        const fontCSS = `
            :root,
            html,
            body,
            #app,
            .fui-FluentProvider,
            .fui-FluentProvider[class*="fui-FluentProvider"],
            [data-theme],
            .app-chrome {
                --fontFamilyBase: ${fontFamily} !important;
                --fontFamilyMonospace: ${font === 'roboto-mono' ? fontFamily : '"Roboto Mono", "Cascadia Mono", Consolas, ui-monospace, Menlo, Monaco, monospace'} !important;
            }
        `;

        // Inject font CSS
        const style = document.createElement('style');
        style.id = 'teams-font-style';
        style.textContent = fontCSS;
        document.head.appendChild(style);
    }

        // Theme selection logic - modular system with base + palette
    function injectTheme(theme) {
        // Remove any previously injected themes
        const oldBaseStyle = document.getElementById('teams-base-theme-style');
        const oldPaletteStyle = document.getElementById('teams-palette-style');
        if (oldBaseStyle) oldBaseStyle.remove();
        if (oldPaletteStyle) oldPaletteStyle.remove();

        // For default theme, styles.css is already injected by the manifest
        if (theme === 'default') {
            return;
        }

        // For themed options, load base + palette
        const supportedThemes = globalThis.TFT_SETTINGS.SETTINGS
            .find(setting => setting.key === 'theme').choices.map(c => c.value);

        if (!supportedThemes.includes(theme)) {
            console.warn('Teams Theme Extension: Unknown theme, falling back to default');
            injectTheme('default');
            return;
        }

        // Load base theme first, then palette
        Promise.all([
            fetch(ext.runtime.getURL('themes/base-theme.css')).then(r => r.text()),
            fetch(ext.runtime.getURL(`themes/${theme}-theme.css`)).then(r => r.text())
        ])
        .then(([baseCss, paletteCss]) => {
            // Inject palette first (defines variables)
            const paletteStyle = document.createElement('style');
            paletteStyle.id = 'teams-palette-style';
            paletteStyle.textContent = paletteCss;
            document.head.appendChild(paletteStyle);

            // Then inject base theme (uses variables)
            const baseStyle = document.createElement('style');
            baseStyle.id = 'teams-base-theme-style';
            baseStyle.textContent = baseCss;
            document.head.appendChild(baseStyle);

        })
        .catch(error => {
            console.error('Teams Theme Extension: Error loading modular theme:', error);
            // Fallback to default
            injectTheme('default');
        });
    }

    // Inject No Animations CSS if enabled
    function injectNoAnimations(enabled) {
        const styleId = 'teams-no-animations-style';
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();
        if (enabled) {
            fetch(ext.runtime.getURL('no-animations.css'))
                .then(response => response.text())
                .then(css => {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = css;
                    document.head.appendChild(style);
                })
                .catch(error => {
                    console.error('Teams Theme Extension: Error loading no-animations.css:', error);
                });
        }
    }

    const { SETTINGS, storageKeyOf, datasetKey, toAttr, fromStorage } = globalThis.TFT_SETTINGS;

    // Settings that load files or inject styles beyond the data-tft-* attribute
    const sideEffects = {
        theme: injectTheme,
        font: injectFont,
        animations: enabled => injectNoAnimations(!enabled),
    };

    function applySetting(setting, value) {
        document.documentElement.dataset[datasetKey(setting.key)] = toAttr(setting, value);
        const sideEffect = sideEffects[setting.key];
        if (sideEffect) sideEffect(value);
    }

    // Attributes first, synchronously, so styles.css matches before storage answers
    SETTINGS.forEach(setting => {
        document.documentElement.dataset[datasetKey(setting.key)] = toAttr(setting, setting.recommended);
    });

    storageGet(SETTINGS.map(storageKeyOf)).then(result => {
        SETTINGS.forEach(setting => applySetting(setting, fromStorage(setting, result[storageKeyOf(setting)])));
    });

    // Tell the popup which message density Teams is showing, so it can hide settings for the other one
    const DENSITY_KEY = 'tft_density';
    let reportedDensity;
    function reportDensity() {
        const density = document.querySelector('.fui-ChatMessageCompact') ? 'compact'
            : document.querySelector('.fui-ChatMessage, .fui-ChatMyMessage') ? 'comfy' : undefined;
        if (!density || density === reportedDensity) return;
        reportedDensity = density;
        ext.storage.local.set({ [DENSITY_KEY]: density });
    }
    let densityCheck;
    new MutationObserver(() => {
        clearTimeout(densityCheck);
        densityCheck = setTimeout(reportDensity, 1000);
    }).observe(document.documentElement, { childList: true, subtree: true });

    // Listen for changes and apply live
    ext.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'sync') {
            SETTINGS.forEach(setting => {
                const change = changes[storageKeyOf(setting)];
                if (change) applySetting(setting, fromStorage(setting, change.newValue));
            });
        }
    });
})();