// ---- creeper.js : a spreading fluid tide (à la Creeper World) ----
// Emitters ooze "creeper" that flows across a sparse grid, pools in place, and rises.
// Standing in it wades you down and burns your HP; weapons & the weave evaporate it.
// Destroy an emitter (it's a stationary enemy) to cut off its source.
const Creeper = (() => {
  const CELL = 46, MAXD = 8;          // cell size px, max depth per cell
  let field = new Map();              // "cx,cy" -> depth
  let emitT = 0, dmgT = 0, breedT = 0, strikeT = 0, totemT = 0, totemPulse = 0;
  let strikes = [];                   // telegraphed spore bombardments {x,y,r,t,maxT}
  let totems = [];                    // player purge beacons {x,y,t}
  const key = (cx, cy) => cx + ',' + cy;
  const cellX = x => Math.floor(x / CELL);

  function reset() { field = new Map(); emitT = 18; dmgT = 0; breedT = 4; strikeT = 12; strikes = []; totemT = 9; totemPulse = 0; totems = []; }
  function emitterCount() { return Enemies.list.filter(e => e.emitter).length; }
  function inTide(x, y) { return depthAt(x, y) > 0.4; }

  function depthAt(x, y) { return field.get(key(cellX(x), cellX(y))) || 0; }
  function add(x, y, amt) {
    const k = key(cellX(x), cellX(y));
    field.set(k, Math.min(MAXD, (field.get(k) || 0) + amt));
  }
  // evaporate creeper in a world-space radius (weapons, weave, dash)
  function clear(x, y, r, amt) {
    const c0 = cellX(x - r), c1 = cellX(x + r), r0 = cellX(y - r), r1 = cellX(y + r);
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
      const k = key(cx, cy), d = field.get(k);
      if (!d) continue;
      const nd = d - amt;
      if (nd <= 0.02) field.delete(k); else field.set(k, nd);
    }
  }

  function spawnEmitter(G) {
    const proto = Enemies.list.find(e => !e.boss && !e.emitter);
    if (!proto) return; // need a live type to base it on
    const e = Enemies.spawnAt(G, proto.type);
    e.emitter = true; e.spd = 0; e.dmg = 0; e.r = 22;
    e.hp = e.maxHp = 500 + G.time * 4;   // tanky structure; scales with run
    e.creeperRate = 9 + G.time / 70;     // oozes faster the longer the run goes
    Particles.text(e.x, e.y - 30, '⚠ CREEPER EMITTER ⚠', '#b05cff', 14);
  }

  function update(G, dt) {
    const P = G.player;
    // spawn emitters on a timer (cap a few at once; harder over time)
    emitT -= dt;
    const liveEmitters = Enemies.list.filter(e => e.emitter);
    if (emitT <= 0 && liveEmitters.length < 4) { emitT = Math.max(12, 26 - G.time / 60); spawnEmitter(G); }
    // emit from each emitter — floods its cell so a deep pool forms at the source
    for (const e of liveEmitters) add(e.x, e.y, e.creeperRate * dt);

    // diffuse + evaporate, but only cells near the camera (bounded cost)
    const margin = 3;
    const cx0 = cellX(P.x) - ((G.w / 2 / CELL) | 0) - margin, cx1 = cellX(P.x) + ((G.w / 2 / CELL) | 0) + margin;
    const cy0 = cellX(P.y) - ((G.h / 2 / CELL) | 0) - margin, cy1 = cellX(P.y) + ((G.h / 2 / CELL) | 0) + margin;
    const delta = new Map();
    const bump = (k, v) => delta.set(k, (delta.get(k) || 0) + v);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const k = key(cx, cy), d = field.get(k);
      if (!d) continue;
      const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx, ny] of nb) {
        const nk = key(nx, ny), nd = field.get(nk) || 0;
        if (d - nd > 0.1) { const flow = (d - nd) * 0.18; bump(k, -flow); bump(nk, flow); } // spread to lower neighbours
      }
    }
    for (const [k, v] of delta) {
      const nd = Math.min(MAXD, (field.get(k) || 0) + v);
      if (nd <= 0.02) field.delete(k); else field.set(k, nd);
    }
    // ambient surface bubbling from deep pools in view (life/atmosphere)
    if (Math.random() < 0.5) {
      const bx = P.x + Util.rand(-G.w / 2, G.w / 2), by = P.y + Util.rand(-G.h / 2, G.h / 2);
      if (depthAt(bx, by) > 1) Particles.spawn(bx, by, Math.random() < 0.5 ? '#b05cff' : '#8a4ad0', { speed: 14, life: 0.6, size: 2, grav: -30, drag: 0.96 });
    }
    // slow global evaporation so it can recede when sources die; cull tiny cells
    for (const [k, d] of field) {
      const nd = d * (1 - 0.02 * dt);
      if (nd <= 0.03) field.delete(k); else field.set(k, nd);
    }

    // SPORE STRIKES: emitters bombard near you — telegraphed circles that seed creeper + hurt
    strikeT -= dt;
    if (strikeT <= 0 && liveEmitters.length) {
      strikeT = Math.max(3.5, 9 - G.time / 90);
      const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 220;
      strikes.push({ x: P.x + Math.cos(ang) * dist, y: P.y + Math.sin(ang) * dist, r: 56 + Math.random() * 30, t: 1.3, maxT: 1.3 });
    }
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i]; s.t -= dt;
      if (s.t <= 0) { // IMPACT: splash creeper + damage anything caught
        const cells = (s.r / CELL) | 0;
        for (let cx = cellX(s.x - s.r); cx <= cellX(s.x + s.r); cx++) for (let cy = cellX(s.y - s.r); cy <= cellX(s.y + s.r); cy++) {
          if (Util.dist2(cx * CELL + CELL / 2, cy * CELL + CELL / 2, s.x, s.y) < s.r * s.r) add(cx * CELL, cy * CELL, 3);
        }
        Particles.burst(s.x, s.y, '#b05cff', 24, { speed: 240, life: 0.6 });
        if (Util.dist2(P.x, P.y, s.x, s.y) < (s.r + P.r) * (s.r + P.r) && P.dashT <= 0) { P.hurtT = 0; Player.hurt(G, 30 + G.time / 8); }
        strikes.splice(i, 1);
      }
    }

    // THE TIDE BREEDS: deep creeper near you occasionally spawns a creeper-spawn (escalation)
    breedT -= dt;
    if (breedT <= 0 && liveEmitters.length) {
      breedT = Math.max(1.5, 4 - G.time / 200);
      // find a deep cell near the player and hatch an enemy from it
      for (let tries = 0; tries < 6; tries++) {
        const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
        const sx = P.x + Math.cos(ang) * dist, sy = P.y + Math.sin(ang) * dist;
        if (depthAt(sx, sy) > 1.5) {
          const proto = Enemies.list.find(en => !en.boss && !en.emitter);
          if (proto) { const m = Enemies.spawnAt(G, proto.type); m.x = sx; m.y = sy; Particles.burst(sx, sy, '#b05cff', 8, { speed: 90, life: 0.4 }); }
          break;
        }
      }
    }

    // PURGE TOTEMS: auto-deployed beacons reclaim ground — evaporate creeper + pulse damage
    totemT -= dt;
    if (totemT <= 0) { totemT = 11; totems.push({ x: P.x, y: P.y, t: 8 }); Particles.text(P.x, P.y - 30, '✦ PURGE TOTEM ✦', '#3ae0ff', 13); }
    totemPulse -= dt; const pulse = totemPulse <= 0; if (pulse) totemPulse = 0.5;
    for (let i = totems.length - 1; i >= 0; i--) {
      const tm = totems[i]; tm.t -= dt;
      clear(tm.x, tm.y, 78, 3.5 * dt); // hold back the tide around the beacon
      if (pulse) for (const en of G.enemiesInRange(tm.x, tm.y, 85, [])) G.damageEnemy(en, 14 + G.player.lvl * 2, { color: '#3ae0ff' });
      if (tm.t <= 0) totems.splice(i, 1);
    }

    // player wades + takes damage in deep creeper (steady drain, deeper = deadlier)
    const here = depthAt(P.x, P.y);
    if (here > 0.4 && P.dashT <= 0) {
      G.chillT = Math.max(G.chillT, G.time + 0.15);        // wade: slowed
      clear(P.x, P.y, 26 + (G.combo > 25 ? 14 : 0), 0.5 * dt * (G.combo > 25 ? 2.2 : 1)); // a hot streak melts the tide back faster
      dmgT -= dt;
      if (dmgT <= 0) {
        dmgT = 0.3;
        const dd = Math.min(MAXD, here) * 3 * (P.guarding ? 0.5 : 1);
        if (P.hp - dd <= 0) { P.hurtT = 0; Player.hurt(G, 99999); } // lethal -> proper death / Last Stand path
        else { P.hp -= dd; G.hurtFlash = Math.min(1, (G.hurtFlash || 0) + 0.25); }
        Particles.spawn(P.x + Util.rand(-8, 8), P.y, '#b05cff', { speed: 40, life: 0.4, size: 3 });
        Particles.text(P.x, P.y - 22, '☣', '#c98aff', 12);
      }
    }
  }

  function draw(G, c) {
    const P = G.player, cx0 = cellX(P.x - G.w / 2) - 1, cx1 = cellX(P.x + G.w / 2) + 1;
    const cy0 = cellX(P.y - G.h / 2) - 1, cy1 = cellX(P.y + G.h / 2) + 1;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const d = field.get(key(cx, cy)); if (!d) continue;
      const a = Math.min(0.72, 0.18 + d * 0.12);
      const wob = Math.sin(G.time * 3 + cx * 1.3 + cy) * 1.5;
      c.fillStyle = `rgba(120,60,180,${a})`;
      c.fillRect(cx * CELL, cy * CELL + wob, CELL + 1, CELL + 1);
      if (d > 2) { c.fillStyle = `rgba(180,120,255,${a * 0.5})`; c.fillRect(cx * CELL + 6, cy * CELL + 6 + wob, CELL - 12, CELL - 12); } // brighter deep core
    }
    // purge totems: a cyan beacon with a protective clearing ring
    for (const tm of totems) {
      const a = Math.min(1, tm.t / 2);
      c.globalAlpha = 0.25 * a; c.fillStyle = '#3ae0ff';
      c.beginPath(); c.arc(tm.x, tm.y, 78, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 8); c.strokeStyle = '#3ae0ff'; c.lineWidth = 2;
      c.beginPath(); c.arc(tm.x, tm.y, 78, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1; c.fillStyle = '#cdfaff'; c.shadowColor = '#3ae0ff'; c.shadowBlur = 12;
      c.fillRect(tm.x - 3, tm.y - 12, 6, 16); c.beginPath(); c.arc(tm.x, tm.y - 14, 4, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }
    // spore-strike telegraphs: a warning ring that fills as impact nears
    for (const s of strikes) {
      const k = 1 - s.t / s.maxT;
      c.globalAlpha = 0.5 + 0.3 * Math.sin(G.time * 16);
      c.strokeStyle = '#ff5cd6'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 0.18; c.fillStyle = '#b05cff'; c.beginPath(); c.arc(s.x, s.y, s.r * k, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    // spore-tower overlay on emitters
    for (const e of Enemies.list) {
      if (!e.emitter) continue;
      c.save(); c.translate(e.x, e.y);
      const pul = 1 + Math.sin(G.time * 4) * 0.12;
      c.fillStyle = '#3a1a5e'; c.fillRect(-12, -4, 24, 18);
      c.fillStyle = '#b05cff'; c.shadowColor = '#b05cff'; c.shadowBlur = 14;
      c.beginPath(); c.arc(0, -6, 8 * pul, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -6, 2.5, 0, Math.PI * 2); c.fill();
      // emitter HP bar so you can gauge progress destroying it
      c.fillStyle = '#000a'; c.fillRect(-14, -20, 28, 4);
      c.fillStyle = '#b05cff'; c.fillRect(-14, -20, 28 * Math.max(0, e.hp / e.maxHp), 4);
      c.restore();
    }
  }

  return { reset, update, draw, clear, depthAt, emitterCount, inTide };
})();
