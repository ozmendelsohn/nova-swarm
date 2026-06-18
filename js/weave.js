// ---- weave.js : Thread Weaving — encircle enemies with your movement trail ----
// The Weaver's signature move: as you move you lay a glowing thread. Close a loop
// around enemies and the weave snaps shut — everything inside is ensnared (frozen)
// and torn for damage, feeding your combo. Rewards bold, looping movement.
const Weave = (() => {
  let trail = [];     // {x,y} breadcrumb of recent player positions
  let bursts = [];    // {pts, life} fading snap visuals
  let cooldown = 0;

  const STEP_DIST = 10;   // min move (px) before a new breadcrumb is laid
  const MAX_POINTS = 80;  // trail length cap
  const CLOSE_R = 26;     // how near an old point counts as closing the loop
  const MIN_LOOP = 14;    // breadcrumbs back required — stops tight wiggles counting
  const MIN_AREA = 5500;  // px², ignore slivers
  const COOLDOWN = 0.5;   // s between weaves

  function reset() { trail = []; bursts = []; cooldown = 0; }

  function area(pts) { // shoelace
    let a = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) / 2;
  }

  function inside(pts, x, y) { // ray-cast point-in-polygon
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const pi = pts[i], pj = pts[j];
      if (((pi.y > y) !== (pj.y > y)) && (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y) + pi.x)) c = !c;
    }
    return c;
  }

  function update(G, dt) {
    if (cooldown > 0) cooldown -= dt;
    const p = G.player;
    const last = trail[trail.length - 1];
    if (last && Util.dist2(last.x, last.y, p.x, p.y) <= STEP_DIST * STEP_DIST) {
      decay(dt); return; // hasn't moved far enough to extend the thread
    }
    trail.push({ x: p.x, y: p.y });
    if (trail.length > MAX_POINTS) trail.shift();
    // closure: does the fresh head come back near an earlier breadcrumb?
    if (cooldown <= 0 && trail.length > MIN_LOOP) {
      for (let i = 0; i <= trail.length - 1 - MIN_LOOP; i++) {
        if (Util.dist2(trail[i].x, trail[i].y, p.x, p.y) < CLOSE_R * CLOSE_R) {
          const loop = trail.slice(i);
          if (area(loop) > MIN_AREA) snap(G, loop);
          break;
        }
      }
    }
    decay(dt);
  }

  function decay(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) { bursts[i].life -= dt; if (bursts[i].life <= 0) bursts.splice(i, 1); }
  }

  // dye-charged weaves: the dye field you close the loop over imbues the snap
  function dyeElement(x, y) {
    const h = World.dyeAt(x, y)[0];
    if (h < 40)  return { id: 'ember',   col: '#ff6b2e', label: 'EMBER WEAVE' };   // burn
    if (h < 90)  return { id: 'volt',    col: '#ffe93e', label: 'VOLT WEAVE' };    // +50% tear
    if (h < 160) return { id: 'verdant', col: '#5ce86b', label: 'VERDANT WEAVE' }; // poison
    if (h < 215) return { id: 'frost',   col: '#bfeaff', label: 'FROST WEAVE' };   // longer ensnare
    return { id: 'plain', col: '#ff5cd6', label: 'WEAVE' };
  }

  function snap(G, loop) {
    cooldown = COOLDOWN;
    let cx = 0, cy = 0;
    for (const pt of loop) { cx += pt.x; cy += pt.y; }
    cx /= loop.length; cy /= loop.length;
    const el = dyeElement(cx, cy);
    const dmg = (24 + G.player.lvl * 5) * (el.id === 'volt' ? 1.5 : 1) * Meta.fx.weave();
    let caught = 0;
    for (const e of Enemies.list) {
      if (e.hp <= 0 || !inside(loop, e.x, e.y)) continue;
      G.damageEnemy(e, e.boss ? dmg * 3 : dmg, { color: el.col });
      if (e.boss) continue; // bosses resist the cloth — heavy chip only
      e.freeze = Math.max(e.freeze || 0, el.id === 'frost' ? 1.6 : 0.8); // ensnared (frost: longer)
      if (el.id === 'ember') e.burn = Math.max(e.burn || 0, 3);
      if (el.id === 'verdant') e.poison = Math.max(e.poison || 0, 4);
      caught++;
    }
    bursts.push({ pts: loop, life: 0.45, col: el.col });
    // expanding shockwave ring sized to the loop, for snap impact
    let ringR = 0;
    for (const pt of loop) ringR = Math.max(ringR, Math.hypot(pt.x - cx, pt.y - cy));
    Particles.spawn(cx, cy, el.col, { ring: ringR + 12, life: 0.5, size: 3, speed: 0 });
    Particles.burst(cx, cy, el.col, Math.min(40, 10 + caught * 2), { speed: 220, life: 0.5 });
    if (typeof Creeper !== 'undefined') Creeper.clear(cx, cy, ringR + 20, 99); // the weave purges the creeper tide inside the loop
    if (caught > 0) {
      G.shake(Math.min(10, 3 + caught * 0.3));
      Snd.play('fusion');
      Particles.text(cx, cy - 10, caught >= 6 ? `${el.label} ×${caught}!` : el.label, '#ffe93e', caught >= 6 ? 18 : 14);
      G.combo += caught; G.comboT = 3; // the weave feeds the combo streak
    }
    trail = []; // the thread is spent
  }

  function draw(G, c) {
    // hint: which element your next weave will carry, under the player (only on charged fields)
    const el = dyeElement(G.player.x, G.player.y);
    if (el.id !== 'plain') {
      c.globalAlpha = 0.6; c.fillStyle = el.col;
      c.font = 'bold 10px monospace'; c.textAlign = 'center';
      c.fillText(el.label.replace(' WEAVE', ''), G.player.x, G.player.y + 34);
      c.globalAlpha = 1; c.textAlign = 'left';
    }
    if (trail.length > 1) { // the live thread
      c.strokeStyle = '#ff9cf0'; c.lineWidth = 2; c.globalAlpha = 0.45;
      c.beginPath(); c.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) c.lineTo(trail[i].x, trail[i].y);
      c.stroke(); c.globalAlpha = 1;
    }
    for (const b of bursts) { // the snap: a bright filled loop fading out
      const a = b.life / 0.45;
      c.globalAlpha = a * 0.5; c.fillStyle = b.col || '#ff5cd6';
      c.beginPath(); c.moveTo(b.pts[0].x, b.pts[0].y);
      for (let i = 1; i < b.pts.length; i++) c.lineTo(b.pts[i].x, b.pts[i].y);
      c.closePath(); c.fill();
      c.globalAlpha = a; c.strokeStyle = '#ffe93e'; c.lineWidth = 3; c.stroke();
      c.globalAlpha = 1;
    }
  }

  return { reset, update, draw };
})();
