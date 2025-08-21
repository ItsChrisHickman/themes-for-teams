
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

    // Load current settings
    storageGet(['teamsTheme', 'teamsFont']).then(result => {
        themeSelect.value = result.teamsTheme || 'default';
        fontSelect.value = result.teamsFont || 'default';
    });

    // Save theme on change
    themeSelect.addEventListener('change', function () {
        storageSet({ teamsTheme: themeSelect.value }).then(() => {
            status.textContent = 'Theme updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

    // Save font on change
    fontSelect.addEventListener('change', function () {
        storageSet({ teamsFont: fontSelect.value }).then(() => {
            status.textContent = 'Font updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

});
