// ---- manager.js : weapon slots, leveling, branching, fusion, passives ----
const WeaponManager = (() => {
  const BASE_WEAPONS = 6, MAX_PASSIVES = 6, MAX_LVL = 5;
  const SLOT_EVERY = 8; // +1 weapon slot every 8 player levels — endgame holds everything
  const maxWeapons = G => BASE_WEAPONS + ((G.player.lvl / SLOT_EVERY) | 0);

  const PASSIVES = {
    might:    { name: 'Power Core',   icon: '⚔', desc: '+12% damage per rank' },
    haste:    { name: 'Overclock',    icon: '⚡', desc: '-8% cooldowns per rank' },
    area:     { name: 'Amplifier',    icon: '◎', desc: '+10% area per rank' },
    speed:    { name: 'Thrusters',    icon: '➤', desc: '+10% move speed per rank' },
    magnet:   { name: 'Tractor Beam', icon: '◈', desc: '+30% pickup range per rank' },
    armor:    { name: 'Hull Plating', icon: '🛡', desc: '-1.5 damage taken per rank' },
    regen:    { name: 'Nanobots',     icon: '+', desc: '+0.6 HP/s per rank' },
    luck:     { name: 'Lucky Chip',   icon: '★', desc: '+8% crit chance per rank' },
  };

  let weapons = []; // {def, lvl, t (cd timer)}
  let passives = {}; // id -> rank
  let discovered = new Set(JSON.parse(localStorage.getItem('ns_codex') || '[]'));

  function reset() {
    weapons = []; passives = {};
  }

  function discover(id) {
    if (!discovered.has(id)) {
      discovered.add(id);
      localStorage.setItem('ns_codex', JSON.stringify([...discovered]));
    }
  }

  function addWeapon(defId) {
    const w = { def: WEAPONS.defs[defId], lvl: 1, t: Util.rand(0, 0.5) };
    weapons.push(w);
    discover(defId);
    return w;
  }

  function stats(w) {
    const d = w.def, lvl = w.lvl;
    const mods = (typeof Game !== 'undefined' && Game.G) ? Game.G.player.mods : { dmg: 1, cd: 1, count: 0 };
    const might = (1 + 0.12 * (passives.might || 0) + 0.18 * (lvl - 1)) * mods.dmg * Meta.fx.dmg();
    const haste = Math.max(0.3, (1 - 0.08 * (passives.haste || 0)) * (1 - 0.05 * (lvl - 1)) * mods.cd);
    const area = (1 + 0.1 * (passives.area || 0)) * d.area * (1 + 0.06 * (lvl - 1));
    const s = {
      dmg: d.dmg * might,
      cd: d.cd * haste,
      count: Math.round(d.count + Math.floor((lvl - 1) / 2)) + mods.count,
      speed: d.speed, area, dur: d.dur, pierce: d.pierce,
    };
    for (const q of Quirks.list(d)) if (q.mod) q.mod(s, w);
    return s;
  }

  function fireWeapon(G, w, s) {
    Archetypes.A[w.def.arch].fire(G, w, s);
    if (w.def.arch2) Archetypes.A[w.def.arch2].fire(G, w, s); // fusion: both archetypes
    for (const q of Quirks.list(w.def)) if (q.onFire) q.onFire(G, w, s);
  }

  function update(G, dt) {
    for (const w of weapons) {
      w.t -= dt;
      if (w.t <= 0) {
        const s = stats(w);
        w.t = s.cd;
        fireWeapon(G, w, s);
        if (w.def.twist && w.def.twist.id === 'echo') { w.echoT = 0.28; w.echoS = s; }
      }
      if (w.echoT !== undefined) { // Echo twist: repeat the volley on game time
        w.echoT -= dt;
        if (w.echoT <= 0) { fireWeapon(G, w, w.echoS); w.echoT = undefined; }
      }
    }
  }

  // ----- level-up card generation -----
  function rollCards(G) {
    const cards = [];

    // Fusion offers (highest priority, glowing)
    const maxed = weapons.filter(w => w.lvl >= MAX_LVL && w.def.tier !== 'fusion');
    for (let i = 0; i < maxed.length; i++) {
      for (let j = i + 1; j < maxed.length; j++) {
        const baseA = maxed[i].def.parent || maxed[i].def.id;
        const baseB = maxed[j].def.parent || maxed[j].def.id;
        const rec = FUSIONS.find(baseA, baseB);
        if (rec) cards.push({ type: 'fusion', rec, wa: maxed[i], wb: maxed[j] });
      }
    }

    // Branch offers: weapon at lvl 4 leveling to 5 chooses a branch
    const upgradeable = weapons.filter(w => w.lvl < MAX_LVL);
    const pool = [];
    for (const w of upgradeable) {
      if (w.lvl === MAX_LVL - 1 && w.def.tier === 'base') {
        for (const bId of w.def.branches) pool.push({ type: 'branch', w, def: WEAPONS.defs[bId] });
      } else {
        pool.push({ type: 'upgrade', w });
      }
    }
    if (weapons.length < maxWeapons(G)) {
      const owned = new Set(weapons.map(w => w.def.parent || w.def.id));
      const news = WEAPONS.baseIds.filter(id => !owned.has(id));
      for (let i = 0; i < 3 && news.length; i++) {
        const id = news.splice((Math.random() * news.length) | 0, 1)[0];
        pool.push({ type: 'new', def: WEAPONS.defs[id] });
      }
    }
    const pkeys = Object.keys(PASSIVES).filter(k => (passives[k] || 0) < 5 && (passives[k] || Object.keys(passives).length < MAX_PASSIVES));
    for (let i = 0; i < 2 && pkeys.length; i++) {
      const k = pkeys.splice((Math.random() * pkeys.length) | 0, 1)[0];
      pool.push({ type: 'passive', pid: k });
    }
    // shuffle pool, take up to 4 total including fusions (fusions always shown)
    while (cards.length < 4 && pool.length) {
      cards.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    if (!cards.length) cards.push({ type: 'heal' });
    return cards.slice(0, 4);
  }

  function applyCard(G, card) {
    switch (card.type) {
      case 'new': addWeapon(card.def.id); break;
      case 'upgrade': card.w.lvl++; break;
      case 'branch':
        card.w.def = card.def; card.w.lvl = MAX_LVL;
        discover(card.def.id);
        break;
      case 'fusion': {
        const idx = weapons.indexOf(card.wb);
        if (idx >= 0) weapons.splice(idx, 1);
        card.wa.def = card.rec; card.wa.lvl = MAX_LVL;
        discover(card.rec.id);
        G.onFusion(card.rec);
        break;
      }
      case 'passive': passives[card.pid] = (passives[card.pid] || 0) + 1; break;
      case 'heal': G.player.hp = Math.min(G.player.maxHp, G.player.hp + 30); break;
    }
  }

  return {
    get weapons() { return weapons; },
    get passives() { return passives; },
    get discovered() { return discovered; },
    PASSIVES, MAX_LVL, SLOT_EVERY, maxWeapons, reset, addWeapon, update, rollCards, applyCard, stats, discover,
  };
})();
