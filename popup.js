
document.addEventListener('DOMContentLoaded', function () {

    const ext = typeof browser !== 'undefined' ? browser : chrome;

    // Cross-browser storage helper
    function storageGet(keys, area = 'sync') {
        return new Promise((resolve) => {
            if (ext.storage[area].get.length > 1) {
                // Chrome-style callback
                ext.storage[area].get(keys, resolve);
            } else {
                // Firefox-style promise
                ext.storage[area].get(keys).then(resolve);
            }
        });
    }

    function storageSet(items, area = 'sync') {
        return new Promise((resolve) => {
            if (ext.storage[area].set.length > 1) {
                // Chrome-style callback
                ext.storage[area].set(items, resolve);
            } else {
                // Firefox-style promise
                ext.storage[area].set(items).then(resolve);
            }
        });
    }

    const { SETTINGS, PRESETS, storageKeyOf, fromStorage, toStorage } = globalThis.TFT_SETTINGS;

    const settingsEl = document.getElementById('settings');
    const undoButton = document.getElementById('undo');
    const presetButtons = document.querySelectorAll('[data-preset]');
    const current = {};
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
        const stack = globalThis.TFT_SETTINGS.fontStack(font);
        document.body.style.fontFamily = (stack ? stack + ', ' : '') + "'Segoe UI', 'Lato', Arial, sans-serif";
    }

    // Live previews for the popup itself
    const previews = { theme: setThemeCss, font: setFontFamily };

    let statusTimer;
    function showStatus(text) {
        status.textContent = text;
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => status.textContent = '', 1200);
    }

    // key -> { read(), write(value) }
    const controls = new Map();

    function addControl(setting, parent) {
        const row = document.createElement('label');
        row.className = 'row';
        const text = document.createElement('span');
        text.textContent = setting.label;
        let input;
        let control;
        if (setting.type === 'toggle') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'switch';
            control = { read: () => input.checked, write: value => { input.checked = value; } };
        } else {
            input = document.createElement('select');
            setting.choices.forEach(choice => input.add(new Option(choice.label, choice.value)));
            control = { read: () => input.value, write: value => { input.value = value; } };
        }
        control.row = row;
        controls.set(setting.key, control);
        input.addEventListener('change', function () {
            applyValues({ [setting.key]: control.read() }, `${setting.label} updated!`);
        });
        row.append(text, input);
        parent.append(row);
    }

    function showValues(values) {
        SETTINGS.filter(setting => setting.key in values).forEach(setting => {
            controls.get(setting.key).write(values[setting.key]);
            if (previews[setting.key]) previews[setting.key](values[setting.key]);
        });
        Object.assign(current, values);
        presetButtons.forEach(button => {
            const preset = PRESETS[button.dataset.preset];
            button.classList.toggle('active', Object.keys(preset).every(key => preset[key] === current[key]));
        });
    }

    // Each entry holds the previous values of the settings one change touched; Undo pops one
    const UNDO_KEY = 'tft_undo';
    const UNDO_LIMIT = 20;
    const readUndo = () => storageGet(UNDO_KEY, 'local').then(result => result[UNDO_KEY] || []);
    const writeUndo = stack => storageSet({ [UNDO_KEY]: stack.slice(-UNDO_LIMIT) }, 'local').then(() => {
        undoButton.disabled = stack.length === 0;
    });

    const toStorageItems = values => Object.fromEntries(SETTINGS
        .filter(setting => setting.key in values)
        .map(setting => [storageKeyOf(setting), toStorage(setting, values[setting.key])]));

    function writeValues(values, message) {
        return storageSet(toStorageItems(values)).then(() => {
            showValues(values);
            showStatus(message);
        });
    }

    function applyValues(values, message) {
        const changed = Object.keys(values).filter(key => values[key] !== current[key]);
        if (!changed.length) return Promise.resolve();
        const previous = Object.fromEntries(changed.map(key => [key, current[key]]));
        return readUndo()
            .then(stack => writeUndo([...stack, previous]))
            .then(() => writeValues(values, message));
    }

    let section;
    let currentGroup;
    SETTINGS.forEach(setting => {
        if (setting.group !== currentGroup) {
            currentGroup = setting.group;
            section = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'section-title';
            title.textContent = currentGroup;
            section.append(title);
            settingsEl.append(section);
        }
        addControl(setting, section);
    });

    // Hide settings that do nothing in the density Teams last reported
    storageGet('tft_density', 'local').then(result => {
        const density = result.tft_density;
        if (!density) return;
        SETTINGS.filter(setting => setting.density && setting.density !== density)
            .forEach(setting => { controls.get(setting.key).row.hidden = true; });
    });

    // Load current settings and any pending undo
    storageGet(SETTINGS.map(storageKeyOf)).then(result => {
        showValues(Object.fromEntries(SETTINGS.map(setting => [setting.key, fromStorage(setting, result[storageKeyOf(setting)])])));
    });
    readUndo().then(stack => {
        undoButton.disabled = stack.length === 0;
    });

    // Apply a preset to every setting at once
    presetButtons.forEach(button => {
        button.addEventListener('click', function () {
            applyValues(PRESETS[button.dataset.preset], `${button.textContent} settings applied`);
        });
    });

    undoButton.addEventListener('click', function () {
        readUndo().then(stack => {
            const previous = stack.pop();
            if (!previous) return;
            writeUndo(stack).then(() => writeValues(previous, 'Undone'));
        });
    });

});
