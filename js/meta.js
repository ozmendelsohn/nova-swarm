// ---- meta.js : prestige system — Weaver's Coins + permanent Loom upgrades ----
const Meta = (() => {
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  let coins = load('ns_coins', 0);
  let ranks = load('ns_meta', {}); // upgrade id -> rank

  const UPGRADES = [
    { id: 'vitality', name: 'Woven Vitality', icon: '❤', max: 8, base: 20,
      desc: r => `+${r * 10} max HP`, per: '+10 max HP / rank' },
    { id: 'power', name: 'Dye Saturation', icon: '⚔', max: 10, base: 30,
      desc: r => `+${r * 4}% damage`, per: '+4% damage / rank' },
    { id: 'swift', name: 'Silk Soles', icon: '➤', max: 6, base: 25,
      desc: r => `+${r * 3}% move speed`, per: '+3% move speed / rank' },
    { id: 'scholar', name: 'Thread Memory', icon: '◆', max: 8, base: 25,
      desc: r => `+${r * 8}% XP gained`, per: '+8% XP / rank' },
    { id: 'greed', name: 'Gilded Needle', icon: '★', max: 8, base: 35,
      desc: r => `+${r * 12}% coins gained`, per: '+12% coins / rank' },
    { id: 'plating', name: 'Quilted Plating', icon: '🛡', max: 6, base: 30,
      desc: r => `-${(r * 0.8).toFixed(1)} damage taken`, per: '-0.8 dmg taken / rank' },
    { id: 'magnet', name: 'Lodestone Charm', icon: '◈', max: 5, base: 25,
      desc: r => `+${r * 15}% pickup range`, per: '+15% pickup range / rank' },
    { id: 'loomcraft', name: 'Loomcraft', icon: '🧵', max: 6, base: 40,
      desc: r => `+${r * 20}% weave damage`, per: '+20% Thread Weaving damage / rank' },
    { id: 'arsenal', name: 'Second Talisman', icon: '⬢', max: 1, base: 400,
      desc: r => r ? 'Start every run with a 2nd weapon' : '', per: 'Start with a 2nd random weapon' },
  ];

  function save() {
    localStorage.setItem('ns_coins', JSON.stringify(coins));
    localStorage.setItem('ns_meta', JSON.stringify(ranks));
  }
  const rank = id => ranks[id] || 0;
  const cost = u => Math.floor(u.base * Math.pow(1.6, rank(u.id)));
  function addCoins(n) { coins += n; save(); }
  function buy(u) {
    const c = cost(u);
    if (coins < c || rank(u.id) >= u.max) return false;
    coins -= c; ranks[u.id] = rank(u.id) + 1; save();
    return true;
  }

  // effect accessors used by game code
  const fx = {
    hp: () => rank('vitality') * 10,
    dmg: () => 1 + rank('power') * 0.04,
    speed: () => 1 + rank('swift') * 0.03,
    xp: () => 1 + rank('scholar') * 0.08,
    greed: () => 1 + rank('greed') * 0.12,
    armor: () => rank('plating') * 0.8,
    magnet: () => 1 + rank('magnet') * 0.15,
    weave: () => 1 + rank('loomcraft') * 0.2,
    arsenal: () => rank('arsenal'),
  };

  // ---- shop UI ----
  function renderShop() {
    document.getElementById('shop-coins').innerHTML = `⛀ ${coins} WEAVER'S COINS`;
    const box = document.getElementById('shop-list');
    box.innerHTML = UPGRADES.map(u => {
      const r = rank(u.id), maxed = r >= u.max;
      return `<div class="shop-item ${maxed ? 'maxed' : coins >= cost(u) ? 'can-buy' : ''}" data-id="${u.id}">
        <div class="shop-icon">${u.icon}</div>
        <div class="shop-info">
          <div class="shop-name">${u.name} <span class="shop-rank">${r}/${u.max}</span></div>
          <div class="shop-desc">${u.per}${r ? ` · now: ${u.desc(r)}` : ''}</div>
        </div>
        <button class="shop-buy btn" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `⛀ ${cost(u)}`}</button>
      </div>`;
    }).join('');
    box.querySelectorAll('.shop-item').forEach(el => {
      el.querySelector('.shop-buy').addEventListener('click', () => {
        const u = UPGRADES.find(x => x.id === el.dataset.id);
        if (buy(u)) { Snd.init(); Snd.play('gem'); renderShop(); }
      });
    });
  }

  // ---- personal-best records per character ----
  let records = load('ns_records', {});
  function best(charId) { return records[charId] || { time: 0, lvl: 0, kills: 0, wins: 0 }; }
  function record(charId, run) { // returns list of records broken
    const b = best(charId), broke = [];
    if (run.time > b.time) { b.time = run.time; broke.push('SURVIVAL'); }
    if (run.lvl > b.lvl) { b.lvl = run.lvl; broke.push('LEVEL'); }
    if (run.kills > b.kills) { b.kills = run.kills; broke.push('KILLS'); }
    if (run.won) b.wins = (b.wins || 0) + 1;
    records[charId] = b;
    localStorage.setItem('ns_records', JSON.stringify(records));
    return broke;
  }

  return { UPGRADES, fx, addCoins, buy, rank, renderShop, best, record, get coins() { return coins; } };
})();
