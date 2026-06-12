// ---- weaponfx.js : all weapon/projectile drawing (split from archetypes.js) ----
const WeaponFX = (() => {
  const TAU = Math.PI * 2;

  function drawProjectiles(G, c) {
    for (const p of Projectiles.pool) {
      if (!p.active) continue;
      c.save();
      switch (p.kind) {
        case 'beam': {
          c.translate(p.x, p.y); c.rotate(p.angle);
          const al = Math.min(1, p.life * 4);
          // outer halo
          c.globalAlpha = al * 0.35;
          const g = c.createLinearGradient(0, 0, p.size, 0);
          g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
          c.fillStyle = g;
          c.fillRect(0, -p.r * 2.2, p.size, p.r * 4.4);
          // hot core
          c.globalAlpha = al;
          c.fillStyle = g; c.fillRect(0, -p.r, p.size, p.r * 2);
          c.fillStyle = '#fff'; c.fillRect(0, -p.r * 0.3, p.size * 0.85, p.r * 0.6);
          // energy ripples racing along the beam
          c.fillStyle = '#fff'; c.globalAlpha = al * 0.8;
          for (let i = 0; i < 5; i++) {
            const bx = ((G.time * 900 + i * p.size / 5) % p.size);
            c.beginPath(); c.arc(bx, 0, p.r * (0.7 + 0.3 * Math.sin(i * 2)), 0, TAU); c.fill();
          }
          // muzzle flare
          c.globalAlpha = al; c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r * 1.8, 0, TAU); c.fill();
          break;
        }
        case 'aura': {
          // rotating double rune-circle with glyph ticks
          c.translate(p.x, p.y);
          c.globalAlpha = 0.13 + 0.04 * Math.sin(G.time * 8);
          c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.globalAlpha = 0.75; c.strokeStyle = p.color; c.lineWidth = 2;
          c.save(); c.rotate(G.time * 0.7);
          c.setLineDash([14, 9]);
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.stroke();
          c.restore();
          c.save(); c.rotate(-G.time * 0.45);
          c.setLineDash([4, 12]); c.lineWidth = 1.5; c.globalAlpha = 0.5;
          c.beginPath(); c.arc(0, 0, p.r * 0.78, 0, TAU); c.stroke();
          c.setLineDash([]);
          // glyph ticks on the inner ring
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            c.save(); c.rotate(a); c.translate(p.r * 0.78, 0);
            c.fillStyle = p.color; c.globalAlpha = 0.9;
            c.fillRect(-2, -5, 4, 10); c.fillRect(-5, -2, 10, 4);
            c.restore();
          }
          c.restore();
          c.setLineDash([]);
          break;
        }
        case 'whip': {
          // crescent slash with motion smear
          c.translate(p.x, p.y); c.rotate(p.angle);
          const ph = 1 - p.life / 0.18; // 0..1 over the swing
          c.globalAlpha = (1 - ph) * 0.9;
          const R = p.r * (0.7 + ph * 0.5);
          // smear ghosts
          for (let i = 2; i >= 0; i--) {
            c.globalAlpha = (1 - ph) * (0.25 + 0.25 * (2 - i));
            c.strokeStyle = i === 0 ? '#fff' : p.color;
            c.lineWidth = (3 - i) * 4;
            c.beginPath();
            c.arc(-R * 0.4, 0, R, -1.1 + ph * 0.5 - i * 0.12, 1.1 + ph * 0.5 - i * 0.12);
            c.stroke();
          }
          break;
        }
        case 'strike': {
          c.globalAlpha = p.life / 0.3;
          c.strokeStyle = '#fff'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(p.x + 10, p.y - 80); c.lineTo(p.x - 4, p.y - 20); c.lineTo(p.x + 6, p.y - 20); c.lineTo(p.x, p.y); c.stroke();
          c.strokeStyle = p.color; c.lineWidth = 1.5; c.stroke();
          // impact rune ring blooming outward on the ground
          const ph2 = 1 - p.life / 0.3;
          c.globalAlpha = (1 - ph2) * 0.9;
          c.strokeStyle = p.color; c.lineWidth = 3;
          c.beginPath(); c.ellipse(p.x, p.y, p.r * (0.4 + ph2), p.r * (0.4 + ph2) * 0.45, 0, 0, TAU); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 1;
          c.beginPath(); c.ellipse(p.x, p.y, p.r * (0.2 + ph2 * 0.8), p.r * (0.2 + ph2 * 0.8) * 0.45, 0, 0, TAU); c.stroke();
          c.fillStyle = p.color; c.globalAlpha *= 0.35;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
          break;
        }
        case 'mine': {
          c.translate(p.x, p.y);
          const blink = Math.sin(p.t * (4 + p.t * 3)) > 0; // ticks faster as it ages
          // body: spiked pod
          c.fillStyle = p.color;
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + p.t * 0.5;
            c.lineTo(Math.cos(a) * p.r * 1.25, Math.sin(a) * p.r * 1.25);
            c.lineTo(Math.cos(a + TAU / 12) * p.r * 0.75, Math.sin(a + TAU / 12) * p.r * 0.75);
          }
          c.fill();
          c.fillStyle = blink ? '#fff' : '#241636';
          c.beginPath(); c.arc(0, 0, p.r * 0.35, 0, TAU); c.fill();
          // arming countdown ring depletes
          c.strokeStyle = p.color; c.lineWidth = 2; c.globalAlpha = 0.6;
          c.beginPath(); c.arc(0, 0, p.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (p.life / 8)); c.stroke();
          break;
        }
        case 'blackhole': {
          c.translate(p.x, p.y);
          c.globalAlpha = 0.75;
          const g = c.createRadialGradient(0, 0, 4, 0, 0, p.r);
          g.addColorStop(0, '#0a0312'); g.addColorStop(0.6, p.color); g.addColorStop(1, 'transparent');
          c.fillStyle = g;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          // spinning accretion arms
          c.rotate(p.t * 4);
          c.strokeStyle = '#fff'; c.lineWidth = 2; c.globalAlpha = 0.55;
          for (let arm = 0; arm < 3; arm++) {
            c.rotate(TAU / 3);
            c.beginPath();
            for (let k = 0; k < 8; k++) {
              const rr = p.r * 0.15 + (k / 8) * p.r * 0.8;
              const aa = k * 0.45;
              c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
            }
            c.stroke();
          }
          // event horizon
          c.globalAlpha = 1; c.strokeStyle = p.color; c.lineWidth = 2;
          c.beginPath(); c.arc(0, 0, p.r * 0.3 + Math.sin(p.t * 9) * 2, 0, TAU); c.stroke();
          break;
        }
        case 'wall': {
          c.translate(p.x, p.y); c.rotate(p.angle);
          c.globalAlpha = Math.min(1, p.life);
          c.fillStyle = p.color;
          c.fillRect(-p.size, -p.r / 2, p.size * 2, p.r);
          c.globalAlpha *= 0.5; c.fillStyle = '#fff';
          c.fillRect(-p.size, -1, p.size * 2, 2);
          break;
        }
        case 'bladering': {
          const R = Math.max(1, p._R || 1);
          c.translate(p.x, p.y); c.rotate(p.t * 6);
          c.globalAlpha = 0.9;
          c.strokeStyle = p.color; c.lineWidth = 4;
          c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
          // spinning blade teeth riding the ring
          c.fillStyle = p.color;
          const nT = 10;
          for (let i = 0; i < nT; i++) {
            const a = (i / nT) * TAU;
            c.save(); c.rotate(a); c.translate(R, 0); c.rotate(0.7);
            c.beginPath(); c.moveTo(10, 0); c.lineTo(-4, 4); c.lineTo(-4, -4); c.fill();
            c.restore();
          }
          c.lineWidth = 1.5; c.strokeStyle = '#fff';
          c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
          break;
        }
        case 'mortar': {
          const ph = 1 - p.life / p.size; // 0..1 flight
          // landing shadow grows as the bomb falls
          c.globalAlpha = 0.25 + ph * 0.3;
          c.fillStyle = '#241636';
          c.beginPath(); c.ellipse(p.vx, p.vy, 8 + ph * 12, (8 + ph * 12) * 0.45, 0, 0, TAU); c.fill();
          c.globalAlpha = 0.6; c.strokeStyle = p.color; c.lineWidth = 2;
          c.beginPath(); c.ellipse(p.vx, p.vy, (1 - ph) * 30 + 10, ((1 - ph) * 30 + 10) * 0.45, 0, 0, TAU); c.stroke();
          // the bomb arcs overhead
          const bx = Util.lerp(p.srcX, p.vx, ph), by = Util.lerp(p.srcY, p.vy, ph) - Math.sin(ph * Math.PI) * 130;
          c.globalAlpha = 1;
          c.translate(bx, by); c.rotate(ph * 9);
          c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.fillRect(-2, -p.r - 3, 4, 5); // fuse spark
          break;
        }
        case 'flail': {
          // chain from player to ball
          c.strokeStyle = '#8a8aa0'; c.lineWidth = 3; c.setLineDash([5, 4]);
          c.beginPath(); c.moveTo(G.player.x, G.player.y); c.lineTo(p.x, p.y); c.stroke();
          c.setLineDash([]);
          // spiked ball
          c.translate(p.x, p.y); c.rotate(p.t * 3);
          c.fillStyle = p.color;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            c.lineTo(Math.cos(a) * p.r * 1.45, Math.sin(a) * p.r * 1.45);
            c.lineTo(Math.cos(a + TAU / 16) * p.r * 0.85, Math.sin(a + TAU / 16) * p.r * 0.85);
          }
          c.fill();
          c.fillStyle = '#241636'; c.beginPath(); c.arc(0, 0, p.r * 0.45, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(-p.r * 0.15, -p.r * 0.15, p.r * 0.18, 0, TAU); c.fill();
          break;
        }
        case 'geyser': {
          c.translate(p.x, p.y);
          if (p.retT > 0) { // warning: cracking ground ring
            c.globalAlpha = 0.55;
            c.strokeStyle = p.color; c.lineWidth = 2; c.setLineDash([6, 5]);
            c.beginPath(); c.ellipse(0, 0, p.r * 0.8, p.r * 0.36, 0, 0, TAU); c.stroke();
            c.setLineDash([]);
          } else { // eruption pillar
            const eh = Math.min(1, (0.4 - p.life + 0.001) / 0.15 + 0.4);
            c.globalAlpha = Math.min(1, p.life * 5);
            c.fillStyle = p.color;
            c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, TAU); c.fill();
            for (let i = 0; i < 3; i++) { // jets
              const jx = (i - 1) * p.r * 0.45;
              c.fillRect(jx - 5, -70 * eh + i * 12, 10, 70 * eh - i * 12);
            }
            c.fillStyle = '#fff';
            c.fillRect(-3, -70 * eh, 6, 18);
          }
          break;
        }
        case 'tether': {
          if (p._e) {
            const e = p._e;
            c.globalAlpha = 0.9;
            c.strokeStyle = p.color; c.lineWidth = 3.5;
            c.beginPath(); c.moveTo(p.x, p.y);
            const segs = 5;
            for (let i = 1; i <= segs; i++) {
              const t = i / segs;
              c.lineTo(Util.lerp(p.x, e.x, t) + (i < segs ? Util.rand(-9, 9) : 0), Util.lerp(p.y, e.y, t) + (i < segs ? Util.rand(-9, 9) : 0));
            }
            c.stroke();
            c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
            // lock ring on the victim
            c.strokeStyle = p.color; c.lineWidth = 2;
            c.beginPath(); c.arc(e.x, e.y, e.r + 5 + Math.sin(G.time * 14) * 2, 0, TAU); c.stroke();
          }
          break;
        }
        case 'comet': {
          c.translate(p.x, p.y);
          c.shadowColor = p.color; c.shadowBlur = 14;
          c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.fillStyle = '#fff';
          c.beginPath(); c.arc(p.r * 0.25, -p.r * 0.25, p.r * 0.4, 0, TAU); c.fill();
          if (p._launched) { // streaking tail
            const a = Math.atan2(p.vy, p.vx) + Math.PI;
            c.globalAlpha = 0.5;
            c.beginPath(); c.moveTo(Math.cos(a + 0.4) * p.r, Math.sin(a + 0.4) * p.r);
            c.lineTo(Math.cos(a) * p.r * 4, Math.sin(a) * p.r * 4);
            c.lineTo(Math.cos(a - 0.4) * p.r, Math.sin(a - 0.4) * p.r);
            c.fillStyle = p.color; c.fill();
          }
          break;
        }
        case 'pulsar': {
          c.translate(p.x, p.y); c.rotate(G.time * 2);
          const pr = p.r * (1 + 0.25 * Math.sin(G.time * 10));
          c.fillStyle = p.color;
          c.beginPath();
          for (let i = 0; i < 5; i++) { // 5-point star
            const a = (i / 5) * TAU;
            c.lineTo(Math.cos(a) * pr * 1.8, Math.sin(a) * pr * 1.8);
            c.lineTo(Math.cos(a + TAU / 10) * pr * 0.7, Math.sin(a + TAU / 10) * pr * 0.7);
          }
          c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, pr * 0.4, 0, TAU); c.fill();
          c.globalAlpha = 0.35; c.strokeStyle = p.color; c.lineWidth = 2;
          c.beginPath(); c.arc(0, 0, pr * (2.4 + (0.45 - p.retT) * 3), 0, TAU); c.stroke();
          break;
        }
        case 'scythe': {
          c.translate(p.x, p.y); c.rotate(p._a || p.angle);
          c.globalAlpha = 0.9;
          // crescent blade at sweep edge
          c.strokeStyle = p.color; c.lineWidth = 14; c.lineCap = 'round';
          c.beginPath(); c.arc(0, 0, p.r - 8, -0.5, 0.5); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 4;
          c.beginPath(); c.arc(0, 0, p.r - 4, -0.45, 0.45); c.stroke();
          c.lineCap = 'butt';
          // motion smear behind the blade
          c.globalAlpha = 0.25; c.fillStyle = p.color;
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, p.r - 8, -1.6, 0); c.fill();
          break;
        }
        case 'anchor': {
          c.translate(p.x, p.y);
          // suction ring
          c.globalAlpha = 0.4; c.strokeStyle = p.color; c.lineWidth = 2; c.setLineDash([8, 6]);
          c.beginPath(); c.arc(0, 0, p.r * (1.4 - (G.time * 1.7) % 0.7), 0, TAU); c.stroke();
          c.setLineDash([]); c.globalAlpha = 1;
          // the anchor itself
          c.rotate(Math.sin(G.time * 3) * 0.15);
          c.strokeStyle = p.color; c.lineWidth = 5;
          c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 12); c.stroke(); // shank
          c.beginPath(); c.arc(0, 8, 12, 0.3, Math.PI - 0.3); c.stroke(); // flukes
          c.beginPath(); c.arc(0, -18, 5, 0, TAU); c.stroke(); // ring
          c.fillStyle = '#fff'; c.fillRect(-7, -4, 14, 3); // stock
          break;
        }
        case 'jugger': {
          c.translate(p.x, p.y); c.rotate(p.t * 1.5);
          c.shadowColor = p.color; c.shadowBlur = 18;
          c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.shadowBlur = 0;
          // craters
          c.fillStyle = '#24163655';
          c.beginPath(); c.arc(-p.r * 0.35, -p.r * 0.2, p.r * 0.22, 0, TAU); c.fill();
          c.beginPath(); c.arc(p.r * 0.3, p.r * 0.35, p.r * 0.16, 0, TAU); c.fill();
          c.beginPath(); c.arc(p.r * 0.2, -p.r * 0.45, p.r * 0.12, 0, TAU); c.fill();
          c.strokeStyle = '#fff'; c.lineWidth = 2; c.globalAlpha = 0.5;
          c.beginPath(); c.arc(0, 0, p.r - 2, 0, TAU); c.stroke();
          break;
        }
        case 'totem': {
          c.translate(p.x, p.y);
          // taunt radius
          c.globalAlpha = 0.15; c.fillStyle = p.color;
          c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
          c.globalAlpha = 1;
          // carved totem pole with glowing eyes
          const wob = Math.sin(G.time * 6) * 0.08;
          c.rotate(wob);
          c.fillStyle = '#6b4214';
          c.fillRect(-9, -26, 18, 40);
          c.fillStyle = p.color;
          c.fillRect(-12, -26, 24, 8); // headdress
          c.fillRect(-9, -8, 18, 4);
          c.fillStyle = '#fff';
          const blink = Math.sin(G.time * 9) > -0.7 ? 1 : 0;
          if (blink) { c.fillRect(-6, -18, 4, 4); c.fillRect(2, -18, 4, 4); }
          break;
        }
        case 'stuck': {
          c.translate(p.x, p.y);
          const bl = Math.sin(p.life * 25) > 0;
          c.fillStyle = bl ? '#fff' : p.color;
          c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
          c.strokeStyle = p.color; c.lineWidth = 2; c.globalAlpha = 0.6;
          c.beginPath(); c.arc(0, 0, 9 + (0.8 - p.life) * 8, 0, TAU); c.stroke();
          break;
        }
        case 'drone': {
          c.translate(p.x, p.y + Math.sin(p.t * 7) * 3); // hover bob
          // thruster exhaust
          c.fillStyle = p.color; c.globalAlpha = 0.4 + 0.3 * Math.sin(p.t * 30);
          c.beginPath(); c.moveTo(-p.r * 0.6, p.r); c.lineTo(0, p.r * 2.4 + Math.random() * 3); c.lineTo(p.r * 0.6, p.r); c.fill();
          c.globalAlpha = 1;
          // body: winged diamond with eye
          c.fillStyle = p.color;
          c.beginPath(); c.moveTo(0, -p.r * 1.3); c.lineTo(p.r * 1.4, 0); c.lineTo(0, p.r); c.lineTo(-p.r * 1.4, 0); c.fill();
          // wing tips flap
          const fl = Math.sin(p.t * 18) * p.r * 0.5;
          c.fillRect(-p.r * 2, -1 + fl, p.r * 0.8, 2);
          c.fillRect(p.r * 1.2, -1 - fl, p.r * 0.8, 2);
          c.fillStyle = '#241636'; c.beginPath(); c.arc(0, -p.r * 0.2, p.r * 0.45, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -p.r * 0.2, p.r * 0.2, 0, TAU); c.fill();
          break;
        }
        case 'turret': {
          c.translate(p.x, p.y);
          const recoil = p.retT > 0.42 ? 3 : 0; // kick right after firing
          // tripod legs
          c.strokeStyle = '#241636'; c.lineWidth = 3;
          for (const la of [0.6, Math.PI - 0.6, Math.PI / 2]) {
            c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(la) * p.r * 1.6, Math.sin(la) * p.r * 1.6 + 4); c.stroke();
          }
          // rotating head tracks nearest enemy
          const te = G.nearestEnemy(p.x, p.y, 420);
          const ha = te ? Util.angTo(p.x, p.y, te.x, te.y) : G.time;
          c.rotate(ha);
          c.fillStyle = p.color;
          c.fillRect(-p.r, -p.r * 0.8, p.r * 2, p.r * 1.6);
          // barrel with recoil
          c.fillStyle = '#fff';
          c.fillRect(p.r * 0.4 - recoil, -2, p.r * 1.4, 4);
          if (recoil) { c.fillStyle = '#ffe93e'; c.beginPath(); c.arc(p.r * 1.9, 0, 5, 0, TAU); c.fill(); }
          c.rotate(-ha);
          c.fillStyle = '#ffd23e'; c.beginPath(); c.arc(0, -p.r, 3, 0, TAU); c.fill(); // status light
          break;
        }
        case 'orbit': {
          // a little hand-forged sword, edge-on to its orbit
          c.translate(p.x, p.y); c.rotate(p.t + Math.PI / 2); // blade leads the spin
          const r = p.r;
          c.shadowColor = p.color; c.shadowBlur = 12;
          // blade
          c.fillStyle = p.color;
          c.beginPath(); c.moveTo(r * 1.6, 0); c.lineTo(r * 0.2, r * 0.4); c.lineTo(-r * 0.5, r * 0.3); c.lineTo(-r * 0.5, -r * 0.3); c.lineTo(r * 0.2, -r * 0.4); c.fill();
          // edge highlight
          c.fillStyle = '#fff';
          c.beginPath(); c.moveTo(r * 1.6, 0); c.lineTo(r * 0.2, -r * 0.18); c.lineTo(-r * 0.4, -r * 0.12); c.lineTo(-r * 0.4, 0); c.fill();
          // crossguard + pommel
          c.shadowBlur = 0;
          c.fillStyle = '#3a2a1a';
          c.fillRect(-r * 0.6, -r * 0.55, r * 0.22, r * 1.1);
          c.fillRect(-r * 1.05, -r * 0.14, r * 0.5, r * 0.28);
          c.fillStyle = '#ffd23e';
          c.beginPath(); c.arc(-r * 1.1, 0, r * 0.18, 0, TAU); c.fill();
          break;
        }
        default: { // shot — shape depends on the weapon's element family
          c.translate(p.x, p.y);
          c.rotate(p.spin ? p.t * p.spin : Math.atan2(p.vy, p.vx));
          c.shadowColor = p.color; c.shadowBlur = 10;
          const fam = p.ownerW && p.ownerW.def.family;
          const col2 = p.ownerW && p.ownerW.def.color2; // fusions are two-tone
          const r = p.r;
          switch (fam) {
            case 'Fire': { // flickering fireball with tail
              c.fillStyle = p.color;
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
              c.fillStyle = col2 || '#ffd23e';
              c.beginPath(); c.arc(r * 0.25, 0, r * 0.55, 0, TAU); c.fill();
              c.fillStyle = '#fff';
              c.beginPath(); c.arc(r * 0.4, 0, r * 0.25, 0, TAU); c.fill();
              c.globalAlpha = 0.6; c.fillStyle = p.color;
              const fl = r * (1.4 + Math.random() * 0.8);
              c.beginPath(); c.moveTo(-r, -r * 0.5); c.lineTo(-fl - r, 0); c.lineTo(-r, r * 0.5); c.fill();
              break;
            }
            case 'Frost': { // crystal shard (diamond + facet line)
              c.fillStyle = p.color;
              c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(0, r * 0.7); c.lineTo(-r * 1.1, 0); c.lineTo(0, -r * 0.7); c.fill();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = 1.5;
              c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(-r * 1.1, 0); c.stroke();
              c.fillStyle = '#fff';
              c.beginPath(); c.moveTo(r * 0.9, 0); c.lineTo(r * 0.3, r * 0.3); c.lineTo(r * 0.3, -r * 0.3); c.fill();
              break;
            }
            case 'Volt': { // jagged lightning dart
              c.strokeStyle = p.color; c.lineWidth = r * 0.8; c.lineJoin = 'miter';
              c.beginPath();
              c.moveTo(r * 1.6, 0); c.lineTo(r * 0.4, -r * 0.6); c.lineTo(-r * 0.2, r * 0.6); c.lineTo(-r * 1.5, 0);
              c.stroke();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = r * 0.3; c.stroke();
              break;
            }
            case 'Void': { // dark core with bright event-horizon ring
              c.fillStyle = '#14081f';
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
              c.strokeStyle = p.color; c.lineWidth = 2.5;
              c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
              c.strokeStyle = col2 || '#fff'; c.lineWidth = 1;
              c.beginPath(); c.arc(0, 0, r * (0.5 + 0.3 * Math.sin(p.t * 12)), 0, TAU); c.stroke();
              break;
            }
            case 'Nature': { // spinning leaf / thorn
              c.rotate(p.t * 9);
              c.fillStyle = p.color;
              c.beginPath(); c.moveTo(r * 1.3, 0); c.quadraticCurveTo(0, r * 0.9, -r * 1.1, 0); c.quadraticCurveTo(0, -r * 0.9, r * 1.3, 0); c.fill();
              c.strokeStyle = col2 || '#bfffcc'; c.lineWidth = 1;
              c.beginPath(); c.moveTo(r * 1.1, 0); c.lineTo(-r * 0.9, 0); c.stroke();
              break;
            }
            case 'Steel': { // buzzing sawdisc with teeth
              c.rotate(p.t * 14);
              c.fillStyle = p.color;
              c.beginPath();
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * TAU;
                c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                c.lineTo(Math.cos(a + 0.4) * r * 0.8, Math.sin(a + 0.4) * r * 0.8);
              }
              c.fill();
              c.fillStyle = col2 || '#2a2a3a';
              c.beginPath(); c.arc(0, 0, r * 0.4, 0, TAU); c.fill();
              break;
            }
            case 'Arcane': { // twinkling 4-point star
              c.rotate(p.t * 5);
              c.fillStyle = p.color;
              c.beginPath();
              for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU;
                c.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
                c.lineTo(Math.cos(a + TAU / 8) * r * 0.45, Math.sin(a + TAU / 8) * r * 0.45);
              }
              c.fill();
              c.fillStyle = col2 || '#fff';
              c.beginPath(); c.arc(0, 0, r * 0.35, 0, TAU); c.fill();
              break;
            }
            default: { // fallback: energy bolt
              c.fillStyle = p.color;
              c.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
              c.fillStyle = '#fff';
              c.fillRect(r * 0.2, -r * 0.3, r * 0.7, r * 0.6);
            }
          }
          c.shadowBlur = 0;
        }
      }
      c.restore();
    }
    c.globalAlpha = 1;
  }

  return { drawProjectiles };
})();
