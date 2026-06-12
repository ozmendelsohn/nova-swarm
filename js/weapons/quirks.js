// ---- quirks.js : per-weapon lore + unique mechanical quirks ----
// Every weapon gets a hand-written identity beyond archetype × stats:
//   lore         — one line of Loomworld fiction, shown on cards & codex
//   mod(s, w)    — bend the computed stats before firing
//   onFire(G,w,s)— extra behavior when the weapon fires
//   onHit(G,e,d,opts) — extra behavior when it damages enemy e for d
// Populated family by family; weapons without an entry behave classically.
const Quirks = (() => {
  const Q = {};

  // ===================== FIRE =====================
  Q.ember = {
    lore: 'The first spark the Weaver ever struck, still looking for tinder.',
    name: 'Kindling',
    // every 3rd hit on the same knot, it catches: guaranteed long burn + flare
    onHit(G, e, d) {
      e._kindle = (e._kindle || 0) + 1;
      if (e._kindle >= 3) {
        e._kindle = 0;
        e.burn = 3;
        Particles.burst(e.x, e.y, '#ffd23e', 6, { speed: 110, life: 0.35 });
      }
    },
  };
  Q.ember_a = {
    lore: 'Fed too long, the spark forgot how to stop.',
    name: 'Overheat',
    // sustained fire ramps the rate: each volley heats it (caps at +25%)
    onFire(G, w) { w._heat = Math.min(10, (w._heat || 0) + 1); },
    mod(s, w) { s.cd *= 1 - 0.025 * (w._heat || 0); },
  };
  Q.ember_b = {
    lore: 'A piece of sky that remembers falling.',
    name: 'Scorched Cloth',
    // meteor hits always ignite
    onHit(G, e) { e.burn = Math.max(e.burn, 2.5); },
  };

  Q.flamewhip = {
    lore: 'Braided from the Loom\'s discard pile and set alight out of spite.',
    name: 'Third Stroke',
    // every third lash is half again as large
    onFire(G, w, s) {
      w._n = ((w._n || 0) + 1) % 3;
      if (w._n === 0) Archetypes.A.whip.fire(G, w, { ...s, area: s.area * 1.5, dmg: s.dmg * 0.6 });
    },
  };
  Q.flamewhip_a = {
    lore: 'The sweep that cleared the first fray, repeated forever.',
    name: 'Ash Halo',
    // each full sweep sheds a slow ring of embers
    onFire(G, w, s) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, dmg: s.dmg * 0.3, r: 4, life: 0.9, color: '#ffd23e', ownerW: w, effects: w.def.effects, decel: 0.97 });
      }
    },
  };
  Q.flamewhip_b = {
    lore: 'Once a year the sun touches the cloth. This is what it leaves.',
    name: 'Corona',
    // the ring is followed by a core detonation where you stand
    onFire(G, w, s) {
      Projectiles.fire({ kind: 'strike', x: G.player.x, y: G.player.y, dmg: s.dmg * 0.8, r: 60 * s.area, life: 0.3, color: w.def.color, ownerW: w, effects: w.def.effects });
    },
  };

  Q.firestorm = {
    lore: 'The Weaver\'s ashtray, upended over the world.',
    name: 'Dry Season',
    // already-burning knots take a quarter more from every strike
    onHit(G, e, d) { if (e.burn > 0) e.hp -= d * 0.25; },
  };
  Q.firestorm_a = {
    lore: 'When the sky itself unravels, it falls as fire.',
    name: 'Firewalker',
    // armageddon ignites everything it grazes
    onHit(G, e) { if (Math.random() < 0.8) e.burn = Math.max(e.burn, 2); },
  };
  Q.firestorm_b = {
    lore: 'One coal, hoarded from the first vat, hot enough to remember.',
    name: 'Heartseeker',
    // the great strike also seeks out the mightiest knot on the field
    onFire(G, w, s) {
      const out = [];
      G.enemiesInRange(G.player.x, G.player.y, 480, out);
      const big = out.filter(e => e.elite || e.boss)[0];
      if (big) Projectiles.fire({ kind: 'strike', x: big.x, y: big.y, dmg: s.dmg * 1.5, r: 50 * s.area, life: 0.3, color: '#ffd23e', ownerW: w, effects: w.def.effects });
    },
  };

  Q.magmamine = {
    lore: 'The cloth blisters where the old dye pools too deep.',
    name: 'Underfoot',
    // also plants a mine exactly where you stand — retreat becomes a trap
    onFire(G, w, s) {
      Projectiles.fire({ kind: 'mine', x: G.player.x, y: G.player.y, dmg: s.dmg * 1.6, r: 10, life: 8, color: w.def.color, ownerW: w, effects: w.def.effects, explode: 70 * s.area });
    },
  };
  Q.magmamine_a = {
    lore: 'Sow blisters. Reap a province.',
    name: 'Bumper Crop',
    // one volley in four is doubled
    onFire(G, w, s) {
      w._crop = ((w._crop || 0) + 1) % 4;
      if (w._crop === 0) Archetypes.A.mine.fire(G, w, s);
    },
  };
  Q.magmamine_b = {
    lore: 'The wound under the cloth, opening one stitch at a time.',
    name: 'Aftershock',
    // the eruption line echoes once at half strength
    onFire(G, w, s) { w.echoT = 0.45; w.echoS = { ...s, dmg: s.dmg * 0.5 }; },
  };

  // attach lore/quirk ids onto weapon defs
  for (const id in Q) {
    if (WEAPONS.defs[id]) {
      WEAPONS.defs[id].lore = Q[id].lore;
      WEAPONS.defs[id].quirkName = Q[id].name;
      WEAPONS.defs[id].quirk = id;
    }
  }

  return { get: id => Q[id] };
})();
