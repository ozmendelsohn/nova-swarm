// ---- ui.js : HUD, level-up cards, codex, screens ----
const UI = (() => {
  const $ = id => document.getElementById(id);

  function showScreen(name) {
    for (const s of document.querySelectorAll('.screen')) s.classList.remove('visible');
    if (name) $(name).classList.add('visible');
    if (name === 'menu') {
      $('menu-coins').textContent = `⛀ ${Meta.coins} WEAVER'S COINS BANKED`;
      Characters.CHARS.forEach((ch, i) => {
        const el = $(`char-best-${i}`);
        if (!el) return;
        const b = Meta.best(ch.id);
        el.textContent = b.time > 0
          ? `BEST ${fmtTime(b.time)} · LV ${b.lvl}${b.wins ? ` · ★×${b.wins}` : ''}`
          : 'UNTESTED';
      });
    }
  }

  function fmtTime(t) {
    const m = (t / 60) | 0, s = (t % 60) | 0;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function drawHUD(G, c) {
    const p = G.player;
    // HP bar
    c.fillStyle = '#000c'; c.fillRect(18, 16, 204, 18);
    c.fillStyle = '#2e0f14'; c.fillRect(20, 18, 200, 14);
    c.fillStyle = p.hp / p.maxHp > 0.3 ? '#ff3a5c' : '#ff8c42';
    c.fillRect(20, 18, 200 * Math.max(0, p.hp / p.maxHp), 14);
    c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textAlign = 'left';
    c.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 24, 29);
    // XP bar (top edge)
    c.fillStyle = '#0a2a1a'; c.fillRect(0, 0, G.w, 6);
    c.fillStyle = '#5cffb0'; c.fillRect(0, 0, G.w * (p.xp / p.nextXp), 6);
    // timer + level + kills + combo
    c.textAlign = 'center'; c.font = 'bold 26px monospace';
    c.fillStyle = '#000'; c.fillText(fmtTime(G.time), G.w / 2 + 2, 42);
    c.fillStyle = '#fff'; c.fillText(fmtTime(G.time), G.w / 2, 40);
    c.font = 'bold 13px monospace'; c.textAlign = 'left';
    c.fillStyle = '#ffd23e'; c.fillText(`LV ${p.lvl}`, 20, 52);
    c.fillStyle = '#9be8ff'; c.fillText(`☠ ${G.kills}`, 80, 52);
    c.fillStyle = '#ffd23e'; c.fillText(`⛀ ${G.coinsRun}`, 150, 52);
    if (G.combo > 5) {
      c.textAlign = 'right'; c.font = `bold ${Math.min(28, 14 + G.combo / 8)}px monospace`;
      c.fillStyle = `hsl(${(G.time * 120) % 360},90%,65%)`;
      c.fillText(`${G.combo} COMBO`, G.w - 20, 60);
    }
    // weapon icons
    c.textAlign = 'left';
    const ws = WeaponManager.weapons;
    const slotMax = WeaponManager.maxWeapons(G);
    // shrink slots so a maxed-out arsenal still fits on screen
    const sz = Math.max(18, Math.min(32, ((G.w * 0.55) / Math.max(1, ws.length)) - 4 | 0));
    let wx = G.w - 24 - ws.length * (sz + 4);
    for (const w of ws) {
      c.fillStyle = '#1a0e2eee'; c.fillRect(wx, 12, sz, sz);
      c.strokeStyle = w.def.tier === 'fusion' ? '#ffd23e' : w.def.color;
      c.lineWidth = 1.5; c.strokeRect(wx + 0.5, 12.5, sz - 1, sz - 1);
      const ic = Sprites.weaponIcon(w.def);
      c.imageSmoothingEnabled = false;
      c.drawImage(ic, wx + 2, 14, sz - 4, sz - 4);
      c.fillStyle = '#ffd23e'; c.font = 'bold 10px monospace';
      c.fillText(w.def.tier === 'fusion' ? '★' : w.lvl, wx + sz - 8, 12 + sz + 11);
      wx += sz + 4;
    }
    c.fillStyle = '#9a8ac9'; c.font = 'bold 10px monospace'; c.textAlign = 'right';
    c.fillText(`SLOTS ${ws.length}/${slotMax} · +1 @ LV ${(((G.player.lvl / WeaponManager.SLOT_EVERY) | 0) + 1) * WeaponManager.SLOT_EVERY}`, G.w - 24, 12 + sz + 24);
    c.textAlign = 'left';
    // virtual joystick (touch)
    const t = Player.touch;
    if (t.active) {
      c.globalAlpha = 0.3;
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(t.ox, t.oy, 56, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 0.55; c.fillStyle = '#3ae0ff';
      c.beginPath(); c.arc(t.ox + t.dx, t.oy + t.dy, 26, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    // boss banner
    if (G.bossBanner > 0) {
      const al = Math.min(1, G.bossBanner);
      c.globalAlpha = al * 0.45;
      c.fillStyle = '#1a0820';
      c.fillRect(0, G.h * 0.18, G.w, 86);
      c.globalAlpha = al;
      c.fillStyle = '#ffd23e';
      c.fillRect(0, G.h * 0.18, G.w, 2); c.fillRect(0, G.h * 0.18 + 84, G.w, 2);
      c.textAlign = 'center'; c.font = 'bold 40px monospace';
      c.fillStyle = '#ff3a5c';
      c.fillText(`⚠ ${G.bossName} ⚠`, G.w / 2, G.h * 0.18 + 42 + Math.sin(G.time * 20) * 2);
      if (G.bossTitle) {
        c.font = 'italic 15px monospace'; c.fillStyle = '#e8d8b0';
        c.fillText(`— ${G.bossTitle} —`, G.w / 2, G.h * 0.18 + 68);
      }
      c.globalAlpha = 1;
    }
  }

  // ----- level-up cards -----
  function cardHtml(card) {
    if (card.type === 'fusion') {
      const r = card.rec;
      return `<div class="card fusion-card">
        <div class="card-tier">⚡ JOINT EVOLUTION ⚡</div>
        <img class="card-icon" src="${Sprites.weaponIcon(r).toDataURL()}">
        <div class="card-name">${r.name}</div>
        <div class="card-desc">${r.desc}</div></div>`;
    }
    if (card.type === 'branch') {
      const d = card.def;
      return `<div class="card branch-card">
        <div class="card-tier">⬆ EVOLUTION PATH</div>
        <img class="card-icon" src="${Sprites.weaponIcon(d).toDataURL()}">
        <div class="card-name">${d.name}</div>
        <div class="card-desc">${card.w.def.name} evolves: ${d.desc}${d.quirkName ? ` <b class="quirk-chip">✶ ${d.quirkName}</b>` : ''}</div>
        ${d.lore ? `<div class="card-lore">“${d.lore}”</div>` : ''}</div>`;
    }
    if (card.type === 'new') {
      const d = card.def;
      return `<div class="card">
        <div class="card-tier">NEW · ${d.family}</div>
        <img class="card-icon" src="${Sprites.weaponIcon(d).toDataURL()}">
        <div class="card-name">${d.name}</div>
        <div class="card-desc">${d.desc}${d.quirkName ? ` <b class="quirk-chip">✶ ${d.quirkName}</b>` : ''}</div>
        ${d.lore ? `<div class="card-lore">“${d.lore}”</div>` : ''}</div>`;
    }
    if (card.type === 'upgrade') {
      const w = card.w;
      return `<div class="card">
        <div class="card-tier">UPGRADE → LV ${w.lvl + 1}</div>
        <img class="card-icon" src="${Sprites.weaponIcon(w.def).toDataURL()}">
        <div class="card-name">${w.def.name}</div>
        <div class="card-desc">+damage, +cooldown reduction${(w.lvl + 1) % 2 === 0 ? ', +1 projectile' : ''}</div></div>`;
    }
    if (card.type === 'passive') {
      const p = WeaponManager.PASSIVES[card.pid];
      const rank = (WeaponManager.passives[card.pid] || 0) + 1;
      return `<div class="card passive-card">
        <div class="card-tier">PASSIVE · RANK ${rank}</div>
        <div class="card-icon passive-icon">${p.icon}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-desc">${p.desc}</div></div>`;
    }
    return `<div class="card"><div class="card-tier">RECOVERY</div><div class="card-icon passive-icon">+</div>
      <div class="card-name">Repair Kit</div><div class="card-desc">Restore 30 HP.</div></div>`;
  }

  function showLevelUp(G, cards, onPick) {
    const box = $('cards');
    box.innerHTML = cards.map(cardHtml).join('');
    [...box.children].forEach((el, i) => {
      el.addEventListener('click', () => { showScreen(null); onPick(cards[i]); });
    });
    showScreen('levelup');
  }

  // ----- codex -----
  function showCodex() {
    const all = Object.values(WEAPONS.defs);
    const disc = WeaponManager.discovered;
    $('codex-count').textContent = `${disc.size} / ${all.length} DISCOVERED`;
    const groups = { base: 'BASE WEAPONS', branch: 'EVOLUTIONS', fusion: 'JOINT EVOLUTIONS' };
    let html = '';
    for (const tier in groups) {
      const items = all.filter(d => d.tier === tier);
      html += `<h3>${groups[tier]} (${items.filter(d => disc.has(d.id)).length}/${items.length})</h3><div class="codex-grid">`;
      for (const d of items) {
        const known = disc.has(d.id);
        html += `<div class="codex-item ${known ? '' : 'unknown'}" title="${known ? d.desc + (d.lore ? ' — ' + d.lore : '') : '???'}">
          ${known ? `<img class="codex-icon" src="${Sprites.weaponIcon(d).toDataURL()}">` : '<span class="codex-dot" style="background:#333"></span>'}
          ${known ? d.name : '?????'}</div>`;
      }
      html += '</div>';
    }
    // ----- bestiary: knots of the Unraveling, discovered by unmaking them -----
    const kb = Enemies.killBook;
    const pretty = id => id.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    const monsters = Enemies.TYPES.slice().sort((a, b) => a.tier - b.tier);
    const knownM = monsters.filter(t => kb[t.id]).length;
    html += `<h3>BESTIARY — KNOTS OF THE UNRAVELING (${knownM}/${monsters.length})</h3><div class="codex-grid">`;
    for (const t of monsters) {
      const known = !!kb[t.id];
      const lore = (Enemies.MQUIRKS[t.id] || {}).lore || '';
      html += `<div class="codex-item ${known ? '' : 'unknown'}" title="${known ? `Tier ${t.tier} · unmade ×${kb[t.id]}${lore ? ' — ' + lore : ''}` : '???'}">
        ${known ? `<img class="codex-icon" src="${Sprites.get(t.id)[0].toDataURL()}">` : '<span class="codex-dot" style="background:#333"></span>'}
        ${known ? pretty(t.id) : '?????'}</div>`;
    }
    html += '</div>';
    const knownB = Enemies.BOSSES.filter(b => kb[b.id]).length;
    html += `<h3>KNOT-TYRANTS (${knownB}/${Enemies.BOSSES.length})</h3><div class="codex-grid">`;
    for (const b of Enemies.BOSSES) {
      const known = !!kb[b.id];
      const lore = (Enemies.MQUIRKS[b.id] || {}).lore || '';
      html += `<div class="codex-item ${known ? '' : 'unknown'}" title="${known ? `${b.title}${lore ? ' — ' + lore : ''}` : '???'}">
        ${known ? `<img class="codex-icon" src="${Sprites.get(b.id)[0].toDataURL()}">` : '<span class="codex-dot" style="background:#333"></span>'}
        ${known ? b.name : '?????'}</div>`;
    }
    html += '</div>';
    $('codex-list').innerHTML = html;
    showScreen('codex');
  }

  function showGameOver(G, won) {
    $('go-title').textContent = won ? '★ VICTORY ★' : 'YOU DIED';
    $('go-title').style.color = won ? '#5cffb0' : '#ff3a5c';
    const broke = G.recordsBroken || [];
    $('go-stats').innerHTML =
      `SURVIVED <b>${fmtTime(G.time)}</b> · LEVEL <b>${G.player.lvl}</b> · KILLS <b>${G.kills}</b><br>
       ${broke.length ? `<span class="new-best">★ NEW BEST: ${broke.join(' · ')} ★</span><br>` : ''}
       WEAVER'S COINS EARNED: <b>⛀ ${G.coinsRun}</b> (bank: ⛀ ${Meta.coins})<br>
       WEAPONS DISCOVERED: <b>${WeaponManager.discovered.size}/252</b>`;
    showScreen('gameover');
  }

  return { showScreen, drawHUD, showLevelUp, showCodex, showGameOver, fmtTime };
})();
