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
    if (e.phased) { // a wraith between the threads cannot be touched
      Particles.text(e.x, e.y - e.r, 'whiff', '#8a9ab8', 10);
      return;
    }
    if (e.wardT > G.time) dmg *= 0.5; // skullmage warding
    let d = dmg;
    let crit = false;
    const luck = 0.08 * (WeaponManager.passives.luck || 0) + G.player.mods.crit;
    const fx = opts.effects || [];
    if (fx.includes('crit') && Math.random() < 0.25 + luck) { d *= 2.2; crit = true; }
    else if (Math.random() < luck) { d *= 2; crit = true; }
    if (e.dr) d *= e.dr; // BULWARK elite affix
    if (e.vulnT > G.time) d *= 1.2; // hoarfrost-style vulnerability marks
    e.hp -= d;
    e.flash = 0.08;
    if (Math.random() < 0.4 || crit) Particles.text(e.x + Util.rand(-8, 8), e.y - e.r, Math.round(d), crit ? '#ffe93e' : '#fff', crit ? 16 : 12);
    Particles.burst(e.x, e.y, opts.color || '#fff', 3, { speed: 80, life: 0.3 });
    if (crit) Particles.spawn(e.x, e.y, opts.color || '#ffe93e', { speed: 0, life: 0.3, ring: e.r + 22 });
    Snd.play('hit');
    // on-hit effects
    for (const f of fx) {
      switch (f) {
        case 'burn': if (Math.random() < 0.5) e.burn = 2; break;
        case 'poison': if (Math.random() < 0.5) e.poison = 3; break;
        case 'freeze': if (Math.random() < 0.18 && !e.boss && !e.stoic) e.freeze = 0.8; break;
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
    if (e.hp > 0) Enemies.quirkHurt(G, e); // per-monster on-hurt reactions
    // per-weapon quirk: on-hit identity
    if (e.hp > 0 && opts.w && opts.w.def.quirk) {
      const q = Quirks.get(opts.w.def.quirk);
      if (q && q.onHit) q.onHit(G, e, d, opts);
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e, idx) {
    const i = idx !== undefined ? idx : Enemies.list.indexOf(e);
    if (i < 0) return;
    Enemies.list.splice(i, 1);
    G.kills++; G.combo++; G.comboT = 2.5;
    if (e.elite || e.boss) World.addStain(e); // spilled dye stains the cloth forever
    Enemies.quirkDeath(G, e); // per-monster death behavior
    if (e.splits) { // SPLITTING affix: bursts into weakened copies
      for (let k = 0; k < e.splits; k++) {
        const s = Enemies.spawnAt(G, e.type);
        s.x = e.x + Util.rand(-30, 30); s.y = e.y + Util.rand(-30, 30);
        s.hp = s.maxHp = s.maxHp * 0.3; s.xp = 1;
      }
    }
    if (e.volatile) { // VOLATILE affix: dying blast hurts YOU
      Particles.burst(e.x, e.y, '#ff6b2e', 30, { speed: 300 });
      Snd.play('explode'); G.shake(8);
      if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 130 * 130) Player.hurt(G, e.dmg * 1.5);
    }
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
    if (e.gilded) { coinDrop = 8 + (Util.rand(0, 6) | 0); Particles.text(e.x, e.y - 24, 'CAUGHT!', '#ffd23e', 18); }
    if (e.elite) coinDrop = Util.rand(2, 5) | 0;
    if (e.boss) coinDrop = e.bdef.id === 'NOVA_PRIME' ? 60 : 12 + (Enemies.BOSSES.findIndex(b => b.id === e.bdef.id)) * 6;
    for (let k = 0; k < coinDrop; k++) {
      World.gems.push({ x: e.x + Util.rand(-40, 40), y: e.y + Util.rand(-40, 40), v: 0, coin: e.boss && e.bdef.id === 'NOVA_PRIME' ? 5 : Math.random() < 0.15 ? 5 : 1, t: 0 });
    }
    if (e.boss) {
      G.freezeT = 0.35; G.shakeAmt = 18; G.flashAmt = 0.8;
      Snd.play('bosskill');
      if (e.bdef.id === 'NOVA_PRIME') { // victory: the final knot comes undone
        G.won = true;
        G.winT = 2.8; // savor it before the score screen
        announceBoss('THE LOOM IS MENDED', 'The Pattern Holds. The Weaver Smiles.');
        for (let k = 0; k < 80; k++) {
          Particles.spawn(e.x, e.y, k % 2 ? '#ffd23e' : '#fff', { speed: 420, life: 1.4, size: 4, thread: k % 3 === 0, drag: 0.95 });
        }
      }
    }
    // combo milestones: every 50-kill streak mends a little cloth
    if (G.combo > 0 && G.combo % 50 === 0) {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + 5);
      Particles.text(G.player.x, G.player.y - 30, `${G.combo} COMBO! +5 HP`, '#5cffb0', 15);
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
    if (G.winT !== undefined) { // victory lap: golden rain, then the score screen
      G.winT -= dt;
      if (Math.random() < 0.4) Particles.spawn(G.player.x + Util.rand(-G.w / 3, G.w / 3), G.player.y - G.h / 2, '#ffd23e', { speed: 30, life: 2, size: 3, grav: 120 });
      if (G.winT <= 0) { G.winT = undefined; gameOver(); }
    }

    // province weather: each dye-field has its own ambient mood
    if (Math.random() < 0.22) {
      const mx = G.player.x + Util.rand(-G.w / 2, G.w / 2), my = G.player.y + Util.rand(-G.h / 2, G.h / 2);
      const [h, s] = World.dyeAt(mx, my);
      const col = `hsl(${h},${s + 25}%,62%)`;
      switch (true) {
        case h < 40:   // Ember fields: rising sparks
          Particles.spawn(mx, my, col, { speed: 20, life: 1.4, size: 2, grav: -70 }); break;
        case h < 90:   // Volt fields: tiny static crackles
          if (Math.random() < 0.4) Particles.spawn(mx, my, '#ffe93e', { speed: 160, life: 0.1, size: 2, thread: true }); break;
        case h < 160:  // Verdant fields: drifting petals fall
          Particles.spawn(mx, my - 60, col, { speed: 16, life: 2.2, size: 3, grav: 26, drag: 0.985 }); break;
        case h < 215:  // Frost fields: snow
          Particles.spawn(mx, my - 60, '#dff3ff', { speed: 10, life: 2.4, size: 2, grav: 32, drag: 0.99 }); break;
        case h < 250:  // Adamant fields: still, faint dust
          if (Math.random() < 0.5) Particles.spawn(mx, my, col, { speed: 6, life: 1.8, size: 2 }); break;
        case h < 300:  // Void fields: motes drift inward, unsettling
          Particles.spawn(mx, my, col, { speed: 8, life: 1.8, size: 2, drag: 1.012 }); break;
        default:       // Arcane fields: twinkling stardust
          Particles.spawn(mx, my, Math.random() < 0.3 ? '#fff' : col, { speed: 10, life: 1.5, size: Math.random() < 0.2 ? 4 : 2 });
      }
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
    // low-HP heartbeat: the edges of the cloth bleed red
    if (G.player.hp / G.player.maxHp < 0.3 && G.state !== 'over') {
      const beat = 0.22 + 0.16 * Math.max(0, Math.sin(G.time * 5.5));
      const hv = c.createRadialGradient(G.w / 2, G.h / 2, G.h * 0.35, G.w / 2, G.h / 2, G.h * 0.8);
      hv.addColorStop(0, 'transparent'); hv.addColorStop(1, `rgba(180,20,40,${beat})`);
      c.fillStyle = hv; c.fillRect(0, 0, G.w, G.h);
    }

    UI.drawHUD(G, c);
  }

  // ---------- wiring ----------
  // menu parade: the Swarm marches across the title screen
  (() => {
    const ids = ['slime', 'bat', 'shroom', 'beetle', 'toad', 'imp', 'moth', 'eyeball', 'snail', 'gildedmoth'];
    document.getElementById('parade').innerHTML = ids.map((id, i) =>
      `<img src="${Sprites.get(id)[0].toDataURL()}" style="animation-delay:${(i * 0.17).toFixed(2)}s" alt="">`).join('');
  })();
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
