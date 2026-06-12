// ---- particles.js : pooled particles + floating damage numbers ----
const Particles = (() => {
  const MAX = 1200;
  const pool = new Array(MAX);
  for (let i = 0; i < MAX; i++) pool[i] = { active: false };
  let cursor = 0;

  const texts = [];

  function spawn(x, y, color, opts = {}) {
    const p = pool[cursor]; cursor = (cursor + 1) % MAX;
    p.active = true; p.x = x; p.y = y;
    const sp = opts.speed ?? 120, a = opts.ang ?? Math.random() * Math.PI * 2;
    const v = sp * (0.4 + Math.random() * 0.6);
    p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
    p.life = p.maxLife = opts.life ?? 0.45;
    p.size = opts.size ?? 3; p.color = color;
    p.drag = opts.drag ?? 0.92; p.grav = opts.grav ?? 0;
    p.thread = opts.thread ?? false; // draws as a wiggling thread strand
  }

  function burst(x, y, color, n = 8, opts = {}) {
    for (let i = 0; i < n; i++) spawn(x, y, color, opts);
  }

  function text(x, y, str, color = '#fff', size = 13) {
    if (texts.length > 80) texts.shift();
    texts.push({ x, y, str, color, size, life: 0.8, vy: -55 });
  }

  function update(dt) {
    for (let i = 0; i < MAX; i++) {
      const p = pool[i]; if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.9;
      if (t.life <= 0) texts.splice(i, 1);
    }
  }

  function draw(c) {
    for (let i = 0; i < MAX; i++) {
      const p = pool[i]; if (!p.active) continue;
      const a = p.life / p.maxLife;
      c.globalAlpha = a;
      c.fillStyle = p.color;
      if (p.thread) { // unraveled thread: short strand along its motion, wiggling
        const ang = Math.atan2(p.vy, p.vx) + Math.sin(p.life * 30) * 0.5;
        const len = p.size * 3.2;
        c.save();
        c.translate(p.x, p.y); c.rotate(ang);
        c.fillRect(-len / 2, -1, len, 2);
        c.restore();
      } else {
        const s = p.size * (0.5 + a * 0.5);
        c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    c.globalAlpha = 1;
    c.textAlign = 'center';
    for (const t of texts) {
      c.globalAlpha = Math.min(1, t.life * 2);
      c.font = `bold ${t.size}px monospace`;
      c.fillStyle = '#000'; c.fillText(t.str, t.x + 1, t.y + 1);
      c.fillStyle = t.color; c.fillText(t.str, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  return { spawn, burst, text, update, draw };
})();
