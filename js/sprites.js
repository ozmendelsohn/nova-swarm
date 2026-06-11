// ---- sprites.js : procedural pixel-art generation ----
// Each sprite = palette + half-grid (mirrored horizontally) per frame.
// '.' = transparent, letters index palette colors.
const Sprites = (() => {
  const cache = {};
  const SCALE = 3;

  function render(grid, palette, scale = SCALE, mirror = true) {
    const rows = grid.length, half = grid[0].length;
    const w = mirror ? half * 2 : half;
    // build full pixel matrix (with 1px border for outline)
    const px = [];
    for (let y = 0; y < rows; y++) {
      px[y] = [];
      for (let x = 0; x < w; x++) {
        const gx = mirror ? (x < half ? x : w - 1 - x) : x;
        px[y][x] = grid[y][gx];
      }
    }
    const filled = (x, y) => y >= 0 && y < rows && x >= 0 && x < w && px[y][x] !== '.';
    const cv = document.createElement('canvas');
    cv.width = (w + 2) * scale; cv.height = (rows + 2) * scale;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    // outline pass: any empty cell touching a filled cell gets a dark plum outline
    for (let y = -1; y <= rows; y++) for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        c.fillStyle = '#241636';
        c.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
      }
    }
    // color pass with auto-shading: highlight on top edges, shadow on bottom edges
    for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
      const ch = px[y][x];
      if (ch === '.') continue;
      let col = palette[ch];
      if (!filled(x, y - 1)) col = shift(col, 48);       // lit from above
      else if (!filled(x, y + 1)) col = shift(col, -38); // shaded below
      c.fillStyle = col;
      c.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
    return cv;
  }

  function shift(hex, amt) { // lighten/darken hex color
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ---- Monster definitions: 24 types. Grids are LEFT HALF, mirrored. ----
  // frame2 is derived by shifting bottom rows when not given.
  const MONSTERS = {
    slime: { pal: { a: '#46e08a', b: '#1f8f52', e: '#0b2e1a' }, grid: [
      '....aa', '..aaaa', '.aaaaa', '.aaeaa', 'aaaaaa', 'abbbbb'] },
    bat: { pal: { a: '#9b6bd6', b: '#5e3a91', e: '#ffd23e' }, grid: [
      'b.....', 'bb..aa', 'bbbaaa', '.bbaea', '..baaa', '...aa.'] },
    skullmage: { pal: { a: '#e8e3d5', b: '#7b54c9', e: '#41e0e0', d: '#2a1a4d' }, grid: [
      '..aaaa', '.aaaaa', '.aeaae', '.aaaaa', '..adaa', '.bbbbb', 'bbbbbb', '.bbbbb'] },
    beetle: { pal: { a: '#d6722f', b: '#8a4413', e: '#ffe96b', l: '#3a2008' }, grid: [
      '.l..l.', '..ll..', '.aaaaa', 'aabbba', 'aabbba', '.aaaaa', '.l..l.'] },
    eyeball: { pal: { a: '#f0f0f0', b: '#e03d3d', e: '#1a1a2e', v: '#b85c5c' }, grid: [
      '..aaaa', '.aaaaa', 'aavaaa', 'aabbba', 'aabeba', '.aabba', '..aaaa'] },
    wraith: { pal: { a: '#7fe7f7', b: '#2a6f8a', e: '#ffffff' }, grid: [
      '..aaaa', '.aaaaa', '.aeaae', '.aaaaa', '..aaaa', '.a.aa.', '....a.'] },
    golem: { pal: { a: '#9a9aa8', b: '#5c5c6e', e: '#ff7b3a', d: '#3a3a48' }, grid: [
      '.bbbbb', 'baaaab', 'baeaeb', 'baaaab', '.bbbb.', 'bbabba', 'bb..bb', 'dd..dd'] },
    serpent: { pal: { a: '#5adb5a', b: '#2c8a2c', e: '#ffd23e', t: '#e35050' }, grid: [
      '..aaa.', '.aaeaa', '.aaaaa', '..taa.', '...aaa', '..aaa.', '.aaa..', 'aaa...'] },
    imp: { pal: { a: '#e35050', b: '#8a1f1f', e: '#ffe96b' }, grid: [
      'b....b', '.b..b.', '.aaaa.', 'aaeaea', 'aaaaaa', '.aaaa.', '.b..b.'] },
    shroom: { pal: { a: '#d65cb1', b: '#7e2f66', e: '#fff', s: '#e8d8b0' }, grid: [
      '..aaaa', '.aaeaa', 'aaaaaa', 'abbbba', '..ss..', '..ss..', '.ssss.'] },
    crab: { pal: { a: '#ff8c42', b: '#b35418', e: '#2e1505' }, grid: [
      'b..b..', '.bb...', '.aaaaa', 'aaeaea', 'aaaaaa', '.b.b.b'] },
    ghostking: { pal: { a: '#c9d8ff', b: '#6b7fc9', e: '#ff5c5c', g: '#ffd23e' }, grid: [
      'g.g.g.', 'gggggg', '.aaaaa', '.aeaae', '.aaaaa', '..aaaa', '.a.a.a'] },
    spider: { pal: { a: '#3d3d52', b: '#1f1f2e', e: '#c9304a' }, grid: [
      'b..b..', '.b.b.b', '..aaa.', '.aaeaa', '..aaa.', '.b.b.b', 'b..b..'] },
    jelly: { pal: { a: '#5cc9e8', b: '#2a7fa8', e: '#fff' }, grid: [
      '..aaaa', '.aaaaa', '.aeaae', '.aaaaa', '..b.b.', '.b.b.b', 'b.b.b.'] },
    cyclops: { pal: { a: '#a8d65c', b: '#5c8a2c', e: '#e03d3d', d: '#2e3a14' }, grid: [
      '.aaaaa', 'aaaaaa', 'aadeda', 'aaaaaa', 'aaaaaa', '.bbbb.', '.b..b.', '.d..d.'] },
    reaper: { pal: { a: '#2e2e3e', b: '#15151f', e: '#5cf0c9', s: '#c9c9d8' }, grid: [
      '..aaaa', '.aaaaa', '.aeaae', '.aaaaa', 's.aaaa', 'ss.aaa', 's..aa.', '....a.'] },
    lavaworm: { pal: { a: '#ff6b2e', b: '#a8321f', e: '#ffe96b', d: '#5c140a' }, grid: [
      '.aaaa.', 'aaeaea', 'aaaaaa', '.abba.', '..abba', '...abb', '..abb.', '.dbb..'] },
    frostling: { pal: { a: '#bfeaff', b: '#5ca8d6', e: '#1f3a5c' }, grid: [
      '..a...', '.aaa..', 'aaaaa.', 'aaeaa.', 'aaaaa.', '.aaa..', 'b.a.b.'] },
    voidling: { pal: { a: '#6b2ea8', b: '#3a1466', e: '#f05cf0' }, grid: [
      'e.....', '.aaaa.', 'aaaaaa', 'aaeaea', 'aaaaaa', '.abba.', 'a.bb.a'] },
    hornet: { pal: { a: '#ffd23e', b: '#1f1f1f', e: '#fff', w: '#cfe8ff' }, grid: [
      'w..w..', '.ww...', '.aaaa.', 'abbeba', 'aabbaa', '.aabb.', '..ab..', '...b..'] },
    mimic: { pal: { a: '#a8743a', b: '#6b4214', e: '#fff', t: '#ffd23e' }, grid: [
      '.aaaaa', 'attata', 'aaaaaa', 'aeeeee', 'abbbbb', 'aaaaaa', '.b..b.'] },
    seraph: { pal: { a: '#ffe9b0', b: '#d6a83a', e: '#5c8aff', w: '#fff' }, grid: [
      'w.....', 'ww.aaa', 'www.aa', 'wwaeae', 'ww.aaa', 'w..aaa', '...a.a'] },
    boulder: { pal: { a: '#8a7a6b', b: '#5c4f42', e: '#ff3a3a' }, grid: [
      '.bbbb.', 'baaaab', 'baeaeb', 'baaaab', 'baaaab', '.bbbb.'] },
    hexer: { pal: { a: '#3ad6b8', b: '#1f7a66', e: '#ffd23e', h: '#14443a' }, grid: [
      'h..h..', '.hh...', '.aaaa.', 'aaeaea', 'aaaaaa', '.haah.', 'h.aa.h'] },
  };

  const BOSSES = {
    OMEGA_SLIME: { pal: { a: '#46e08a', b: '#1f8f52', e: '#ff3a3a', c: '#bfffdd' }, grid: [
      '.....ccc', '...ccaaa', '..caaaaa', '.caaaaaa', '.caaeeaa', 'caaaeeaa', 'caaaaaaa', 'caaaaaaa', 'aaaaaaaa', 'abbbbbbb', '.bbbbbbb', '..bbbbbb'] },
    BONE_TYRANT: { pal: { a: '#e8e3d5', b: '#8a8273', e: '#ff5c2e', d: '#2e2a24' }, grid: [
      '..aaaaaa', '.aaaaaaa', '.aaaaaaa', 'aaeeaaee', 'aaeeaaee', 'aaaaaaaa', '.aaddaad', '.aaaaaaa', '..adadad', '...bbbbb', '..bbbbbb', '.bb..bbb'] },
    STORM_EYE: { pal: { a: '#7fb8f0', b: '#2e5c9e', e: '#ffe96b', d: '#0f1f3a' }, grid: [
      '...bbbbb', '..baaaab', '.baaaaaa', 'baaddaaa', 'baadedaa', 'baadddaa', 'baaddaaa', '.baaaaaa', '..baaaab', '...bbbbb'] },
    HELL_BLOOM: { pal: { a: '#ff5c8a', b: '#a81f4d', e: '#ffe96b', g: '#3ad65c' }, grid: [
      'a..a..a.', '.aa.aa.a', '.aaaaaaa', 'aaabbbba', 'aabeebbb', 'aabeebbb', 'aaabbbba', '.aaaaaaa', '..g.g.g.', '..g.gg..', '...gg...', '...gg...'] },
    VOID_MAW: { pal: { a: '#4d1f8a', b: '#2a0f52', e: '#f05cf0', t: '#fff' }, grid: [
      '.aaaaaaa', 'aaaaaaaa', 'aaeeaaee', 'aaeeaaee', 'aaaaaaaa', 'abtbtbtb', 'ab.b.b.b', 'abtbtbtb', 'aaaaaaaa', '.aaaaaaa', '..aaaaaa', '....aaaa'] },
    NOVA_PRIME: { pal: { a: '#ffd23e', b: '#e0561f', e: '#3ae0ff', w: '#fff' }, grid: [
      '.......w', '....wwwa', '..wwaaaa', '.waaaaaa', '.waaeeaa', 'waaaeeaa', 'waabbbaa', 'waabbbaa', '.wabbbaa', '.waaaaaa', '..wwaaaa', '....wwwa'] },
  };

  // Player ship
  const PLAYER = { pal: { a: '#3ae0ff', b: '#1f6b9e', w: '#ffffff', e: '#ff8c42' }, grid: [
    '....w', '...ww', '..waa', '.waaa', '.waab', 'waaab', 'waabb', '.wabb', '.e.bb', 'e..b.'] };

  const GEM = { pal: { a: '#5cffb0', b: '#1fa86b', w: '#fff' }, grid: ['..a', '.aw', 'aaa', '.ab', '..b'] };
  const CHEST = { pal: { a: '#ffd23e', b: '#a8741f', w: '#fff' }, grid: ['.aaa', 'abba', 'awba', 'abba', '.aaa'] };

  function frame2(grid) { // simple 2nd frame: nudge bottom third
    const g = grid.slice();
    const cut = Math.max(1, grid.length - 2);
    for (let i = cut; i < g.length; i++) {
      g[i] = ('.' + g[i]).slice(0, g[i].length);
    }
    return g;
  }

  function get(name) {
    if (cache[name]) return cache[name];
    let out;
    if (MONSTERS[name]) {
      const m = MONSTERS[name];
      out = [render(m.grid, m.pal), render(frame2(m.grid), m.pal)];
    } else if (BOSSES[name]) {
      const b = BOSSES[name];
      out = [render(b.grid, b.pal, 6), render(frame2(b.grid), b.pal, 6)];
    } else if (name === 'player') {
      out = [render(PLAYER.grid, PLAYER.pal, 3, true)];
    } else if (name === 'gem') {
      out = [render(GEM.grid, GEM.pal, 2, true)];
    } else if (name === 'chest') {
      out = [render(CHEST.grid, CHEST.pal, 3, true)];
    }
    cache[name] = out;
    return out;
  }

  // Elite variant: bigger + hue-shifted golden overlay
  function getElite(name) {
    const key = 'elite_' + name;
    if (cache[key]) return cache[key];
    const m = MONSTERS[name];
    const pal = {};
    for (const k in m.pal) pal[k] = shift(m.pal[k], 50);
    pal.e = '#ff3a3a';
    cache[key] = [render(m.grid, pal, 5), render(frame2(m.grid), pal, 5)];
    return cache[key];
  }

  // ---- weapon icon glyphs: one per archetype, left half mirrored ----
  // a = element color, b = secondary (fusion partner color), w = white, g = gold
  const ICONS = {
    projectile: ['....a','...aw','..aww','..aab','..aab','..aab','..aab','.b.ab','b..ab','....b'],
    spread:     ['a...a','aw..a','.a..a','.a.aw','..aaa','..aab','...ab','...ab','..b.b','.b...'],
    homing:     ['....a','...aa','..aaw','..awg','..aww','..aab','.a.ab','a..ab','....b','....b'],
    boomerang:  ['aa...','awa..','.awa.','..awa','...aw','...aa','...ab','..ab.','.ab..','ab...'],
    ricochet:   ['a....','aw...','.aw..','..aw.','...aa','..aw.','.aw..','aw...','a....','.....'],
    chain:      ['..aaw','..aw.','.aw..','.aaaw','...aw','..aw.','.aw..','aaaw.','..aw.','..a..'],
    nova:       ['....a','.a..a','..a.a','...aa','aaaaw','...aa','..a.a','.a..a','....a','.....'],
    spiral:     ['..aaa','.a...','a..aa','a.a..','a.a.w','a.a..','a..a.','.a...','..aaa','.....'],
    orbit:      ['..aaa','.a...','a....','a..ww','a..ww','a....','.a...','..aaa','.....','..g..'],
    beam:       ['...aw','...aw','...aw','..aaw','..aaw','..aaw','...aw','...aw','...aw','...aw'],
    aura:       ['..aaa','.a...','a..g.','a.g.g','a..g.','a....','.a...','..aaa','.....','.....'],
    whip:       ['aa...','.aa..','..aa.','...aa','...aa','...aw','..aw.','.aw..','aw...','w....'],
    mine:       ['..a..','.a.a.','..aaa','.aabb','.aagb','.aabb','..aaa','.a.a.','..a..','.....'],
    drone:      ['..a.a','...a.','..aaa','.aaww','.aagw','.aaaa','...a.','..a.a','.a...','.....'],
    turret:     ['....a','..aaa','.aaaw','.aaaa','..aaa','...b.','..bbb','..b.b','.b..b','.....'],
    blackhole:  ['..aaa','.a...','a.bbb','a.bbb','a.bbg','a.bbb','.a...','..aaa','.....','.....'],
    wall:       ['aa.aa','aa.aa','.....','a.aa.','a.aa.','.....','aa.aa','aa.aa','.....','.....'],
    mirror:     ['a....','aw...','.aw..','..a..','..a..','..a..','..a..','.aw..','aw...','a....'],
    lance:      ['....w','...wa','...aa','...aa','...ab','...ab','...ab','..g.b','.g..b','....b'],
    storm:      ['.aabb','aaabb','aaaab','.aaa.','...w.','..w..','.ww..','..w..','.w...','w....'],
    bladering:  ['..a.a','.a..a','a..a.','a.a.w','a..a.','.a..a','..a.a','...a.','.....','.....'],
  };

  function weaponIcon(def) {
    const key = 'icon_' + def.id;
    if (cache[key]) return cache[key];
    const grid = ICONS[def.arch] || ICONS.projectile;
    const pal = {
      a: def.color,
      b: def.color2 || shift(def.color, -70),
      w: '#ffffff', g: '#ffd23e',
    };
    cache[key] = render(grid, pal, 4, true);
    return cache[key];
  }

  return { get, getElite, MONSTERS, BOSSES, render, weaponIcon };
})();
