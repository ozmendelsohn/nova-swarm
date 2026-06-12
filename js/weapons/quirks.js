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

  // ===================== FROST =====================
  Q.shard = {
    lore: 'Splinters of a winter the Weaver wove, regretted, and ripped out.',
    name: 'Brittle',
    // chilled or frozen knots SHATTER: bonus area damage on hit
    onHit(G, e, d) {
      if (e.slow > 0 || e.freeze > 0) {
        G.explodeAt(e.x, e.y, 45, d * 0.5, { color: '#bfeaff' });
      }
    },
  };
  Q.shard_a = {
    lore: 'Break a winter into pieces and every piece is still winter.',
    name: 'Shrapnel Frost',
    onHit(G, e) { e.slow = Math.max(e.slow, 1.5); }, // every fragment chills
  };
  Q.shard_b = {
    lore: 'The cold at the bottom of the vat, sharpened to a point.',
    name: 'Dead Stop',
    onHit(G, e) { if (!e.boss) e.freeze = Math.max(e.freeze, 0.5); }, // skewered solid
  };

  Q.frostnova = {
    lore: 'The Loom exhales once a heartbeat. This is the breath.',
    name: 'Winter\'s Grip',
    // the expanding ring drags knots outward with it and chills them
    onHit(G, e) {
      e.slow = Math.max(e.slow, 1.2);
      if (!e.boss) {
        const a = Util.angTo(G.player.x, G.player.y, e.x, e.y);
        e.x += Math.cos(a) * 22; e.y += Math.sin(a) * 22;
      }
    },
  };
  Q.frostnova_a = {
    lore: 'Where the frozen star pulses, even time wears mittens.',
    name: 'Stillness',
    // every 12th pulse-hit freezes its victim solid
    onHit(G, e) {
      this._n = (this._n || 0) + 1;
      if (this._n >= 12) { this._n = 0; if (!e.boss) { e.freeze = 1.2; Particles.burst(e.x, e.y, '#dff3ff', 8, { speed: 100 }); } }
    },
  };
  Q.frostnova_b = {
    lore: 'Hail is just the sky returning what the vat spilled upward.',
    name: 'Black Ice',
    onHit(G, e) { e.slow = Math.max(e.slow, 2); if (Math.random() < 0.12 && !e.boss) e.freeze = 0.6; },
  };

  Q.icewall = {
    lore: 'The Weaver pressed a cold iron to the cloth, and the crease holds.',
    name: 'Grinding Floe',
    // the wall shoves whatever it grinds
    onHit(G, e) {
      if (e.boss) return;
      const a = Util.angTo(G.player.x, G.player.y, e.x, e.y);
      e.x += Math.cos(a) * 34; e.y += Math.sin(a) * 34;
    },
  };
  Q.icewall_a = {
    lore: 'Dropped from a ship that sailed a sea the Loom unwove long ago.',
    name: 'Drowner\'s Grip',
    // three pulls from the anchor and the victim freezes in the undertow
    onHit(G, e) {
      e._undertow = (e._undertow || 0) + 1;
      if (e._undertow >= 3 && !e.boss) { e._undertow = 0; e.freeze = 1; }
    },
  };
  Q.icewall_b = {
    lore: 'It starts as a snowflake. Everything terrible starts small.',
    name: 'Gathering Mass',
    // also looses one boulder that grows as it rolls
    onFire(G, w, s) {
      const e = G.nearestEnemy(G.player.x, G.player.y, 600);
      const a = e ? Util.angTo(G.player.x, G.player.y, e.x, e.y) : G.player.faceAng;
      Projectiles.fire({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: s.dmg, r: 6, life: 2, color: '#dff3ff', ownerW: w, effects: w.def.effects, pierce: 9999, grow: s.dmg * 0.8 });
    },
  };

  Q.cryobeam = {
    lore: 'Light, if light had given up on warmth entirely.',
    name: 'Deep Cold',
    // the longer the beam holds one victim, the colder: 4 ticks = frozen solid
    onHit(G, e) {
      e._cryo = (e._cryo || 0) + 1;
      e.slow = Math.max(e.slow, 0.8);
      if (e._cryo >= 4) { e._cryo = 0; if (!e.boss) e.freeze = 0.8; }
    },
  };
  Q.cryobeam_a = {
    lore: 'Cut cold with cold and you get edges all the way down.',
    name: 'Refraction',
    // hits scatter razor shards sideways
    onHit(G, e, d, opts) {
      if (Math.random() > 0.4) return;
      for (const sgn of [1, -1]) {
        const a = Util.angTo(G.player.x, G.player.y, e.x, e.y) + sgn * Math.PI / 2;
        Projectiles.fire({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dmg: d * 0.35, r: 4, life: 0.45, color: '#dff3ff', ownerW: opts.w, effects: ['freeze'] });
      }
    },
  };
  Q.cryobeam_b = {
    lore: 'Stand in it long enough and you forget there were other seasons.',
    name: 'Hoarfrost',
    // chilled flesh splits easier: marked knots take +20% from EVERYTHING
    onHit(G, e) { e.vulnT = G.time + 1.2; },
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
