// ---- world.js : the Loomworld ground, pickups, and breakable props ----
// Terrain rules live in LORE.md ("map rules") and ART_STYLE.md (layer budget).
const World = (() => {
  // dye-field geography
  const PROV = 64 * 7; // province = 7x7 tiles of one dye
  const DYES = [ // [hue, sat] for the seven dyes
    [16, 60], [203, 58], [50, 55], [275, 56], [130, 52], [228, 22], [315, 56],
  ];
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ (x * 1274126177); h = (h ^ (h >> 13)) * 1103515245; return ((h ^ (h >> 16)) >>> 0); };
  const dyeOf = (px, py) => hash(Math.floor(px / PROV), Math.floor(py / PROV)) % 7;
  const dyeAt = (x, y) => DYES[dyeOf(x, y)];
  const WARP = PROV * 3; // the Weaver's golden warp-threads
  const onWarpThread = (x, y) => {
    const dx = Math.abs(((x % WARP) + WARP) % WARP), dy = Math.abs(((y % WARP) + WARP) % WARP);
    return Math.min(dx, WARP - dx) < 14 || Math.min(dy, WARP - dy) < 14;
  };

  const gems = [];
  const props = [];   // breakable spools/urns/cocoons + shrines
  const stains = [];  // spilled dye soaks the cloth where great knots died
  let propT = 0, shrineT = 50;

  function reset() {
    gems.length = 0; props.length = 0; stains.length = 0;
    propT = 4; shrineT = 50;
  }

  function addStain(e) {
    if (stains.length > 50) stains.shift();
    const [sh, ss] = dyeAt(e.x, e.y);
    stains.push({ x: e.x, y: e.y, r: e.boss ? 90 : 45, hue: (sh + 180) % 360, sat: ss + 20, rot: Math.random() * Math.PI });
  }

  function magnetizeAll() { for (const o of gems) o.pull = true; }

  // ---------- breakable props ----------
  function updateProps(G, dt) {
    const P = G.player;
    propT -= dt;
    if (propT <= 0 && props.length < 5) {
      propT = 16;
      const a = Math.random() * Math.PI * 2, d = Util.rand(350, 600);
      const kind = Util.pick(['spool', 'spool', 'urn', 'cocoon']); // spools commonest
      props.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, hp: kind === 'cocoon' ? 45 : 30, wob: 0, kind });
    }
    shrineT -= dt;
    if (shrineT <= 0) {
      shrineT = 75;
      const a = Math.random() * Math.PI * 2, d = Util.rand(400, 650);
      props.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, hp: 9999, wob: 0, kind: 'shrine' });
    }
    for (let i = props.length - 1; i >= 0; i--) {
      const pr = props[i];
      pr.wob = Math.max(0, pr.wob - dt * 4);
      if (Util.dist2(pr.x, pr.y, P.x, P.y) > 1600 * 1600) { props.splice(i, 1); continue; } // left behind
      if (pr.kind === 'shrine') { // shrines are touched, never shot
        if (Util.dist2(pr.x, pr.y, P.x, P.y) < 34 * 34) {
          props.splice(i, 1);
          const bless = Util.pick(['heal', 'coins', 'magnet']);
          Particles.burst(pr.x, pr.y, '#ffd23e', 26, { speed: 240 });
          Snd.play('levelup');
          if (bless === 'heal') { P.hp = Math.min(P.maxHp, P.hp + 50); Particles.text(P.x, P.y - 24, 'THE LOOM MENDS YOU', '#5cffb0', 15); }
          else if (bless === 'coins') { G.coinsRun += 4; Meta.addCoins(4); Particles.text(P.x, P.y - 24, 'THE WEAVER PROVIDES +4⛀', '#ffd23e', 15); }
          else { magnetizeAll(); Particles.text(P.x, P.y - 24, 'THREADS DRAW HOME', '#3ae0ff', 15); }
        }
        continue;
      }
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
  const GEM_CAP = 1200; // loose gems never despawn; cap the field so long runs don't stall
  function updateGems(G, dt) {
    const P = G.player;
    const range = 70 * (1 + 0.3 * (WeaponManager.passives.magnet || 0)) * Meta.fx.magnet();
    // Overflow guard: auto-bank the oldest gems (left far behind) so the array stays bounded.
    // Credits their value instantly — the player loses nothing but the trail of stragglers.
    // Batched splice keeps this O(n) even if a big overflow ever accrues at once.
    if (gems.length > GEM_CAP) {
      const drained = gems.splice(0, gems.length - GEM_CAP);
      let coins = 0;
      for (const g of drained) {
        if (g.coin) coins += Math.round(g.coin * Meta.fx.greed());
        else if (!g.heal && !g.magnet) Player.gainXp(G, g.v);
      }
      if (coins) { G.coinsRun += coins; Meta.addCoins(coins); }
    }
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
          magnetizeAll();
          Particles.text(P.x, P.y - 24, 'MAGNETIZED!', '#3ae0ff', 16);
          Particles.burst(P.x, P.y, '#3ae0ff', 24, { speed: 280 });
          Snd.play('levelup');
        }
        else Player.gainXp(G, g.v);
        Snd.play('gem');
      }
    }
  }

  // draws the ~9px embroidered sigil of a dye at (ox,oy); fillStyle preset by caller
  function drawSigil(c, dye, ox, oy) {
    switch (dye) {
      case 0: // Ember: flame knot
        c.fillRect(ox + 3, oy, 3, 3); c.fillRect(ox, oy + 3, 9, 3); c.fillRect(ox + 3, oy + 6, 3, 3); break;
      case 1: // Frost: six-point star stitch
        c.fillRect(ox + 3, oy - 2, 3, 13); c.fillRect(ox - 2, oy + 3, 13, 3); c.fillRect(ox, oy, 3, 3); c.fillRect(ox + 6, oy + 6, 3, 3); break;
      case 2: // Volt: zigzag stitch
        c.fillRect(ox, oy, 4, 3); c.fillRect(ox + 3, oy + 3, 4, 3); c.fillRect(ox, oy + 6, 4, 3); break;
      case 3: // Void: hollow eye
        c.fillRect(ox, oy, 9, 2); c.fillRect(ox, oy + 7, 9, 2); c.fillRect(ox, oy, 2, 9); c.fillRect(ox + 7, oy, 2, 9); break;
      case 4: // Verdant: leaf-work
        c.fillRect(ox + 3, oy, 3, 9); c.fillRect(ox, oy + 2, 3, 3); c.fillRect(ox + 6, oy + 4, 3, 3); break;
      case 5: // Adamant: rivet cross-stitch
        c.fillRect(ox, oy, 3, 3); c.fillRect(ox + 6, oy, 3, 3); c.fillRect(ox + 3, oy + 3, 3, 3); c.fillRect(ox, oy + 6, 3, 3); c.fillRect(ox + 6, oy + 6, 3, 3); break;
      case 6: // Arcane: spiral stitch
        c.fillRect(ox, oy, 9, 2); c.fillRect(ox + 7, oy, 2, 9); c.fillRect(ox + 2, oy + 7, 7, 2); c.fillRect(ox + 2, oy + 3, 2, 5); c.fillRect(ox + 4, oy + 3, 3, 2); break;
    }
  }

  // ---------- ground rendering ----------
  function drawGround(G, c) {
    const P = G.player;
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
          c.globalAlpha = 0.55 + 0.3 * Math.sin(G.time * 2 + (x + y) * 0.01);
          c.fillStyle = `hsl(${hue},80%,64%)`;
          drawSigil(c, dye, sx2, sy2);
          c.globalAlpha = 1;
        }
      }
    }
    // great province emblems: each dye-field bears its sigil writ large,
    // woven faintly into the center of the cloth
    for (let px = Math.floor(x0 / PROV) * PROV; px < x1; px += PROV) {
      for (let py = Math.floor(y0 / PROV) * PROV; py < y1; py += PROV) {
        const dye = dyeOf(px + 1, py + 1);
        const [hue, sat] = DYES[dye];
        const cx = px + PROV / 2, cy = py + PROV / 2;
        c.save();
        c.translate(cx, cy);
        c.rotate((hash(px, py) % 4) * Math.PI / 2); // varied orientation
        c.scale(7, 7);
        c.globalAlpha = 0.13 + 0.03 * Math.sin(G.time * 0.8 + px * 0.01);
        c.fillStyle = `hsl(${hue},70%,70%)`;
        drawSigil(c, dye, -5, -5);
        c.restore();
      }
    }
    c.globalAlpha = 1;
    // cloud-shadows: soft darkness drifting over the cloth (depth layer)
    for (let i = 0; i < 4; i++) {
      const sx2 = P.x * 0.8 + Math.sin(i * 2.1 + G.time * 0.045) * 900 + i * 700;
      const sy2 = P.y * 0.8 + Math.cos(i * 1.7 + G.time * 0.035) * 700 - i * 520;
      const g = c.createRadialGradient(sx2, sy2, 40, sx2, sy2, 320);
      g.addColorStop(0, 'rgba(16,6,32,0.16)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.fillRect(sx2 - 320, sy2 - 320, 640, 640);
    }
    // the Weaver's golden warp-threads, every 3 provinces (sacred gold)
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
    // spilled-dye stains soaked into the cloth
    for (const st of stains) {
      c.save();
      c.translate(st.x, st.y); c.rotate(st.rot);
      c.globalAlpha = 0.22;
      c.fillStyle = `hsl(${st.hue},${st.sat}%,38%)`;
      c.beginPath(); c.ellipse(0, 0, st.r, st.r * 0.7, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(st.r * 0.5, st.r * 0.3, st.r * 0.35, st.r * 0.22, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(-st.r * 0.55, -st.r * 0.25, st.r * 0.25, st.r * 0.18, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  // ---------- props + pickup rendering ----------
  function drawPickups(G, c) {
    for (const pr of props) {
      const prSpr = Sprites.get(pr.kind || 'spool')[0];
      c.fillStyle = 'rgba(20,8,40,0.35)';
      c.beginPath(); c.ellipse(pr.x, pr.y + 16, 16, 6, 0, 0, Math.PI * 2); c.fill();
      c.save();
      c.translate(pr.x, pr.y);
      if (pr.kind === 'shrine') { // beckoning golden halo
        c.globalAlpha = 0.25 + 0.12 * Math.sin(G.time * 3);
        c.fillStyle = '#ffd23e';
        c.beginPath(); c.arc(0, -6, 30, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
      if (pr.kind === 'cocoon') c.rotate(Math.sin(G.time * 2.5) * 0.06); // it's alive...
      if (pr.wob > 0) c.rotate(Math.sin(G.time * 35) * 0.12 * pr.wob);
      c.drawImage(prSpr, -prSpr.width / 2, -prSpr.height / 2);
      c.restore();
    }
    const gemSpr = Sprites.get('gem')[0], chestSpr = Sprites.get('chest')[0], magSpr = Sprites.get('magnet')[0];
    // cull to the visible area (plus a margin) — long runs leave thousands of gems off-screen
    const P = G.player, mx = G.w / 2 + 40, my = G.h / 2 + 40;
    for (const g of gems) {
      if (Math.abs(g.x - P.x) > mx || Math.abs(g.y - P.y) > my) continue;
      const bob = Math.sin(G.time * 5 + g.x) * 3;
      const spr = g.heal ? chestSpr : g.magnet ? magSpr : g.coin ? Sprites.get('coin')[0] : gemSpr;
      if (g.magnet) { c.shadowColor = '#3ae0ff'; c.shadowBlur = 12; }
      if (g.coin) { c.shadowColor = '#ffd23e'; c.shadowBlur = 8; }
      c.save();
      c.translate(g.x, g.y + bob);
      if (g.coin) c.scale(Math.max(0.18, Math.abs(Math.sin(G.time * 4 + g.x * 0.1))), 1); // spinning coin
      else if (!g.heal && !g.magnet) c.scale(1 + Math.sin(G.time * 7 + g.x) * 0.12, 1 + Math.cos(G.time * 7 + g.x) * 0.12); // gem pulse
      c.drawImage(spr, -spr.width / 2, -spr.height / 2);
      c.restore();
      c.shadowBlur = 0;
    }
  }

  return { gems, reset, addStain, magnetizeAll, updateProps, updateGems, drawGround, drawPickups, dyeAt, onWarpThread };
})();
