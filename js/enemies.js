// ---- enemies.js : 24 monster types, elites, 6 bosses, wave spawner ----
const Enemies = (() => {
  // tier = minute the type starts appearing
  const TYPES = [
    { id: 'slime',     hp: 8,   spd: 55,  dmg: 6,  xp: 1, tier: 0 },
    { id: 'bat',       hp: 5,   spd: 95,  dmg: 5,  xp: 1, tier: 0 },
    { id: 'beetle',    hp: 16,  spd: 45,  dmg: 8,  xp: 2, tier: 1 },
    { id: 'shroom',    hp: 12,  spd: 50,  dmg: 7,  xp: 2, tier: 1 },
    { id: 'eyeball',   hp: 14,  spd: 70,  dmg: 8,  xp: 2, tier: 2 },
    { id: 'imp',       hp: 12,  spd: 105, dmg: 9,  xp: 2, tier: 2 },
    { id: 'crab',      hp: 28,  spd: 40,  dmg: 10, xp: 3, tier: 3 },
    { id: 'spider',    hp: 18,  spd: 85,  dmg: 9,  xp: 3, tier: 3 },
    { id: 'jelly',     hp: 24,  spd: 60,  dmg: 10, xp: 3, tier: 4 },
    { id: 'skullmage', hp: 22,  spd: 55,  dmg: 11, xp: 4, tier: 4, shoots: true },
    { id: 'hornet',    hp: 18,  spd: 120, dmg: 10, xp: 4, tier: 5 },
    { id: 'wraith',    hp: 30,  spd: 75,  dmg: 12, xp: 4, tier: 5 },
    { id: 'serpent',   hp: 38,  spd: 70,  dmg: 12, xp: 5, tier: 6 },
    { id: 'frostling', hp: 34,  spd: 65,  dmg: 12, xp: 5, tier: 7 },
    { id: 'boulder',   hp: 70,  spd: 30,  dmg: 14, xp: 6, tier: 8 },
    { id: 'hexer',     hp: 40,  spd: 60,  dmg: 13, xp: 6, tier: 9, shoots: true },
    { id: 'golem',     hp: 95,  spd: 35,  dmg: 16, xp: 8, tier: 10 },
    { id: 'lavaworm',  hp: 60,  spd: 80,  dmg: 14, xp: 7, tier: 11 },
    { id: 'voidling',  hp: 55,  spd: 90,  dmg: 14, xp: 7, tier: 12 },
    { id: 'cyclops',   hp: 130, spd: 45,  dmg: 18, xp: 10, tier: 13 },
    { id: 'mimic',     hp: 110, spd: 70,  dmg: 16, xp: 12, tier: 14 },
    { id: 'ghostking', hp: 100, spd: 80,  dmg: 16, xp: 10, tier: 15, shoots: true },
    { id: 'seraph',    hp: 140, spd: 95,  dmg: 18, xp: 14, tier: 16, shoots: true },
    { id: 'reaper',    hp: 200, spd: 85,  dmg: 22, xp: 18, tier: 17 },
    // -- extended bestiary --
    { id: 'toad',        hp: 10,  spd: 60,  dmg: 6,  xp: 1, tier: 0 },
    { id: 'snail',       hp: 20,  spd: 25,  dmg: 8,  xp: 2, tier: 1 },
    { id: 'moth',        hp: 7,   spd: 100, dmg: 6,  xp: 1, tier: 1 },
    { id: 'scarab',      hp: 18,  spd: 55,  dmg: 9,  xp: 2, tier: 2 },
    { id: 'raven',       hp: 12,  spd: 110, dmg: 8,  xp: 2, tier: 3 },
    { id: 'cactoid',     hp: 26,  spd: 45,  dmg: 11, xp: 3, tier: 4, shoots: true },
    { id: 'bomber',      hp: 16,  spd: 95,  dmg: 20, xp: 3, tier: 5, kamikaze: true },
    { id: 'mantis',      hp: 30,  spd: 90,  dmg: 12, xp: 4, tier: 6 },
    { id: 'banshee',     hp: 36,  spd: 70,  dmg: 12, xp: 5, tier: 7, shoots: true },
    { id: 'knightling',  hp: 60,  spd: 50,  dmg: 14, xp: 6, tier: 8 },
    { id: 'krakenspawn', hp: 48,  spd: 65,  dmg: 13, xp: 6, tier: 10 },
    { id: 'gargoyle',    hp: 80,  spd: 75,  dmg: 15, xp: 8, tier: 12 },
    { id: 'djinn',       hp: 90,  spd: 85,  dmg: 16, xp: 9, tier: 14, shoots: true },
    { id: 'stalker',     hp: 150, spd: 95,  dmg: 20, xp: 14, tier: 16 },
    // -- the deep bestiary: 27 more knots of the Unraveling --
    { id: 'sparkmite',   hp: 6,   spd: 115, dmg: 5,  xp: 1, tier: 0 },
    { id: 'tumbler',     hp: 12,  spd: 70,  dmg: 7,  xp: 1, tier: 0 },
    { id: 'sunmote',     hp: 8,   spd: 85,  dmg: 6,  xp: 1, tier: 1 },
    { id: 'lanternfly',  hp: 11,  spd: 90,  dmg: 7,  xp: 2, tier: 1 },
    { id: 'glasswing',   hp: 9,   spd: 125, dmg: 7,  xp: 2, tier: 2 },
    { id: 'pearlsnail',  hp: 26,  spd: 22,  dmg: 9,  xp: 3, tier: 2 },
    { id: 'foxfire',     hp: 16,  spd: 100, dmg: 9,  xp: 2, tier: 3 },
    { id: 'owlet',       hp: 18,  spd: 95,  dmg: 9,  xp: 3, tier: 3 },
    { id: 'inkling',     hp: 22,  spd: 75,  dmg: 10, xp: 3, tier: 4 },
    { id: 'pincer',      hp: 32,  spd: 50,  dmg: 12, xp: 4, tier: 5 },
    { id: 'fumebat',     hp: 20,  spd: 105, dmg: 10, xp: 3, tier: 5 },
    { id: 'thornling',   hp: 24,  spd: 65,  dmg: 11, xp: 4, tier: 6, shoots: true },
    { id: 'coilworm',    hp: 42,  spd: 70,  dmg: 12, xp: 5, tier: 7 },
    { id: 'icefang',     hp: 38,  spd: 88,  dmg: 13, xp: 5, tier: 8 },
    { id: 'barnacle',    hp: 65,  spd: 18,  dmg: 12, xp: 6, tier: 8, shoots: true },
    { id: 'stormcrow',   hp: 36,  spd: 115, dmg: 12, xp: 5, tier: 9 },
    { id: 'magmite',     hp: 78,  spd: 42,  dmg: 15, xp: 7, tier: 10 },
    { id: 'lurkfish',    hp: 55,  spd: 92,  dmg: 14, xp: 6, tier: 11 },
    { id: 'rusthound',   hp: 70,  spd: 100, dmg: 15, xp: 7, tier: 12 },
    { id: 'voideye',     hp: 60,  spd: 78,  dmg: 14, xp: 7, tier: 12, shoots: true },
    { id: 'bloomling',   hp: 85,  spd: 60,  dmg: 15, xp: 8, tier: 13 },
    { id: 'chimeling',   hp: 75,  spd: 85,  dmg: 15, xp: 8, tier: 14 },
    { id: 'boneworm',    hp: 110, spd: 72,  dmg: 17, xp: 10, tier: 15 },
    { id: 'ashwalker',   hp: 120, spd: 65,  dmg: 18, xp: 10, tier: 15 },
    { id: 'gravekite',   hp: 95,  spd: 105, dmg: 17, xp: 10, tier: 16, shoots: true },
    { id: 'bramblebear', hp: 190, spd: 55,  dmg: 22, xp: 14, tier: 17 },
    { id: 'maweater',    hp: 230, spd: 80,  dmg: 24, xp: 18, tier: 18, kamikaze: true },
  ];

  // animation personality per monster (ART_STYLE.md: idle motion everywhere)
  const ANIM = {
    bounce: ['slime', 'jelly', 'toad', 'shroom', 'voidling', 'krakenspawn', 'inkling', 'bloomling', 'tumbler', 'foxfire'],  // squash & stretch
    flap:   ['bat', 'raven', 'moth', 'hornet', 'gargoyle', 'seraph', 'gildedmoth', 'lanternfly', 'glasswing', 'owlet', 'fumebat', 'stormcrow', 'gravekite'], // vertical wing pump
    float:  ['wraith', 'banshee', 'ghostking', 'djinn', 'reaper', 'skullmage', 'eyeball', 'stalker', 'voideye', 'sunmote', 'chimeling', 'ashwalker', 'lurkfish'], // sine hover + shimmer
    waddle: ['beetle', 'crab', 'golem', 'boulder', 'knightling', 'cyclops', 'snail', 'cactoid', 'mimic', 'pincer', 'pearlsnail', 'magmite', 'rusthound', 'bramblebear', 'barnacle', 'thornling', 'maweater'], // rocking gait
  };
  const ANIM_OF = {};
  for (const k in ANIM) for (const id of ANIM[k]) ANIM_OF[id] = k;

  // ---- per-monster lore + behavioral quirks ----
  // update(G,e,dt) runs each tick after movement; onDeath(G,e) on kill.
  const webs = []; // spider silk patches that slow the player
  const qb = []; // shared spatial-query buffer for quirks (perf: avoid full-list scans)
  const MQUIRKS = {
    slime: {
      lore: 'Spilled dye that learned to want.',
      onDeath(G, e) { // pools split into droplets
        if (e._mini || e.elite) return;
        for (let k = 0; k < 2; k++) {
          const m = spawnAt(G, e.type);
          m.x = e.x + Util.rand(-16, 16); m.y = e.y + Util.rand(-16, 16);
          m.hp = m.maxHp = e.maxHp * 0.25; m.r = 8; m.xp = 0; m._mini = true;
        }
      },
    },
    bat: {
      lore: 'A scrap of night the Weaver trimmed off and never swept up.',
      update(G, e, dt) { // skittish: flutters in erratic arcs
        const a = Util.angTo(e.x, e.y, G.player.x, G.player.y) + Math.PI / 2;
        const off = Math.sin(e.anim * 4.2) * 85 * dt;
        e.x += Math.cos(a) * off; e.y += Math.sin(a) * off;
      },
    },
    beetle: {
      lore: 'It carries a tile of the old pattern on its back and lets nothing touch it.',
      update(G, e, dt) { // hunkers periodically: slow but armored
        e._shellT = (e._shellT || 0) + dt;
        const hunk = (e._shellT % 4) > 2.8;
        e.wardT = hunk ? G.time + 0.1 : 0;
        if (hunk) e.x -= 0; // (stays put visually via slow)
        e.slowSelf = hunk;
        if (hunk && Math.random() < 0.1) Particles.spawn(e.x, e.y - 8, '#c9ccd6', { speed: 8, life: 0.3, size: 2 });
      },
    },
    shroom: {
      lore: 'It grew in the dark between two stitches and thinks the dark is coming back.',
      onDeath(G, e) { // spore burst: slow ring of drifting toxin
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, dmg: e.dmg * 0.5, r: 5, life: 1.6, color: '#d65cb1' });
        }
      },
    },
    eyeball: {
      lore: 'The Loom needed to see what was eating it. It regrets looking.',
      update(G, e, dt) { // fixating lunge every few seconds
        e._lungeT = (e._lungeT || Util.rand(1, 3)) - dt;
        if (e._lungeT <= 0) { e._lungeT = 3; e._lungeV = 1.2; }
        if (e._lungeV > 0) {
          e._lungeV -= dt;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          e.x += Math.cos(a) * 130 * dt; e.y += Math.sin(a) * 130 * dt;
        }
      },
    },
    imp: {
      lore: 'A knot tied as a joke. The joke kept going.',
      onHurt(G, e) { // mischief: blinks away when struck
        if (Math.random() < 0.18) {
          Particles.burst(e.x, e.y, '#e35050', 6, { speed: 90, life: 0.25 });
          const a = Math.random() * Math.PI * 2;
          e.x += Math.cos(a) * 70; e.y += Math.sin(a) * 70;
        }
      },
    },
    crab: {
      lore: 'It walks sideways because the weft runs that way. Obviously.',
      update(G, e, dt) { // strafing approach
        const a = Util.angTo(e.x, e.y, G.player.x, G.player.y) + Math.PI / 2;
        const off = Math.sin(e.anim * 1.1) * 95 * dt;
        e.x += Math.cos(a) * off; e.y += Math.sin(a) * off;
      },
    },
    spider: {
      lore: 'The only knot that learned to weave back. It weaves badly, on purpose.',
      update(G, e, dt) { // spins silk patches that slow YOU
        e._webT = (e._webT || 2) - dt;
        if (e._webT <= 0 && webs.length < 12) {
          e._webT = 3.2;
          webs.push({ x: e.x, y: e.y, life: 6 });
        }
      },
    },
    jelly: {
      lore: 'Dye and water and a rumor of a soul.',
      onDeath(G, e) { // pops into a drifting stinging current
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, dmg: e.dmg * 0.4, r: 4, life: 2.2, color: '#5cc9e8' });
        }
      },
    },
    skullmage: {
      lore: 'It remembers being embroidery on a funeral shroud. It misses the work.',
      update(G, e, dt) { // wards a nearby knot with pale light
        e._wardT2 = (e._wardT2 || 3) - dt;
        if (e._wardT2 <= 0) {
          e._wardT2 = 4;
          let best = null, bd = 200 * 200;
          G.enemiesInRange(e.x, e.y, 200, qb);
          for (const o of qb) {
            if (o === e || o.boss) continue;
            const d2 = Util.dist2(e.x, e.y, o.x, o.y);
            if (d2 < bd) { bd = d2; best = o; }
          }
          if (best) { best.wardT = G.time + 2; G.zap(e.x, e.y, best.x, best.y, '#7b54c9'); }
        }
      },
    },
    hornet: {
      lore: 'The Weaver kept bees once. These are not those.',
      update(G, e, dt) { // committed dive: locks a line and charges
        if (e._diveT === undefined) e._diveT = Util.rand(1, 2.5);
        e._diveT -= dt;
        if (e._diveT <= 0 && !e._diving) {
          e._diving = 0.45;
          e._diveA = Util.angTo(e.x, e.y, G.player.x, G.player.y);
        }
        if (e._diving) {
          e._diving -= dt;
          e.x += Math.cos(e._diveA) * 320 * dt; e.y += Math.sin(e._diveA) * 320 * dt;
          if (e._diving <= 0) { e._diving = null; e._diveT = 2.5; }
        }
      },
    },
    wraith: {
      lore: 'Weft with no warp: a direction with nothing to hold it.',
      update(G, e, dt) { // phases out of the world on a cycle
        e._phT = (e._phT || 0) + dt;
        e.phased = (e._phT % 3.5) > 2.7;
      },
    },
    serpent: {
      lore: 'One long thread that refused to be cut to length.',
      update(G, e, dt) { // sidewinds in S-curves
        const a = Util.angTo(e.x, e.y, G.player.x, G.player.y) + Math.PI / 2;
        const off = Math.sin(e.anim * 2.4) * 120 * dt;
        e.x += Math.cos(a) * off; e.y += Math.sin(a) * off;
      },
    },
  };
  // batch 2
  Object.assign(MQUIRKS, {
    golem: {
      lore: 'Patchwork of every mend that did not hold. It is very patient about revenge.',
      update(G, e) { // wrath: speeds up as it breaks
        e.spd = e._spd0 || (e._spd0 = e.spd);
        e.spd = e._spd0 * (1 + (1 - e.hp / e.maxHp) * 0.9);
      },
    },
    ghostking: {
      lore: 'He ruled a province the Weaver unwove. His court never noticed.',
      update(G, e, dt) { // royal decree: hastens his courtiers
        e._court = (e._court || 0) + dt;
        if (e._court > 1) {
          e._court = 0;
          G.enemiesInRange(e.x, e.y, 180, qb);
          for (const o of qb) if (o !== e && !o.boss) o._hasteT = 1.2;
        }
      },
    },
    cyclops: {
      lore: 'One eye, because the Weaver ran out of thread one stitch early.',
      update(G, e, dt) { // hurls a boulder
        e._rockT = (e._rockT || 3) - dt;
        if (e._rockT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 420 * 420) {
          e._rockT = 4;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, dmg: e.dmg * 1.2, r: 10, life: 4, color: '#8a7a6b' });
        }
      },
    },
    reaper: {
      lore: 'It does not cut threads. It files them under "later".',
      update(G, e, dt) { // flanks: blinks behind you when far
        e._blinkT = (e._blinkT || 4) - dt;
        if (e._blinkT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) > 380 * 380) {
          e._blinkT = 5;
          Particles.burst(e.x, e.y, '#5cf0c9', 10, { speed: 120 });
          const a = G.player.faceAng + Math.PI;
          e.x = G.player.x + Math.cos(a) * 220; e.y = G.player.y + Math.sin(a) * 220;
          Particles.burst(e.x, e.y, '#5cf0c9', 10, { speed: 120 });
        }
      },
    },
    lavaworm: {
      lore: 'It tunnels through the cloth with a mouth full of vat-fire.',
      update(G, e, dt) { // burning wake
        e._lavaT = (e._lavaT || 0.8) - dt;
        if (e._lavaT <= 0 && hazards.length < 14) {
          e._lavaT = 0.9;
          hazards.push({ x: e.x, y: e.y, r: 26, life: 3.5, type: 'lava' });
        }
      },
    },
    frostling: {
      lore: 'A snowflake that survived the unmaking of its storm. It holds a grudge.',
      update(G, e) { // cold presence: chills the Threadbound
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 95 * 95) G.playerWebbed = true;
      },
    },
    voidling: {
      lore: 'A hole shaped like an animal, or an animal shaped like a hole.',
      update(G, e, dt) { // faint gravity: tugs you toward it
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 200 * 200) {
          const a = Util.angTo(G.player.x, G.player.y, e.x, e.y);
          G.player.x += Math.cos(a) * 26 * dt; G.player.y += Math.sin(a) * 26 * dt;
        }
      },
    },
    mimic: {
      lore: 'It pretended to be treasure so long it became some.',
      onDeath(G, e) { // treasure gut
        for (let k = 0; k < 3; k++) World.gems.push({ x: e.x + Util.rand(-15, 15), y: e.y + Util.rand(-15, 15), v: 0, coin: 1, t: 0 });
      },
    },
    seraph: {
      lore: 'Stitched to watch over the cloth. Nobody told it the war was over it.',
      update(G, e, dt) { // mends nearby knots
        e._mendT = (e._mendT || 2.5) - dt;
        if (e._mendT <= 0) {
          e._mendT = 3;
          G.enemiesInRange(e.x, e.y, 160, qb);
          for (const o of qb) if (o !== e) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06);
          Particles.burst(e.x, e.y, '#ffe9b0', 8, { speed: 70, life: 0.5 });
        }
      },
    },
    boulder: {
      lore: 'The Loom wove a mountain once, to see if it could. This pebble escaped.',
      update(G, e) { e.stoic = true; }, // unmoved by cold and current
    },
    hexer: {
      lore: 'It learned three words of the Weaver\'s language. All curses.',
      update(G, e, dt) { // hex: saps your dash
        e._hexT = (e._hexT || 5) - dt;
        if (e._hexT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 320 * 320) {
          e._hexT = 7;
          G.player.dashCd += 1.5;
          G.zap(e.x, e.y, G.player.x, G.player.y, '#3ad6b8');
          Particles.text(G.player.x, G.player.y - 26, 'HEXED — dash sapped', '#3ad6b8', 13);
        }
      },
    },
    scarab: {
      lore: 'It rolls the sun across the cloth each day. Nobody pays it. It drops change.',
      onDeath(G, e) { if (Math.random() < 0.25) World.gems.push({ x: e.x, y: e.y, v: 0, coin: 1, t: 0 }); },
    },
    raven: {
      lore: 'It arrives before bad news, out of professional courtesy.',
      onDeath(G, e) { // the omen: the flock panics
        for (const o of list) {
          if (o.type.id === 'raven' && Util.dist2(e.x, e.y, o.x, o.y) < 300 * 300) o._hasteT = 2;
        }
      },
    },
  });

  // batch 3 — the extended bestiary
  Object.assign(MQUIRKS, {
    toad: {
      lore: 'It ate a dye-gem once and has been digesting the idea ever since.',
      update(G, e) { // hops: bursts of motion, then sits
        e._hopT = (e._hopT || 0) + 0.016;
        e.slowSelf = (e._hopT % 1.4) > 0.5;
      },
    },
    snail: {
      lore: 'Slowest of the Unraveling. It is not worried. You will tire.',
      update(G, e, dt) { // slick trail
        e._slimeT = (e._slimeT || 1.5) - dt;
        if (e._slimeT <= 0 && webs.length < 12) {
          e._slimeT = 2.5;
          webs.push({ x: e.x, y: e.y, life: 5, slime: true });
        }
      },
    },
    moth: {
      lore: 'It eats cloth. You are wearing the world.',
      onDeath(G, e) { // blinding powder
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 160 * 160) G.flashAmt = Math.max(G.flashAmt, 0.3);
      },
    },
    cactoid: {
      lore: 'It practices patience the way deserts do: armed.',
      onHurt(G, e) { // needle coat
        if (Math.random() > 0.25) return;
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * Math.PI * 2;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, dmg: e.dmg * 0.5, r: 4, life: 1.2, color: '#7ac95c' });
        }
      },
    },
    bomber: {
      lore: 'A knot tied around a held breath.',
      update(G, e, dt) { e.spd += 9 * dt; e.flash = Math.max(e.flash, Math.sin(G.time * (6 + e.spd * 0.05)) > 0.7 ? 0.05 : 0); },
    },
    mantis: {
      lore: 'The cloth holds very still where it stands. So does it.',
      update(G, e) { // ambush: dormant until you stray close
        const near = Util.dist2(e.x, e.y, G.player.x, G.player.y) < 260 * 260;
        e.slowSelf = !near;
        e._hasteT = near ? 0.2 : 0;
        e.phasedLook = !near; // faded while lurking (visual only)
      },
    },
    banshee: {
      lore: 'Her song is the sound a thread makes when it is about to give.',
      update(G, e, dt) { // keening: chilling wails instead of plain shots
        e.shootT = 99; // replaces the generic shooter
        e._wailT = (e._wailT || 2.5) - dt;
        if (e._wailT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 420 * 420) {
          e._wailT = 3.2;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: e.dmg * 0.7, r: 7, life: 4, color: '#c9b8e8', chill: true });
        }
      },
    },
    knightling: {
      lore: 'Sworn to a banner that was unwoven before its first oath ended.',
      update(G, e) { // shieldwall: armored at range, soft up close
        e.wardT = Util.dist2(e.x, e.y, G.player.x, G.player.y) > 200 * 200 ? G.time + 0.1 : 0;
      },
    },
    krakenspawn: {
      lore: 'The sea the Loom unwove still has children. They are looking for it.',
      update(G, e) { // tangle: brushing it grips you cold
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < (e.r + 18) * (e.r + 18)) G.chillT = G.time + 0.8;
      },
    },
    gargoyle: {
      lore: 'Set to guard a gate. The gate unraveled. The watch continues.',
      update(G, e, dt) { // stoneform: once, near death, turns to stone
        if (!e._stoned && e.hp < e.maxHp * 0.3) { e._stoned = 1.5; }
        if (e._stoned > 0) { e._stoned -= dt; e.phased = true; e.slowSelf = true; }
        else if (e._stoned !== undefined && e._stoned <= 0) { e.phased = false; e.slowSelf = false; e._stoned = undefined; }
      },
    },
    djinn: {
      lore: 'It owes the Weaver three favors and intends to die still owing them.',
      onHurt(G, e) { // three wishes: blinks at 75/50/25%
        e._wishes = e._wishes === undefined ? 3 : e._wishes;
        const th = [0.75, 0.5, 0.25][3 - e._wishes];
        if (e._wishes > 0 && e.hp < e.maxHp * th) {
          e._wishes--;
          Particles.burst(e.x, e.y, '#5c8aff', 12, { speed: 140 });
          const a = Math.random() * Math.PI * 2;
          e.x += Math.cos(a) * 160; e.y += Math.sin(a) * 160;
        }
      },
    },
    stalker: {
      lore: 'You have never seen one arrive. Neither has anyone else.',
      update(G, e) { // dread: nearness darkens the world and quickens it
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 170 * 170) {
          G.dreadT = G.time + 0.3;
          e._hasteT = 0.2;
        }
      },
    },
    gildedmoth: {
      lore: 'The Weaver paid its debts in gold thread. Some of it grew wings.',
    },
  });

  // batch 4 — the deep bestiary, first half
  Object.assign(MQUIRKS, {
    sparkmite: {
      lore: 'Static that crawled off the storm and kept crawling.',
      onDeath(G, e) { // static pop
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 110 * 110) {
          G.zap(e.x, e.y, G.player.x, G.player.y, '#ffe93e');
          Player.hurt(G, 4, e);
        }
      },
    },
    tumbler: {
      lore: 'It goes where the wind under the cloth goes. The wind is hungry today.',
      update(G, e, dt) { // windblown: drifts on a fixed heading, barely steering
        if (e._wind === undefined) e._wind = Math.random() * Math.PI * 2;
        e.x += Math.cos(e._wind) * 60 * dt;
        e.y += Math.sin(e._wind) * 60 * dt;
      },
    },
    sunmote: {
      lore: 'A dropped stitch of daylight, still warm.',
      onDeath(G, e) { // flare: dies in a cross of light
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: e.dmg * 0.6, r: 5, life: 1, color: '#ffd23e' });
        }
      },
    },
    lanternfly: {
      lore: 'The Swarm follows its little light, believing it knows the way.',
      update(G, e, dt) { // beacon: rallies the knots around it
        e._beaconT = (e._beaconT || 1.5) - dt;
        if (e._beaconT <= 0) {
          e._beaconT = 2;
          G.enemiesInRange(e.x, e.y, 150, qb);
          for (const o of qb) if (o !== e && !o.boss) o._hasteT = 1;
          Particles.burst(e.x, e.y, '#ffe9a8', 5, { speed: 50, life: 0.5 });
        }
      },
    },
    glasswing: {
      lore: 'So thin the world shows through it. The edges, however.',
      onDeath(G, e) { // shatters into razors
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, dmg: e.dmg * 0.5, r: 3, life: 0.9, color: '#d8f0f5' });
        }
      },
    },
    pearlsnail: {
      lore: 'Wound around an insult until the insult became jewelry.',
      onHurt(G, e) { e.wardT = G.time + 0.6; }, // nacre: hits harden the shell
    },
    foxfire: {
      lore: 'A fire that lies about where it is. All fires do. This one is better at it.',
      update(G, e, dt) { // will-o: flickers forward in short blinks
        e._flickT = (e._flickT || 2) - dt;
        if (e._flickT <= 0) {
          e._flickT = 2.2;
          Particles.burst(e.x, e.y, '#ff9e3e', 8, { speed: 80, life: 0.4 });
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y) + Util.rand(-0.5, 0.5);
          e.x += Math.cos(a) * 90; e.y += Math.sin(a) * 90;
        }
      },
    },
    owlet: {
      lore: 'It asks the only question worth asking, over and over.',
      update(G, e) { // silent swoop: fades and quickens on approach
        const near = Util.dist2(e.x, e.y, G.player.x, G.player.y) < 300 * 300;
        e.phasedLook = near; // visually faded — still hittable
        e._hasteT = near ? 0.2 : 0;
      },
    },
    inkling: {
      lore: 'The Loom keeps no records. This is what happened to them.',
      onHurt(G, e) { // ink cloud: dims your sight when struck up close
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 200 * 200 && Math.random() < 0.4) G.dreadT = G.time + 0.6;
      },
    },
    pincer: {
      lore: 'It has two opinions about everything, and both of them close.',
      update(G, e) { // grip: brushing it locks you in the cold clamp
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < (e.r + 16) * (e.r + 16)) G.chillT = G.time + 1;
      },
    },
    fumebat: {
      lore: 'It exhales the dye it drowned in, one breath at a time, forever.',
      update(G, e, dt) { // toxic wake
        e._gasT = (e._gasT || 1.2) - dt;
        if (e._gasT <= 0 && hazards.length < 14) {
          e._gasT = 1.6;
          hazards.push({ x: e.x, y: e.y, r: 24, life: 2.8, type: 'gas' });
        }
      },
    },
    thornling: {
      lore: 'The hedge the Weaver planted to keep the Swarm out, gone over to them.',
      update(G, e, dt) { // volley root: plants itself and fires bursts of three
        e.shootT = 99;
        const far = Util.dist2(e.x, e.y, G.player.x, G.player.y) > 240 * 240;
        e.slowSelf = far;
        e._volT = (e._volT || 2) - dt;
        if (far && e._volT <= 0) {
          e._volT = 3.4;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          for (let k = -1; k <= 1; k++) {
            Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a + k * 0.18) * 180, vy: Math.sin(a + k * 0.18) * 180, dmg: e.dmg * 0.6, r: 4, life: 2.2, color: '#5ce86b' });
          }
        }
      },
    },
    coilworm: {
      lore: 'It learned tunneling from the moths and ambition from no one. It is self-taught.',
      update(G, e, dt) { // burrow: submerges, surfaces closer
        e._burT = (e._burT || 3.5) - dt;
        if (e._burT <= 0) {
          e._burT = 4;
          Particles.burst(e.x, e.y, '#bba88f', 10, { speed: 90 });
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          e.x += Math.cos(a) * 130; e.y += Math.sin(a) * 130;
          Particles.burst(e.x, e.y, '#bba88f', 14, { speed: 130 });
        }
      },
    },
    icefang: {
      lore: 'Winter, distilled to the part with teeth.',
      update(G, e) { // cold bite: contact grips you with frost
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < (e.r + 16) * (e.r + 16)) G.chillT = G.time + 0.7;
      },
    },
  });

  // batch 5 — the deep bestiary's heavyweights + the Knot-Tyrants
  Object.assign(MQUIRKS, {
    barnacle: {
      lore: 'It chose a spot. The spot was wrong. It is committed now.',
      update(G, e, dt) { // anchored battery: never moves, lobs heavy shots
        e.slowSelf = true;
        e.shootT = 99;
        e._lobT = (e._lobT || 2) - dt;
        if (e._lobT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 520 * 520) {
          e._lobT = 2.8;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dmg: e.dmg, r: 9, life: 5, color: '#d65c8a' });
        }
      },
    },
    stormcrow: {
      lore: 'Where two fly together, the weather takes sides.',
      update(G, e) { // murmuration: pairs ride each other's tailwind
        G.enemiesInRange(e.x, e.y, 220, qb);
        for (const o of qb) {
          if (o !== e && o.type.id === 'stormcrow') { e._hasteT = 0.3; break; }
        }
      },
    },
    magmite: {
      lore: 'A kiln that walked out of its own firing.',
      onDeath(G, e) { hazards.push({ x: e.x, y: e.y, r: 44, life: 5, type: 'lava' }); },
    },
    lurkfish: {
      lore: 'The cloth ripples where it swims. Watch the ripples.',
      update(G, e) { // breach: under the cloth at range, surfacing to strike
        e.phased = Util.dist2(e.x, e.y, G.player.x, G.player.y) > 240 * 240;
      },
    },
    rusthound: {
      lore: 'It still answers to a whistle nobody living can make.',
      update(G, e, dt) { // pack howl
        e._howlT = (e._howlT || Util.rand(2, 8)) - dt;
        if (e._howlT <= 0) {
          e._howlT = 9;
          let n = 0;
          for (const o of list) if (o.type.id === 'rusthound') { o._hasteT = 2.5; n++; }
          if (n > 1) Particles.text(e.x, e.y - 20, 'AWHOOO', '#b8703a', 13);
        }
      },
    },
    voideye: {
      lore: 'It blinked once, and a village was never woven.',
      update(G, e, dt) { // null gaze: stares, then a fast triple
        e.shootT = 99;
        e._gazeT = (e._gazeT || 3) - dt;
        if (e._gazeT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 460 * 460) {
          e._gazeT = 3.6;
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          for (let k = -1; k <= 1; k++) {
            Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a + k * 0.1) * 260, vy: Math.sin(a + k * 0.1) * 260, dmg: e.dmg * 0.6, r: 5, life: 2, color: '#f05cf0' });
          }
        }
      },
    },
    bloomling: {
      lore: 'It flowers out of season because the seasons left.',
      update(G, e, dt) { // pollen snare
        e._polT = (e._polT || 2) - dt;
        if (e._polT <= 0 && webs.length < 12) { e._polT = 3.5; webs.push({ x: e.x, y: e.y, life: 5, slime: true }); }
      },
    },
    chimeling: {
      lore: 'Cast as a bell for a tower the Loom never finished. It rings anyway.',
      onHurt(G, e) { // resonance: each strike rings against your dash
        G.player.dashCd = Math.min(G.player.dashCd + 0.15, 4);
      },
    },
    boneworm: {
      lore: 'Cut it in half and you have two arguments instead of one.',
      onDeath(G, e) { // segmented: regrows once from the larger half
        if (e._regrown) return;
        const m = spawnAt(G, e.type);
        m.x = e.x; m.y = e.y;
        m.hp = m.maxHp = e.maxHp * 0.4; m.xp = 2; m._regrown = true;
        Particles.burst(e.x, e.y, '#e8e3d5', 10, { speed: 100 });
      },
    },
    ashwalker: {
      lore: 'It was the fire brigade, once. Now it delivers.',
      update(G, e, dt) { // cinder steps
        e._cinT = (e._cinT || 1.4) - dt;
        if (e._cinT <= 0 && hazards.length < 14) { e._cinT = 1.8; hazards.push({ x: e.x, y: e.y, r: 18, life: 2.2, type: 'lava' }); }
      },
    },
    gravekite: {
      lore: 'It carries what the battlefield no longer needs, and drops it where it will hurt.',
      update(G, e, dt) { // pale cargo: bone bombs
        e.shootT = 99;
        e._cargoT = (e._cargoT || 2.5) - dt;
        if (e._cargoT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) < 260 * 260) {
          e._cargoT = 3.5;
          Projectiles.efire({ x: e.x, y: e.y, vx: 0, vy: 0, dmg: e.dmg, r: 11, life: 1.6, color: '#e8e3d5' });
        }
      },
    },
    bramblebear: {
      lore: 'The forest sent its opinion of the Unraveling. It has claws.',
      onHurt(G, e) { // overgrowth: hurting it grows thorns back at you
        if (e.hp < e.maxHp * 0.5 && Math.random() < 0.3) {
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: e.dmg * 0.4, r: 4, life: 1.4, color: '#6b8a3a' });
        }
      },
    },
    maweater: {
      lore: 'The Unraveling unravels too. Something has to eat the loose ends.',
      update(G, e) { // devourer: consumes lesser knots to mend itself
        G.enemiesInRange(e.x, e.y, e.r + 30, qb);
        for (const o of qb) {
          if (o === e || o.boss || o.elite) continue;
          if (Util.dist2(e.x, e.y, o.x, o.y) < (e.r + o.r) * (e.r + o.r)) {
            o._eaten = true; // swallowed whole — removed without drops
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08);
            Particles.burst(o.x, o.y, '#8a3a6b', 10, { speed: 120 });
            break;
          }
        }
      },
    },
    // ---- the Knot-Tyrants ----
    OMEGA_SLIME: {
      lore: 'When enough spilled dye pools in one regret, it remembers every shape it stained.',
      update(G, e, dt) { // tide of dye: sheds droplets
        e._tideT = (e._tideT || 5) - dt;
        if (e._tideT <= 0) {
          e._tideT = 6;
          for (let k = 0; k < 3; k++) {
            const m = spawnAt(G, TYPES[0]);
            m.x = e.x + Util.rand(-50, 50); m.y = e.y + Util.rand(-50, 50);
          }
        }
      },
    },
    BONE_TYRANT: {
      lore: 'Pale warp does not rot. It waits, and files its edges.',
      update(G, e, dt) { // conscription: raises the dead-threaded
        e._consT = (e._consT || 8) - dt;
        if (e._consT <= 0) {
          e._consT = 10;
          const t = TYPES.find(x => x.id === 'boneworm') || TYPES[0];
          for (let k = 0; k < 2; k++) {
            const m = spawnAt(G, t);
            m.x = e.x + Util.rand(-60, 60); m.y = e.y + Util.rand(-60, 60);
          }
          Particles.text(e.x, e.y - 50, 'RISE', '#e8e3d5', 16);
        }
      },
    },
    STORM_EYE: {
      lore: 'The needle\'s eye through which the storm was threaded. It never closed.',
      update(G, e, dt) { // the pull: you drift toward the eye
        if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 420 * 420) {
          const a = Util.angTo(G.player.x, G.player.y, e.x, e.y);
          G.player.x += Math.cos(a) * 34 * dt; G.player.y += Math.sin(a) * 34 * dt;
        }
      },
    },
    HELL_BLOOM: {
      lore: 'It was meant to be a rose on a queen\'s sleeve. The queen unraveled first.',
      update(G, e, dt) { // pollen veil: rings itself in toxin
        e._veilT = (e._veilT || 4) - dt;
        if (e._veilT <= 0) {
          e._veilT = 5;
          for (let k = 0; k < 4; k++) {
            const a = Math.random() * Math.PI * 2, d = Util.rand(60, 140);
            hazards.push({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, r: 30, life: 4, type: 'gas' });
          }
        }
      },
    },
    VOID_MAW: {
      lore: 'Where the pattern was, there is now an appetite.',
      update(G, e) { // hunger: devours dye-gems off the field and grows fat on them
        for (let i = World.gems.length - 1; i >= 0; i--) {
          const g = World.gems[i];
          if (!g.coin && !g.heal && Util.dist2(e.x, e.y, g.x, g.y) < 130 * 130) {
            World.gems.splice(i, 1);
            e.hp = Math.min(e.maxHp, e.hp + 25);
            Particles.burst(e.x, e.y, '#f05cf0', 4, { speed: 60 });
          }
        }
      },
    },
    NOVA_PRIME: {
      lore: 'The last knot, tied around the last light. It does not hate you. It is holding on.',
      update(G, e, dt) { // the tightening: folds space to stay close
        e._foldT = (e._foldT || 9) - dt;
        if (e._foldT <= 0 && Util.dist2(e.x, e.y, G.player.x, G.player.y) > 500 * 500) {
          e._foldT = 11;
          Particles.burst(e.x, e.y, '#ffd23e', 20, { speed: 200 });
          const a = Math.random() * Math.PI * 2;
          e.x = G.player.x + Math.cos(a) * 320; e.y = G.player.y + Math.sin(a) * 320;
          Particles.burst(e.x, e.y, '#3ae0ff', 20, { speed: 200 });
          G.shake(8);
        }
      },
    },
  });

  const hazards = []; // ground hazards left by monsters (lava wakes etc.)

  // bestiary discovery: kills per monster type, persisted across runs
  let killBook = {};
  try { killBook = JSON.parse(localStorage.getItem('ns_bestiary')) || {}; } catch { killBook = {}; }
  let killSaveT = 0;
  function recordKill(e) {
    const id = e.type.id;
    killBook[id] = (killBook[id] || 0) + 1;
    if (++killSaveT >= 25) { killSaveT = 0; localStorage.setItem('ns_bestiary', JSON.stringify(killBook)); }
  }

  function quirkDeath(G, e) {
    const q = MQUIRKS[e.type.id];
    if (q && q.onDeath) q.onDeath(G, e);
  }
  function quirkHurt(G, e) {
    const q = MQUIRKS[e.type.id];
    if (q && q.onHurt) q.onHurt(G, e);
  }

  const BOSSES = [
    { id: 'OMEGA_SLIME', name: 'OMEGA SLIME', title: 'The First Pooling of Spilled Dye', hp: 1500,  spd: 45, dmg: 18, at: 180,  pattern: 'ring' },
    { id: 'BONE_TYRANT', name: 'BONE TYRANT', title: 'Knotted from Pale Warp', hp: 3800,  spd: 50, dmg: 22, at: 420,  pattern: 'aimed' },
    { id: 'STORM_EYE',   name: 'STORM EYE',   title: 'A Needle\'s Eye, Watching Back', hp: 7500,  spd: 60, dmg: 26, at: 660,  pattern: 'spiral' },
    { id: 'HELL_BLOOM',  name: 'HELL BLOOM',  title: 'Embroidery That Learned Hunger', hp: 13000, spd: 40, dmg: 30, at: 900,  pattern: 'flower' },
    { id: 'VOID_MAW',    name: 'VOID MAW',    title: 'The Hole Where the Pattern Was', hp: 21000, spd: 70, dmg: 34, at: 1080, pattern: 'cross' },
    { id: 'NOVA_PRIME',  name: 'NOVA PRIME',  title: 'The Knot Around the Dying Star', hp: 40000, spd: 75, dmg: 40, at: 1185, pattern: 'all' },
  ];

  let list = [];
  let spawnT = 0, eliteT = 50, bossIdx = 0, mothT = 150, gildT = 70;

  function reset() { list = []; spawnT = 0; eliteT = 50; bossIdx = 0; mothT = 150; gildT = 70; webs.length = 0; hazards.length = 0; }

  // elite affixes: named modifiers with a visual tell (ring color)
  const AFFIXES = {
    HASTED:   { color: '#3ae0ff', apply: e => { e.spd *= 1.6; } },
    BULWARK:  { color: '#c9ccd6', apply: e => { e.dr = 0.5; } },          // takes half damage
    SPLITTING:{ color: '#5ce86b', apply: e => { e.splits = 4; } },        // bursts into copies
    VOLATILE: { color: '#ff6b2e', apply: e => { e.volatile = true; } },   // explodes on death
    UNDYING:  { color: '#ff5cd6', apply: e => { e.regen = 0.02; } },      // regenerates
  };

  function spawnAt(G, type, elite = false) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(G.w, G.h) * 0.62;
    const hpScale = 1 + G.time / 75;
    const e = {
      type, x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d,
      hp: type.hp * hpScale * (elite ? 14 : 1),
      maxHp: type.hp * hpScale * (elite ? 14 : 1),
      spd: type.spd * (elite ? 0.85 : Util.rand(0.9, 1.1)),
      dmg: type.dmg * (elite ? 1.6 : 1),
      xp: type.xp * (elite ? 12 : 1),
      r: elite ? 24 : 13, elite, flash: 0, anim: Math.random() * 9,
      slow: 0, burn: 0, poison: 0, freeze: 0, shootT: Util.rand(1, 3),
    };
    if (elite) {
      e.affix = Util.pick(Object.keys(AFFIXES));
      AFFIXES[e.affix].apply(e);
    }
    list.push(e);
    return e;
  }

  function spawnBoss(G, bdef) {
    const a = Math.random() * Math.PI * 2;
    const e = {
      type: { id: bdef.id, dmg: bdef.dmg, xp: 400 }, boss: true, bdef,
      x: G.player.x + Math.cos(a) * 600, y: G.player.y + Math.sin(a) * 600,
      hp: bdef.hp, maxHp: bdef.hp, spd: bdef.spd, dmg: bdef.dmg, xp: 300 + bossIdx * 200,
      r: 42, flash: 0, anim: 0, slow: 0, burn: 0, poison: 0, freeze: 0,
      shootT: 2, patT: 0, patA: 0,
    };
    list.push(e);
    G.announceBoss(bdef.name, bdef.title);
    return e;
  }

  function update(G, dt) {
    const P = G.player;
    const minute = G.time / 60;
    // spawn budget ramps with time
    spawnT -= dt;
    const interval = Math.max(0.05, 0.38 - minute * 0.03);
    if (spawnT <= 0 && list.length < Settings.enemyCap) { // horde cap (menu setting)
      spawnT = interval;
      const avail = TYPES.filter(t => t.tier <= minute + 0.01);
      const t = avail[Math.max(0, avail.length - 1 - (Math.random() * Math.min(5, avail.length) | 0))];
      const n = 3 + (minute / 2 | 0);
      for (let i = 0; i < n; i++) spawnAt(G, t);
      // surge wave: a ring of enemies closing in from all sides
      if (Math.random() < 0.03 + minute * 0.003) {
        const st = avail[(Math.random() * avail.length) | 0];
        for (let i = 0; i < 20; i++) spawnAt(G, st);
      }
    }
    eliteT -= dt;
    if (eliteT <= 0) {
      eliteT = Math.max(22, 45 - minute * 1.5);
      const avail = TYPES.filter(t => t.tier <= minute + 1);
      const nE = 1 + (minute / 5 | 0);
      for (let i = 0; i < nE; i++) spawnAt(G, avail[avail.length - 1 - (i % 2)], true);
      Snd.play('elite');
      Particles.text(P.x, P.y - 58, nE > 1 ? `⚠ ${nE} ELITES INCOMING ⚠` : '⚠ ELITE INCOMING ⚠', '#ff8c42', 16); // elite spawn announce
      G.flashAmt = Math.max(G.flashAmt, 0.25);
    }
    // spider silk: patches age out; standing in one slows the player
    G.playerWebbed = false;
    for (let i = webs.length - 1; i >= 0; i--) {
      const wb = webs[i]; wb.life -= dt;
      if (wb.life <= 0) { webs.splice(i, 1); continue; }
      if (Util.dist2(wb.x, wb.y, P.x, P.y) < 42 * 42) G.playerWebbed = true;
    }
    // ground hazards (lava wakes): age out, scorch the Threadbound
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i]; hz.life -= dt;
      if (hz.life <= 0) { hazards.splice(i, 1); continue; }
      if (Util.dist2(hz.x, hz.y, P.x, P.y) < hz.r * hz.r) Player.hurt(G, hz.type === 'gas' ? 4 : 8);
    }
    if (bossIdx < BOSSES.length && G.time >= BOSSES[bossIdx].at) {
      spawnBoss(G, BOSSES[bossIdx]); bossIdx++;
    }
    // the Gilded Moth: a fleeing treasure — catch it before it escapes
    gildT -= dt;
    if (gildT <= 0) {
      gildT = 95;
      const e = spawnAt(G, { id: 'gildedmoth', hp: 24, spd: 150, dmg: 0, xp: 5, tier: 0 });
      e.hp = e.maxHp = 24 + minute * 18; // scale so it stays catchable-but-tense
      e.gilded = true; e.fleeT = 9;
      Particles.text(e.x, e.y - 20, '✦ GILDED MOTH ✦', '#ffd23e', 15);
    }
    // the Moth Plague: every ~4 min a flock sweeps in to eat the cloth
    mothT -= dt;
    if (mothT <= 0) {
      mothT = 240;
      G.announceBoss('THE MOTH PLAGUE', 'They Come to Eat the Cloth');
      const moth = TYPES.find(t => t.id === 'moth');
      const a = Math.random() * Math.PI * 2;
      for (let i = 0; i < 16 + (minute * 2 | 0); i++) {
        const e = spawnAt(G, moth);
        // line formation sweeping in from one side
        const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
        e.x = G.player.x + Math.cos(a) * 700 + px * (i - 8) * 45;
        e.y = G.player.y + Math.sin(a) * 700 + py * (i - 8) * 45;
        e.spd *= 1.5;
        e.hp *= 2; e.maxHp = e.hp;
      }
    }

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e._eaten) { list.splice(i, 1); continue; } // swallowed by a maweater
      // safety net: anything that hit 0 HP through a side path dies properly
      if (e.hp <= 0 || !isFinite(e.x) || !isFinite(e.y)) { G.killEnemy(e, i); continue; }
      e.flash -= dt; e.anim += dt * 6;
      // status effects
      if (e.burn > 0) { e.burn -= dt; e.hp -= 8 * dt; if (Math.random() < 0.2) Particles.spawn(e.x, e.y, '#ff6b2e', { speed: 30, life: 0.3 }); if (e.hp <= 0) { G.killEnemy(e, i); continue; } }
      if (e.poison > 0) { e.poison -= dt; e.hp -= 5 * dt; if (Math.random() < 0.15) Particles.spawn(e.x, e.y, '#5ce86b', { speed: 25, life: 0.35 }); if (e.hp <= 0) { G.killEnemy(e, i); continue; } }
      if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt); // UNDYING affix
      e.freeze -= dt; e.slow -= dt;
      if (e.freeze > 0) continue; // frozen solid

      if (e._hasteT > 0) e._hasteT -= dt;
      const sl = (e.slow > 0 && !e.stoic ? 0.5 : 1) * (e.slowSelf ? 0.15 : 1) * (e._hasteT > 0 ? 1.45 : 1);
      if (e.gilded) { // the Gilded Moth flees, trailing gold dust, then escapes
        e.fleeT -= dt;
        if (e.fleeT <= 0) { list.splice(i, 1); continue; }
        const fa = Util.angTo(P.x, P.y, e.x, e.y) + Math.sin(e.anim * 2) * 0.6;
        e.x += Math.cos(fa) * e.spd * sl * dt;
        e.y += Math.sin(fa) * e.spd * sl * dt;
        if (Math.random() < 0.5) Particles.spawn(e.x, e.y, '#ffd23e', { speed: 25, life: 0.5, size: 2, grav: 40 });
        continue; // no contact damage, no shooting
      }
      // a totem decoy taunts nearby non-boss enemies away from the player
      const tgt = (G.totem && !e.boss && Util.dist2(e.x, e.y, G.totem.x, G.totem.y) < 480 * 480) ? G.totem : P;
      const a = Util.angTo(e.x, e.y, tgt.x, tgt.y);
      e.x += Math.cos(a) * e.spd * sl * dt;
      e.y += Math.sin(a) * e.spd * sl * dt;
      // per-monster behavioral quirk
      const mq = MQUIRKS[e.type.id];
      if (mq && mq.update) mq.update(G, e, dt);
      // movement fx by animation style: dust kicks for walkers, wing shimmer for flyers
      const st = ANIM_OF[e.type.id];
      if (st === 'waddle' && Math.random() < dt * 3) {
        Particles.spawn(e.x - Math.cos(a) * e.r, e.y + e.r * 0.7, '#bba88f', { speed: 22, life: 0.4, size: 2, grav: -16 });
      } else if (st === 'flap' && Math.random() < dt * 4) {
        Particles.spawn(e.x + Util.rand(-e.r, e.r), e.y, '#ffffff', { speed: 10, life: 0.25, size: 2 });
      }

      // shooters & bosses fire bullet patterns
      if (e.boss) {
        bossAttack(G, e, dt);
      } else if (e.type.shoots) {
        e.shootT -= dt;
        if (e.shootT <= 0 && Util.dist2(e.x, e.y, P.x, P.y) < 450 * 450) {
          e.shootT = Util.rand(2.2, 3.5);
          const aa = Util.angTo(e.x, e.y, P.x, P.y);
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(aa) * 170, vy: Math.sin(aa) * 170, dmg: e.dmg * 0.8, r: 5 });
        }
      }

      // kamikaze bombers detonate near the player
      if (e.type.kamikaze && Util.dist2(e.x, e.y, P.x, P.y) < 70 * 70) {
        Particles.burst(e.x, e.y, '#ff5c2e', 22, { speed: 260 });
        Particles.burst(e.x, e.y, '#ffe93e', 12, { speed: 180 });
        Snd.play('explode'); G.shake(7);
        if (Util.dist2(e.x, e.y, P.x, P.y) < 110 * 110) Player.hurt(G, e.dmg, e);
        e.hp = 0; G.killEnemy(e, i);
        continue;
      }
      // contact damage
      if (Util.dist2(e.x, e.y, P.x, P.y) < (e.r + P.r) * (e.r + P.r)) {
        Player.hurt(G, e.dmg, e);
      }
      // de-clump (cheap): push away from previous enemy
      if (i > 0) {
        const o = list[i - 1];
        const d2 = Util.dist2(e.x, e.y, o.x, o.y);
        const rr = e.r + o.r;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5;
          const ax = (e.x - o.x) / d, ay = (e.y - o.y) / d;
          e.x += ax * push; e.y += ay * push; o.x -= ax * push; o.y -= ay * push;
        }
      }
    }
  }

  function bossAttack(G, e, dt) {
    // ENRAGE phase at half HP: faster, angrier, announced
    if (!e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true;
      e.spd *= 1.3;
      G.announceBoss(e.bdef.name + ' ENRAGES', 'The Knot Tightens');
      G.shake(12);
      Particles.burst(e.x, e.y, '#ff3a5c', 40, { speed: 320 });
    }
    if (e.enraged && Math.random() < dt * 6) { // seething embers
      Particles.spawn(e.x + Util.rand(-e.r, e.r), e.y + Util.rand(-e.r, e.r), '#ff3a5c', { speed: 30, life: 0.5, size: 3, grav: -60 });
    }
    // telegraph: brief warning before each volley
    if (e.teleT !== undefined) {
      e.teleT -= dt;
      if (e.teleT > 0) return;
      e.teleT = undefined; // warning over — fire below using stored aim
    } else {
      e.patT -= dt;
      if (e.patT > 0) return;
      // pattern is ready: telegraph first (skip for rapid spiral)
      if (e.bdef.pattern !== 'spiral') {
        e.teleT = 0.4;
        e.teleAim = Util.angTo(e.x, e.y, G.player.x, G.player.y);
        return;
      }
    }
    const P = G.player;
    const enr = e.enraged ? 0.72 : 1; // enraged: shorter cooldowns
    const pat = e.bdef.pattern === 'all' ? Util.pick(['ring', 'aimed', 'spiral', 'flower', 'cross']) : e.bdef.pattern;
    switch (pat) {
      case 'ring': {
        e.patT = 2.4 * enr;
        const n = 22;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.patA;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: e.dmg * 0.6, r: 6, color: '#ff8c5c' });
        }
        e.patA += 0.3;
        break;
      }
      case 'aimed': {
        e.patT = 1.5 * enr;
        const a = e.teleAim ?? Util.angTo(e.x, e.y, P.x, P.y);
        for (let i = -2; i <= 2; i++) {
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a + i * 0.14) * 220, vy: Math.sin(a + i * 0.14) * 220, dmg: e.dmg * 0.7, r: 6, color: '#ffe96b' });
        }
        break;
      }
      case 'spiral': {
        e.patT = 0.09 * enr;
        for (let k = 0; k < 2; k++) {
          const a = e.patA + k * Math.PI;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: e.dmg * 0.5, r: 5, color: '#7fb8f0' });
        }
        e.patA += 0.42;
        break;
      }
      case 'flower': {
        e.patT = 1.1 * enr;
        const n = 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.patA;
          for (let s = 0; s < 3; s++) {
            Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * (90 + s * 50), vy: Math.sin(a) * (90 + s * 50), dmg: e.dmg * 0.5, r: 5, color: '#ff5c8a' });
          }
        }
        e.patA += 0.5;
        break;
      }
      case 'cross': {
        e.patT = 0.7 * enr;
        for (let i = 0; i < 4; i++) {
          const a = e.patA + (i * Math.PI) / 2;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: e.dmg * 0.6, r: 7, color: '#f05cf0' });
        }
        e.patA += 0.22;
        break;
      }
    }
  }

  function draw(G, c) {
    // ground hazards
    for (const hz of hazards) {
      c.globalAlpha = Math.min(0.55, hz.life * 0.4);
      const g = c.createRadialGradient(hz.x, hz.y, 2, hz.x, hz.y, hz.r);
      if (hz.type === 'gas') { g.addColorStop(0, '#d8ff8a'); g.addColorStop(0.5, '#5c8a3a'); g.addColorStop(1, 'transparent'); }
      else { g.addColorStop(0, '#ffe96b'); g.addColorStop(0.5, '#ff6b2e'); g.addColorStop(1, 'transparent'); }
      c.fillStyle = g;
      c.beginPath(); c.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // spider silk patches (under everything)
    for (const wb of webs) {
      c.save();
      c.translate(wb.x, wb.y);
      c.globalAlpha = Math.min(0.5, wb.life * 0.3);
      c.strokeStyle = wb.slime ? '#b8e8a0' : '#e8e3f5'; c.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 4);
        c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.stroke();
      }
      c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
    // off-screen cull: extreme hordes spawn far off-camera — only draw what's visible
    const P = G.player, cullX = G.w / 2 + 90, cullY = G.h / 2 + 90;
    const onScreen = e => Math.abs(e.x - P.x) <= cullX && Math.abs(e.y - P.y) <= cullY;
    // drop shadows first so they never overlap sprites
    c.fillStyle = 'rgba(20,8,40,0.35)';
    for (const e of list) {
      if (!onScreen(e)) continue;
      c.beginPath();
      c.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2);
      c.fill();
    }
    for (const e of list) {
      if (!onScreen(e)) continue;
      const frames = e.boss ? Sprites.get(e.bdef.id) : e.elite ? Sprites.getElite(e.type.id) : Sprites.get(e.type.id);
      if (!frames) continue; // never let a bad sprite lookup kill the render loop
      const f = frames[(e.anim * 1.5 | 0) % frames.length];
      c.save();
      c.translate(e.x, e.y);
      if (e.phased || e.phasedLook) c.globalAlpha = 0.25; // phased or lurking
      const flip = G.player.x < e.x ? -1 : 1;
      // animation personality
      const style = e.boss ? 'float' : ANIM_OF[e.type.id];
      let oy = Math.sin(e.anim) * 2, sx2 = 1, sy2 = 1;
      switch (style) {
        case 'bounce': { // squash & stretch hop
          const ph = Math.abs(Math.sin(e.anim * 1.4));
          sy2 = 0.82 + ph * 0.3; sx2 = 1.18 - ph * 0.25; oy = -ph * 6 + 3;
          break;
        }
        case 'flap': { // wing pump: vertical stretch pulse + lift
          sy2 = 1 + Math.sin(e.anim * 3.2) * 0.16;
          oy = Math.sin(e.anim * 1.6) * 5 - 3;
          break;
        }
        case 'float': { // slow hover with spectral shimmer
          oy = Math.sin(e.anim * 0.9) * 5;
          if (e.flash <= 0 && e.freeze <= 0) c.globalAlpha = 0.85 + 0.15 * Math.sin(e.anim * 2.3);
          break;
        }
        case 'waddle': // rocking gait
          c.rotate(Math.sin(e.anim * 1.8) * 0.09 * flip);
          break;
      }
      c.scale(flip * sx2, sy2);
      const dx = -f.width / 2, dy = -f.height / 2 + oy / sy2;
      if (e.boss) { c.shadowColor = e.enraged ? '#ff3a5c' : '#ffd23e'; c.shadowBlur = 18; } // imposing rim glow
      c.drawImage(f, dx, dy);
      c.shadowBlur = 0;
      // clean tint overlays (replace slow canvas filters)
      if (e.freeze > 0) { c.globalAlpha = 0.5; c.drawImage(Sprites.tinted(f, '#bfeaff'), dx, dy); c.globalAlpha = 1; }
      if (e.flash > 0) { c.globalAlpha = Math.min(1, e.flash / 0.08) * 0.9; c.drawImage(Sprites.tinted(f, '#ffffff'), dx, dy); c.globalAlpha = 1; }
      c.restore();
      // elites wear a floating gold halo (rarity language, ART_STYLE.md)
      if (e.elite) {
        c.strokeStyle = '#ffd23e'; c.lineWidth = 2.5;
        c.globalAlpha = 0.85;
        c.beginPath();
        c.ellipse(e.x, e.y - e.r - 8 + Math.sin(e.anim * 1.5) * 2, e.r * 0.55, e.r * 0.18, 0, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      }
      // boss attack telegraph: red warning ring + dashed aim line
      if (e.boss && e.teleT > 0) {
        const ph = e.teleT / 0.4;
        c.strokeStyle = '#ff3a5c'; c.lineWidth = 3;
        c.globalAlpha = 0.4 + 0.5 * Math.sin(G.time * 30);
        c.beginPath(); c.arc(e.x, e.y, e.r + 14 + ph * 26, 0, Math.PI * 2); c.stroke();
        if (e.bdef.pattern === 'aimed' || e.bdef.pattern === 'all') {
          c.setLineDash([10, 8]); c.lineWidth = 2;
          c.beginPath(); c.moveTo(e.x, e.y);
          c.lineTo(e.x + Math.cos(e.teleAim) * 420, e.y + Math.sin(e.teleAim) * 420);
          c.stroke();
          c.setLineDash([]);
        }
        c.globalAlpha = 1;
      }
      if (e.boss && e.enraged) { // enrage aura
        c.strokeStyle = '#ff3a5c'; c.lineWidth = 2;
        c.globalAlpha = 0.35 + 0.2 * Math.sin(G.time * 9);
        c.beginPath(); c.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
      }
      // boss / elite hp bar
      if (e.boss || e.elite) {
        const w = e.boss ? 90 : 44;
        c.fillStyle = '#000a'; c.fillRect(e.x - w / 2, e.y - e.r - 14, w, 5);
        c.fillStyle = e.boss ? '#ff3a5c' : '#ffd23e';
        c.fillRect(e.x - w / 2, e.y - e.r - 14, w * Math.max(0, e.hp / e.maxHp), 5);
        if (e.affix) { // affix tell: colored ground ring + name
          const ac = AFFIXES[e.affix].color;
          c.strokeStyle = ac; c.lineWidth = 2; c.globalAlpha = 0.6;
          c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 1.3, e.r * 0.5, 0, 0, Math.PI * 2); c.stroke();
          c.globalAlpha = 1;
          c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillStyle = ac;
          c.fillText(e.affix, e.x, e.y - e.r - 18);
        }
      }
    }
  }

  return { get list() { return list; }, TYPES, BOSSES, MQUIRKS, killBook, recordKill, reset, update, draw, spawnAt, quirkDeath, quirkHurt };
})();
