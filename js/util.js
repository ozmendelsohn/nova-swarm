// ---- util.js : math, RNG, spatial hash ----
const Util = (() => {
  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

  // Spatial hash for enemies
  class Grid {
    constructor(cell = 96) { this.cell = cell; this.map = new Map(); }
    clear() { this.map.clear(); }
    key(x, y) { return ((x / this.cell) | 0) * 100000 + ((y / this.cell) | 0); }
    insert(e) {
      const k = this.key(e.x + 50000, e.y + 50000);
      let b = this.map.get(k); if (!b) { b = []; this.map.set(k, b); }
      b.push(e);
    }
    query(x, y, r, out) {
      out.length = 0;
      const c = this.cell, x0 = ((x - r + 50000) / c) | 0, x1 = ((x + r + 50000) / c) | 0;
      const y0 = ((y - r + 50000) / c) | 0, y1 = ((y + r + 50000) / c) | 0;
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        const b = this.map.get(gx * 100000 + gy);
        if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
      }
      return out;
    }
  }
  return { rand, pick, clamp, lerp, dist2, angTo, Grid };
})();
