// ---- player.js : movement, HP, XP, dash ----
const Player = (() => {
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // ---- touch: floating virtual joystick + second-finger dash ----
  const touch = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, dash: false };
  const cvEl = document.getElementById('game');
  cvEl.addEventListener('touchstart', ev => {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      if (!touch.active) { // first finger: joystick anchors where you touch
        touch.active = true; touch.id = t.identifier;
        touch.ox = t.clientX; touch.oy = t.clientY; touch.dx = 0; touch.dy = 0;
      } else { // any extra finger: dash
        touch.dash = true;
      }
    }
  }, { passive: false });
  cvEl.addEventListener('touchmove', ev => {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      if (t.identifier === touch.id) {
        touch.dx = t.clientX - touch.ox; touch.dy = t.clientY - touch.oy;
        const m = Math.hypot(touch.dx, touch.dy);
        if (m > 70) { // joystick follows the finger so direction flips fast
          touch.ox += (touch.dx / m) * (m - 70);
          touch.oy += (touch.dy / m) * (m - 70);
          touch.dx = (touch.dx / m) * 70; touch.dy = (touch.dy / m) * 70;
        }
      }
    }
  }, { passive: false });
  const endTouch = ev => {
    for (const t of ev.changedTouches) {
      if (t.identifier === touch.id) { touch.active = false; touch.id = null; touch.dx = touch.dy = 0; }
    }
  };
  cvEl.addEventListener('touchend', endTouch);
  cvEl.addEventListener('touchcancel', endTouch);

  function create(ch) {
    const hp = ch.hp + Meta.fx.hp();
    return {
      x: 0, y: 0, r: 12, hp, maxHp: hp,
      xp: 0, lvl: 1, nextXp: 10,
      speed: ch.speed * Meta.fx.speed(), faceAng: 0, hurtT: 0,
      dashT: 0, dashCd: 0, anim: 0, char: ch,
      // perk-driven modifiers (see characters.js)
      mods: { dmg: ch.dmgMul, cd: ch.cdMul, count: 0, dashCd: 1, armor: 0, regen: 0, crit: 0, lifesteal: 0, thorns: 0, dashExplode: false, special: null },
      specialT: 0,
    };
  }

  function update(G, dt) {
    const p = G.player;
    const mut = mutationData();
    let dx = 0, dy = 0;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    // virtual joystick (deadzone 12px)
    if (touch.active && Math.hypot(touch.dx, touch.dy) > 12) {
      const m = Math.hypot(touch.dx, touch.dy);
      dx = touch.dx / m; dy = touch.dy / m;
    }
    const wantDash = keys.Space || touch.dash;
    touch.dash = false;

    const dashWasCD = p.dashCd > 0;
    p.dashCd -= dt; p.dashT -= dt; p.hurtT -= dt;
    if (dashWasCD && p.dashCd <= 0) Particles.spawn(p.x, p.y, '#3ae0ff', { ring: p.r + 14, life: 0.3, speed: 0 }); // dash ready
    if (wantDash && p.dashCd <= 0 && (dx || dy)) {
      p.dashT = 0.18; p.dashCd = 2.2 * p.mods.dashCd;
      Snd.play('dash');
      Particles.burst(p.x, p.y, p.char.pal.a, 14, { speed: 180 });
      if (p.mods.dashExplode) G.explodeAt(p.x, p.y, 90, 30 * p.mods.dmg, { color: p.char.pal.a });
    }
    // character special: free archetype cast on a timer
    if (p.mods.special) {
      p.specialT -= dt;
      if (p.specialT <= 0) {
        p.specialT = p.mods.special.cd;
        const sd = { color: p.mods.special.color, effects: [], family: p.char.id, arch: p.mods.special.arch };
        Archetypes.A[p.mods.special.arch].fire(G, { def: sd }, { dmg: 30 * p.mods.dmg, cd: 1, count: 3, speed: 380, area: 1.2, dur: 1.6, pierce: 1 });
      }
    }

    const spd = p.speed * (1 + 0.1 * (WeaponManager.passives.speed || 0)) * (p.dashT > 0 ? 3.2 : 1) * (p.warpBlessed ? 1.12 : 1) * (G.playerWebbed || G.chillT > G.time ? 0.65 : 1);
    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      p.x += (dx / m) * spd * dt;
      p.y += (dy / m) * spd * dt;
      p.faceAng = Math.atan2(dy, dx);
      p.anim += dt * 8;
      // engine exhaust in the character's accent color
      if (Math.random() < 0.5) {
        Particles.spawn(p.x - (dx / m) * 14, p.y - (dy / m) * 14, Math.random() < 0.3 ? '#fff' : p.char.pal.a,
          { speed: 50, life: 0.3, size: 2, ang: Math.atan2(-dy, -dx) + Util.rand(-0.4, 0.4), drag: 0.9 });
      }
      // elemental wake: your dominant nature sheds themed motes as you move
      if (mut.domFam && TRAIL_STYLE[mut.domFam] && Math.random() < 0.45) TRAIL_STYLE[mut.domFam](p);
    }

    // regen
    const rg = 0.6 * (WeaponManager.passives.regen || 0) + p.mods.regen;
    if (rg) p.hp = Math.min(p.maxHp, p.hp + rg * dt);

    // transformation burst: when a nature first appears or crosses a tier, the body reweaves
    const sig = Object.keys(mut.nat).sort().map(f => f + (mut.nat[f] >= 6 ? '!' : mut.nat[f] >= 3 ? '+' : '')).join(',') + '|' + mut.fusions;
    if (p._mutSig === undefined) { p._mutSig = sig; }
    else if (sig !== p._mutSig) {
      if (mut.domFam) {
        const col = FAM_COL[mut.domFam];
        Particles.text(p.x, p.y - 48, `✦ ${mut.domFam.toUpperCase()} ${mut.domK >= 6 ? 'ASCENDANT' : 'WOVEN'} ✦`, col, 16);
        Particles.burst(p.x, p.y, col, 28, { speed: 240, life: 0.7 });
        G.shake(5); G.flashAmt = Math.max(G.flashAmt, 0.3);
      }
      p._mutSig = sig;
    }
  }

  function gainXp(G, amount) {
    const p = G.player;
    p.xp += amount * Meta.fx.xp();
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.lvl++;
      G.lvlFlash = 1; // gold pulse on the XP bar
      p.nextXp = Math.floor(10 + p.lvl * 5.5 + p.lvl * p.lvl * 0.4);
      Characters.onLevel(G);
      if (p.lvl % WeaponManager.SLOT_EVERY === 0) {
        Particles.text(p.x, p.y - 60, '+1 WEAPON SLOT!', '#3ae0ff', 18);
        Particles.burst(p.x, p.y, '#3ae0ff', 20, { speed: 220 });
      }
      G.queueLevelUp();
    }
  }

  function hurt(G, dmg, attacker) {
    const p = G.player;
    if (p.dashT > 0) return; // i-frames while dashing
    const armor = 1.5 * (WeaponManager.passives.armor || 0) + 1.5 * p.mods.armor + Meta.fx.armor();
    const d = Math.max(1, dmg - armor);
    if (p.hurtT > 0) return;
    if (attacker && p.mods.thorns) G.damageEnemy(attacker, p.mods.thorns, { color: '#5ce86b' });
    p.hurtT = 0.5;
    p.hp -= d;
    G.shake(6);
    G.hurtFlash = Math.min(1, (G.hurtFlash || 0) + 0.5 + d / p.maxHp); // red screen flash scaled by the bite
    if (attacker) { G.hurtDir = Math.atan2(attacker.y - p.y, attacker.x - p.x); G.hurtDirT = 0.8; } // direction tell
    Snd.play('hurt');
    Particles.burst(p.x, p.y, '#ff4d4d', 10, { speed: 160 });
    if (p.hp <= 0) { p.hp = 0; G.gameOver(); }
  }

  const ghosts = []; // dash afterimages
  function draw(G, c) {
    const p = G.player;
    if (!p._spr) p._spr = Characters.sprite(p.char);
    const spr = p._spr;
    // dash afterimages: drop a ghost every frame while dashing
    if (p.dashT > 0) ghosts.push({ x: p.x, y: p.y, ang: p.faceAng, life: 0.3 });
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i]; g.life -= 1 / 60;
      if (g.life <= 0) { ghosts.splice(i, 1); continue; }
      c.save();
      c.translate(g.x, g.y); c.rotate(g.ang + Math.PI / 2);
      c.globalAlpha = g.life * 1.6;
      c.drawImage(spr, -spr.width / 2, -spr.height / 2);
      c.restore();
    }
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(20,8,40,0.35)';
    c.beginPath();
    c.ellipse(p.x, p.y + 16, 13, 5, 0, 0, Math.PI * 2);
    c.fill();
    const mut = mutationData();
    c.save();
    c.translate(p.x, p.y);
    if (p.hurtT > 0.3) c.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 40);
    if (p.dashT > 0) { c.globalAlpha = 0.7; c.shadowColor = '#3ae0ff'; c.shadowBlur = 20; }
    const bob = Math.sin(p.anim) * 2;
    c.rotate(p.faceAng + Math.PI / 2);
    c.drawImage(spr, -spr.width / 2, -spr.height / 2 + bob * 0.3);
    // body tint: the flesh itself takes on your dominant elemental nature
    if (mut.domCol && mut.domK >= 2) {
      const a0 = c.globalAlpha;
      c.globalAlpha = a0 * Math.min(0.55, 0.1 + mut.domK * 0.05);
      c.drawImage(Sprites.tinted(spr, mut.domCol), -spr.width / 2, -spr.height / 2 + bob * 0.3);
      c.globalAlpha = a0;
    }
    c.restore();
    c.globalAlpha = 1;
    drawMutations(G, c, p, mut);
  }

  // ---- weapon-driven MUTATION: the character's body changes with your arsenal ----
  // Each weapon's elemental family (Fire/Frost/Volt/Void/Nature/Steel/Arcane) grows
  // a physical feature — horns, ice shards, vines, runes... — and stacking the SAME
  // family compounds it (weighted by weapon level). Your dominant nature also tints
  // the body. Lore: the Weaver's champion is rewoven by the threads they wield.
  const FAM_COL = { Fire: '#ff6b2e', Frost: '#5cc9ff', Volt: '#ffe93e', Void: '#b05cff', Nature: '#5ce86b', Steel: '#c9ccd6', Arcane: '#ff5cd6' };
  // element-themed movement wake particles per dominant nature
  const TRAIL_STYLE = {
    Fire:   p => Particles.spawn(p.x + Util.rand(-5, 5), p.y + 2, '#ff8c42', { speed: 18, life: 0.4, size: 2, grav: -55 }),
    Frost:  p => Particles.spawn(p.x + Util.rand(-7, 7), p.y, '#dff3ff', { speed: 8, life: 0.7, size: 2, grav: 18, drag: 0.99 }),
    Volt:   p => Particles.spawn(p.x + Util.rand(-6, 6), p.y, '#fff59c', { speed: 110, life: 0.1, size: 2, thread: true }),
    Nature: p => Particles.spawn(p.x + Util.rand(-7, 7), p.y, '#5ce86b', { speed: 12, life: 0.9, size: 2, grav: 16, drag: 0.98 }),
    Void:   p => Particles.spawn(p.x + Util.rand(-5, 5), p.y, '#b05cff', { speed: 14, life: 0.5, size: 2, drag: 1.01 }),
    Steel:  p => Particles.spawn(p.x + Util.rand(-5, 5), p.y, '#c9ccd6', { speed: 32, life: 0.2, size: 1 }),
    Arcane: p => Particles.spawn(p.x + Util.rand(-6, 6), p.y, Math.random() < 0.4 ? '#fff' : '#ff5cd6', { speed: 16, life: 0.5, size: 2 }),
  };
  function famOf(def) {
    if (def.family) return def.family;
    if (def.parent && typeof WEAPONS !== 'undefined' && WEAPONS.defs[def.parent]) return WEAPONS.defs[def.parent].family;
    return null;
  }
  function mutationData() {
    const ws = WeaponManager.weapons;
    const nat = {}; let fusions = 0;
    for (const w of ws) {
      if (w.def.tier === 'fusion') fusions++;
      const fam = famOf(w.def);
      if (fam) nat[fam] = (nat[fam] || 0) + 1 + (w.lvl - 1) * 0.5; // same-family compounds, scaled by level
    }
    let domFam = null, domK = 0, totalK = 0;
    for (const f in nat) { totalK += nat[f]; if (nat[f] > domK) { domK = nat[f]; domFam = f; } }
    return { nat, fusions, domFam, domK, totalK, domCol: domFam ? FAM_COL[domFam] : null };
  }
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function drawMutations(G, c, p, mut) {
    const t = G.time;
    // fusion WINGS: ascended champions sprout flapping gold wings behind them
    if (mut.fusions > 0) {
      const span = 12 + Math.min(16, mut.fusions * 4), flap = Math.sin(t * 5) * 4;
      c.save(); c.globalAlpha = 0.8; c.fillStyle = '#ffd23e'; c.shadowColor = '#ffe93e'; c.shadowBlur = 10;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(p.x, p.y - 2);
        c.quadraticCurveTo(p.x + s * span, p.y - 12 - flap, p.x + s * (span + 4), p.y + 2 + flap);
        c.quadraticCurveTo(p.x + s * span * 0.5, p.y + 2, p.x, p.y + 4); c.closePath(); c.fill();
      }
      c.restore(); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    if (mut.totalK > 0 || mut.fusions) { // power aura — gold once fused, else your nature's hue
      const auraR = 16 + Math.min(22, mut.totalK * 1.6) + mut.fusions * 3;
      const pulse = 0.1 + 0.05 * Math.sin(t * 4);
      const ac = mut.fusions > 0 ? [255, 210, 62] : hexRgb(mut.domCol || '#ffffff');
      const ag = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, auraR);
      ag.addColorStop(0, `rgba(${ac[0]},${ac[1]},${ac[2]},${pulse})`); ag.addColorStop(1, 'transparent');
      c.fillStyle = ag; c.beginPath(); c.arc(p.x, p.y, auraR, 0, Math.PI * 2); c.fill();
    }
    for (const fam in mut.nat) { const fn = MUTATE[fam]; if (fn) fn(c, p, mut.nat[fam], t); }
    // eye-glow: the champion's gaze burns with their dominant nature
    if (mut.domCol && mut.domK >= 2) {
      const gl = 0.5 + 0.5 * Math.sin(t * 6);
      c.globalAlpha = 0.5 + gl * 0.4; c.fillStyle = mut.domCol; c.shadowColor = mut.domCol; c.shadowBlur = 6;
      c.fillRect(p.x - 3, p.y - 4, 2, 2); c.fillRect(p.x + 1, p.y - 4, 2, 2);
      c.shadowBlur = 0; c.globalAlpha = 1;
    }
    for (let i = 0; i < mut.fusions; i++) { // fusion crown of gold diamonds
      const a = t * 1.2 + i * (Math.PI * 2 / Math.max(1, mut.fusions));
      const cx = p.x + Math.cos(a) * 12, cy = p.y - 16 + Math.sin(a) * 4;
      c.fillStyle = '#ffe93e'; c.shadowColor = '#ffd23e'; c.shadowBlur = 8;
      c.save(); c.translate(cx, cy); c.rotate(a); c.fillRect(-2.5, -2.5, 5, 5); c.restore(); c.shadowBlur = 0;
    }
  }
  // each mutation animates with time and gains an APEX flourish at high stack (k>=6)
  const MUTATE = {
    Fire(c, p, k, t) { // horns that flicker, embers, apex flame-crown
      const apex = k >= 6, h = (5 + Math.min(12, k * 2.2)) * (1 + Math.sin(t * 6) * 0.07);
      c.fillStyle = apex ? '#ffd23e' : '#ff6b2e';
      for (const s of [-1, 1]) {
        const sway = Math.sin(t * 4 + s) * 1.2;
        c.beginPath(); c.moveTo(p.x + s * 4, p.y - 9);
        c.quadraticCurveTo(p.x + s * 9 + sway, p.y - 9 - h * 0.6, p.x + s * 5 + sway, p.y - 9 - h);
        c.lineTo(p.x + s * 2, p.y - 10); c.closePath(); c.fill();
      }
      if (apex) { // a central crown tongue of flame
        const fh = h * 0.8 * (1 + Math.sin(t * 9) * 0.15);
        c.fillStyle = '#ffe93e'; c.beginPath(); c.moveTo(p.x - 2, p.y - 10);
        c.quadraticCurveTo(p.x + Math.sin(t * 7) * 2, p.y - 10 - fh, p.x + 2, p.y - 10); c.closePath(); c.fill();
      }
      if (Math.random() < Math.min(0.7, k * 0.12)) Particles.spawn(p.x + Util.rand(-5, 5), p.y - 12, apex ? '#ffe93e' : '#ff8c42', { speed: 24, life: 0.4, size: 2, grav: -60 });
    },
    Frost(c, p, k, t) { // shoulder shards that shimmer; apex mantle
      const n = Math.min(7, 2 + Math.floor(k)), shimmer = 0.7 + 0.3 * Math.sin(t * 5);
      c.fillStyle = '#bfeaff'; c.globalAlpha = shimmer;
      for (let i = 0; i < n; i++) {
        const s = i % 2 ? 1 : -1, len = (5 + Math.min(10, k * 1.6)) * (1 + Math.sin(t * 3 + i) * 0.08), ang = -Math.PI / 2 + s * (0.4 + i * 0.14);
        const bx = p.x + s * 7, by = p.y - 2;
        c.beginPath(); c.moveTo(bx, by);
        c.lineTo(bx + Math.cos(ang) * len - 2, by + Math.sin(ang) * len);
        c.lineTo(bx + Math.cos(ang) * len + 2, by + Math.sin(ang) * len); c.closePath(); c.fill();
      }
      if (k >= 6) { c.strokeStyle = '#dff3ff'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, 14, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
      c.globalAlpha = 1;
    },
    Volt(c, p, k, t) { // crackling antennae + arc; apex halo of sparks
      c.strokeStyle = '#ffe93e'; c.lineWidth = 1.5; const h = 6 + Math.min(11, k * 2);
      const tips = [];
      for (const s of [-1, 1]) {
        c.beginPath(); let x = p.x + s * 3, y = p.y - 10; c.moveTo(x, y);
        for (let j = 0; j < 3; j++) { x += s * (j % 2 ? 2 : -1); y -= h / 3; c.lineTo(x + Util.rand(-1, 1), y); }
        c.stroke(); tips.push([x, y]);
      }
      if (Math.sin(t * 20) > 0.6) { c.beginPath(); c.moveTo(tips[0][0], tips[0][1]); c.lineTo(p.x + Util.rand(-2, 2), p.y - 14); c.lineTo(tips[1][0], tips[1][1]); c.stroke(); }
      if (k >= 6 && Math.sin(t * 30) > 0.4) Particles.spawn(p.x, p.y, '#fff59c', { speed: 0, life: 0.18, ring: 16 });
      if (Math.random() < Math.min(0.5, k * 0.1)) Particles.spawn(p.x + Util.rand(-6, 6), p.y - 14, '#fff59c', { speed: 120, life: 0.1, size: 2, thread: true });
    },
    Nature(c, p, k, t) { // swaying vines + leaves; apex flower bloom
      c.strokeStyle = '#5ce86b'; c.lineWidth = 2; const h = 8 + Math.min(15, k * 2.4);
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(p.x + s * 6, p.y + 8);
        c.quadraticCurveTo(p.x + s * (10 + Math.sin(t * 2 + s) * 3), p.y, p.x + s * 5, p.y - h); c.stroke();
        c.fillStyle = '#5ce86b'; c.save(); c.translate(p.x + s * 5, p.y - h); c.rotate(Math.sin(t * 3) * 0.3);
        c.beginPath(); c.ellipse(0, 0, 2.6, 1.6, s, 0, Math.PI * 2); c.fill(); c.restore();
      }
      if (k >= 6) { // crown flower
        const pet = 6, r = 3 + Math.sin(t * 3) * 0.5; c.fillStyle = '#ff5cd6';
        for (let i = 0; i < pet; i++) { const a = t + i * (Math.PI * 2 / pet); c.beginPath(); c.ellipse(p.x + Math.cos(a) * r, p.y - h - 3 + Math.sin(a) * r, 1.6, 1.6, 0, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#ffe93e'; c.beginPath(); c.arc(p.x, p.y - h - 3, 1.6, 0, Math.PI * 2); c.fill();
      }
    },
    Void(c, p, k, t) { // inward-spiralling tendrils; apex dark halo
      c.strokeStyle = '#b05cff'; c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3); c.lineWidth = 1.5;
      const R = 12 + Math.min(11, k * 1.5), n = Math.min(8, 3 + Math.floor(k));
      for (let i = 0; i < n; i++) {
        const a = t * -0.8 + i * (Math.PI * 2 / n), rr = R * (0.85 + 0.15 * Math.sin(t * 4 + i));
        c.beginPath(); c.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.6);
        c.lineTo(p.x + Math.cos(a) * rr * 0.4, p.y + Math.sin(a) * rr * 0.3); c.stroke();
      }
      if (k >= 6) { c.globalAlpha = 0.5; c.strokeStyle = '#1a0b2e'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - 14, 7, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    },
    Steel(c, p, k, t) { // plates with a shine sweep; apex pauldrons
      c.fillStyle = '#c9ccd6'; const n = Math.min(6, 1 + Math.floor(k));
      for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1; c.fillRect(p.x + s * 6 - 2, p.y - 6 + i * 3, 4, 3); }
      const sw = (t * 30) % 24 - 12; c.globalAlpha = 0.6; c.fillStyle = '#fff'; c.fillRect(p.x + sw, p.y - 6, 1, n * 3); c.globalAlpha = 1;
      if (k >= 6) { c.fillStyle = '#9fa3ad'; for (const s of [-1, 1]) c.fillRect(p.x + s * 9 - 2, p.y - 7, 4, 5); }
    },
    Arcane(c, p, k, t) { // rotating rune halo; apex counter-ring
      c.fillStyle = '#ff5cd6'; c.shadowColor = '#ff5cd6'; c.shadowBlur = 6; const n = Math.min(8, 3 + Math.floor(k));
      const pulse = 0.7 + 0.3 * Math.sin(t * 5);
      c.globalAlpha = pulse;
      for (let i = 0; i < n; i++) {
        const a = t * 1.1 + i * (Math.PI * 2 / n); const x = p.x + Math.cos(a) * 11, y = p.y - 13 + Math.sin(a) * 3;
        c.save(); c.translate(x, y); c.rotate(a); c.fillRect(-1.5, -1.5, 3, 3); c.restore();
      }
      if (k >= 6) { c.fillStyle = '#fff'; for (let i = 0; i < n; i++) { const a = -t * 1.5 + i * (Math.PI * 2 / n); c.fillRect(p.x + Math.cos(a) * 16 - 1, p.y - 13 + Math.sin(a) * 4 - 1, 2, 2); } }
      c.shadowBlur = 0; c.globalAlpha = 1;
    },
  };

  return { create, update, gainXp, hurt, draw, keys, touch };
})();
