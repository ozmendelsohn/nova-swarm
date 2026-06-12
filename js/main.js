// ---- main.js : game loop, state machine, combat API, DOM wiring ----
// Ground/pickups/props live in world.js; weapon drawing in weapons/weaponfx.js.
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
  const qbuf = [], qbuf2 = [];
  const zaps = []; // lightning visuals

  function newGame() {
    WeaponManager.reset();
    Enemies.reset();
    Projectiles.clearAll();
    World.reset();
    zaps.length = 0;
    G = {
      state: 'play', time: 0, w: cv.width, h: cv.height,
      player: Player.create(Characters.selected), kills: 0, combo: 0, comboT: 0, coinsRun: 0,
      shakeAmt: 0, flashAmt: 0, freezeT: 0, levelUpQueue: 0,
      bossBanner: 0, bossName: '', bossTitle: '', won: false,
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

  // ---------- spatial queries ----------
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

  // ---------- combat ----------
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
    if (e.elite || e.boss) World.addStain(e); // spilled dye stains the cloth forever
    // the knot unravels: thread strands spill out (LORE.md), plus a dye puff
    const tcol = (e.boss || e.elite) ? '#ffd23e' : '#ff8c5c';
    Particles.burst(e.x, e.y, tcol, e.boss ? 50 : 8, { speed: e.boss ? 350 : 140 });
    for (let k = 0; k < (e.boss ? 26 : 7); k++) {
      Particles.spawn(e.x, e.y, k % 3 ? tcol : '#e8d8b0', { speed: e.boss ? 280 : 170, life: 0.7, size: 3, thread: true, drag: 0.9, grav: 70 });
    }
    Snd.play('kill');
    // drop xp gems
    const xp = e.xp;
    const n = Math.min(5, Math.ceil(xp / 8));
    for (let k = 0; k < n; k++) {
      World.gems.push({ x: e.x + Util.rand(-12, 12), y: e.y + Util.rand(-12, 12), v: Math.ceil(xp / n), t: 0 });
    }
    if (e.elite || e.boss) World.gems.push({ x: e.x, y: e.y, v: 0, heal: 25, t: 0 });
    // Weaver's Coins: elites a few, bosses a pile, NOVA PRIME a fortune
    let coinDrop = 0;
    if (e.elite) coinDrop = Util.rand(2, 5) | 0;
    if (e.boss) coinDrop = e.bdef.id === 'NOVA_PRIME' ? 60 : 12 + (Enemies.BOSSES.findIndex(b => b.id === e.bdef.id)) * 6;
    for (let k = 0; k < coinDrop; k++) {
      World.gems.push({ x: e.x + Util.rand(-40, 40), y: e.y + Util.rand(-40, 40), v: 0, coin: e.boss && e.bdef.id === 'NOVA_PRIME' ? 5 : Math.random() < 0.15 ? 5 : 1, t: 0 });
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

  function zap(x1, y1, x2, y2, color) {
    zaps.push({ x1, y1, x2, y2, color, life: 0.15 });
  }

  function announceBoss(name, title) {
    G.bossName = name; G.bossTitle = title || ''; G.bossBanner = 3.5;
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
      const [h, s] = World.dyeAt(mx, my);
      Particles.spawn(mx, my, `hsl(${h},${s + 25}%,62%)`, { speed: 12, life: 1.6, size: 2, grav: -22, drag: 0.995 });
    }
    // warp-thread blessing: the Weaver's strings still carry power
    const P = G.player;
    P.warpBlessed = World.onWarpThread(P.x, P.y);
    if (P.warpBlessed) {
      P.hp = Math.min(P.maxHp, P.hp + 1.2 * dt);
      if (Math.random() < 0.25) Particles.spawn(P.x + Util.rand(-12, 12), P.y + Util.rand(-12, 12), '#ffd23e', { speed: 18, life: 0.5, size: 2, grav: -50 });
    }

    Player.update(G, dt);
    rebuildGrid();
    WeaponManager.update(G, dt);
    Archetypes.updateProjectiles(G, dt);
    Enemies.update(G, dt);
    updateEnemyBullets(dt);
    World.updateProps(G, dt);
    World.updateGems(G, dt);
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

    World.drawGround(G, c);
    World.drawPickups(G, c);
    Enemies.draw(G, c);
    WeaponFX.drawProjectiles(G, c);

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
  console.log(`NOVA SWARM loaded: ${Object.keys(WEAPONS.defs).length} weapon forms (${FUSIONS.recipes.length} fusions)`);
  requestAnimationFrame(frame);

  return { get G() { return G; } };
})();
