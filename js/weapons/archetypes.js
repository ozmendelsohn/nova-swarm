// ---- archetypes.js : the 36 weapon behavior archetypes (logic only) ----
// Each archetype has fire(G, w, s) where s = computed stats
// {dmg, count, speed, area, dur, cd}. Persistent kinds live as long-lived
// projectiles updated in updateProjectiles(). Drawing lives in weaponfx.js.
const Archetypes = (() => {
  const TAU = Math.PI * 2;
  const aimAng = (G, spread = 0) => {
    const e = G.nearestEnemy(G.player.x, G.player.y, 700);
    let a = e ? Util.angTo(G.player.x, G.player.y, e.x, e.y) : G.player.faceAng;
    return a + Util.rand(-spread, spread);
  };

  function shot(G, w, s, extra = {}) {
    const base = aimAng(G, 0.05);
    // muzzle flash
    for (let i = 0; i < 3; i++) Particles.spawn(G.player.x + Math.cos(base) * 16, G.player.y + Math.sin(base) * 16, i === 0 ? '#fff' : w.def.color, { speed: 90, life: 0.15, size: 3, ang: base + Util.rand(-0.6, 0.6) });
    for (let i = 0; i < s.count; i++) {
      const a = base + (i - (s.count - 1) / 2) * 0.16;
      Projectiles.fire(Object.assign({
        x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        dmg: s.dmg, r: 5 * s.area, life: s.dur, color: w.def.color, pierce: s.pierce,
        ownerW: w, effects: w.def.effects, angle: a,
      }, extra));
    }
  }

  const A = {
    projectile: { fire: (G, w, s) => shot(G, w, s) },

    spread: { fire: (G, w, s) => { // shotgun fan
      const base = aimAng(G);
      for (let i = 0; i < s.count + 2; i++) {
        const a = base + Util.rand(-0.45, 0.45);
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed * Util.rand(0.7, 1.2), vy: Math.sin(a) * s.speed * Util.rand(0.7, 1.2), dmg: s.dmg * 0.6, r: 4 * s.area, life: s.dur * 0.5, color: w.def.color, ownerW: w, effects: w.def.effects });
      }
    } },

    homing: { fire: (G, w, s) => shot(G, w, s, { homing: 6, life: s.dur * 1.5 }) },

    boomerang: { fire: (G, w, s) => shot(G, w, s, { boomerang: true, spin: 12, life: s.dur * 2, pierce: 99, r: 8 * s.area }) },

    ricochet: { fire: (G, w, s) => shot(G, w, s, { ricochet: 3 + (s.pierce | 0), pierce: 99 }) },

    chain: { fire: (G, w, s) => { // chain lightning: instant zaps
      let from = { x: G.player.x, y: G.player.y };
      let e = G.nearestEnemy(from.x, from.y, 420);
      const hit = new Set();
      let hops = 2 + s.count;
      while (e && hops-- > 0) {
        hit.add(e);
        G.damageEnemy(e, s.dmg, { color: w.def.color, effects: w.def.effects, w });
        G.zap(from.x, from.y, e.x, e.y, w.def.color);
        from = e;
        e = G.nearestEnemy(e.x, e.y, 260, hit);
      }
    } },

    nova: { fire: (G, w, s) => { // blooming ring: bursts out fast, stalls, fades
      const n = 8 + s.count * 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed * 1.4, vy: Math.sin(a) * s.speed * 1.4, dmg: s.dmg * 0.8, r: 5 * s.area, life: s.dur * 0.7, color: w.def.color, ownerW: w, effects: w.def.effects, decel: 0.955 });
      }
    } },

    spiral: { fire: (G, w, s) => { // bullets curve into true spiral arms
      w._spA = (w._spA || 0) + 0.55;
      for (let i = 0; i < Math.max(1, s.count); i++) {
        const a = w._spA + (i * TAU) / Math.max(1, s.count);
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed * 0.7, vy: Math.sin(a) * s.speed * 0.7, dmg: s.dmg * 0.7, r: 4 * s.area, life: s.dur, color: w.def.color, ownerW: w, effects: w.def.effects, curve: 1.7 });
      }
    } },

    orbit: { fire: (G, w, s) => { // refresh orbiting blades
      for (let i = 0; i < s.count + 1; i++) {
        Projectiles.fire({ kind: 'orbit', x: G.player.x, y: G.player.y, orbitR: 70 * s.area + 20, orbitSpd: 3.2, t: (i * TAU) / (s.count + 1), dmg: s.dmg, r: 9 * s.area, life: s.dur * 2, color: w.def.color, pierce: 9999, ownerW: w, effects: w.def.effects });
      }
    } },

    beam: { fire: (G, w, s) => {
      Projectiles.fire({ kind: 'beam', x: G.player.x, y: G.player.y, angle: aimAng(G), dmg: s.dmg, r: 8 * s.area, life: 0.35 + s.dur * 0.1, color: w.def.color, ownerW: w, effects: w.def.effects, size: 520 + 80 * s.count });
    } },

    aura: { fire: (G, w, s) => {
      Projectiles.fire({ kind: 'aura', x: 0, y: 0, dmg: s.dmg * 0.5, r: 85 * s.area, life: s.cd * 1.05, color: w.def.color, ownerW: w, effects: w.def.effects });
    } },

    whip: { fire: (G, w, s) => {
      const dir = G.player.faceAng;
      for (let i = 0; i < s.count; i++) {
        const a = dir + (i % 2 ? Math.PI : 0);
        Projectiles.fire({ kind: 'whip', x: G.player.x + Math.cos(a) * 70, y: G.player.y + Math.sin(a) * 30, dmg: s.dmg, r: 60 * s.area, life: 0.18, color: w.def.color, ownerW: w, effects: w.def.effects, angle: a });
      }
    } },

    mine: { fire: (G, w, s) => {
      for (let i = 0; i < s.count; i++) {
        Projectiles.fire({ kind: 'mine', x: G.player.x + Util.rand(-120, 120), y: G.player.y + Util.rand(-120, 120), dmg: s.dmg * 1.6, r: 10, life: 8, color: w.def.color, ownerW: w, effects: w.def.effects, explode: 70 * s.area });
      }
    } },

    drone: { fire: (G, w, s) => {
      const have = Projectiles.pool.filter(p => p.active && p.kind === 'drone' && p.ownerW === w).length;
      for (let i = have; i < s.count; i++) {
        Projectiles.fire({ kind: 'drone', x: G.player.x, y: G.player.y, dmg: s.dmg, r: 7, life: 9999, color: w.def.color, ownerW: w, effects: w.def.effects, t: Math.random() * TAU, retT: s.cd * 0.6 });
      }
    } },

    turret: { fire: (G, w, s) => {
      Projectiles.fire({ kind: 'turret', x: G.player.x, y: G.player.y, dmg: s.dmg, r: 9, life: 4 + s.dur, color: w.def.color, ownerW: w, effects: w.def.effects, retT: 0, size: s.speed });
    } },

    blackhole: { fire: (G, w, s) => {
      const e = G.nearestEnemy(G.player.x, G.player.y, 500);
      const x = e ? e.x : G.player.x + Util.rand(-200, 200), y = e ? e.y : G.player.y + Util.rand(-200, 200);
      Projectiles.fire({ kind: 'blackhole', x, y, dmg: s.dmg * 0.4, r: 90 * s.area, life: 1.5 + s.dur * 0.4, color: w.def.color, ownerW: w, effects: w.def.effects, vacuum: 280 });
    } },

    wall: { fire: (G, w, s) => { // damaging wall segment perpendicular to aim
      const a = aimAng(G), d = 110;
      Projectiles.fire({ kind: 'wall', x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d, angle: a + Math.PI / 2, dmg: s.dmg * 0.5, r: 14, life: 1.5 + s.dur * 0.5, color: w.def.color, ownerW: w, effects: w.def.effects, size: 70 + 40 * s.count * s.area });
    } },

    mirror: { fire: (G, w, s) => { // fires forward AND backward volleys
      const a = aimAng(G);
      for (const dir of [a, a + Math.PI]) {
        for (let i = 0; i < s.count; i++) {
          const aa = dir + (i - (s.count - 1) / 2) * 0.14;
          Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(aa) * s.speed, vy: Math.sin(aa) * s.speed, dmg: s.dmg * 0.85, r: 5 * s.area, life: s.dur, color: w.def.color, ownerW: w, effects: w.def.effects });
        }
      }
    } },

    lance: { fire: (G, w, s) => { // piercing dash-lance, very fast
      shot(G, w, { ...s, speed: s.speed * 2.2 }, { pierce: 9999, r: 7 * s.area, life: 0.6 });
    } },

    storm: { fire: (G, w, s) => { // strikes random enemies from above
      const out = [];
      G.enemiesInRange(G.player.x, G.player.y, 430, out);
      for (let i = 0; i < s.count + 1 && out.length; i++) {
        const e = out[(Math.random() * out.length) | 0];
        Projectiles.fire({ kind: 'strike', x: e.x, y: e.y, dmg: s.dmg, r: 45 * s.area, life: 0.3, color: w.def.color, ownerW: w, effects: w.def.effects });
      }
    } },

    bladering: { fire: (G, w, s) => { // expanding then contracting ring
      Projectiles.fire({ kind: 'bladering', x: G.player.x, y: G.player.y, dmg: s.dmg * 0.7, r: 10, life: 1.6, color: w.def.color, ownerW: w, effects: w.def.effects, size: 170 * s.area, pierce: 9999 });
    } },

    splitter: { fire: (G, w, s) => { // shots shatter into shards on impact
      shot(G, w, s, { split: 2 + (s.count | 0) });
    } },

    mortar: { fire: (G, w, s) => { // lobbed bombs arc onto targets
      for (let i = 0; i < s.count; i++) {
        const e = G.nearestEnemy(G.player.x, G.player.y, 480);
        const tx = (e ? e.x : G.player.x) + Util.rand(-70, 70);
        const ty = (e ? e.y : G.player.y) + Util.rand(-70, 70);
        Projectiles.fire({ kind: 'mortar', x: G.player.x, y: G.player.y, srcX: G.player.x, srcY: G.player.y, life: 0.85, size: 0.85, dmg: s.dmg * 1.4, r: 7, color: w.def.color, ownerW: w, effects: w.def.effects, explode: 65 * s.area, vx: tx, vy: ty }); // vx,vy = landing spot
      }
    } },

    flail: { fire: (G, w, s) => { // chained spiked ball swings around you
      const have = Projectiles.pool.filter(q => q.active && q.kind === 'flail' && q.ownerW === w).length;
      if (have) return;
      Projectiles.fire({ kind: 'flail', x: G.player.x, y: G.player.y, dmg: s.dmg, r: 13 * s.area, life: s.cd * 1.1, color: w.def.color, ownerW: w, effects: w.def.effects, orbitR: 95 * s.area, t: Math.random() * TAU, knock: 1 });
    } },

    geyser: { fire: (G, w, s) => { // staggered eruptions marching down a line
      const a = aimAng(G);
      for (let i = 0; i < 3 + s.count; i++) {
        const d = 55 + i * 65;
        Projectiles.fire({ kind: 'geyser', x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d, retT: 0.14 + i * 0.13, life: 0.14 + i * 0.13 + 0.4, dmg: s.dmg, r: 42 * s.area, color: w.def.color, ownerW: w, effects: w.def.effects });
      }
    } },

    tether: { fire: (G, w, s) => { // sustained lock-on link that cooks one target
      Projectiles.fire({ kind: 'tether', x: G.player.x, y: G.player.y, dmg: s.dmg * 0.45, r: 12, life: 1.1 + s.dur * 0.3, color: w.def.color, ownerW: w, effects: w.def.effects, size: 340 + 40 * s.count });
    } },

    comet: { fire: (G, w, s) => { // winds up in orbit, then slingshots at prey
      for (let i = 0; i < s.count; i++) {
        Projectiles.fire({ kind: 'comet', x: G.player.x, y: G.player.y, t: (i * TAU) / s.count, retT: 0.5 + i * 0.12, dmg: s.dmg * 1.3, r: 7 * s.area, life: 3, color: w.def.color, ownerW: w, effects: w.def.effects, orbitR: 55, pierce: 2 });
      }
    } },

    pulsar: { fire: (G, w, s) => { // plants a star that pulses bullet rings
      const e = G.nearestEnemy(G.player.x, G.player.y, 420);
      Projectiles.fire({ kind: 'pulsar', x: e ? e.x : G.player.x + Util.rand(-150, 150), y: e ? e.y : G.player.y + Util.rand(-150, 150), dmg: s.dmg * 0.6, r: 10, life: 2 + s.dur * 0.5, color: w.def.color, ownerW: w, effects: w.def.effects, retT: 0.2, size: s.count });
    } },

    scythe: { fire: (G, w, s) => { // one full sweeping cut all the way around
      Projectiles.fire({ kind: 'scythe', x: G.player.x, y: G.player.y, angle: G.player.faceAng, dmg: s.dmg * 1.2, r: 95 * s.area, life: 0.32, color: w.def.color, ownerW: w, effects: w.def.effects });
    } },

    wave: { fire: (G, w, s) => { // twin helix bullets weaving across each other
      const a = aimAng(G);
      for (let i = 0; i < s.count; i++) {
        for (const ph of [0, Math.PI]) {
          Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg * 0.8, r: 5 * s.area, life: s.dur, color: w.def.color, ownerW: w, effects: w.def.effects, wave: 9, retT: ph + i * 0.7, pierce: 1 });
        }
      }
    } },

    anchor: { fire: (G, w, s) => { // heavy anchor: drags the pack in, then shatters
      const a = aimAng(G);
      Projectiles.fire({ kind: 'anchor', x: G.player.x + Math.cos(a) * 150, y: G.player.y + Math.sin(a) * 150, dmg: s.dmg * 0.4, r: 70 * s.area, life: 1.4 + s.dur * 0.3, color: w.def.color, ownerW: w, effects: w.def.effects, vacuum: 420, explode: 80 * s.area });
    } },

    critter: { fire: (G, w, s) => { // skittering swarmlings crawl after prey
      for (let i = 0; i < s.count + 2; i++) {
        const a = Math.random() * TAU;
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dmg: s.dmg * 0.7, r: 5, life: s.dur * 2.5, color: w.def.color, ownerW: w, effects: w.def.effects, homing: 3.5, wiggle: 1, spin: 0 });
      }
    } },

    sticky: { fire: (G, w, s) => { // latches onto a victim, then detonates
      shot(G, w, s, { sticky: true, explode: 60 * s.area, homing: 4 });
    } },

    harpoon: { fire: (G, w, s) => { // skewers and YANKS the victim to your feet
      shot(G, w, { ...s, speed: s.speed * 1.6 }, { harpoon: true, r: 6 * s.area });
    } },

    jugger: { fire: (G, w, s) => { // slow colossal moon grinding through the horde
      const a = aimAng(G);
      Projectiles.fire({ kind: 'jugger', x: G.player.x, y: G.player.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, dmg: s.dmg * 0.8, r: 34 * s.area, life: 2.2 + s.dur * 0.5, color: w.def.color, ownerW: w, effects: w.def.effects });
    } },

    totem: { fire: (G, w, s) => { // decoy totem: taunts the horde, then erupts
      const have = Projectiles.pool.some(q => q.active && q.kind === 'totem');
      if (have) return;
      Projectiles.fire({ kind: 'totem', x: G.player.x + Util.rand(-90, 90), y: G.player.y + Util.rand(-90, 90), dmg: s.dmg * 0.5, r: 60 * s.area, life: 2.5 + s.dur, color: w.def.color, ownerW: w, effects: w.def.effects, explode: 110 * s.area });
    } },
  };

  // ---------- shared projectile update ----------
  const qtmp = [];
  const EXPLODE_ON_EXPIRY = { mine: 1, anchor: 2.5, totem: 2.5, stuck: 2.5 }; // dmg multiplier
  function pullEnemies(G, p, dt, radiusMult) { // suction toward p (black hole / anchor)
    G.enemiesInRange(p.x, p.y, p.r * radiusMult, qtmp);
    for (const e of qtmp) {
      if (e.boss) continue;
      const a = Util.angTo(e.x, e.y, p.x, p.y);
      e.x += Math.cos(a) * p.vacuum * dt; e.y += Math.sin(a) * p.vacuum * dt;
    }
  }
  function updateProjectiles(G, dt) {
    const P = G.player;
    for (const p of Projectiles.pool) {
      if (!p.active) continue;
      p.life -= dt; p.t += dt;
      if (p.life <= 0) {
        if (EXPLODE_ON_EXPIRY[p.kind]) G.explodeAt(p.x, p.y, p.explode, p.dmg * EXPLODE_ON_EXPIRY[p.kind], p);
        else if (p.kind === 'mortar') G.explodeAt(p.vx, p.vy, p.explode, p.dmg, p); // lands and detonates
        p.active = false; continue;
      }
      switch (p.kind) {
        case 'shot': {
          if (p.homing) {
            const e = G.nearestEnemy(p.x, p.y, 300);
            if (e) {
              const a = Util.angTo(p.x, p.y, e.x, e.y);
              const sp = Math.hypot(p.vx, p.vy);
              const cur = Math.atan2(p.vy, p.vx);
              let d = a - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
              const na = cur + Util.clamp(d, -p.homing * dt, p.homing * dt);
              p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
            }
          }
          if (p.boomerang) {
            // accelerate back toward player after half-life
            const half = 0.55;
            if (p.t > half) {
              const a = Util.angTo(p.x, p.y, P.x, P.y);
              p.vx += Math.cos(a) * 1400 * dt; p.vy += Math.sin(a) * 1400 * dt;
              if (Util.dist2(p.x, p.y, P.x, P.y) < 400) p.active = false;
            }
          }
          if (p.wave) { // helix: oscillate perpendicular to flight path
            const a = Math.atan2(p.vy, p.vx) + Math.PI / 2;
            const off = Math.cos(p.t * p.wave + p.retT) * 130 * dt * p.wave * 0.4;
            p.x += Math.cos(a) * off; p.y += Math.sin(a) * off;
          }
          if (p.wiggle) { // critter skitter
            const a = Math.atan2(p.vy, p.vx) + Math.PI / 2;
            const off = Math.sin(p.t * 16) * 60 * dt;
            p.x += Math.cos(a) * off; p.y += Math.sin(a) * off;
          }
          if (p.curve) { // spiral arms: velocity rotates continuously
            const ca = Math.cos(p.curve * dt), sa = Math.sin(p.curve * dt);
            const nvx = p.vx * ca - p.vy * sa; p.vy = p.vx * sa + p.vy * ca; p.vx = nvx;
          }
          if (p.decel) { p.vx *= p.decel; p.vy *= p.decel; }
          if (p.grow) { p.r += 12 * dt; p.dmg += p.grow * dt; } // gathering mass
          p.x += p.vx * dt; p.y += p.vy * dt;
          hitEnemies(G, p, dt);
          famTrail(p);
          break;
        }
        case 'orbit': {
          p.t += p.orbitSpd * dt;
          p.x = P.x + Math.cos(p.t) * p.orbitR;
          p.y = P.y + Math.sin(p.t) * p.orbitR;
          hitEnemies(G, p, dt, 0.12);
          break;
        }
        case 'aura': {
          p.x = P.x; p.y = P.y;
          hitEnemies(G, p, dt, 0.25);
          break;
        }
        case 'beam': {
          // damage along a line from player at p.angle
          p.x = P.x; p.y = P.y;
          G.enemiesInRange(P.x, P.y, p.size, qtmp);
          for (const e of qtmp) {
            const a = Util.angTo(P.x, P.y, e.x, e.y);
            let d = a - p.angle; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
            const dist = Math.sqrt(Util.dist2(P.x, P.y, e.x, e.y));
            if (Math.abs(d) * dist < p.r + e.r) tryHit(G, p, e, 0.15);
          }
          break;
        }
        case 'whip': case 'strike': {
          hitEnemies(G, p, dt, 99); // one-shot zones
          break;
        }
        case 'mine': {
          G.enemiesInRange(p.x, p.y, p.r + 16, qtmp);
          if (qtmp.length) { G.explodeAt(p.x, p.y, p.explode, p.dmg, p); p.active = false; }
          break;
        }
        case 'drone': {
          p.retT -= dt;
          const target = G.nearestEnemy(p.x, p.y, 350);
          const hx = P.x + Math.cos(p.t * 2) * 60, hy = P.y + Math.sin(p.t * 2) * 60;
          const tx = target ? target.x : hx, ty = target ? target.y : hy;
          const a = Util.angTo(p.x, p.y, tx, ty);
          p.x += Math.cos(a) * 240 * dt; p.y += Math.sin(a) * 240 * dt;
          hitEnemies(G, p, dt, 0.4);
          if (Util.dist2(p.x, p.y, P.x, P.y) > 700 * 700) { p.x = P.x; p.y = P.y; }
          break;
        }
        case 'turret': {
          p.retT -= dt;
          if (p.retT <= 0) {
            p.retT = 0.5;
            const e = G.nearestEnemy(p.x, p.y, 420);
            if (e) {
              const a = Util.angTo(p.x, p.y, e.x, e.y);
              Projectiles.fire({ x: p.x, y: p.y, vx: Math.cos(a) * (p.size || 380), vy: Math.sin(a) * (p.size || 380), dmg: p.dmg, r: 4, life: 1.2, color: p.color, ownerW: p.ownerW, effects: p.effects });
            }
          }
          break;
        }
        case 'blackhole': {
          pullEnemies(G, p, dt, 2.2);
          hitEnemies(G, p, dt, 0.2);
          if (Math.random() < 0.5) Particles.spawn(p.x + Util.rand(-p.r, p.r), p.y + Util.rand(-p.r, p.r), p.color, { speed: 40, life: 0.3 });
          break;
        }
        case 'wall': {
          // segment of length size centered at x,y along angle
          G.enemiesInRange(p.x, p.y, p.size + 20, qtmp);
          const ca = Math.cos(p.angle), sa = Math.sin(p.angle);
          for (const e of qtmp) {
            const dx = e.x - p.x, dy = e.y - p.y;
            const along = dx * ca + dy * sa, perp = Math.abs(-dx * sa + dy * ca);
            if (Math.abs(along) < p.size && perp < p.r + e.r) tryHit(G, p, e, 0.3);
          }
          break;
        }
        case 'mortar': break; // pure flight, handled in draw + expiry
        case 'comet': {
          p.retT -= dt;
          if (p.retT > 0) { // wind-up orbit
            p.t += 11 * dt;
            p.x = P.x + Math.cos(p.t) * p.orbitR;
            p.y = P.y + Math.sin(p.t) * p.orbitR;
          } else if (!p._launched) { // slingshot!
            p._launched = true;
            const e = G.nearestEnemy(p.x, p.y, 600);
            const a = e ? Util.angTo(p.x, p.y, e.x, e.y) : p.t;
            p.vx = Math.cos(a) * 640; p.vy = Math.sin(a) * 640;
            Particles.burst(p.x, p.y, '#fff', 6, { speed: 120, life: 0.2 });
          } else {
            p.x += p.vx * dt; p.y += p.vy * dt;
            hitEnemies(G, p, dt);
            famTrail(p);
          }
          break;
        }
        case 'pulsar': {
          p.retT -= dt;
          if (p.retT <= 0) {
            p.retT = 0.45;
            const n = 6 + (p.size | 0) * 2;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU + p.life;
              Projectiles.fire({ x: p.x, y: p.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, dmg: p.dmg, r: 4, life: 0.7, color: p.color, ownerW: p.ownerW, effects: p.effects });
            }
          }
          break;
        }
        case 'scythe': {
          p.x = P.x; p.y = P.y;
          const ph = 1 - p.life / 0.32;
          p._a = p.angle + ph * TAU; // blade sweeps a full revolution
          G.enemiesInRange(p.x, p.y, p.r + 20, qtmp);
          for (const e of qtmp) {
            const ea = Util.angTo(p.x, p.y, e.x, e.y);
            let d = ea - p._a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
            if (Math.abs(d) < 0.55 && Util.dist2(p.x, p.y, e.x, e.y) < p.r * p.r) tryHit(G, p, e, 99);
          }
          break;
        }
        case 'anchor': {
          pullEnemies(G, p, dt, 2.6);
          hitEnemies(G, p, dt, 0.3);
          break;
        }
        case 'jugger': {
          p.x += p.vx * dt; p.y += p.vy * dt;
          hitEnemies(G, p, dt, 0.2);
          if (Math.random() < 0.4) Particles.spawn(p.x + Util.rand(-p.r, p.r), p.y + p.r * 0.8, p.color, { speed: 30, life: 0.4, size: 3 });
          break;
        }
        case 'totem': {
          G.totem = p; // enemies in enemies.js walk to this instead of the player
          hitEnemies(G, p, dt, 0.5);
          break;
        }
        case 'stuck': { // sticky bomb riding its victim
          if (p._e && p._e.hp > 0) { p.x = p._e.x; p.y = p._e.y - 8; }
          break;
        }
        case 'flail': {
          p.t += 5.5 * dt; // swing speed
          const R = p.orbitR * (0.55 + 0.45 * Math.sin(p.t * 1.3));
          p.x = P.x + Math.cos(p.t) * R;
          p.y = P.y + Math.sin(p.t) * R;
          hitEnemies(G, p, dt, 0.15);
          break;
        }
        case 'geyser': {
          p.retT -= dt;
          if (p.retT <= 0) hitEnemies(G, p, dt, 99);
          break;
        }
        case 'tether': {
          p.x = P.x; p.y = P.y;
          const e = G.nearestEnemy(P.x, P.y, p.size);
          p._e = e || null;
          if (e) {
            tryHit(G, p, e, 0.12);
            if (Math.random() < 0.4) Particles.spawn(e.x, e.y, p.color, { speed: 60, life: 0.2, size: 2 });
          }
          break;
        }
        case 'bladering': {
          const ph = 1 - p.life / 1.6;
          const R = Math.sin(ph * Math.PI) * p.size;
          G.enemiesInRange(p.x, p.y, R + 24, qtmp);
          for (const e of qtmp) {
            const d = Math.sqrt(Util.dist2(p.x, p.y, e.x, e.y));
            if (Math.abs(d - R) < 16 + e.r) tryHit(G, p, e, 0.2);
          }
          p._R = R;
          break;
        }
      }
    }
  }

  // family-specific living trails: each element leaves its own signature
  function famTrail(p) {
    const fam = p.ownerW && p.ownerW.def.family;
    switch (fam) {
      case 'Fire': // embers drift upward and shrink
        if (Math.random() < 0.55) Particles.spawn(p.x, p.y, Math.random() < 0.3 ? '#ffd23e' : p.color, { speed: 25, life: 0.5, size: 3, grav: -160 });
        break;
      case 'Frost': // glitter falls gently
        if (Math.random() < 0.4) Particles.spawn(p.x, p.y, Math.random() < 0.5 ? '#fff' : p.color, { speed: 12, life: 0.6, size: 2, grav: 60, drag: 0.97 });
        break;
      case 'Volt': // crackling offshoots perpendicular to flight
        if (Math.random() < 0.3) {
          const a = Math.atan2(p.vy, p.vx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
          Particles.spawn(p.x, p.y, '#ffe93e', { speed: 140, life: 0.12, size: 2, ang: a, drag: 0.8 });
        }
        break;
      case 'Void': // motes spiral back toward the projectile's wake
        if (Math.random() < 0.45) Particles.spawn(p.x + Util.rand(-10, 10), p.y + Util.rand(-10, 10), Math.random() < 0.3 ? '#f05cf0' : p.color, { speed: 8, life: 0.55, size: 2, drag: 1.04 });
        break;
      case 'Nature': // petals flutter off
        if (Math.random() < 0.35) Particles.spawn(p.x, p.y, Math.random() < 0.4 ? '#bfffcc' : p.color, { speed: 30, life: 0.7, size: 3, grav: 35, drag: 0.96 });
        break;
      case 'Steel': // hot sparks kick backward
        if (Math.random() < 0.3) {
          const a = Math.atan2(p.vy, p.vx) + Math.PI + Util.rand(-0.5, 0.5);
          Particles.spawn(p.x, p.y, Math.random() < 0.5 ? '#ffb35c' : '#fff', { speed: 180, life: 0.2, size: 2, ang: a });
        }
        break;
      case 'Arcane': // twinkling stardust
        if (Math.random() < 0.5) Particles.spawn(p.x, p.y, Math.random() < 0.4 ? '#fff' : p.color, { speed: 10, life: 0.45, size: Math.random() < 0.2 ? 4 : 2, drag: 0.99 });
        break;
      default:
        if (Math.random() < 0.3) Particles.spawn(p.x, p.y, p.color, { speed: 20, life: 0.25, size: 2 });
    }
  }

  function tryHit(G, p, e, cd = 0) {
    if (!p.hitSet) p.hitSet = new Set();
    if (cd >= 99) { // one-shot zone
      if (p.hitSet.has(e)) return;
      p.hitSet.add(e);
    } else if (cd > 0) {
      const t = e._lastHit && e._lastHit.get(p);
      if (t && G.time - t < cd) return;
      if (!e._lastHit) e._lastHit = new Map();
      e._lastHit.set(p, G.time);
    }
    G.damageEnemy(e, p.dmg, { color: p.color, effects: p.effects, w: p.ownerW, knock: p.knock, from: p });
  }

  function hitEnemies(G, p, dt, zoneCd = 0) {
    G.enemiesInRange(p.x, p.y, p.r + 30, qtmp);
    for (const e of qtmp) {
      if (Util.dist2(p.x, p.y, e.x, e.y) > (p.r + e.r) * (p.r + e.r)) continue;
      if (p.kind === 'shot') {
        if (p.hitSet.has(e)) continue;
        p.hitSet.add(e);
        if (p.sticky) { // latch on: become a riding bomb instead of damaging now
          p.kind = 'stuck'; p._e = e; p.life = 0.8; p.sticky = false;
          break;
        }
        G.damageEnemy(e, p.dmg, { color: p.color, effects: p.effects, w: p.ownerW, knock: p.knock, from: p });
        if (p.harpoon && !e.boss) { // reel the victim in
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          e.x += Math.cos(a) * 150; e.y += Math.sin(a) * 150;
          G.zap(G.player.x, G.player.y, e.x, e.y, p.color);
        }
        if (p.split) { // shatter into a fan of shards (which don't re-split)
          const base = Math.atan2(p.vy, p.vx);
          for (let k = 0; k < p.split; k++) {
            const a = base + (k - (p.split - 1) / 2) * 0.7 + Util.rand(-0.15, 0.15);
            Projectiles.fire({ x: p.x, y: p.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, dmg: p.dmg * 0.45, r: p.r * 0.6, life: 0.5, color: p.color, ownerW: p.ownerW, effects: p.effects, hitSet: new Set([e]) });
          }
          Particles.burst(p.x, p.y, '#fff', 6, { speed: 150, life: 0.2 });
          p.active = false;
          break;
        }
        if (p.ricochet > 0) {
          p.ricochet--;
          const ne = G.nearestEnemy(p.x, p.y, 320, p.hitSet);
          if (ne) {
            const a = Util.angTo(p.x, p.y, ne.x, ne.y);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            p.life = Math.max(p.life, 0.8);
            Particles.burst(p.x, p.y, '#fff', 5, { speed: 130, life: 0.2 }); // bounce ping
            continue;
          }
        }
        if (p.pierce > 0) { p.pierce--; continue; }
        if (p.explode) G.explodeAt(p.x, p.y, p.explode, p.dmg * 0.7, p);
        p.active = false;
        break;
      } else {
        tryHit(G, p, e, zoneCd);
      }
    }
  }

  return { A, updateProjectiles };
})();
