
document.addEventListener('DOMContentLoaded', function () {

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

    const themeSelect = document.getElementById('theme-select');
    const fontSelect = document.getElementById('font-select');
    const status = document.getElementById('status');
    const themeCss = document.getElementById('theme-css');

    // Helper to set theme CSS
    function setThemeCss(theme) {
        if (theme === 'default' || !theme) {
            themeCss.removeAttribute('href');
        } else {
            themeCss.href = `themes/${theme}-theme.css`;
        }
    }

    // Helper to set font family
    function setFontFamily(font) {
        let fontFamily = '';
        switch (font) {
            case 'arial': fontFamily = 'Arial, sans-serif'; break;
            case 'comic-sans': fontFamily = '"Comic Sans MS", cursive, sans-serif'; break;
            case 'georgia': fontFamily = 'Georgia, serif'; break;
            case 'lato': fontFamily = '"Lato", Arial, sans-serif'; break;
            case 'noto-sans': fontFamily = '"Noto Sans", Arial, sans-serif'; break;
            case 'roboto-mono': fontFamily = '"Roboto Mono", monospace'; break;
            case 'san-francisco-pro': fontFamily = '"San Francisco Pro", Arial, sans-serif'; break;
            case 'verdana': fontFamily = 'Verdana, Geneva, sans-serif'; break;
            default: fontFamily = "'Segoe UI', 'Lato', Arial, sans-serif";
        }
        document.body.style.fontFamily = fontFamily;
    }

    // Load current settings
    storageGet(['teamsTheme', 'teamsFont']).then(result => {
        themeSelect.value = result.teamsTheme || 'default';
        fontSelect.value = result.teamsFont || 'default';
        setThemeCss(themeSelect.value);
        setFontFamily(fontSelect.value);
    });

    // Save theme on change
    themeSelect.addEventListener('change', function () {
        storageSet({ teamsTheme: themeSelect.value }).then(() => {
            setThemeCss(themeSelect.value);
            status.textContent = 'Theme updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

    // Save font on change
    fontSelect.addEventListener('change', function () {
        storageSet({ teamsFont: fontSelect.value }).then(() => {
            setFontFamily(fontSelect.value);
            status.textContent = 'Font updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

});
