// ---- main.js : game loop + state machine + world ----
const Game = (() => {
  const cv = document.getElementById('game');
  const c = cv.getContext('2d');
  let G; // game state object

  function resize() {
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    if (G) { G.w = cv.width; G.h = cv.height; }
  }
  window.addEventListener('resize', resize);

  const grid = new Util.Grid(96);
  const qbuf = [];
  const zaps = []; // lightning visuals
  const gems = [];
  const props = []; // breakable dye-spools on the tapestry
  let propT = 0;

  // dye-field geography (shared by terrain render + ambient effects)
  const PROV = 64 * 7; // province = 7x7 tiles of one dye
  const DYES = [ // [hue, sat] for the seven dyes
    [16, 60], [203, 58], [50, 55], [275, 56], [130, 52], [228, 22], [315, 56],
  ];
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ (x * 1274126177); h = (h ^ (h >> 13)) * 1103515245; return ((h ^ (h >> 16)) >>> 0); };
  const dyeOf = (px, py) => hash(Math.floor(px / PROV), Math.floor(py / PROV)) % 7;

  function newGame() {
    WeaponManager.reset();
    Enemies.reset();
    Projectiles.clearAll();
    gems.length = 0; zaps.length = 0; props.length = 0; propT = 4;
    G = {
      state: 'play', time: 0, w: cv.width, h: cv.height,
      player: Player.create(Characters.selected), kills: 0, combo: 0, comboT: 0, coinsRun: 0,
      shakeAmt: 0, flashAmt: 0, freezeT: 0, levelUpQueue: 0,
      bossBanner: 0, bossName: '', won: false,
      // API used by weapons/enemies:
      nearestEnemy, enemiesInRange, damageEnemy, killEnemy, explodeAt, zap,
      queueLevelUp: () => { G.levelUpQueue++; },
      shake: a => { G.shakeAmt = Math.max(G.shakeAmt, a); },
      announceBoss, onFusion, gameOver,
    };
    WeaponManager.addWeapon(Characters.selected.start);
    if (Meta.fx.arsenal()) { // Second Talisman upgrade
      const others = WEAPONS.baseIds.filter(id => id !== Characters.selected.start);
      WeaponManager.addWeapon(Util.pick(others));
    }
    UI.showScreen(null);
  }

  // ---------- world API ----------
  function rebuildGrid() {
    grid.clear();
    for (const e of Enemies.list) grid.insert(e);
  }
  function nearestEnemy(x, y, range, exclude) {
    let best = null, bd = range * range;
    grid.query(x, y, range, qbuf);
    for (const e of qbuf) {
      if (exclude && exclude.has(e)) continue;
      const d = Util.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function enemiesInRange(x, y, r, out) {
    grid.query(x, y, r, out);
    for (let i = out.length - 1; i >= 0; i--) {
      if (Util.dist2(x, y, out[i].x, out[i].y) > r * r) out.splice(i, 1);
    }
    return out;
  }

  function damageEnemy(e, dmg, opts = {}) {
    if (e.hp <= 0) return;
    let d = dmg;
    let crit = false;
    const luck = 0.08 * (WeaponManager.passives.luck || 0) + G.player.mods.crit;
    const fx = opts.effects || [];
    if (fx.includes('crit') && Math.random() < 0.25 + luck) { d *= 2.2; crit = true; }
    else if (Math.random() < luck) { d *= 2; crit = true; }
    e.hp -= d;
    e.flash = 0.08;
    if (Math.random() < 0.4 || crit) Particles.text(e.x + Util.rand(-8, 8), e.y - e.r, Math.round(d), crit ? '#ffe93e' : '#fff', crit ? 16 : 12);
    Particles.burst(e.x, e.y, opts.color || '#fff', 3, { speed: 80, life: 0.3 });
    Snd.play('hit');
    // on-hit effects
    for (const f of fx) {
      switch (f) {
        case 'burn': if (Math.random() < 0.5) e.burn = 2; break;
        case 'poison': if (Math.random() < 0.5) e.poison = 3; break;
        case 'freeze': if (Math.random() < 0.18 && !e.boss) e.freeze = 0.8; break;
        case 'slow': e.slow = 1.5; break;
        case 'shock': if (Math.random() < 0.3) {
          const ne = nearestEnemy(e.x, e.y, 180, new Set([e]));
          if (ne && ne.hp > 0) {
            ne.hp -= d * 0.5; ne.flash = 0.08; zap(e.x, e.y, ne.x, ne.y, '#ffe93e');
            if (ne.hp <= 0) killEnemy(ne);
          }
          break;
        }
        case 'knock': if (!e.boss) {
          const a = Util.angTo(G.player.x, G.player.y, e.x, e.y);
          e.x += Math.cos(a) * 26; e.y += Math.sin(a) * 26;
          break;
        }
        case 'vacuum': if (!e.boss && Math.random() < 0.3) {
          const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
          e.x += Math.cos(a) * 30; e.y += Math.sin(a) * 30;
          break;
        }
        case 'lifesteal': if (Math.random() < 0.2) G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1); break;
        default: break;
        case 'explode': if (opts.from && !opts.from._chainExp && Math.random() < 0.4) explodeAt(e.x, e.y, 55, d * 0.5, { color: opts.color, _chainExp: true, ownerW: opts.w }); break;
      }
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e, idx) {
    const i = idx !== undefined ? idx : Enemies.list.indexOf(e);
    if (i < 0) return;
    Enemies.list.splice(i, 1);
    G.kills++; G.combo++; G.comboT = 2.5;
    // the knot unravels: thread strands spill out (LORE.md), plus a dye puff
    const tcol = e.boss ? '#ffd23e' : (e.elite ? '#ffd23e' : '#ff8c5c');
    Particles.burst(e.x, e.y, tcol, e.boss ? 50 : 8, { speed: e.boss ? 350 : 140 });
    for (let k = 0; k < (e.boss ? 26 : 7); k++) {
      Particles.spawn(e.x, e.y, k % 3 ? tcol : '#e8d8b0', { speed: e.boss ? 280 : 170, life: 0.7, size: 3, thread: true, drag: 0.9, grav: 70 });
    }
    Snd.play('kill');
    // drop xp gems
    let xp = e.xp;
    const n = Math.min(5, Math.ceil(xp / 8));
    for (let k = 0; k < n; k++) {
      gems.push({ x: e.x + Util.rand(-12, 12), y: e.y + Util.rand(-12, 12), v: Math.ceil(xp / n), t: 0 });
    }
    if (e.elite || e.boss) gems.push({ x: e.x, y: e.y, v: 0, heal: 25, t: 0 });
    // Weaver's Coins: elites a few, bosses a pile, NOVA PRIME a fortune
    let coinDrop = 0;
    if (e.elite) coinDrop = Util.rand(2, 5) | 0;
    if (e.boss) coinDrop = e.bdef.id === 'NOVA_PRIME' ? 60 : 12 + (Enemies.BOSSES.findIndex(b => b.id === e.bdef.id)) * 6;
    for (let k = 0; k < coinDrop; k++) {
      gems.push({ x: e.x + Util.rand(-40, 40), y: e.y + Util.rand(-40, 40), v: 0, coin: e.boss && e.bdef.id === 'NOVA_PRIME' ? 5 : Math.random() < 0.15 ? 5 : 1, t: 0 });
    }
    if (e.boss) {
      G.freezeT = 0.35; G.shakeAmt = 18; G.flashAmt = 0.8;
      Snd.play('bosskill');
      if (e.bdef.id === 'NOVA_PRIME') { G.won = true; gameOver(); }
    }
  }

  function explodeAt(x, y, r, dmg, src = {}) {
    Particles.burst(x, y, src.color || '#ff8c42', 18, { speed: 220, life: 0.4 });
    G.shakeAmt = Math.max(G.shakeAmt, 4);
    Snd.play('explode');
    enemiesInRange(x, y, r, qbuf2);
    for (const e of qbuf2.slice()) {
      damageEnemy(e, dmg, { color: src.color, from: { _chainExp: true }, w: src.ownerW });
    }
  }
  const qbuf2 = [];

  function zap(x1, y1, x2, y2, color) {
    zaps.push({ x1, y1, x2, y2, color, life: 0.15 });
  }

  function announceBoss(name) {
    G.bossName = name; G.bossBanner = 3;
    G.shakeAmt = 10;
    Snd.play('boss');
  }

  function onFusion(rec) {
    G.flashAmt = 1; G.freezeT = 0.5; G.shakeAmt = 14;
    Snd.play('fusion');
    Particles.burst(G.player.x, G.player.y, rec.color, 40, { speed: 320 });
    Particles.burst(G.player.x, G.player.y, rec.color2, 40, { speed: 260 });
    Particles.text(G.player.x, G.player.y - 40, '★ FUSION ★', '#ffe93e', 22);
  }

  function gameOver() {
    if (G.state === 'over') return;
    G.state = 'over';
    setTimeout(() => UI.showGameOver(G, G.won), 800);
  }

  // ---------- breakable dye-spools ----------
  function updateProps(dt) {
    const P = G.player;
    propT -= dt;
    if (propT <= 0 && props.length < 5) {
      propT = 16;
      const a = Math.random() * Math.PI * 2, d = Util.rand(350, 600);
      const kind = Util.pick(['spool', 'spool', 'urn', 'cocoon']); // spools commonest
      props.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, hp: kind === 'cocoon' ? 45 : 30, wob: 0, kind });
    }
    for (let i = props.length - 1; i >= 0; i--) {
      const pr = props[i];
      pr.wob = Math.max(0, pr.wob - dt * 4);
      if (Util.dist2(pr.x, pr.y, P.x, P.y) > 1600 * 1600) { props.splice(i, 1); continue; } // left behind
      // any player projectile cracks it
      for (const p of Projectiles.pool) {
        if (!p.active || p.kind === 'aura' || p.kind === 'totem') continue;
        if (Util.dist2(pr.x, pr.y, p.x, p.y) < 26 * 26) {
          pr.hp -= 12; pr.wob = 1;
          Particles.burst(pr.x, pr.y, '#d65cb1', 5, { speed: 110, life: 0.3 });
          Snd.play('hit');
          break;
        }
      }
      if (pr.hp <= 0) {
        props.splice(i, 1);
        Particles.burst(pr.x, pr.y, '#d65cb1', 18, { speed: 200 });
        Particles.burst(pr.x, pr.y, '#e8d8b0', 10, { speed: 150 });
        Snd.play('kill');
        if (pr.kind === 'urn') { // dye urn: always coins
          for (let k = 0; k < 5; k++) gems.push({ x: pr.x + Util.rand(-22, 22), y: pr.y + Util.rand(-22, 22), v: 0, coin: 1, t: 0 });
        } else if (pr.kind === 'cocoon') { // knot cocoon: a burst of dye-gems (XP)
          for (let k = 0; k < 9; k++) gems.push({ x: pr.x + Util.rand(-26, 26), y: pr.y + Util.rand(-26, 26), v: 3, t: 0 });
        } else { // spool: health chest, magnet charm, or a few coins
          const roll = Math.random();
          if (roll < 0.45) gems.push({ x: pr.x, y: pr.y, v: 0, heal: 30, t: 0 });
          else if (roll < 0.75) gems.push({ x: pr.x, y: pr.y, v: 0, magnet: true, t: 0 });
          else for (let k = 0; k < 3; k++) gems.push({ x: pr.x + Util.rand(-20, 20), y: pr.y + Util.rand(-20, 20), v: 0, coin: 1, t: 0 });
        }
      }
    }
  }

  // ---------- pickups ----------
  function updateGems(dt) {
    const P = G.player;
    const range = 70 * (1 + 0.3 * (WeaponManager.passives.magnet || 0)) * Meta.fx.magnet();
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i]; g.t += dt;
      if (Math.random() < 0.008) Particles.spawn(g.x, g.y - 4, g.heal ? '#ffd23e' : '#fff', { speed: 15, life: 0.4, size: 2 });
      const d2 = Util.dist2(g.x, g.y, P.x, P.y);
      if (d2 < range * range || g.pull) {
        g.pull = true;
        const a = Util.angTo(g.x, g.y, P.x, P.y);
        const sp = Math.min(1400, 320 + g.t * 600);
        const step = Math.min(sp * dt, Math.sqrt(d2)); // never overshoot the player
        g.x += Math.cos(a) * step; g.y += Math.sin(a) * step;
      }
      if (d2 < 26 * 26) {
        gems.splice(i, 1);
        if (g.heal) { P.hp = Math.min(P.maxHp, P.hp + g.heal); Particles.text(P.x, P.y - 20, '+' + g.heal, '#5cffb0'); }
        else if (g.coin) {
          const gained = Math.round(g.coin * Meta.fx.greed());
          G.coinsRun += gained;
          Meta.addCoins(gained);
          Particles.text(g.x, g.y - 14, `+${gained}⛀`, '#ffd23e', 13);
        }
        else if (g.magnet) { // every gem on the field rushes to you
          for (const o of gems) o.pull = true;
          Particles.text(P.x, P.y - 24, 'MAGNETIZED!', '#3ae0ff', 16);
          Particles.burst(P.x, P.y, '#3ae0ff', 24, { speed: 280 });
          Snd.play('levelup');
        }
        else Player.gainXp(G, g.v);
        Snd.play('gem');
      }
    }
  }

  // ---------- enemy bullets vs player ----------
  function updateEnemyBullets(dt) {
    const P = G.player;
    for (const b of Projectiles.epool) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) { b.active = false; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Util.dist2(b.x, b.y, P.x, P.y) < (b.r + P.r) * (b.r + P.r)) {
        b.active = false;
        Player.hurt(G, b.dmg);
      }
    }
  }

  // ---------- main loop ----------
  let last = 0, acc = 0;
  const STEP = 1 / 60;

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    if (!G || G.state === 'menu') return;
    if (G.state === 'play') {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps++ < 4) { acc -= STEP; tick(STEP); }
    }
    render();
  }

  function tick(dt) {
    if (G.freezeT > 0) { G.freezeT -= dt; return; } // hit-stop
    G.time += dt;
    G.bossBanner -= dt;
    G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
    G.shakeAmt *= 0.88; G.flashAmt *= 0.92;

    G.totem = null; // re-claimed each tick by an active totem projectile
    // ambient dye-motes: loose pigment drifting up from the local province
    if (Math.random() < 0.12) {
      const mx = G.player.x + Util.rand(-G.w / 2, G.w / 2), my = G.player.y + Util.rand(-G.h / 2, G.h / 2);
      const [h, s] = DYES[dyeOf(mx, my)];
      Particles.spawn(mx, my, `hsl(${h},${s + 25}%,62%)`, { speed: 12, life: 1.6, size: 2, grav: -22, drag: 0.995 });
    }
    Player.update(G, dt);
    rebuildGrid();
    WeaponManager.update(G, dt);
    Archetypes.updateProjectiles(G, dt);
    Enemies.update(G, dt);
    updateEnemyBullets(dt);
    updateProps(dt);
    updateGems(dt);
    Particles.update(dt);
    for (let i = zaps.length - 1; i >= 0; i--) { zaps[i].life -= dt; if (zaps[i].life <= 0) zaps.splice(i, 1); }

    if (G.levelUpQueue > 0 && G.state === 'play') {
      G.levelUpQueue--;
      G.state = 'levelup';
      Snd.play('levelup');
      Particles.burst(G.player.x, G.player.y, '#5cffb0', 24, { speed: 200 });
      UI.showLevelUp(G, WeaponManager.rollCards(G), card => {
        WeaponManager.applyCard(G, card);
        G.state = 'play';
      });
    }
  }

  function render() {
    const P = G.player;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#2a1a4a';
    c.fillRect(0, 0, G.w, G.h);
    // camera + shake
    const sx = Util.rand(-G.shakeAmt, G.shakeAmt), sy = Util.rand(-G.shakeAmt, G.shakeAmt);
    c.translate(G.w / 2 - P.x + sx, G.h / 2 - P.y + sy);

    // ---- the Loomworld tapestry (LORE.md "map rules") ----
    // quilt of dye-field provinces, stitched seams, golden warp-threads,
    // embroidered sigils. Cloth breathes slowly but stays dimmer than actors.
    const gs = 64;
    const breathe = Math.sin(G.time * 0.4) * 1.5;
    const x0 = Math.floor((P.x - G.w / 2) / gs) * gs - gs, y0 = Math.floor((P.y - G.h / 2) / gs) * gs - gs;
    const x1 = P.x + G.w / 2 + gs, y1 = P.y + G.h / 2 + gs;
    for (let x = x0; x < x1; x += gs) {
      for (let y = y0; y < y1; y += gs) {
        const dye = dyeOf(x, y);
        const [hue, sat] = DYES[dye];
        const h2 = hash(x, y) % 13;
        const check = ((x / gs + y / gs) & 1) ? 4 : 0;
        const lit = 25 + check + (h2 < 2 ? 4 : 0) + breathe; // L budget 22-34
        c.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
        c.fillRect(x, y, gs, gs);
        // cloth weave: two weft lines per tile
        c.fillStyle = `hsla(${hue},${sat + 10}%,${lit + 8}%,0.45)`;
        c.fillRect(x, y + gs * 0.3, gs, 2);
        c.fillStyle = `hsla(${hue},${sat + 10}%,${lit - 6}%,0.45)`;
        c.fillRect(x, y + gs * 0.72, gs, 2);
        // stitched seams where two dye-fields meet (dashed thread)
        const seamCol = `hsla(${hue},40%,72%,0.5)`;
        if (dyeOf(x + gs, y) !== dye) {
          c.fillStyle = seamCol;
          for (let k = 6; k < gs; k += 16) c.fillRect(x + gs - 2, y + k, 2, 8);
        }
        if (dyeOf(x, y + gs) !== dye) {
          c.fillStyle = seamCol;
          for (let k = 6; k < gs; k += 16) c.fillRect(x + k, y + gs - 2, 8, 2);
        }
        // embroidered sigil of this dye (sparse, glinting)
        if (h2 === 5) {
          const sx2 = x + 14 + hash(x, y + 1) % (gs - 30), sy2 = y + 14 + hash(x + 1, y) % (gs - 30);
          const glint = 0.55 + 0.3 * Math.sin(G.time * 2 + (x + y) * 0.01);
          c.globalAlpha = glint;
          c.fillStyle = `hsl(${hue},80%,64%)`;
          switch (dye) {
            case 0: // Ember: flame knot
              c.fillRect(sx2 + 3, sy2, 3, 3); c.fillRect(sx2, sy2 + 3, 9, 3); c.fillRect(sx2 + 3, sy2 + 6, 3, 3); break;
            case 1: // Frost: six-point star stitch
              c.fillRect(sx2 + 3, sy2 - 2, 3, 13); c.fillRect(sx2 - 2, sy2 + 3, 13, 3); c.fillRect(sx2, sy2, 3, 3); c.fillRect(sx2 + 6, sy2 + 6, 3, 3); break;
            case 2: // Volt: zigzag stitch
              c.fillRect(sx2, sy2, 4, 3); c.fillRect(sx2 + 3, sy2 + 3, 4, 3); c.fillRect(sx2, sy2 + 6, 4, 3); break;
            case 3: // Void: hollow eye
              c.fillRect(sx2, sy2, 9, 2); c.fillRect(sx2, sy2 + 7, 9, 2); c.fillRect(sx2, sy2, 2, 9); c.fillRect(sx2 + 7, sy2, 2, 9); break;
            case 4: // Verdant: leaf-work
              c.fillRect(sx2 + 3, sy2, 3, 9); c.fillRect(sx2, sy2 + 2, 3, 3); c.fillRect(sx2 + 6, sy2 + 4, 3, 3); break;
            case 5: // Adamant: rivet cross-stitch
              c.fillRect(sx2, sy2, 3, 3); c.fillRect(sx2 + 6, sy2, 3, 3); c.fillRect(sx2 + 3, sy2 + 3, 3, 3); c.fillRect(sx2, sy2 + 6, 3, 3); c.fillRect(sx2 + 6, sy2 + 6, 3, 3); break;
            case 6: // Arcane: spiral stitch
              c.fillRect(sx2, sy2, 9, 2); c.fillRect(sx2 + 7, sy2, 2, 9); c.fillRect(sx2 + 2, sy2 + 7, 7, 2); c.fillRect(sx2 + 2, sy2 + 3, 2, 5); c.fillRect(sx2 + 4, sy2 + 3, 3, 2); break;
          }
          c.globalAlpha = 1;
        }
      }
    }
    // the Weaver's golden warp-threads, every 9 provinces (sacred gold)
    const WARP = PROV * 3;
    c.strokeStyle = '#ffd23e'; c.lineWidth = 2;
    for (let wxL = Math.floor(x0 / WARP) * WARP; wxL < x1; wxL += WARP) {
      c.globalAlpha = 0.18 + 0.07 * Math.sin(G.time * 1.3 + wxL);
      c.beginPath(); c.moveTo(wxL, y0); c.lineTo(wxL, y1); c.stroke();
      c.globalAlpha = 0.5;
      for (let k = y0 - (y0 % 48); k < y1; k += 48) c.fillStyle = '#ffd23e', c.fillRect(wxL - 1, k, 2, 6);
    }
    for (let wyL = Math.floor(y0 / WARP) * WARP; wyL < y1; wyL += WARP) {
      c.globalAlpha = 0.18 + 0.07 * Math.sin(G.time * 1.3 + wyL);
      c.beginPath(); c.moveTo(x0, wyL); c.lineTo(x1, wyL); c.stroke();
    }
    c.globalAlpha = 1;
    // drifting nebula orbs (parallax glow)
    for (let i = 0; i < 7; i++) {
      const nx = P.x * 0.55 + Math.sin(i * 2.4 + G.time * 0.08) * 700 + i * 530;
      const ny = P.y * 0.55 + Math.cos(i * 3.1 + G.time * 0.06) * 500 - i * 410;
      const g = c.createRadialGradient(nx, ny, 0, nx, ny, 190);
      const nh = (i * 51 + G.time * 6) % 360;
      g.addColorStop(0, `hsla(${nh},90%,65%,0.16)`);
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.fillRect(nx - 190, ny - 190, 380, 380);
    }

    // breakable props (spools, urns, cocoons)
    for (const pr of props) {
      const prSpr = Sprites.get(pr.kind || 'spool')[0];
      c.fillStyle = 'rgba(20,8,40,0.35)';
      c.beginPath(); c.ellipse(pr.x, pr.y + 16, 16, 6, 0, 0, Math.PI * 2); c.fill();
      c.save();
      c.translate(pr.x, pr.y);
      if (pr.kind === 'cocoon') c.rotate(Math.sin(G.time * 2.5) * 0.06); // it's alive...
      if (pr.wob > 0) c.rotate(Math.sin(G.time * 35) * 0.12 * pr.wob);
      c.drawImage(prSpr, -prSpr.width / 2, -prSpr.height / 2);
      c.restore();
    }
    // gems
    const gemSpr = Sprites.get('gem')[0], chestSpr = Sprites.get('chest')[0], magSpr = Sprites.get('magnet')[0];
    for (const g of gems) {
      const bob = Math.sin(G.time * 5 + g.x) * 3;
      const spr = g.heal ? chestSpr : g.magnet ? magSpr : g.coin ? Sprites.get('coin')[0] : gemSpr;
      if (g.magnet) { c.shadowColor = '#3ae0ff'; c.shadowBlur = 12; }
      if (g.coin) { c.shadowColor = '#ffd23e'; c.shadowBlur = 8; }
      c.drawImage(spr, g.x - spr.width / 2, g.y - spr.height / 2 + bob);
      c.shadowBlur = 0;
    }

    Enemies.draw(G, c);
    Archetypes.drawProjectiles(G, c);

    // enemy bullets
    for (const b of Projectiles.epool) {
      if (!b.active) continue;
      c.fillStyle = b.color;
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(b.x, b.y, b.r * 0.4, 0, Math.PI * 2); c.fill();
    }

    // zaps
    for (const z of zaps) {
      c.globalAlpha = z.life / 0.15;
      c.strokeStyle = z.color; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(z.x1, z.y1);
      const mx = (z.x1 + z.x2) / 2 + Util.rand(-14, 14), my = (z.y1 + z.y2) / 2 + Util.rand(-14, 14);
      c.lineTo(mx, my); c.lineTo(z.x2, z.y2); c.stroke();
      c.globalAlpha = 1;
    }

    Particles.draw(c);
    Player.draw(G, c);

    // screen-space
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (G.flashAmt > 0.02) {
      c.fillStyle = `rgba(255,255,255,${G.flashAmt * 0.5})`;
      c.fillRect(0, 0, G.w, G.h);
    }
    // vignette
    const vg = c.createRadialGradient(G.w / 2, G.h / 2, G.h * 0.45, G.w / 2, G.h / 2, G.h * 0.85);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(26,8,46,0.5)');
    c.fillStyle = vg; c.fillRect(0, 0, G.w, G.h);

    UI.drawHUD(G, c);
  }

  // ---------- wiring ----------
  // character select cards
  (() => {
    const box = document.getElementById('charsel');
    box.innerHTML = Characters.CHARS.map((ch, i) => `
      <div class="char-card ${i === 0 ? 'sel' : ''}" data-i="${i}">
        <img src="${Characters.sprite(ch).toDataURL()}" alt="${ch.name}">
        <div class="char-name" style="color:${ch.pal.a}">${ch.name}</div>
        <div class="char-blurb">${ch.blurb}</div>
        <div class="char-perks">${ch.perks.map(p => `<span title="${p.desc}">L${p.lvl} ${p.name}</span>`).join('')}</div>
      </div>`).join('');
    box.addEventListener('click', ev => {
      const card = ev.target.closest('.char-card');
      if (!card) return;
      box.querySelectorAll('.char-card').forEach(el => el.classList.remove('sel'));
      card.classList.add('sel');
      Characters.select(Characters.CHARS[+card.dataset.i]);
    });
  })();

  document.getElementById('btn-start').addEventListener('click', () => {
    Snd.init(); Snd.startMusic();
    newGame();
  });
  document.getElementById('btn-codex').addEventListener('click', () => UI.showCodex());
  document.getElementById('btn-shop').addEventListener('click', () => { Meta.renderShop(); UI.showScreen('shop'); });
  document.getElementById('btn-shop-back').addEventListener('click', () => UI.showScreen('menu'));
  document.getElementById('btn-codex-back').addEventListener('click', () => UI.showScreen('menu'));
  document.getElementById('btn-retry').addEventListener('click', () => newGame());
  document.getElementById('btn-menu').addEventListener('click', () => { G.state = 'menu'; UI.showScreen('menu'); });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyM') Snd.toggleMute();
    if (e.code === 'KeyP' && G && (G.state === 'play' || G.state === 'pause')) {
      G.state = G.state === 'play' ? 'pause' : 'play';
    }
  });

  resize();
  UI.showScreen('menu');
  // sanity: weapon count
  console.log(`NOVA SWARM loaded: ${Object.keys(WEAPONS.defs).length} weapon forms (${FUSIONS.recipes.length} fusions)`);
  requestAnimationFrame(frame);

  return { get G() { return G; } };
})();
