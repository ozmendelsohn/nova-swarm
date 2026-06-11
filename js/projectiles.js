// ---- projectiles.js : pooled player projectiles + enemy bullets ----
// Player projectiles carry behavior flags so archetypes can compose them.
const Projectiles = (() => {
  const MAX = 900;
  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ active: false });
  let cursor = 0;

  const EMAX = 600; // enemy bullets
  const epool = [];
  for (let i = 0; i < EMAX; i++) epool.push({ active: false });
  let ecursor = 0;

  function fire(opts) {
    const p = pool[cursor]; cursor = (cursor + 1) % MAX;
    Object.assign(p, {
      active: true, x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 10, life: 2,
      pierce: 0, color: '#fff', kind: 'shot', t: 0,
      homing: 0, boomerang: false, ricochet: 0, chain: 0, spin: 0,
      orbitR: 0, orbitSpd: 0, ownerW: null, effects: null, hitSet: null,
      retT: 0, srcX: 0, srcY: 0, trail: null, size: 1, knock: 0, explode: 0,
      vacuum: 0, angle: 0,
    }, opts);
    p.srcX = p.x; p.srcY = p.y;
    p.hitSet = p.hitSet || new Set();
    return p;
  }

  function efire(opts) {
    const p = epool[ecursor]; ecursor = (ecursor + 1) % EMAX;
    Object.assign(p, { active: true, x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 8, life: 6, color: '#ff5c8a' }, opts);
    return p;
  }

  function clearAll() {
    for (const p of pool) p.active = false;
    for (const p of epool) p.active = false;
  }

  return { pool, epool, fire, efire, clearAll, MAX, EMAX };
})();
