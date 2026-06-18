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
      specialT: 0, usedLastStand: false,
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

    const spd = p.speed * (1 + 0.1 * (WeaponManager.passives.speed || 0)) * (p.dashT > 0 ? 3.2 : 1) * (p.warpBlessed ? 1.12 : 1) * (G.rampageT > 0 ? 1.25 : 1) * (G.playerWebbed || G.chillT > G.time ? 0.65 : 1);
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

    // OFFENSIVE DASH: carve through enemies for damage + knockback (dash is a weapon)
    if (p.dashT > 0) {
      if (!p._dashHits) p._dashHits = new Set();
      for (const e of G.enemiesInRange(p.x, p.y, p.r + 20, [])) {
        if (!p._dashHits.has(e)) { p._dashHits.add(e); G.damageEnemy(e, 16 * p.mods.dmg, { color: '#3ae0ff', effects: ['knock'] }); }
      }
    } else if (p._dashHits) p._dashHits = null;

    // MOMENTUM GUARD: stand still ~0.8s to brace — incoming damage is halved (turtle option)
    if (dx || dy) { p._stillT = 0; p.guarding = false; }
    else { p._stillT = (p._stillT || 0) + dt; if (p._stillT > 0.8) p.guarding = true; }

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
    // apex builds radiate their element even at rest
    if (mut.domK >= 6 && mut.domFam && TRAIL_STYLE[mut.domFam] && Math.random() < 0.16) TRAIL_STYLE[mut.domFam](p);
  }

  function gainXp(G, amount) {
    const p = G.player;
    p.xp += amount * Meta.fx.xp();
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.lvl++;
      G.lvlFlash = 1; // gold pulse on the XP bar
      p.nextXp = Math.floor((10 + p.lvl * 5.5 + p.lvl * p.lvl * 0.4) * 1.35); // slower leveling — fewer power spikes
      Characters.onLevel(G);
      if (p.lvl % WeaponManager.SLOT_EVERY === 0) {
        Particles.text(p.x, p.y - 60, '+1 WEAPON SLOT!', '#3ae0ff', 18);
        Particles.burst(p.x, p.y, '#3ae0ff', 20, { speed: 220 });
      }
      // level-up gem vacuum: your XP trail rushes in
      World.magnetizeAll();
      // every 10th level unleashes a NOVA PULSE that clears the space around you
      if (p.lvl % 10 === 0) {
        G.explodeAt(p.x, p.y, 220, 60 + p.lvl * 4, { color: '#5cffb0' });
        G.shake(10); G.flashAmt = Math.max(G.flashAmt, 0.5);
        Particles.text(p.x, p.y - 72, '⚡ NOVA PULSE ⚡', '#5cffb0', 20);
        Particles.spawn(p.x, p.y, '#5cffb0', { ring: 220, life: 0.5, speed: 0 });
      }
      G.queueLevelUp();
    }
  }

  function hurt(G, dmg, attacker) {
    const p = G.player;
    if (p.dashT > 0) return; // i-frames while dashing
    const armor = 1.5 * (WeaponManager.passives.armor || 0) + 1.5 * p.mods.armor + Meta.fx.armor();
    let d = Math.max(1, dmg - armor);
    if (p.guarding) { d *= 0.5; Particles.text(p.x, p.y - 20, 'GUARD', '#9be8ff', 12); } // braced
    if (p.hurtT > 0) return;
    if (attacker && p.mods.thorns) G.damageEnemy(attacker, p.mods.thorns, { color: '#5ce86b' });
    const hpFrac0 = p.hp / p.maxHp;
    p.hurtT = 0.5;
    p.hp -= d;
    G.dmgTaken = (G.dmgTaken || 0) + d; // run stat
    // clutch survival: a hit that drops you into the red triggers a dramatic hit-stop
    if (p.hp > 0 && p.hp / p.maxHp < 0.2 && hpFrac0 >= 0.2) {
      G.freezeT = 0.22; G.flashAmt = Math.max(G.flashAmt, 0.7);
      Particles.text(p.x, p.y - 34, 'CLUTCH!', '#ff3a5c', 18); Snd.heartbeat();
    }
    G.shake(6);
    G.hurtFlash = Math.min(1, (G.hurtFlash || 0) + 0.5 + d / p.maxHp); // red screen flash scaled by the bite
    if (attacker) { G.hurtDir = Math.atan2(attacker.y - p.y, attacker.x - p.x); G.hurtDirT = 0.8; } // direction tell
    Snd.play('hurt');
    Particles.burst(p.x, p.y, '#ff4d4d', 10, { speed: 160 });
    if (p.hp <= 0) {
      if (!p.usedLastStand) { // LAST STAND: once per run, a fatal blow leaves you at 1 HP + a nova
        p.usedLastStand = true; p.hp = 1; p.hurtT = 2; G.flashAmt = 1; G.shake(16);
        Particles.text(p.x, p.y - 40, '✦ LAST STAND ✦', '#ffd23e', 22);
        Particles.burst(p.x, p.y, '#ffd23e', 40, { speed: 300 });
        G.explodeAt(p.x, p.y, 170, 60 + G.player.lvl * 4, { color: '#ffd23e' });
        Snd.play('fusion');
      } else { p.hp = 0; G.gameOver(); }
    }
  }

  const ghosts = []; // dash afterimages
  function draw(G, c) {
    const p = G.player;
    if (!p._spr) p._spr = Sprites.render(hires(p.char.grid), p.char.pal, PLAYER_SCALE, true); // hi-res, larger base body
    const mut = mutationData();
    // the BODY ITSELF is rebuilt from your mutations — recoloured + regrown silhouette
    const spr = resolveMutSprite(p, mut) || p._spr;
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
    if (p.guarding) { // momentum-guard shield ring
      c.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 6); c.strokeStyle = '#9be8ff'; c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    c.fillStyle = 'rgba(20,8,40,0.35)';
    c.beginPath();
    c.ellipse(p.x, p.y + 16, 13, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(p.x, p.y);
    if (p.hurtT > 0.3) c.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 40);
    if (p.dashT > 0) { c.globalAlpha = 0.7; c.shadowColor = '#3ae0ff'; c.shadowBlur = 20; }
    const bob = Math.sin(p.anim) * 2;
    c.rotate(p.faceAng + Math.PI / 2);
    const breathe = 1 + Math.sin(G.time * 2.2) * 0.025 * Math.min(1, mut.totalK / 6); // the body breathes harder as it powers up
    if (breathe !== 1) c.scale(breathe, breathe);
    c.drawImage(spr, -spr.width / 2, -spr.height / 2 + bob * 0.3);
    c.restore();
    c.globalAlpha = 1;
    drawMutations(G, c, p, mut);
  }

  // ---- bake the mutation into the actual character sprite (cached, rebuilt on change) ----
  function blendHex(h1, h2, t) {
    const a = hexRgb(h1), b = hexRgb(h2);
    const m = i => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0');
    return '#' + m(0) + m(1) + m(2);
  }
  function resolveMutSprite(p, mut) {
    if (!mut.domFam || mut.domK < 2) { p._mutKey = null; p._mutSpr = null; return null; }
    const key = p.char.id + ':' + mut.domFam + ':' + Math.min(12, Math.round(mut.domK)) + ':' + (mut.fusions > 0 ? 'F' : '') + ':' + (mut.domK2 >= 2 ? mut.domFam2 : '');
    if (p._mutKey !== key) { p._mutKey = key; p._mutSpr = buildMutatedSprite(p.char, mut.domFam, mut.domK, mut.fusions, mut.domFam2, mut.domK2); }
    return p._mutSpr;
  }
  // Scale2x (EPX): doubles grid resolution and smooths diagonals — higher-detail body
  function hires(grid) {
    const rows = grid.length, cols = grid[0].length;
    const at = (y, x) => (y >= 0 && y < rows && x >= 0 && x < cols) ? grid[y][x] : '.';
    const out = [];
    for (let y = 0; y < rows; y++) {
      let r0 = '', r1 = '';
      for (let x = 0; x < cols; x++) {
        const P = at(y, x), A = at(y - 1, x), B = at(y, x + 1), C = at(y, x - 1), D = at(y + 1, x);
        let e0 = P, e1 = P, e2 = P, e3 = P;
        if (C === A && C !== D && A !== B) e0 = A;
        if (A === B && A !== C && B !== D) e1 = B;
        if (D === C && D !== B && C !== A) e2 = C;
        if (B === D && B !== A && D !== C) e3 = D;
        r0 += e0 + e1; r1 += e2 + e3;
      }
      out.push(r0, r1);
    }
    return out;
  }
  function buildMutatedSprite(char, domFam, domK, fusions, domFam2, domK2) {
    const col = FAM_COL[domFam];
    const tint = Math.min(0.7, 0.18 + domK * 0.07); // body recolour strength grows with the stack
    const pal = {};
    for (const k in char.pal) pal[k] = (k === 'a' || k === 'b') ? blendHex(char.pal[k], col, tint) : char.pal[k];
    pal.H = col; pal.D = blendHex(col, '#000000', 0.4); pal.L = blendHex(col, '#ffffff', 0.4);
    pal.S = domFam2 ? FAM_COL[domFam2] : col; // secondary-nature accent colour
    const hg = hires(char.grid);                 // work at 2x resolution — room for detailed features
    const half = hg[0].length, empty = '.'.repeat(half);
    const TOP = 6, BOT = 5;                       // generous padding for big appendages
    const g = [...Array(TOP).fill(empty), ...hg, ...Array(BOT).fill(empty)].map(r => r.split(''));
    const baseN = TOP + hg.length, head = TOP, hx = half - 1; // head top row, centre col
    const set = (row, cc, ch) => { if (row >= 0 && row < g.length && cc >= 0 && cc < half) g[row][cc] = ch; };
    const grow = Math.min(6, 2 + Math.floor(domK)); // far more detail headroom at 2x
    switch (domFam) {
      case 'Fire': // tall multi-segment horns sweeping up-and-out, bright tips
        for (let i = 0; i < grow; i++) { const cc = Math.max(0, hx - 3 - Math.floor(i / 2)); set(head - 1 - i, cc, i >= grow - 2 ? 'L' : 'H'); set(head - 1 - i, cc + 1, 'H'); }
        break;
      case 'Volt': case 'Arcane': // a spiky crown across the whole head
        for (let i = 0; i < grow; i++) { const cc = hx - i * 2; set(head - 1 - (i % 3), cc, i % 2 ? 'L' : 'H'); }
        break;
      case 'Frost': case 'Steel': // layered shards / plates down the shoulders
        for (let i = 0; i < grow; i++) { const row = head + 5 + i; set(row, 0, i % 2 ? 'D' : 'H'); set(row, 1, 'H'); if (domFam === 'Steel') set(row, 2, 'D'); }
        break;
      case 'Nature': // thick roots below + a sprouting crown
        for (let i = 0; i < grow; i++) { set(baseN - 1 + (i % BOT), Math.max(0, hx - 2 - i), 'H'); set(baseN - 1 + (i % BOT), hx, 'D'); }
        set(head - 1, hx, 'L'); set(head - 2, hx, 'L');
        break;
      case 'Void': // a jagged dark fringe consuming the edges
        for (let r = head + 1; r < baseN - 1; r += 2) { set(r, 0, 'D'); if (grow > 3) set(r, 1, 'D'); }
        break;
    }
    if (fusions > 0) { for (let i = 0; i < 3; i++) set(head - 1 - i, hx, 'L'); } // ascended crown
    // secondary nature leaves a visible accent — a mixed build wears both
    if (domFam2 && domK2 >= 2) {
      const a = Math.min(3, 1 + Math.floor(domK2 / 2));
      switch (domFam2) {
        case 'Fire': case 'Volt': case 'Arcane': for (let i = 0; i < a; i++) set(head - 1 - i, 1 + i, 'S'); break;          // small side spikes
        case 'Frost': case 'Steel': for (let i = 0; i < a; i++) set(head + 6 + i, half - 1, 'S'); break;                     // accent on far shoulder
        case 'Nature': for (let i = 0; i < a; i++) set(baseN - 1 + (i % BOT), hx - 1, 'S'); break;                            // accent roots
        case 'Void': for (let r = head + 2; r < baseN - 2; r += 3) set(r, half - 1, 'S'); break;                              // fringe other edge
      }
    }
    return Sprites.render(g.map(r => r.join('')), pal, PLAYER_SCALE, true);
  }

  // ---- weapon-driven MUTATION: the character's body changes with your arsenal ----
  // Each weapon's elemental family (Fire/Frost/Volt/Void/Nature/Steel/Arcane) grows
  // a physical feature — horns, ice shards, vines, runes... — and stacking the SAME
  // family compounds it (weighted by weapon level). Your dominant nature also tints
  // the body. Lore: the Weaver's champion is rewoven by the threads they wield.
  const FAM_COL = { Fire: '#ff6b2e', Frost: '#5cc9ff', Volt: '#ffe93e', Void: '#b05cff', Nature: '#5ce86b', Steel: '#c9ccd6', Arcane: '#ff5cd6' };
  const PLAYER_SCALE = 2; // render scale for the hi-res (2x grid) player body — bigger + crisper
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
    let domFam = null, domK = 0, domFam2 = null, domK2 = 0, totalK = 0;
    for (const f in nat) {
      totalK += nat[f];
      if (nat[f] > domK) { domFam2 = domFam; domK2 = domK; domFam = f; domK = nat[f]; }
      else if (nat[f] > domK2) { domFam2 = f; domK2 = nat[f]; }
    }
    return { nat, fusions, domFam, domK, domFam2, domK2, totalK, domCol: domFam ? FAM_COL[domFam] : null };
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
    // (drawn-on appendages & fusion halo removed — the mutations are baked into the model now)
  }

  return { create, update, gainXp, hurt, draw, keys, touch };
})();
