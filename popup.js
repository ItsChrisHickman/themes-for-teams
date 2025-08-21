document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('theme-select');
    const fontSelect = document.getElementById('font-select');
    const status = document.getElementById('status');

    // Load current settings
    chrome.storage.sync.get(['teamsTheme', 'teamsFont'], function(result) {
        themeSelect.value = result.teamsTheme || 'default';
        fontSelect.value = result.teamsFont || 'default';
    });

    // Save theme on change
    themeSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ teamsTheme: themeSelect.value }, function() {
            status.textContent = 'Theme updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

    // Save font on change
    fontSelect.addEventListener('change', function() {
        chrome.storage.sync.set({ teamsFont: fontSelect.value }, function() {
            status.textContent = 'Font updated!';
            setTimeout(() => status.textContent = '', 1200);
        });
    });

});
