// Checks styles.css and main-world.js against settings.js: node tools/check-settings.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
await import(new URL('settings.js', root));
const { SETTINGS, attrName, datasetKey } = globalThis.TFT_SETTINGS;

const read = name => readFileSync(fileURLToPath(new URL(name, root)), 'utf8');
const css = read('styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
const mainWorld = read('main-world.js');

// Loaded through their own code paths rather than CSS rules
const noCssRule = ['theme', 'font'];

const allowedValues = new Map(SETTINGS.map(s => [
    attrName(s.key),
    s.type === 'toggle' ? ['on', 'off'] : s.choices.map(c => c.value),
]));

const problems = [];
const usedAttrs = new Set();
const usedValues = new Set();

for (const [, name, value] of css.matchAll(/(data-tft-[a-z-]+)="([^"]*)"/g)) {
    usedAttrs.add(name);
    usedValues.add(`${name}=${value}`);
    const values = allowedValues.get(name);
    if (!values) problems.push(`styles.css uses unknown attribute ${name}`);
    else if (!values.includes(value)) problems.push(`styles.css uses ${name}="${value}", not defined in settings.js`);
}

for (const s of SETTINGS) {
    if (noCssRule.includes(s.key)) continue;
    const referenced = usedAttrs.has(attrName(s.key)) || mainWorld.includes(datasetKey(s.key));
    if (!referenced) problems.push(`setting "${s.key}" is not referenced by styles.css or main-world.js`);
    // A choice with no rule must be the Teams look, or it does nothing
    if (s.type === 'choice') for (const { value } of s.choices) {
        if (value !== s.teamsDefault && !usedValues.has(`${attrName(s.key)}=${value}`)) {
            problems.push(`setting "${s.key}" choice "${value}" has no styles.css rule and isn't the Teams default`);
        }
    }
}

if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
}
console.log(`ok: ${SETTINGS.length} settings`);
