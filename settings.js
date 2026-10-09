// Setting definitions shared by the popup and the content script.
// Toggle values are booleans, choice values are strings. Each setting reaches
// styles.css as the attribute data-tft-<kebab-case key> on <html> ("on"/"off" for toggles).

(function () {
    'use strict';

    // A setting with `density` only does anything in that Teams message density; the popup hides it otherwise
    const toggle = (key, group, label, recommended, teamsDefault = false) =>
        ({ key, group, label, type: 'toggle', recommended, teamsDefault });

    const choice = (key, group, label, choices, recommended, teamsDefault) =>
        ({ key, group, label, type: 'choice', choices: choices.map(([value, text, stack]) => ({ value, label: text, stack })), recommended, teamsDefault });

    const SETTINGS = [
        { ...choice('theme', 'Look', 'Theme', [
            ['default', 'Default'], ['purple', 'Purple'], ['lagoon', 'Lagoon'], ['monokai', 'Monokai'],
            ['dracula', 'Dracula'], ['amber', 'Amber'], ['forest', 'Forest'], ['midnight', 'Midnight'],
            ['nord', 'Nord'], ['tokyonight', 'Tokyo Night'], ['gruvbox', 'Gruvbox'], ['catppuccin', 'Catppuccin'],
            ['cherry', 'Cherry'], ['mint', 'Mint'], ['hotdog', '\u{1F32D} Hot Dog Stand'],
        ], 'default', 'default'), storageKey: 'teamsTheme', personal: true },
        { ...choice('font', 'Look', 'Font', [
            ['default', 'Default'],
            ['arial', 'Arial', '"Arial"'],
            ['comic-sans', 'Comic Sans', '"Comic Sans MS", "Comic Sans", cursive'],
            ['georgia', 'Georgia', '"Georgia", "Times New Roman", Times, serif'],
            ['lato', 'Lato', '"Lato"'],
            ['noto-sans', 'Noto Sans', '"Noto Sans"'],
            ['roboto-mono', 'Roboto Mono', '"Roboto Mono", "Cascadia Mono", Consolas, ui-monospace, Menlo, Monaco, monospace'],
            ['san-francisco-pro', 'San Francisco Pro', '"SF Pro Text", "SF Pro"'],
            ['verdana', 'Verdana', '"Verdana", Geneva, Tahoma'],
        ], 'default', 'default'), storageKey: 'teamsFont', personal: true },
        choice('avatar', 'Look', 'Avatar shape', [['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle']], 'square', 'circle'),
        choice('textSize', 'Look', 'Text size', [['90', '90%'], ['100', '100%'], ['110', '110%'], ['120', '120%']], '100', '100'),
        toggle('borders', 'Look', 'Hide borders', true),

        choice('linkStyle', 'Links', 'Link color', [['blue', 'Bright blue'], ['theme', 'Theme']], 'blue', 'theme'),
        choice('mentionStyle', 'Links', 'Mentions', [['chip', 'Chip'], ['plain', 'Plain']], 'chip', 'plain'),
        toggle('teamsLinks', 'Links', 'Style Teams links', true),
        toggle('externalIcon', 'Links', 'Arrow on external links', true),

        { ...toggle('myMessages', 'Messages', 'Left-align my messages + "You"', true), density: 'comfy' },
        { ...toggle('flatMessages', 'Messages', 'Flat messages (no bubbles)', false), density: 'comfy' },
        toggle('hoverHighlight', 'Messages', 'Highlight message on hover', false),
        toggle('timestamps', 'Messages', 'Fade timestamps', true),
        toggle('replySummary', 'Messages', 'Replies summary bar', true),
        toggle('reactions', 'Messages', 'Filled reaction buttons (no outline)', true),
        toggle('tombstone', 'Messages', 'Dim deleted messages', true),
        choice('spacing', 'Messages', 'Message spacing', [['tight', 'Tight'], ['normal', 'Normal'], ['roomy', 'Roomy'], ['teams', 'Teams']], 'normal', 'teams'),
        choice('dayDividers', 'Messages', 'Day dividers', [['pill', 'Pill'], ['teams', 'Teams']], 'pill', 'teams'),
        choice('wallpaper', 'Messages', 'Chat background', [['none', 'None'], ['doodles', 'Doodles'], ['dots', 'Dots'], ['grid', 'Graph paper'], ['honeycomb', 'Honeycomb'], ['waves', 'Waves'], ['plus', 'Plus'], ['tartan', 'Tartan'], ['arabesque', 'Arabesque'], ['confetti', 'Confetti']], 'none', 'none'),

        toggle('listGutter', 'Layout', 'Wider chat list (trim gutter and channel indent)', true),
        toggle('roundedList', 'Layout', 'Rounded chat list corner', true),
        toggle('threadInset', 'Layout', 'Roomier Threads pane', true),
        toggle('filters', 'Layout', 'Show all filters', true),
        toggle('seeMore', 'Layout', 'Always expand long posts', true),
        choice('listDensity', 'Layout', 'List density', [['compact', 'Compact'], ['teams', 'Teams']], 'teams', 'teams'),

        toggle('codeColors', 'Code & media', 'Code colors', true),
        choice('codeSize', 'Code & media', 'Code size', [['85', '85%'], ['100', '100%']], '85', '100'),
        toggle('imageBorder', 'Code & media', 'Border around images', true),
        toggle('cards', 'Code & media', 'Card borders', true),

        toggle('hideCopilot', 'Distractions', 'Hide Copilot buttons', false),
        toggle('notifications', 'Distractions', 'See-through notifications', true),

        { ...toggle('animations', 'Motion', 'Animations', true, true), storageKey: 'teamsDisableAnimations', storeInverted: true, personal: true },
    ];

    // Presets leave personal choices (theme, font) alone
    const presetSettings = SETTINGS.filter(s => !s.personal);
    const PRESETS = {
        recommended: Object.fromEntries(presetSettings.map(s => [s.key, s.recommended])),
        teamsDefault: Object.fromEntries(presetSettings.map(s => [s.key, s.teamsDefault])),
    };
    PRESETS.streamlined = {
        ...PRESETS.recommended,
        flatMessages: true, hoverHighlight: true, spacing: 'tight', listDensity: 'compact',
    };

    const storageKeyOf = s => s.storageKey || `tft_${s.key}`;

    // data-tft-text-size on <html>, dataset.tftTextSize in script
    const attrName = key => 'data-tft-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const datasetKey = key => 'tft' + key[0].toUpperCase() + key.slice(1);

    const toAttr = (s, value) => s.type === 'toggle' ? (value ? 'on' : 'off') : value;

    // Unknown or wrong-typed stored values (another version's settings) fall back to recommended
    const fromStorage = (s, raw) => {
        if (s.type === 'toggle') return typeof raw === 'boolean' ? (s.storeInverted ? !raw : raw) : s.recommended;
        return s.choices.some(c => c.value === raw) ? raw : s.recommended;
    };
    const toStorage = (s, value) => s.storeInverted ? !value : value;

    const fontStack = font => SETTINGS.find(s => s.key === 'font').choices.find(c => c.value === font)?.stack;

    globalThis.TFT_SETTINGS = { SETTINGS, PRESETS, storageKeyOf, attrName, datasetKey, toAttr, fromStorage, toStorage, fontStack };
})();
