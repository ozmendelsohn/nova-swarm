#!/usr/bin/env node
// Sanity checks for game data. Run: node scripts/validate.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// minimal browser shims so data files evaluate under node
global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) }), width: 0, height: 0 }) };
global.window = { addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };

const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const src = ['js/util.js', 'js/weapons/weapons.js', 'js/weapons/fusions.js'].map(read).join('\n');

const checks = `
const all = Object.values(WEAPONS.defs);
const archs = new Set(all.map(d => d.arch));
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
if (all.length !== 252) fail('expected 252 weapon forms, got ' + all.length);
if (archs.size < 36) fail('expected >=36 archetypes in use, got ' + archs.size);
const badNames = FUSIONS.recipes.filter(r => r.name.includes('undefined'));
if (badNames.length) fail(badNames.length + ' fusion names contain undefined');
const badParents = FUSIONS.recipes.filter(r => !WEAPONS.defs[r.parents[0]] || !WEAPONS.defs[r.parents[1]]);
if (badParents.length) fail(badParents.length + ' fusion recipes reference missing weapons');
// every archetype referenced by a weapon must be implemented
const implSrc = ${JSON.stringify('@ARCH@')};
for (const a of archs) {
  if (!implSrc.includes("    " + a + ": { fire:")) fail('archetype not implemented: ' + a);
}
// every enemy type must have a sprite grid
const sprSrc = ${JSON.stringify('@SPR@')};
const enemSrc = ${JSON.stringify('@ENEM@')};
const types = [...enemSrc.matchAll(/\\{ id: '(\\w+)',\\s+hp:/g)].map(m => m[1]);
for (const t of types) {
  if (!new RegExp('^    ' + t + ': \\\\{ pal:', 'm').test(sprSrc)) fail('enemy type has no sprite: ' + t);
}
console.log('OK:', all.length, 'forms ·', archs.size, 'archetypes ·', FUSIONS.recipes.length, 'fusions ·', types.length, 'enemy types');
`;

eval(src + checks
  .replace(JSON.stringify('@ARCH@'), JSON.stringify(read('js/weapons/archetypes.js')))
  .replace(JSON.stringify('@SPR@'), JSON.stringify(read('js/sprites.js')))
  .replace(JSON.stringify('@ENEM@'), JSON.stringify(read('js/enemies.js'))));
