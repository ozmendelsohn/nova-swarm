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

  // ===================== VOLT =====================
  Q.arc = {
    lore: 'The Weaver sewed with lightning exactly once. The seam is still arguing.',
    name: 'Conduction',
    // every hit banks charge; banked charge becomes extra chain hops
    onHit(G, e, d, opts) { const w = opts.w; w._charge = Math.min(4, (w._charge || 0) + 0.2); },
    mod(s, w) { s.count += Math.floor(w._charge || 0); if (w._charge >= 4) w._charge = 0; },
  };
  Q.arc_a = {
    lore: 'It has never touched the ground. It does not intend to start.',
    name: 'Never Grounded',
    // every 4th cast doubles
    onFire(G, w, s) { w._n4 = ((w._n4 || 0) + 1) % 4; if (w._n4 === 0) { w.echoT = 0.12; w.echoS = s; } },
  };
  Q.arc_b = {
    lore: 'Hold the wire long enough and the wire holds back.',
    name: 'Capacitor Burn',
    // the tether ramps on a held target
    onHit(G, e, d) {
      e._giga = Math.min(6, (e._giga || 0) + 1);
      e.hp -= d * 0.12 * e._giga;
    },
  };

  Q.voltorb = {
    lore: 'Moons of a planet that was never woven, still keeping their appointment.',
    name: 'Static Leak',
    // orbiting hits jump a spark to a second knot
    onHit(G, e, d, opts) {
      if (Math.random() > 0.35) return;
      const ne = G.nearestEnemy(e.x, e.y, 150, new Set([e]));
      if (ne) { G.zap(e.x, e.y, ne.x, ne.y, '#ffe93e'); G.damageEnemy(ne, d * 0.4, { color: '#ffe93e' }); }
    },
  };
  Q.voltorb_a = {
    lore: 'A halo, if saints hummed at fifty hertz.',
    name: 'Magnetosphere',
    // the ring drags loose dye-gems toward you
    onFire(G) {
      for (const g of World.gems) {
        if (Util.dist2(g.x, g.y, G.player.x, G.player.y) < 170 * 170) g.pull = true;
      }
    },
  };
  Q.voltorb_b = {
    lore: 'It leaves orbit the way debts leave ledgers: suddenly, and at speed.',
    name: 'Coilgun',
    // each impact charges the slug: later hits hit harder
    onHit(G, e, d, opts) { if (opts.from) opts.from.dmg *= 1.18; },
  };

  Q.thunder = {
    lore: 'The sky keeps accounts. This is the collections department.',
    name: 'Sky Tax',
    onHit(G, e, d) { if (e.elite || e.boss) e.hp -= d * 0.35; }, // the mighty owe more
  };
  Q.thunder_a = {
    lore: 'The first crack is a question. The rest are the argument.',
    name: 'Rolling Thunder',
    // strikes cascade to neighbors
    onHit(G, e, d, opts) {
      if (Math.random() > 0.3) return;
      const ne = G.nearestEnemy(e.x, e.y, 220, new Set([e]));
      if (ne) Projectiles.fire({ kind: 'strike', x: ne.x, y: ne.y, dmg: d * 0.6, r: 38, life: 0.3, color: '#ffe93e', ownerW: opts.w, effects: ['shock'] });
    },
  };
  Q.thunder_b = {
    lore: 'Whoever holds it is worthy. It is not picky. It is tired.',
    name: 'Stunning Verdict',
    onHit(G, e) { if (!e.boss && !e.stoic) e.freeze = Math.max(e.freeze, 0.3); }, // flattens what it strikes
  };

  Q.zapdrone = {
    lore: 'It thinks you are its battery. It is half right.',
    name: 'Loyal Battery',
    // drone hits feed your dash
    onHit(G) { G.player.dashCd = Math.max(0, G.player.dashCd - 0.06); },
  };
  Q.zapdrone_a = {
    lore: 'One spark is a pet. A thousand are weather.',
    name: 'Biting Static',
    onHit(G, e) { e.slow = Math.max(e.slow, 0.7); }, // mite bites numb the legs
  };
  Q.zapdrone_b = {
    lore: 'The Weaver built one soldier, felt ashamed, and hid it. It found you.',
    name: 'Ordnance',
    // every 6th hit fires a rocket
    onHit(G, e, d, opts) {
      const w = opts.w;
      w._ord = ((w._ord || 0) + 1) % 6;
      if (w._ord === 0) G.explodeAt(e.x, e.y, 60, d * 1.2, { color: '#ffe93e', ownerW: w });
    },
  };

  // ===================== VOID =====================
  Q.voidshot = {
    lore: 'An arrow fletched with absence. It always knows the shortest way to nothing.',
    name: 'Devour the Faint',
    // executes knots below 12% HP outright; each execution feeds the dark
    onHit(G, e, d, opts) {
      if (!e.boss && e.hp < e.maxHp * 0.12) {
        e.hp = -1;
        Particles.burst(e.x, e.y, '#b05cff', 10, { speed: 140 });
        opts.w._fed = Math.min(12, (opts.w._fed || 0) + 0.5);
      }
    },
    mod(s, w) { s.dmg += w._fed || 0; },
  };
  Q.voidshot_a = {
    lore: 'Three hungers sharing one memory of being fed.',
    name: 'Marked Prey',
    // seekers mark; marked prey takes more from the dark
    onHit(G, e, d) {
      if (e._dark > G.time) e.hp -= d * 0.3;
      e._dark = G.time + 2;
    },
  };
  Q.voidshot_b = {
    lore: 'Some falls take a lifetime. This one takes everyone nearby.',
    name: 'Slow Collapse',
    onHit(G, e, d, opts) { if (opts.from && opts.from.kind === 'blackhole') opts.from.life += 0.08; }, // feeding extends the hole
  };

  Q.singularity = {
    lore: 'The Weaver dropped a stitch. The stitch kept dropping.',
    name: 'Accretion',
    onHit(G, e, d, opts) { if (opts.from && opts.from.r < 150) opts.from.r += 0.8; }, // it grows as it eats
  };
  Q.singularity_a = {
    lore: 'Two absences, orbiting the memory of each other.',
    name: 'Binary Pull',
    onFire(G, w) {
      for (const p of Projectiles.pool) if (p.active && p.kind === 'blackhole' && p.ownerW === w) p.vacuum = 380;
    },
  };
  Q.singularity_b = {
    lore: 'In the end, everything comes home. This is the end, commuting.',
    name: 'Event Horizon',
    onFire(G, w) {
      for (const p of Projectiles.pool) if (p.active && p.kind === 'jugger' && p.ownerW === w) p.vacuum = 220;
    },
  };

  Q.riftspiral = {
    lore: 'Where it passes, directions stop agreeing with each other.',
    name: 'Disorient',
    onHit(G, e) { // scrambled heading
      if (e.boss) return;
      const a = Math.random() * Math.PI * 2;
      e.x += Math.cos(a) * 24; e.y += Math.sin(a) * 24;
    },
  };
  Q.riftspiral_a = {
    lore: 'Two currents from the same wound, braiding shut around whatever they catch.',
    name: 'Crossing Currents',
    onHit(G, e) { // a brief local vortex
      if (Math.random() > 0.3) return;
      const out = [];
      G.enemiesInRange(e.x, e.y, 90, out);
      for (const o of out) {
        if (o.boss) continue;
        const a = Util.angTo(o.x, o.y, e.x, e.y);
        o.x += Math.cos(a) * 26; o.y += Math.sin(a) * 26;
      }
    },
  };
  Q.riftspiral_b = {
    lore: 'It does not destroy. It revises.',
    name: 'Erasure',
    onHit(G, e, d) { // strips wards and haste; punishes the protected
      if (e.wardT > 0 || e._hasteT > 0) e.hp -= d * 0.25;
      e.wardT = 0; e._hasteT = 0;
    },
  };

  Q.shadowlance = {
    lore: 'Forged from the shadow of a spear that was never made.',
    name: 'First Strike',
    onHit(G, e, d) { if (e.hp > e.maxHp * 0.95) e.hp -= d; }, // doubles on the unwounded
  };
  Q.shadowlance_a = {
    lore: 'They circle, remembering when they were soldiers. Then they remember the rest.',
    name: 'Haunting',
    onHit(G, e, d, opts) {
      if (Math.random() < 0.25) Projectiles.fire({ kind: 'strike', x: e.x, y: e.y, dmg: d * 0.4, r: 34, life: 0.25, color: '#b05cff', ownerW: opts.w, effects: [] });
    },
  };
  Q.shadowlance_b = {
    lore: 'Every blow owes a twin. The mirror collects.',
    name: 'Mirror Debt',
    onHit(G, e, d) { // the opposite side of you is struck too
      const mx = G.player.x * 2 - e.x, my = G.player.y * 2 - e.y;
      const ne = G.nearestEnemy(mx, my, 120, new Set([e]));
      if (ne) { G.damageEnemy(ne, d * 0.5, { color: '#b05cff' }); Particles.burst(ne.x, ne.y, '#b05cff', 4, { speed: 80 }); }
    },
  };

  // ===================== NATURE =====================
  Q.thorn = {
    lore: 'The meadow keeps its own counsel, and its counsel is sharp.',
    name: 'Festering',
    onHit(G, e) { e.poison = Math.min(6, (e.poison || 0) + 1.2); }, // every thorn deepens the venom
  };
  Q.thorn_a = {
    lore: 'Roots deep enough to hold the cloth together where it stands.',
    name: 'Sap Tithe',
    onHit(G) { G.player.hp = Math.min(G.player.maxHp, G.player.hp + 0.8); }, // the totem feeds its planter
  };
  Q.thorn_b = {
    lore: 'The serpent lost its body in the Unraveling. The bite negotiated independence.',
    name: 'Envenom',
    onHit(G, e) { e.poison = Math.max(e.poison, 4); }, // burst wounds always fester
  };

  Q.sporecloud = {
    lore: 'Breathe carefully. The garden is paying attention.',
    name: 'Fruiting Bodies',
    onHit(G, e, d) { if (e.poison > 0) e.hp -= d * 0.25; }, // the poisoned rot faster inside it
  };
  Q.sporecloud_a = {
    lore: 'Left alone, a garden becomes a province. This one is never left alone enough.',
    name: 'Creep',
    onFire(G, w) { w._creep = Math.min(0.6, (w._creep || 0) + 0.004); }, // grows all run
    mod(s, w) { s.area *= 1 + (w._creep || 0); },
  };
  Q.sporecloud_b = {
    lore: 'Patience, compressed until it ticks.',
    name: 'Burst Bloom',
    onHit(G, e) { e.poison = Math.max(e.poison, 3); e.slow = Math.max(e.slow, 1); },
  };

  Q.vinewhip = {
    lore: 'The Loom\'s gardener kept one tool when she was unwoven. The tool kept her temper.',
    name: 'Grasping',
    onHit(G, e) { // the lash reels them in to be lashed again
      if (e.boss) return;
      const a = Util.angTo(e.x, e.y, G.player.x, G.player.y);
      e.x += Math.cos(a) * 22; e.y += Math.sin(a) * 22;
    },
  };
  Q.vinewhip_a = {
    lore: 'Ask the oldest root how far it reaches. Wait. It is still answering.',
    name: 'Long Memory',
    onFire(G, w) { w._rootN = ((w._rootN || 0) + 1) % 3; },
    mod(s, w) { if (w._rootN === 2) s.count += 2; }, // every third line runs much longer
  };
  Q.vinewhip_b = {
    lore: 'The mantis prays before eating. It is not praying to you.',
    name: 'Harvest Spin',
    onHit(G, e) { // reaping shakes loose dye-gems
      if (Math.random() < 0.06) World.gems.push({ x: e.x, y: e.y, v: 1, t: 0 });
    },
  };

  Q.beestorm = {
    lore: 'The hive remembers being kept, and has decided to keep you instead.',
    name: 'Sting Ledger',
    onHit(G, e) { e.poison = Math.min(5, (e.poison || 0) + 0.6); }, // stings accumulate
  };
  Q.beestorm_a = {
    lore: 'Her majesty does not grieve. She mobilizes.',
    name: 'Protect the Queen',
    onHit(G, e, d) { if (G.player.hp < G.player.maxHp * 0.5) e.hp -= d * 0.4; }, // the wounded queen\'s swarm rages
  };
  Q.beestorm_b = {
    lore: 'There is one of it. That has always been enough.',
    name: 'Apex Mark',
    onHit(G, e) { e.vulnT = G.time + 1.5; }, // its prey is marked for ALL your weapons
  };

  // ===================== STEEL =====================
  Q.saw = {
    lore: 'It was a millwheel. The mill is gone. The work ethic survived.',
    name: 'Whetted',
    onFire(G, w) { w._edge = Math.min(0.3, (w._edge || 0) + 0.015); }, // every throw hones the edge
    mod(s, w) { s.dmg *= 1 + (w._edge || 0); },
  };
  Q.saw_a = {
    lore: 'Two blades, one grudge, perfect scheduling.',
    name: 'Shear',
    onHit(G, e, d) { // caught between discs
      if (e._shearT > G.time) e.hp -= d * 0.5;
      e._shearT = G.time + 0.5;
    },
  };
  Q.saw_b = {
    lore: 'The chain was a compromise. The ball was not.',
    name: 'Momentum',
    onHit(G, e, d) { // the wide arc hits hardest
      if (Util.dist2(e.x, e.y, G.player.x, G.player.y) > 80 * 80) e.hp -= d * 0.4;
    },
  };

  Q.flak = {
    lore: 'A handful of the Adamant vat, thrown with feeling.',
    name: 'Point Blank',
    onHit(G, e, d) { // devastating up close
      if (Util.dist2(e.x, e.y, G.player.x, G.player.y) < 110 * 110) e.hp -= d * 0.5;
    },
  };
  Q.flak_a = {
    lore: 'Every piece of it wants to be smaller pieces.',
    name: 'Chain Reaction',
    onHit(G, e, d, opts) { if (Math.random() < 0.15) G.explodeAt(e.x, e.y, 32, d * 0.4, { color: '#c9ccd6', ownerW: opts.w }); },
  };
  Q.flak_b = {
    lore: 'What it catches, it keeps. What it keeps, it presents.',
    name: 'Trophy Hook',
    onHit(G, e) { e.vulnT = G.time + 2; }, // dragged prey is marked for everything
  };

  Q.sentry = {
    lore: 'It asked for one order it could follow forever. It got it.',
    name: 'Entrench',
    onFire(G, w) { // each deployment hardens the standing line
      for (const p of Projectiles.pool) {
        if (p.active && p.kind === 'turret' && p.ownerW === w) p.dmg *= 1.12;
      }
    },
  };
  Q.sentry_a = {
    lore: 'Doctrine: two guns are a crossfire. Three are a homeland.',
    name: 'Overlapping Fields',
    onFire(G, w) {
      const mine = Projectiles.pool.filter(p => p.active && p.kind === 'turret' && p.ownerW === w);
      if (mine.length >= 2) for (const p of mine) p.rof = 0.34;
    },
  };
  Q.sentry_b = {
    lore: 'It starts slow the way avalanches start slow.',
    name: 'Spin-Up',
    onFire(G, w) {
      for (const p of Projectiles.pool) if (p.active && p.kind === 'turret' && p.ownerW === w) p.spinup = true;
    },
  };

  Q.bladering = {
    lore: 'A halo for the patron saint of standing too close.',
    name: 'Shrapnel',
    onHit(G, e, d, opts) {
      if (Math.random() > 0.2) return;
      const a = Math.random() * Math.PI * 2;
      Projectiles.fire({ x: e.x, y: e.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, dmg: d * 0.4, r: 4, life: 0.5, color: '#c9ccd6', ownerW: opts.w, effects: [] });
    },
  };
  Q.bladering_a = {
    lore: 'The first cut is a greeting. The rest are the conversation.',
    name: 'Lacerate',
    onHit(G, e, d) {
      if (e._lacT > G.time) e.hp -= d * 0.45;
      e._lacT = G.time + 1.2;
    },
  };
  Q.bladering_b = {
    lore: 'The Loom\'s justice is a circle. It comes around.',
    name: 'Execution Arc',
    onHit(G, e) { // the orbit finishes the faltering
      if (!e.boss && !e.elite && e.hp < e.maxHp * 0.1) {
        e.hp = -1;
        Particles.burst(e.x, e.y, '#c9ccd6', 8, { speed: 130 });
      }
    },
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
