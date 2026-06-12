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
  ];

  // animation personality per monster (ART_STYLE.md: idle motion everywhere)
  const ANIM = {
    bounce: ['slime', 'jelly', 'toad', 'shroom', 'voidling', 'krakenspawn'],  // squash & stretch
    flap:   ['bat', 'raven', 'moth', 'hornet', 'gargoyle', 'seraph', 'gildedmoth'], // vertical wing pump
    float:  ['wraith', 'banshee', 'ghostking', 'djinn', 'reaper', 'skullmage', 'eyeball', 'stalker'], // sine hover + shimmer
    waddle: ['beetle', 'crab', 'golem', 'boulder', 'knightling', 'cyclops', 'snail', 'cactoid', 'mimic'], // rocking gait
  };
  const ANIM_OF = {};
  for (const k in ANIM) for (const id of ANIM[k]) ANIM_OF[id] = k;

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

  function reset() { list = []; spawnT = 0; eliteT = 50; bossIdx = 0; mothT = 150; gildT = 70; }

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
    const minute = G.time / 60;
    // spawn budget ramps with time
    spawnT -= dt;
    const interval = Math.max(0.05, 0.38 - minute * 0.03);
    if (spawnT <= 0 && list.length < 650) {
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

    const P = G.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      // safety net: anything that hit 0 HP through a side path dies properly
      if (e.hp <= 0 || !isFinite(e.x) || !isFinite(e.y)) { G.killEnemy(e, i); continue; }
      e.flash -= dt; e.anim += dt * 6;
      // status effects
      if (e.burn > 0) { e.burn -= dt; e.hp -= 8 * dt; if (Math.random() < 0.2) Particles.spawn(e.x, e.y, '#ff6b2e', { speed: 30, life: 0.3 }); if (e.hp <= 0) { G.killEnemy(e, i); continue; } }
      if (e.poison > 0) { e.poison -= dt; e.hp -= 5 * dt; if (Math.random() < 0.15) Particles.spawn(e.x, e.y, '#5ce86b', { speed: 25, life: 0.35 }); if (e.hp <= 0) { G.killEnemy(e, i); continue; } }
      if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt); // UNDYING affix
      e.freeze -= dt; e.slow -= dt;
      if (e.freeze > 0) continue; // frozen solid

      const sl = e.slow > 0 ? 0.5 : 1;
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
    e.patT -= dt;
    if (e.patT > 0) return;
    const P = G.player;
    const pat = e.bdef.pattern === 'all' ? Util.pick(['ring', 'aimed', 'spiral', 'flower', 'cross']) : e.bdef.pattern;
    switch (pat) {
      case 'ring': {
        e.patT = 2.4;
        const n = 22;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.patA;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: e.dmg * 0.6, r: 6, color: '#ff8c5c' });
        }
        e.patA += 0.3;
        break;
      }
      case 'aimed': {
        e.patT = 1.5;
        const a = Util.angTo(e.x, e.y, P.x, P.y);
        for (let i = -2; i <= 2; i++) {
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a + i * 0.14) * 220, vy: Math.sin(a + i * 0.14) * 220, dmg: e.dmg * 0.7, r: 6, color: '#ffe96b' });
        }
        break;
      }
      case 'spiral': {
        e.patT = 0.09;
        for (let k = 0; k < 2; k++) {
          const a = e.patA + k * Math.PI;
          Projectiles.efire({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: e.dmg * 0.5, r: 5, color: '#7fb8f0' });
        }
        e.patA += 0.42;
        break;
      }
      case 'flower': {
        e.patT = 1.1;
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
        e.patT = 0.7;
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
    // drop shadows first so they never overlap sprites
    c.fillStyle = 'rgba(20,8,40,0.35)';
    for (const e of list) {
      c.beginPath();
      c.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2);
      c.fill();
    }
    for (const e of list) {
      const frames = e.boss ? Sprites.get(e.bdef.id) : e.elite ? Sprites.getElite(e.type.id) : Sprites.get(e.type.id);
      if (!frames) continue; // never let a bad sprite lookup kill the render loop
      const f = frames[(e.anim * 1.5 | 0) % frames.length];
      c.save();
      c.translate(e.x, e.y);
      if (e.flash > 0) { c.globalAlpha = 0.9; c.filter = 'brightness(3)'; }
      if (e.freeze > 0) c.filter = 'saturate(0.2) brightness(1.6)';
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
      c.drawImage(f, -f.width / 2, -f.height / 2 + oy / sy2);
      c.restore();
      c.filter = 'none';
      // elites wear a floating gold halo (rarity language, ART_STYLE.md)
      if (e.elite) {
        c.strokeStyle = '#ffd23e'; c.lineWidth = 2.5;
        c.globalAlpha = 0.85;
        c.beginPath();
        c.ellipse(e.x, e.y - e.r - 8 + Math.sin(e.anim * 1.5) * 2, e.r * 0.55, e.r * 0.18, 0, 0, Math.PI * 2);
        c.stroke();
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

  return { get list() { return list; }, TYPES, BOSSES, reset, update, draw, spawnAt };
})();
