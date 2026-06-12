// ---- characters.js : playable characters with level-gated abilities ----
const Characters = (() => {
  // sprite grids: left half, mirrored (folk-embroidery symmetry per ART_STYLE.md)
  const CHARS = [
    {
      id: 'vanguard', name: 'NOVA VANGUARD', start: 'ember',
      blurb: 'Balanced star-knight. Masters the dash.',
      hp: 100, speed: 200, dmgMul: 1, cdMul: 1,
      pal: { a: '#3ae0ff', b: '#1f6b9e', w: '#ffffff', e: '#ff8c42' },
      grid: ['....w', '...ww', '..waa', '.waaa', '.waab', 'waaab', 'waabb', '.wabb', '.e.bb', 'e..b.'],
      perks: [
        { lvl: 5,  name: 'Afterburner',  desc: 'Dash recharges 40% faster', apply: m => m.dashCd *= 0.6 },
        { lvl: 10, name: 'Plated Hull',  desc: '+25 max HP, +1 armor', apply: (m, p) => { p.maxHp += 25; p.hp += 25; m.armor += 1; } },
        { lvl: 15, name: 'Overdrive',    desc: '+15% damage', apply: m => m.dmg *= 1.15 },
        { lvl: 20, name: 'Nova Break',   desc: 'Dashing detonates an explosion', apply: m => m.dashExplode = true },
      ],
    },
    {
      id: 'witch', name: 'HEXA THE WITCH', start: 'missile',
      blurb: 'Glass cannon. Pure arcane violence.',
      hp: 75, speed: 195, dmgMul: 1.25, cdMul: 1,
      pal: { a: '#ff5cd6', b: '#8a1f7a', w: '#ffe9ff', e: '#ffd23e' },
      grid: ['..e..', '.aab.', 'aaaab', '.waaa', '.waaa', 'waaab', 'wabbb', '.wabb', '..bb.', '.b.b.'],
      perks: [
        { lvl: 5,  name: 'Doom Sight',   desc: '+15% crit chance', apply: m => m.crit += 0.15 },
        { lvl: 10, name: 'Blood Pact',   desc: 'Hits can drink life', apply: m => m.lifesteal += 0.08 },
        { lvl: 15, name: 'Hex Amplifier', desc: '+20% damage', apply: m => m.dmg *= 1.2 },
        { lvl: 20, name: 'Witchstorm',   desc: 'Free arcane nova every 9s', apply: m => m.special = { arch: 'nova', cd: 9, color: '#ff5cd6' } },
      ],
    },
    {
      id: 'monk', name: 'BRAMBLEFOOT', start: 'thorn',
      blurb: 'Living grove. Outlasts everything.',
      hp: 135, speed: 185, dmgMul: 0.9, cdMul: 1,
      pal: { a: '#5ce86b', b: '#1f8a3a', w: '#eaffe0', e: '#a8743a' },
      grid: ['..a..', '.aaa.', '.waa.', 'waaaa', 'waaae', 'waaae', 'wabbb', '.wabb', '..bb.', '.b.b.'],
      perks: [
        { lvl: 5,  name: 'Sap Skin',     desc: 'Attackers take thorn damage', apply: m => m.thorns += 14 },
        { lvl: 10, name: 'Photosynthesis', desc: '+1.5 HP/s regeneration', apply: m => m.regen += 1.5 },
        { lvl: 15, name: 'Ironbark',     desc: '+3 armor', apply: m => m.armor += 3 },
        { lvl: 20, name: 'World Bloom',  desc: 'Free poison eruption line every 8s', apply: m => m.special = { arch: 'geyser', cd: 8, color: '#5ce86b' } },
      ],
    },
    {
      id: 'gunner', name: 'GIGAVOLT GUNNER', start: 'arc',
      blurb: 'Overclocked speedster. Never stops.',
      hp: 90, speed: 230, dmgMul: 1, cdMul: 0.92,
      pal: { a: '#ffe93e', b: '#a8741f', w: '#fffbe0', e: '#3ae0ff' },
      grid: ['...ww', '..waa', '..aae', '.waaa', '.waab', 'waaab', 'w.abb', '..abb', '.e.b.', 'e.b..'],
      perks: [
        { lvl: 5,  name: 'Static Steps', desc: '-12% all cooldowns', apply: m => m.cd *= 0.88 },
        { lvl: 10, name: 'Capacitor',    desc: '+12% damage', apply: m => m.dmg *= 1.12 },
        { lvl: 15, name: 'Twin Coils',   desc: '+1 projectile on everything', apply: m => m.count += 1 },
        { lvl: 20, name: 'Railstorm',    desc: 'Free auto-turret every 10s', apply: m => m.special = { arch: 'turret', cd: 10, color: '#ffe93e' } },
      ],
    },
  ];

  let selected = CHARS[0];

  function sprite(ch) { return Sprites.render(ch.grid, ch.pal, 3, true); }

  // called when the player reaches a new level: apply any perk gated at it
  function onLevel(G) {
    const p = G.player;
    for (const perk of selected.perks) {
      if (perk.lvl === p.lvl) {
        perk.apply(p.mods, p);
        Particles.text(p.x, p.y - 46, `★ ${perk.name} ★`, '#ffd23e', 18);
        Particles.burst(p.x, p.y, '#ffd23e', 26, { speed: 240 });
        Snd.play('fusion');
      }
    }
  }

  return { CHARS, sprite, onLevel, get selected() { return selected; }, select(c) { selected = c; } };
})();
