// Teams Chat Padding Fix Content Script

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

        // Define font families with fallbacks
        const fontFamilies = {
            'default': '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
            'lato': '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
            'georgia': '"Georgia", "Times New Roman", Times, serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui',
            'noto-sans': '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
            'roboto-mono': '"Roboto Mono", "Cascadia Mono", Consolas, ui-monospace, Menlo, Monaco, monospace',
            'verdana': '"Verdana", Geneva, Tahoma, sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui'
        };

        const fontFamily = fontFamilies[font];
        if (!fontFamily) return;

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

            /* Apply font to common Teams elements */
            body,
            .app-chrome,
            .app-chrome *,
            .ui-message,
            .message-content,
            .chat-message,
            .channel-content,
            .conversation-content,
            .fui-Text,
            .ui-text,
            button,
            input,
            textarea,
            select {
                font-family: ${fontFamily} !important;
            }
        `;

        // Inject font CSS
        const style = document.createElement('style');
        style.id = 'teams-font-style';
        style.textContent = fontCSS;
        document.head.appendChild(style);
    }

    // Theme selection logic
    function injectTheme(theme) {

        // Remove any previously injected theme
        const oldStyle = document.getElementById('teams-theme-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        let themeFile = 'styles.css'; // default
        if (theme === 'purple') themeFile = 'themes/purple-theme.css';
        if (theme === 'lagoon') themeFile = 'themes/lagoon-theme.css';
        if (theme === 'amber') themeFile = 'themes/amber-theme.css';
        if (theme === 'forest') themeFile = 'themes/forest-theme.css';
        if (theme === 'midnight') themeFile = 'themes/midnight-theme.css';
        if (theme === 'rose') themeFile = 'themes/rose-theme.css';
        if (theme === 'sunset') themeFile = 'themes/sunset-theme.css';
        if (theme === 'laser') themeFile = 'themes/laser-theme.css';
        if (theme === 'dracula') themeFile = 'themes/dracula-theme.css';
        if (theme === 'monokai') themeFile = 'themes/monokai-theme.css';
        if (theme === 'nord') themeFile = 'themes/nord-theme.css';
        if (theme === 'solarized') themeFile = 'themes/solarized-theme.css';

        fetch(ext.runtime.getURL(themeFile))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(css => {
                const style = document.createElement('style');
                style.id = 'teams-theme-style';
                style.textContent = css;
                document.head.appendChild(style);
            })
            .catch(error => {
                console.error('Teams Theme Extension: Error loading theme:', error);
            });
    }

    // Inject Teams Improvements CSS if enabled
    function injectImprovements(enabled) {
        const styleId = 'teams-improvements-style';
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();
        if (enabled) {
            fetch(ext.runtime.getURL('styles.css'))
                .then(response => response.text())
                .then(css => {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = css;
                    document.head.appendChild(style);
                });
        }
    }

    storageGet(['teamsTheme', 'teamsFont']).then(result => {
        injectTheme(result.teamsTheme || 'default');
        injectFont(result.teamsFont || 'default');
        injectImprovements(true);
    });

    // Listen for changes and apply live
    ext.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'sync') {
            if (changes.teamsTheme) {
                injectTheme(changes.teamsTheme.newValue || 'default');
            }
            if (changes.teamsFont) {
                injectFont(changes.teamsFont.newValue || 'default');
            }
        }
    });
})();