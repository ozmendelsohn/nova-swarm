// ---- player.js : movement, HP, XP, dash ----
const Player = (() => {
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  function create(ch) {
    return {
      x: 0, y: 0, r: 12, hp: ch.hp, maxHp: ch.hp,
      xp: 0, lvl: 1, nextXp: 10,
      speed: ch.speed, faceAng: 0, hurtT: 0,
      dashT: 0, dashCd: 0, anim: 0, char: ch,
      // perk-driven modifiers (see characters.js)
      mods: { dmg: ch.dmgMul, cd: ch.cdMul, count: 0, dashCd: 1, armor: 0, regen: 0, crit: 0, lifesteal: 0, thorns: 0, dashExplode: false, special: null },
      specialT: 0,
    };
  }

  function update(G, dt) {
    const p = G.player;
    let dx = 0, dy = 0;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;

    p.dashCd -= dt; p.dashT -= dt; p.hurtT -= dt;
    if (keys.Space && p.dashCd <= 0 && (dx || dy)) {
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

    const spd = p.speed * (1 + 0.1 * (WeaponManager.passives.speed || 0)) * (p.dashT > 0 ? 3.2 : 1);
    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      p.x += (dx / m) * spd * dt;
      p.y += (dy / m) * spd * dt;
      p.faceAng = Math.atan2(dy, dx);
      p.anim += dt * 8;
    }

    // regen
    const rg = 0.6 * (WeaponManager.passives.regen || 0) + p.mods.regen;
    if (rg) p.hp = Math.min(p.maxHp, p.hp + rg * dt);
  }

  function gainXp(G, amount) {
    const p = G.player;
    p.xp += amount;
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.lvl++;
      p.nextXp = Math.floor(10 + p.lvl * 5.5 + p.lvl * p.lvl * 0.4);
      Characters.onLevel(G);
      G.queueLevelUp();
    }
  }

  function hurt(G, dmg, attacker) {
    const p = G.player;
    if (p.dashT > 0) return; // i-frames while dashing
    const armor = 1.5 * (WeaponManager.passives.armor || 0) + 1.5 * p.mods.armor;
    const d = Math.max(1, dmg - armor);
    if (p.hurtT > 0) return;
    if (attacker && p.mods.thorns) G.damageEnemy(attacker, p.mods.thorns, { color: '#5ce86b' });
    p.hurtT = 0.5;
    p.hp -= d;
    G.shake(6);
    Snd.play('hurt');
    Particles.burst(p.x, p.y, '#ff4d4d', 10, { speed: 160 });
    if (p.hp <= 0) { p.hp = 0; G.gameOver(); }
  }

  function draw(G, c) {
    const p = G.player;
    if (!p._spr) p._spr = Characters.sprite(p.char);
    const spr = p._spr;
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
    c.drawImage(spr, -spr.width / 2, -spr.height / 2 + bob * 0.3);
    c.restore();
    c.globalAlpha = 1;
  }

  return { create, update, gainXp, hurt, draw, keys };
})();
