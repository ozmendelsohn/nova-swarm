// ---- fusions.js : 168 joint-evolution recipes ----
// Every base weapon fuses with 6 partners (offsets 1,3,5,7,9,11 in the base
// list) -> 28*6 = 168 unique unordered pairs. A fusion fires BOTH parent
// archetypes, merges elements/effects, and gains a unique TWIST.
const FUSIONS = (() => {
  const TWISTS = [
    { id: 'echo', name: 'Echo', desc: 'Volleys repeat a second time.', m: {} },
    { id: 'titan', name: 'Titan', desc: 'Massively enlarged area.', m: { area: 1.7 } },
    { id: 'frenzy', name: 'Frenzy', desc: 'Blistering fire rate.', m: { cd: 0.55 } },
    { id: 'vampiric', name: 'Vampiric', desc: 'Heals you on hit.', fx: ['lifesteal'] },
    { id: 'volatile', name: 'Volatile', desc: 'Hits explode.', fx: ['explode'] },
    { id: 'swarm', name: 'Swarm', desc: 'Doubled projectile count.', m: { count: 2 } },
    { id: 'executioner', name: 'Executioner', desc: 'Huge crit chance.', fx: ['crit'], m: { dmg: 1.15 } },
    { id: 'glacial', name: 'Glacial', desc: 'Hits freeze solid.', fx: ['freeze', 'slow'] },
    { id: 'magnetar', name: 'Magnetar', desc: 'Hits drag enemies in.', fx: ['vacuum'] },
    { id: 'plague', name: 'Plague', desc: 'Spreads heavy poison.', fx: ['poison'] },
    { id: 'overload', name: 'Overload', desc: 'Chain shock on every hit.', fx: ['shock'] },
    { id: 'colossus', name: 'Colossus', desc: 'Double damage, slower.', m: { dmg: 2, cd: 1.3 } },
    { id: 'phantom', name: 'Phantom', desc: 'Pierces everything.', m: { pierce: 999 } },
    { id: 'meteoric', name: 'Meteoric', desc: 'Faster, burning shots.', fx: ['burn'], m: { speed: 1.4 } },
  ];

  const NOUN = { // archetype -> fusion noun fragment
    projectile: 'Cannon', spread: 'Scatter', homing: 'Seeker', boomerang: 'Glaive',
    ricochet: 'Rebound', chain: 'Conduit', nova: 'Burst', spiral: 'Helix',
    orbit: 'Halo', beam: 'Ray', aura: 'Mantle', whip: 'Lash', mine: 'Trap',
    drone: 'Legion', turret: 'Bastion', blackhole: 'Abyss', wall: 'Bulwark',
    mirror: 'Duality', lance: 'Pike', storm: 'Tempest', bladering: 'Cyclone', splitter: 'Shatter', mortar: 'Meteor', flail: 'Flail', geyser: 'Geyser', tether: 'Leash',
    comet: 'Comet', pulsar: 'Pulsar', scythe: 'Reaper', wave: 'Helix-Weave', anchor: 'Anchor', critter: 'Brood', sticky: 'Limpet', harpoon: 'Skewer', jugger: 'Moon', totem: 'Idol',
  };
  const ELEM = {
    'Fire,Fire': 'Infernal', 'Frost,Frost': 'Glacial', 'Volt,Volt': 'Fulminant',
    'Void,Void': 'Abyssal', 'Nature,Nature': 'Verdant', 'Steel,Steel': 'Adamant',
    'Arcane,Arcane': 'Eldritch',
    'Fire,Frost': 'Thermal', 'Fire,Volt': 'Plasma', 'Fire,Void': 'Hellfire',
    'Fire,Nature': 'Wildfire', 'Fire,Steel': 'Forged', 'Fire,Arcane': 'Phoenix',
    'Frost,Volt': 'Ion-Storm', 'Frost,Void': 'Entropy', 'Frost,Nature': 'Tundra',
    'Frost,Steel': 'Permafrost', 'Frost,Arcane': 'Crystal',
    'Volt,Void': 'Dark-Star', 'Volt,Nature': 'Storm-Bloom', 'Volt,Steel': 'Railgun',
    'Volt,Arcane': 'Aether', 'Void,Nature': 'Blight', 'Void,Steel': 'Singular',
    'Void,Arcane': 'Oblivion', 'Nature,Steel': 'Thornplate', 'Nature,Arcane': 'Fey',
    'Steel,Arcane': 'Runeblade',
  };

  // normalize ELEM keys to alphabetical order to match the sorted lookup
  const ELEM_N = {};
  for (const k in ELEM) ELEM_N[k.split(',').sort().join(',')] = ELEM[k];

  function build() {
    const ids = WEAPONS.baseIds; // 28
    const recipes = [];
    const offs = [1, 3, 5, 7, 9, 11];
    for (let i = 0; i < ids.length; i++) {
      for (const k of offs) {
        const j = (i + k) % ids.length;
        const a = WEAPONS.defs[ids[i]], b = WEAPONS.defs[ids[j]];
        const tw = TWISTS[(i * 7 + j * 3 + k) % TWISTS.length];
        const ekey = [a.family, b.family].sort().join(',');
        const name = `${ELEM_N[ekey]} ${NOUN[a.arch]}-${NOUN[b.arch]} [${tw.name}]`;
        const id = `fz_${a.id}_${b.id}`;
        const def = {
          id, name, tier: 'fusion', parents: [a.id, b.id],
          family: a.family, color: a.color, color2: b.color,
          arch: a.arch, arch2: b.arch,
          dmg: +(((a.dmg + b.dmg) / 2) * 1.9).toFixed(1),
          cd: +(Math.min(a.cd, b.cd) * 0.85).toFixed(2),
          count: Math.max(a.count, b.count) + 1,
          speed: Math.max(a.speed, b.speed, 320),
          area: +(Math.max(a.area, b.area) * 1.2).toFixed(2),
          dur: Math.max(a.dur, b.dur),
          pierce: a.pierce + b.pierce + 1,
          effects: [...new Set([...a.effects, ...b.effects, ...(tw.fx || [])])],
          twist: tw,
          desc: `${a.name} + ${b.name}. ${tw.desc}`,
        };
        const m = tw.m || {};
        for (const s of ['dmg', 'cd', 'count', 'speed', 'area', 'dur']) {
          if (m[s]) def[s] = +(def[s] * m[s]).toFixed(2);
        }
        if (m.pierce) def.pierce += m.pierce;
        def.count = Math.min(8, Math.round(def.count));
        WEAPONS.defs[id] = def;
        recipes.push(def);
      }
    }
    return recipes;
  }

  const recipes = build();
  // lookup by sorted base pair
  const byPair = new Map();
  for (const r of recipes) byPair.set(r.parents.slice().sort().join('|'), r);

  function find(baseA, baseB) {
    return byPair.get([baseA, baseB].sort().join('|')) || null;
  }

  return { recipes, find, TWISTS };
})();
