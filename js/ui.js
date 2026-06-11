// ---- ui.js : HUD, level-up cards, codex, screens ----
const UI = (() => {
  const $ = id => document.getElementById(id);

  function showScreen(name) {
    for (const s of document.querySelectorAll('.screen')) s.classList.remove('visible');
    if (name) $(name).classList.add('visible');
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
    if (G.combo > 5) {
      c.textAlign = 'right'; c.font = `bold ${Math.min(28, 14 + G.combo / 8)}px monospace`;
      c.fillStyle = `hsl(${(G.time * 120) % 360},90%,65%)`;
      c.fillText(`${G.combo} COMBO`, G.w - 20, 60);
    }
    // weapon icons
    c.textAlign = 'left';
    let wx = G.w - 24 - WeaponManager.weapons.length * 36;
    for (const w of WeaponManager.weapons) {
      c.fillStyle = '#1a0e2eee'; c.fillRect(wx, 12, 32, 32);
      c.strokeStyle = w.def.tier === 'fusion' ? '#ffd23e' : w.def.color;
      c.lineWidth = 1.5; c.strokeRect(wx + 0.5, 12.5, 31, 31);
      const ic = Sprites.weaponIcon(w.def);
      c.imageSmoothingEnabled = false;
      c.drawImage(ic, wx + 2, 14, 28, 28);
      c.fillStyle = '#ffd23e'; c.font = 'bold 10px monospace';
      c.fillText(w.def.tier === 'fusion' ? '★' : w.lvl, wx + 24, 43);
      wx += 36;
    }
    // boss banner
    if (G.bossBanner > 0) {
      c.globalAlpha = Math.min(1, G.bossBanner);
      c.textAlign = 'center'; c.font = 'bold 42px monospace';
      c.fillStyle = '#ff3a5c';
      c.fillText(`⚠ ${G.bossName} ⚠`, G.w / 2, G.h * 0.25 + Math.sin(G.time * 20) * 3);
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
        <div class="card-desc">${card.w.def.name} evolves: ${d.desc}</div></div>`;
    }
    if (card.type === 'new') {
      const d = card.def;
      return `<div class="card">
        <div class="card-tier">NEW · ${d.family}</div>
        <img class="card-icon" src="${Sprites.weaponIcon(d).toDataURL()}">
        <div class="card-name">${d.name}</div>
        <div class="card-desc">${d.desc}</div></div>`;
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
    return `<div class="card"><div class="card-tier">RECOVERY</div><div class="card-icon" style="background:#5cffb0"></div>
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
        html += `<div class="codex-item ${known ? '' : 'unknown'}" title="${known ? d.desc : '???'}">
          ${known ? `<img class="codex-icon" src="${Sprites.weaponIcon(d).toDataURL()}">` : '<span class="codex-dot" style="background:#333"></span>'}
          ${known ? d.name : '?????'}</div>`;
      }
      html += '</div>';
    }
    $('codex-list').innerHTML = html;
    showScreen('codex');
  }

  function showGameOver(G, won) {
    $('go-title').textContent = won ? '★ VICTORY ★' : 'YOU DIED';
    $('go-title').style.color = won ? '#5cffb0' : '#ff3a5c';
    $('go-stats').innerHTML =
      `SURVIVED <b>${fmtTime(G.time)}</b> · LEVEL <b>${G.player.lvl}</b> · KILLS <b>${G.kills}</b><br>
       WEAPONS DISCOVERED: <b>${WeaponManager.discovered.size}/252</b>`;
    showScreen('gameover');
  }

  return { showScreen, drawHUD, showLevelUp, showCodex, showGameOver, fmtTime };
})();
