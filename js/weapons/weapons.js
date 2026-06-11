// ---- weapons.js : 28 base weapons + 56 branch evolutions = 84 forms ----
// Base stats: dmg, cd(s), count, speed, area(mult), dur(s), pierce.
// Branches: pick one at lvl 5; mods multiply stats, may swap archetype or add effects.
const WEAPONS = (() => {
  const FAM = {
    Fire:   { color: '#ff6b2e', fx: 'burn' },
    Frost:  { color: '#5cc9ff', fx: 'freeze' },
    Volt:   { color: '#ffe93e', fx: 'shock' },
    Void:   { color: '#b05cff', fx: 'vacuum' },
    Nature: { color: '#5ce86b', fx: 'poison' },
    Steel:  { color: '#c9ccd6', fx: 'knock' },
    Arcane: { color: '#ff5cd6', fx: 'crit' },
  };

  const defs = {};
  let nextOrd = 0;
  function W(id, name, family, arch, stats, effects, desc, br1, br2) {
    const f = FAM[family];
    defs[id] = {
      id, name, family, arch, color: f.color, ord: nextOrd++,
      dmg: stats[0], cd: stats[1], count: stats[2], speed: stats[3],
      area: stats[4] ?? 1, dur: stats[5] ?? 1.4, pierce: stats[6] ?? 0,
      effects: effects || [f.fx], desc,
      branches: [br1.id, br2.id], tier: 'base',
    };
    for (const b of [br1, br2]) {
      defs[b.id] = Object.assign({}, defs[id], {
        id: b.id, name: b.name, tier: 'branch', parent: id, branches: null,
        desc: b.desc, effects: (effects || [f.fx]).concat(b.fx || []),
      });
      const m = b.m || {};
      for (const k of ['dmg', 'cd', 'count', 'speed', 'area', 'dur']) {
        if (m[k]) defs[b.id][k] = +(defs[b.id][k] * m[k]).toFixed(2);
      }
      if (m.pierce) defs[b.id].pierce += m.pierce;
      if (b.arch) defs[b.id].arch = b.arch;
      if (b.color) defs[b.id].color = b.color;
    }
  }

  // ============ FIRE ============
  W('ember', 'Ember Bolt', 'Fire', 'projectile', [12, 0.8, 1, 420], null, 'A searing bolt that ignites foes.',
    { id: 'ember_a', name: 'Hellstream', m: { cd: 0.35, dmg: 0.7 }, desc: 'Machine-gun fire rate.' },
    { id: 'ember_b', name: 'Meteor Bolt', m: { dmg: 2.4, cd: 1.5, area: 1.6 }, fx: ['explode'], desc: 'Slow, huge, explosive.' });
  W('flamewhip', 'Flame Whip', 'Fire', 'whip', [16, 1.1, 1, 0, 1.1], null, 'Lashes a cone of fire.',
    { id: 'flamewhip_a', name: 'Inferno Lash', m: { count: 2, dmg: 1.2 }, desc: 'Strikes both sides.' },
    { id: 'flamewhip_b', name: 'Solar Flare', arch: 'nova', m: { dmg: 0.9, cd: 1.2 }, desc: 'Erupts in a flame ring.' });
  W('firestorm', 'Pyre Rain', 'Fire', 'storm', [18, 1.6, 2, 0, 1.1], null, 'Fire crashes down on enemies.',
    { id: 'firestorm_a', name: 'Armageddon', m: { count: 2.5, cd: 1.2 }, desc: 'Blankets the field.' },
    { id: 'firestorm_b', name: 'Cinder Core', m: { dmg: 2.2, area: 1.5 }, desc: 'Fewer, devastating strikes.' });
  W('magmamine', 'Magma Mine', 'Fire', 'mine', [22, 1.8, 2, 0, 1.2], null, 'Plants explosive magma pods.',
    { id: 'magmamine_a', name: 'Minefield', m: { count: 2, cd: 0.8, dmg: 0.8 }, desc: 'Carpets the ground.' },
    { id: 'magmamine_b', name: 'Caldera', m: { dmg: 2, area: 1.8 }, desc: 'City-block explosions.' });

  // ============ FROST ============
  W('shard', 'Ice Shard', 'Frost', 'projectile', [10, 0.7, 2, 460], null, 'Twin shards that chill.',
    { id: 'shard_a', name: 'Glacier Volley', m: { count: 2.5, cd: 1.1 }, desc: 'A wall of shards.' },
    { id: 'shard_b', name: 'Permafrost Lance', arch: 'lance', m: { dmg: 1.8 }, desc: 'Piercing frozen spear.' });
  W('frostnova', 'Frost Nova', 'Frost', 'nova', [11, 1.5, 2, 340], null, 'Ring of freezing crystals.',
    { id: 'frostnova_a', name: 'Absolute Zero', m: { area: 1.5, dmg: 1.3 }, fx: ['slow'], desc: 'Deep-freezes all it touches.' },
    { id: 'frostnova_b', name: 'Hailstorm', arch: 'storm', m: { count: 1.5 }, desc: 'Hail hammers from above.' });
  W('icewall', 'Glacial Wall', 'Frost', 'wall', [9, 1.7, 1, 0, 1.1], null, 'Raises a wall of grinding ice.',
    { id: 'icewall_a', name: 'Iceberg Rampart', m: { count: 2, dur: 1.6 }, desc: 'Longer, lasting walls.' },
    { id: 'icewall_b', name: 'Avalanche', arch: 'spread', m: { dmg: 1.2, speed: 1 }, desc: 'The wall charges forward as debris.' });
  W('cryobeam', 'Cryo Beam', 'Frost', 'beam', [8, 1.2, 1, 0, 1], null, 'A lance of absolute cold.',
    { id: 'cryobeam_a', name: 'Diamond Ray', m: { dmg: 1.8, cd: 1.1 }, desc: 'Cuts like crystal.' },
    { id: 'cryobeam_b', name: 'Winter Aura', arch: 'aura', m: { area: 1.4 }, fx: ['slow'], desc: 'A freezing field around you.' });

  // ============ VOLT ============
  W('arc', 'Arc Chain', 'Volt', 'chain', [13, 1.0, 2, 0], null, 'Lightning leaps between foes.',
    { id: 'arc_a', name: 'Tesla Cascade', m: { count: 2, cd: 0.85 }, desc: 'Endless chain hops.' },
    { id: 'arc_b', name: 'Gigavolt', m: { dmg: 2.5 }, desc: 'One devastating arc.' });
  W('voltorb', 'Volt Orbiter', 'Volt', 'orbit', [9, 2.4, 2, 0, 1], null, 'Charged orbs circle you.',
    { id: 'voltorb_a', name: 'Ion Ring', m: { count: 2, area: 1.2 }, desc: 'A full electric halo.' },
    { id: 'voltorb_b', name: 'Railgun Orbit', arch: 'ricochet', m: { dmg: 1.6, speed: 1.3 }, desc: 'Orbs launch and bounce.' });
  W('thunder', 'Sky Hammer', 'Volt', 'storm', [20, 1.7, 1, 0, 1.2], null, 'Thunderbolts strike the horde.',
    { id: 'thunder_a', name: 'Ragnarok', m: { count: 3, cd: 1.3 }, desc: 'The sky falls.' },
    { id: 'thunder_b', name: 'Mjolnir', arch: 'boomerang', m: { dmg: 1.7 }, desc: 'A hammer that returns.' });
  W('zapdrone', 'Spark Drone', 'Volt', 'drone', [8, 3.0, 1, 0], null, 'A loyal zapping companion.',
    { id: 'zapdrone_a', name: 'Drone Swarm', m: { count: 3 }, desc: 'A buzzing fleet.' },
    { id: 'zapdrone_b', name: 'War Drone', m: { dmg: 2.6 }, desc: 'One heavily-armed unit.' });

  // ============ VOID ============
  W('voidshot', 'Void Bolt', 'Void', 'homing', [11, 0.9, 1, 330], null, 'Seeking darkness.',
    { id: 'voidshot_a', name: 'Hungering Dark', m: { count: 3, dmg: 0.8 }, desc: 'Three seekers.' },
    { id: 'voidshot_b', name: 'Event Bolt', arch: 'blackhole', m: { dmg: 1.2 }, desc: 'Bolts collapse into singularities.' });
  W('singularity', 'Singularity', 'Void', 'blackhole', [10, 2.6, 1, 0, 1], null, 'Tears a hole in space.',
    { id: 'singularity_a', name: 'Galaxy Engine', m: { count: 2, cd: 0.85 }, desc: 'Twin black holes.' },
    { id: 'singularity_b', name: 'Big Crunch', m: { area: 1.7, dmg: 1.6 }, desc: 'One monstrous well.' });
  W('riftspiral', 'Rift Spiral', 'Void', 'spiral', [7, 0.25, 2, 300], null, 'Spirals of unreality.',
    { id: 'riftspiral_a', name: 'Maelstrom', m: { count: 2 }, desc: 'A dense vortex.' },
    { id: 'riftspiral_b', name: 'Null Ray', arch: 'beam', m: { dmg: 1.6, cd: 4 }, desc: 'The spiral focuses into a beam.' });
  W('shadowlance', 'Shadow Lance', 'Void', 'lance', [15, 1.2, 1, 380], null, 'A spear of pure night.',
    { id: 'shadowlance_a', name: 'Phantom Pike', m: { count: 3, cd: 1.2 }, desc: 'A volley of spears.' },
    { id: 'shadowlance_b', name: 'Umbra Mirror', arch: 'mirror', m: { dmg: 1.2 }, desc: 'Strikes ahead and behind.' });

  // ============ NATURE ============
  W('thorn', 'Thorn Shot', 'Nature', 'spread', [8, 0.9, 3, 380], null, 'A burst of venomous thorns.',
    { id: 'thorn_a', name: 'Bramble Storm', m: { count: 2, cd: 0.9 }, desc: 'Thorn hurricane.' },
    { id: 'thorn_b', name: 'Serpent Fang', arch: 'homing', m: { dmg: 1.7 }, desc: 'Thorns that hunt.' });
  W('sporecloud', 'Spore Aura', 'Nature', 'aura', [7, 1.0, 1, 0, 1.1], null, 'Toxic spores surround you.',
    { id: 'sporecloud_a', name: 'Blight Garden', m: { area: 1.6 }, desc: 'A vast poison field.' },
    { id: 'sporecloud_b', name: 'Spore Mines', arch: 'mine', m: { dmg: 1.8 }, desc: 'Spores condense into pods.' });
  W('vinewhip', 'Vine Whip', 'Nature', 'whip', [14, 1.0, 1, 0], null, 'A living lash.',
    { id: 'vinewhip_a', name: 'World Root', m: { count: 2, area: 1.4 }, desc: 'Roots strike everywhere.' },
    { id: 'vinewhip_b', name: 'Mantis Scythe', arch: 'bladering', m: { dmg: 1.3 }, desc: 'A spinning blade of chitin.' });
  W('beestorm', 'Hornet Hive', 'Nature', 'drone', [7, 2.8, 2, 0], null, 'Angry guardians.',
    { id: 'beestorm_a', name: 'Queen\'s Wrath', m: { count: 2.5 }, desc: 'The whole hive.' },
    { id: 'beestorm_b', name: 'Murder Hornet', m: { dmg: 2.4, speed: 1.4 }, desc: 'One apex predator.' });

  // ============ STEEL ============
  W('saw', 'Saw Disc', 'Steel', 'boomerang', [13, 1.1, 1, 400], null, 'A returning blade.',
    { id: 'saw_a', name: 'Twin Reapers', m: { count: 2.5, cd: 1.1 }, desc: 'Multiple discs.' },
    { id: 'saw_b', name: 'Buzzkill', m: { dmg: 2, area: 1.4 }, desc: 'A giant shredder.' });
  W('flak', 'Flak Cannon', 'Steel', 'spread', [9, 1.0, 4, 420], null, 'Shrapnel everywhere.',
    { id: 'flak_a', name: 'Cluster Hell', m: { count: 2 }, fx: ['explode'], desc: 'Exploding flechettes.' },
    { id: 'flak_b', name: 'Slug Driver', arch: 'projectile', m: { dmg: 3, cd: 1.2, speed: 1.3 }, desc: 'One brutal slug.' });
  W('sentry', 'Sentry Gun', 'Steel', 'turret', [10, 3.2, 1, 380], null, 'Deploys an autogun.',
    { id: 'sentry_a', name: 'Firebase', m: { count: 2, dur: 1.5 }, desc: 'A fortified position.' },
    { id: 'sentry_b', name: 'Gatling Sentry', m: { dmg: 1.4, speed: 1.4, cd: 0.9 }, desc: 'Faster everything.' });
  W('bladering', 'Blade Cyclone', 'Steel', 'bladering', [12, 1.8, 1, 0, 1], null, 'An expanding ring of steel.',
    { id: 'bladering_a', name: 'Tornado of Knives', m: { cd: 0.7 }, desc: 'Ring after ring.' },
    { id: 'bladering_b', name: 'Guillotine Orbit', arch: 'orbit', m: { dmg: 1.4 }, desc: 'Blades settle into orbit.' });

  // ============ ARCANE ============
  W('missile', 'Arcane Missile', 'Arcane', 'homing', [12, 0.85, 2, 360], null, 'Classic seeking magic.',
    { id: 'missile_a', name: 'Missile Swarm', m: { count: 2.5, dmg: 0.75 }, desc: 'Fill the sky.' },
    { id: 'missile_b', name: 'Arcanum Lance', arch: 'lance', m: { dmg: 1.9 }, desc: 'Raw focused mana.' });
  W('prism', 'Prism Beam', 'Arcane', 'beam', [9, 1.3, 1, 0], null, 'Refracted devastation.',
    { id: 'prism_a', name: 'Spectrum Array', m: { count: 2.2, cd: 1.1 }, desc: 'Beams in many colors.' },
    { id: 'prism_b', name: 'Prism Prison', arch: 'wall', m: { dmg: 1.3, dur: 1.4 }, desc: 'Light made solid.' });
  W('hexbolt', 'Hex Ricochet', 'Arcane', 'ricochet', [11, 1.0, 1, 430], null, 'A curse that bounces.',
    { id: 'hexbolt_a', name: 'Jinx Engine', m: { count: 2.5 }, desc: 'Curses everywhere.' },
    { id: 'hexbolt_b', name: 'Doom Orbit', arch: 'orbit', m: { dmg: 1.5 }, desc: 'The hex circles you.' });
  W('mirrorbolt', 'Mirror Bolt', 'Arcane', 'mirror', [10, 0.95, 2, 400], null, 'Strikes fore and aft.',
    { id: 'mirrorbolt_a', name: 'Kaleidoscope', arch: 'nova', m: { count: 1.5 }, desc: 'Shatters in all directions.' },
    { id: 'mirrorbolt_b', name: 'Twin Paradox', m: { dmg: 1.6, count: 1.5 }, desc: 'Heavier twin volleys.' });

  const baseIds = Object.values(defs).filter(d => d.tier === 'base').sort((a, b) => a.ord - b.ord).map(d => d.id);
  return { defs, baseIds, FAM };
})();
