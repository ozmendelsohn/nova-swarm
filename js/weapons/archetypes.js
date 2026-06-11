// ---- archetypes.js : 20 weapon behavior archetypes ----
// Each archetype has fire(G, w, s) where s = computed stats
// {dmg, count, speed, area, dur, cd}. Persistent kinds (orbit, aura, beam,
// drone, turret, blackhole, wall, bladering) live as long-lived projectiles
// updated in updateProjectiles().
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

    nova: { fire: (G, w, s) => { // ring of bullets outward
      const n = 8 + s.count * 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed * 0.8, vy: Math.sin(a) * s.speed * 0.8, dmg: s.dmg * 0.8, r: 5 * s.area, life: s.dur * 0.7, color: w.def.color, ownerW: w, effects: w.def.effects });
      }
    } },

    spiral: { fire: (G, w, s) => { // continuous spiral emitter (cheap cd, rotating)
      w._spA = (w._spA || 0) + 0.55;
      for (let i = 0; i < Math.max(1, s.count); i++) {
        const a = w._spA + (i * TAU) / Math.max(1, s.count);
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * s.speed * 0.7, vy: Math.sin(a) * s.speed * 0.7, dmg: s.dmg * 0.7, r: 4 * s.area, life: s.dur, color: w.def.color, ownerW: w, effects: w.def.effects });
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
  };

  // ---------- shared projectile update ----------
  const qtmp = [];
  function updateProjectiles(G, dt) {
    const P = G.player;
    for (const p of Projectiles.pool) {
      if (!p.active) continue;
      p.life -= dt; p.t += dt;
      if (p.life <= 0) {
        if (p.kind === 'mine') G.explodeAt(p.x, p.y, p.explode, p.dmg, p);
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
          if (p.boomerang && p.t > p.life + p.t - 0.0001) {/*noop*/}
          if (p.boomerang) {
            // accelerate back toward player after half-life
            const half = 0.55;
            if (p.t > half) {
              const a = Util.angTo(p.x, p.y, P.x, P.y);
              p.vx += Math.cos(a) * 1400 * dt; p.vy += Math.sin(a) * 1400 * dt;
              if (Util.dist2(p.x, p.y, P.x, P.y) < 400) p.active = false;
            }
          }
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
          G.enemiesInRange(p.x, p.y, p.r * 2.2, qtmp);
          for (const e of qtmp) {
            if (e.boss) continue;
            const a = Util.angTo(e.x, e.y, p.x, p.y);
            e.x += Math.cos(a) * p.vacuum * dt; e.y += Math.sin(a) * p.vacuum * dt;
          }
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
        G.damageEnemy(e, p.dmg, { color: p.color, effects: p.effects, w: p.ownerW, knock: p.knock, from: p });
        if (p.ricochet > 0) {
          p.ricochet--;
          const ne = G.nearestEnemy(p.x, p.y, 320, p.hitSet);
          if (ne) {
            const a = Util.angTo(p.x, p.y, ne.x, ne.y);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            p.life = Math.max(p.life, 0.8);
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

  // ---------- drawing ----------
  function drawProjectiles(G, c) {
    for (const p of Projectiles.pool) {
      if (!p.active) continue;
      c.save();
      switch (p.kind) {
        case 'beam': {
          c.translate(p.x, p.y); c.rotate(p.angle);
          const al = Math.min(1, p.life * 4);
          // outer halo
          c.globalAlpha = al * 0.35;
          const g = c.createLinearGradient(0, 0, p.size, 0);
          g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
          c.fillStyle = g;
          c.fillRect(0, -p.r * 2.2, p.size, p.r * 4.4);
          // hot core
          c.globalAlpha = al;
          c.fillStyle = g; c.fillRect(0, -p.r, p.size, p.r * 2);
          c.fillStyle = '#fff'; c.fillRect(0, -p.r * 0.3, p.size * 0.85, p.r * 0.6);
          // energy ripples racing along the beam
          c.fillStyle = '#fff'; c.globalAlpha = al * 0.8;
          for (let i = 0; i < 5; i++) {
            const bx = ((G.time * 900 + i * p.size / 5) % p.size);
            c.beginPath(); c.arc(bx, 0, p.r * (0.7 + 0.3 * Math.sin(i * 2)), 0, TAU); c.fill();
          }
          // muzzle flare
          c.globalAlpha = al; c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r * 1.8, 0, TAU); c.fill();
          break;
        }
        case 'aura': {
          // rotating double rune-circle with glyph ticks
          c.translate(p.x, p.y);
          c.globalAlpha = 0.13 + 0.04 * Math.sin(G.time * 8);
          c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.globalAlpha = 0.75; c.strokeStyle = p.color; c.lineWidth = 2;
          c.save(); c.rotate(G.time * 0.7);
          c.setLineDash([14, 9]);
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.stroke();
          c.restore();
          c.save(); c.rotate(-G.time * 0.45);
          c.setLineDash([4, 12]); c.lineWidth = 1.5; c.globalAlpha = 0.5;
          c.beginPath(); c.arc(0, 0, p.r * 0.78, 0, TAU); c.stroke();
          c.setLineDash([]);
          // glyph ticks on the inner ring
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            c.save(); c.rotate(a); c.translate(p.r * 0.78, 0);
            c.fillStyle = p.color; c.globalAlpha = 0.9;
            c.fillRect(-2, -5, 4, 10); c.fillRect(-5, -2, 10, 4);
            c.restore();
          }
          c.restore();
          c.setLineDash([]);
          break;
        }
        case 'whip': {
          // crescent slash with motion smear
          c.translate(p.x, p.y); c.rotate(p.angle);
          const ph = 1 - p.life / 0.18; // 0..1 over the swing
          c.globalAlpha = (1 - ph) * 0.9;
          const R = p.r * (0.7 + ph * 0.5);
          // smear ghosts
          for (let i = 2; i >= 0; i--) {
            c.globalAlpha = (1 - ph) * (0.25 + 0.25 * (2 - i));
            c.strokeStyle = i === 0 ? '#fff' : p.color;
            c.lineWidth = (3 - i) * 4;
            c.beginPath();
            c.arc(-R * 0.4, 0, R, -1.1 + ph * 0.5 - i * 0.12, 1.1 + ph * 0.5 - i * 0.12);
            c.stroke();
          }
          break;
        }
        case 'strike': {
          c.globalAlpha = p.life / 0.3;
          c.strokeStyle = '#fff'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(p.x + 10, p.y - 80); c.lineTo(p.x - 4, p.y - 20); c.lineTo(p.x + 6, p.y - 20); c.lineTo(p.x, p.y); c.stroke();
          c.strokeStyle = p.color; c.lineWidth = 1.5; c.stroke();
          // impact rune ring blooming outward on the ground
          const ph2 = 1 - p.life / 0.3;
          c.globalAlpha = (1 - ph2) * 0.9;
          c.strokeStyle = p.color; c.lineWidth = 3;
          c.beginPath(); c.ellipse(p.x, p.y, p.r * (0.4 + ph2), p.r * (0.4 + ph2) * 0.45, 0, 0, TAU); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 1;
          c.beginPath(); c.ellipse(p.x, p.y, p.r * (0.2 + ph2 * 0.8), p.r * (0.2 + ph2 * 0.8) * 0.45, 0, 0, TAU); c.stroke();
          c.fillStyle = p.color; c.globalAlpha *= 0.35;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
          break;
        }
        case 'mine': {
          c.fillStyle = p.color;
          const blink = Math.sin(G.time * 10) > 0 ? 1 : 0.5;
          c.globalAlpha = blink;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
          c.strokeStyle = '#fff'; c.globalAlpha = 0.3; c.stroke();
          break;
        }
        case 'blackhole': {
          c.globalAlpha = 0.7;
          const g = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
          g.addColorStop(0, '#000'); g.addColorStop(0.6, p.color); g.addColorStop(1, 'transparent');
          c.fillStyle = g;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
          break;
        }
        case 'wall': {
          c.translate(p.x, p.y); c.rotate(p.angle);
          c.globalAlpha = Math.min(1, p.life);
          c.fillStyle = p.color;
          c.fillRect(-p.size, -p.r / 2, p.size * 2, p.r);
          c.globalAlpha *= 0.5; c.fillStyle = '#fff';
          c.fillRect(-p.size, -1, p.size * 2, 2);
          break;
        }
        case 'bladering': {
          c.globalAlpha = 0.85;
          c.strokeStyle = p.color; c.lineWidth = 5;
          c.beginPath(); c.arc(p.x, p.y, Math.max(1, p._R || 1), 0, TAU); c.stroke();
          c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
          break;
        }
        case 'drone': case 'turret': {
          c.translate(p.x, p.y);
          if (p.kind === 'drone') c.rotate(p.t * 3);
          c.fillStyle = p.color;
          c.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
          c.fillStyle = '#fff';
          c.fillRect(-2, -2, 4, 4);
          break;
        }
        case 'orbit': {
          // a little hand-forged sword, edge-on to its orbit
          c.translate(p.x, p.y); c.rotate(p.t + Math.PI / 2); // blade leads the spin
          const r = p.r;
          c.shadowColor = p.color; c.shadowBlur = 12;
          // blade
          c.fillStyle = p.color;
          c.beginPath(); c.moveTo(r * 1.6, 0); c.lineTo(r * 0.2, r * 0.4); c.lineTo(-r * 0.5, r * 0.3); c.lineTo(-r * 0.5, -r * 0.3); c.lineTo(r * 0.2, -r * 0.4); c.fill();
          // edge highlight
          c.fillStyle = '#fff';
          c.beginPath(); c.moveTo(r * 1.6, 0); c.lineTo(r * 0.2, -r * 0.18); c.lineTo(-r * 0.4, -r * 0.12); c.lineTo(-r * 0.4, 0); c.fill();
          // crossguard + pommel
          c.shadowBlur = 0;
          c.fillStyle = '#3a2a1a';
          c.fillRect(-r * 0.6, -r * 0.55, r * 0.22, r * 1.1);
          c.fillRect(-r * 1.05, -r * 0.14, r * 0.5, r * 0.28);
          c.fillStyle = '#ffd23e';
          c.beginPath(); c.arc(-r * 1.1, 0, r * 0.18, 0, TAU); c.fill();
          break;
        }
        default: { // shot — shape depends on the weapon's element family
          c.translate(p.x, p.y);
          c.rotate(p.spin ? p.t * p.spin : Math.atan2(p.vy, p.vx));
          c.shadowColor = p.color; c.shadowBlur = 10;
          const fam = p.ownerW && p.ownerW.def.family;
          const col2 = p.ownerW && p.ownerW.def.color2; // fusions are two-tone
          const r = p.r;
          switch (fam) {
            case 'Fire': { // flickering fireball with tail
              c.fillStyle = p.color;
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
              c.fillStyle = col2 || '#ffd23e';
              c.beginPath(); c.arc(r * 0.25, 0, r * 0.55, 0, TAU); c.fill();
              c.fillStyle = '#fff';
              c.beginPath(); c.arc(r * 0.4, 0, r * 0.25, 0, TAU); c.fill();
              c.globalAlpha = 0.6; c.fillStyle = p.color;
              const fl = r * (1.4 + Math.random() * 0.8);
              c.beginPath(); c.moveTo(-r, -r * 0.5); c.lineTo(-fl - r, 0); c.lineTo(-r, r * 0.5); c.fill();
              break;
            }
            case 'Frost': { // crystal shard (diamond + facet line)
              c.fillStyle = p.color;
              c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(0, r * 0.7); c.lineTo(-r * 1.1, 0); c.lineTo(0, -r * 0.7); c.fill();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = 1.5;
              c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(-r * 1.1, 0); c.stroke();
              c.fillStyle = '#fff';
              c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 0.3, r * 0.3); c.lineTo(r * 0.3, -r * 0.3); c.fill();
              break;
            }
            case 'Volt': { // jagged lightning dart
              c.strokeStyle = p.color; c.lineWidth = r * 0.8; c.lineJoin = 'miter';
              c.beginPath();
              c.moveTo(r * 1.6, 0); c.lineTo(r * 0.4, -r * 0.6); c.lineTo(-r * 0.2, r * 0.6); c.lineTo(-r * 1.5, 0);
              c.stroke();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = r * 0.3; c.stroke();
              break;
            }
            case 'Void': { // dark core with bright event-horizon ring
              c.fillStyle = '#14081f';
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
              c.strokeStyle = p.color; c.lineWidth = 2.5;
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = 1;
              c.beginPath(); c.arc(0, 0, r * (0.5 + 0.3 * Math.sin(p.t * 12)), 0, TAU); c.stroke();
              break;
            }
            case 'Nature': { // spinning leaf / thorn
              c.rotate(p.t * 9);
              c.fillStyle = p.color;
              c.beginPath(); c.moveTo(r * 1.3, 0); c.quadraticCurveTo(0, r * 0.9, -r * 1.1, 0); c.quadraticCurveTo(0, -r * 0.9, r * 1.3, 0); c.fill();
              c.strokeStyle = col2 || '#bfffcc'; c.lineWidth = 1;
              c.beginPath(); c.moveTo(r * 1.1, 0); c.lineTo(-r * 0.9, 0); c.stroke();
              break;
            }
            case 'Steel': { // buzzing sawdisc with teeth
              c.rotate(p.t * 14);
              c.fillStyle = p.color;
              c.beginPath();
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * TAU;
                c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                c.lineTo(Math.cos(a + 0.4) * r * 0.8, Math.sin(a + 0.4) * r * 0.8);
              }
              c.fill();
              c.fillStyle = col2 || '#2a2a3a';
              c.beginPath(); c.arc(0, 0, r * 0.4, 0, TAU); c.fill();
              break;
            }
            case 'Arcane': { // twinkling 4-point star
              c.rotate(p.t * 5);
              c.fillStyle = p.color;
              c.beginPath();
              for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU;
                c.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
                c.lineTo(Math.cos(a + TAU / 8) * r * 0.45, Math.sin(a + TAU / 8) * r * 0.45);
              }
              c.fill();
              c.fillStyle = col2 || '#fff';
              c.beginPath(); c.arc(0, 0, r * 0.35, 0, TAU); c.fill();
              break;
            }
            default: { // fallback: energy bolt
              c.fillStyle = p.color;
              c.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
              c.fillStyle = '#fff';
              c.fillRect(r * 0.2, -r * 0.3, r * 0.7, r * 0.6);
            }
          }
          c.shadowBlur = 0;
        }
      }
      c.restore();
    }
    c.globalAlpha = 1;
  }

  return { A, updateProjectiles, drawProjectiles };
})();
