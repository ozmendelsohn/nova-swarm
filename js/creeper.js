// ---- creeper.js : a spreading fluid tide (à la Creeper World) ----
// Emitters ooze "creeper" that flows across a sparse grid, pools in place, and rises.
// Standing in it wades you down and burns your HP; weapons & the weave evaporate it.
// Destroy an emitter (it's a stationary enemy) to cut off its source.
const Creeper = (() => {
  const CELL = 46, MAXD = 8;          // cell size px, max depth per cell
  let field = new Map();              // "cx,cy" -> depth
  let emitT = 0, dmgT = 0;
  const key = (cx, cy) => cx + ',' + cy;
  const cellX = x => Math.floor(x / CELL);

  function reset() { field = new Map(); emitT = 18; dmgT = 0; }

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
    // slow global evaporation so it can recede when sources die; cull tiny cells
    for (const [k, d] of field) {
      const nd = d * (1 - 0.02 * dt);
      if (nd <= 0.03) field.delete(k); else field.set(k, nd);
    }

    // player wades + takes damage in deep creeper (steady drain, deeper = deadlier)
    const here = depthAt(P.x, P.y);
    if (here > 0.4 && P.dashT <= 0) {
      G.chillT = Math.max(G.chillT, G.time + 0.15); // wade: slowed
      clear(P.x, P.y, 26, 0.5 * dt);                // you displace a little as you stand
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
    // spore-tower overlay on emitters
    for (const e of Enemies.list) {
      if (!e.emitter) continue;
      c.save(); c.translate(e.x, e.y);
      const pul = 1 + Math.sin(G.time * 4) * 0.12;
      c.fillStyle = '#3a1a5e'; c.fillRect(-12, -4, 24, 18);
      c.fillStyle = '#b05cff'; c.shadowColor = '#b05cff'; c.shadowBlur = 14;
      c.beginPath(); c.arc(0, -6, 8 * pul, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -6, 2.5, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  return { reset, update, draw, clear, depthAt };
})();
