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
    const put = (x, y, col) => { c.fillStyle = col; c.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale); };
    // outline pass: selective outlining (selout) — lighter plum toward the
    // light (top-left), darker toward the shadow (bottom-right). Reads as volume.
    for (let y = -1; y <= rows; y++) for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      const touches = filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)
        || filled(x - 1, y - 1) || filled(x + 1, y - 1) || filled(x - 1, y + 1) || filled(x + 1, y + 1);
      if (!touches) continue;
      const litScore = (filled(x, y + 1) ? 1 : 0) + (filled(x + 1, y) ? 1 : 0); // sprite is below/right → this edge faces the light
      const shadeScore = (filled(x, y - 1) ? 1 : 0) + (filled(x - 1, y) ? 1 : 0);
      const o = litScore > shadeScore ? '#4a3a66' : shadeScore > litScore ? '#160a26' : '#241636';
      put(x, y, o);
    }
    // color pass: directional light from top-left, warm highlights / cool shadows
    for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
      const ch = px[y][x];
      if (ch === '.') continue;
      const base = palette[ch];
      const eAbove = !filled(x, y - 1), eLeft = !filled(x - 1, y);
      const eBelow = !filled(x, y + 1), eRight = !filled(x + 1, y);
      let col;
      if (eAbove && eLeft) col = shade(base, 70, 12);        // specular corner (top-left)
      else if (eAbove || eLeft) col = shade(base, 46, 9);    // lit edge — warm
      else if (eBelow && eRight) col = shade(base, -52, -14);// deep shadow corner — cool
      else if (eBelow || eRight) col = shade(base, -34, -9); // shaded edge — cool
      else col = base;
      put(x, y, col);
    }
    return cv;
  }

  // lighten/darken with optional warm/cool tint (+warm = redder, -warm = bluer)
  function shade(hex, amt, warm = 0) {
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    let r = (n >> 16) + amt + warm, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt - warm;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
  const shift = shade; // back-compat alias for elite/icon recolors

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
    scarab: { pal: { a: '#3aa8d6', b: '#1f5c8a', e: '#ffd23e', g: '#7fe8ff' }, grid: [
      '..gg..', '.aaaa.', 'agaaga', 'aaeaea', 'agaaga', '.aaaa.', 'b..b..'] },
    raven: { pal: { a: '#2e2e44', b: '#15152a', e: '#ff8c42', k: '#ffd23e' }, grid: [
      'b.....', 'bb.aa.', 'bbbaaa', '.baaea', '..aaak', '..aa..', '.b.b..'] },
    banshee: { pal: { a: '#c9b8e8', b: '#7a5ca8', e: '#3ae0ff', h: '#f0eaff' }, grid: [
      '.hhh..', 'haaah.', 'haeaeh', '.aaaa.', '.aeea.', '.aaaa.', '.a.a..', '..a...'] },
    cactoid: { pal: { a: '#7ac95c', b: '#3a8a2c', e: '#ffd23e', f: '#ff5cd6' }, grid: [
      '..f...', '.aaa..', 'aaeaa.', 'aaaaa.', 'b.a.b.', 'b.a.b.', '..a...', '.bbb..'] },
    snail: { pal: { a: '#e8a85c', b: '#a8642c', e: '#1f1f2e', s: '#d65cb1' }, grid: [
      'a.....', 'ae.sss', 'a.ssss', 'aassbs', 'aasssb', 'aaaaaa', '.aaaaa'] },
    mantis: { pal: { a: '#5ce8a8', b: '#1f8a5c', e: '#1a1a2e', c: '#bfffdd' }, grid: [
      'c..a..', '.caea.', '..aaa.', '.aaa..', 'a.ab..', 'a.ab..', '..b.b.', '.b...b'] },
    gargoyle: { pal: { a: '#8a8aa0', b: '#4a4a5e', e: '#ff3a3a', w: '#b8b8cc' }, grid: [
      'w....w', 'ww..ww', '.waaw.', '.aeae.', '.aaaa.', '.abba.', 'b.bb.b', 'b....b'] },
    djinn: { pal: { a: '#5c8aff', b: '#2a4aa8', e: '#ffd23e', s: '#bfd8ff' }, grid: [
      '.sss..', 'saaas.', 'saeaes', '.aaaa.', '.aaaa.', '..ab..', '...b..', '..b...'] },
    krakenspawn: { pal: { a: '#d65c8a', b: '#8a2c5c', e: '#ffe96b' }, grid: [
      '.aaaa.', 'aaeaea', 'aaaaaa', '.aaaa.', 'a.a.a.', '.a.a.a', 'a.a.a.', '.a..a.'] },
    bomber: { pal: { a: '#ff5c2e', b: '#a82c14', e: '#fff', f: '#ffe93e' }, grid: [
      '..f...', '..b...', '.aaaa.', 'aaaaaa', 'aaeaea', 'aaaaaa', '.aaaa.', '..bb..'] },
    knightling: { pal: { a: '#c9ccd6', b: '#6e7282', e: '#3ae0ff', p: '#ff5c5c' }, grid: [
      '..p...', '.aaaa.', '.aeae.', '.aaaa.', 'baaaab', 'b.aa.b', '..aa..', '.b..b.'] },
    moth: { pal: { a: '#e8d65c', b: '#a8942c', e: '#f05cf0', w: '#fff0bf' }, grid: [
      'ww..ww', 'wwwwww', 'wwaaww', 'w.aea.', '..aa..', '..aa..', '...a..', '..a...'] },
    stalker: { pal: { a: '#4a2c66', b: '#2a1440', e: '#5cf0c9', t: '#8a5cb8' }, grid: [
      't....t', '.t..t.', '..aa..', '.aaaa.', '.aeae.', '.aaaa.', 't.aa.t', '..tt..'] },
    lanternfly: { pal: { a: '#ffe9a8', b: '#a8742a', e: '#ff8c42', w: '#fff' }, grid: [
      'w..w..', '.ww...', '.aaaa.', 'aaeaea', '.aaaa.', '..ww..', '..ee..', '...e..'] },
    foxfire: { pal: { a: '#ff9e3e', b: '#b85c14', e: '#fff', t: '#ffe96b' }, grid: [
      't....t', '.t..t.', '.aaaa.', 'aaeaea', 'aaaaaa', '.aaaa.', 'a.aa.a', 't....t'] },
    tumbler: { pal: { a: '#b8a05c', b: '#7a6428', e: '#3a2c0a' }, grid: [
      '.a.a..', 'a.a.a.', '.aeaa.', 'a.aa.a', '.aaea.', 'a.a.a.', '.a.a..'] },
    pincer: { pal: { a: '#d65c5c', b: '#8a2424', e: '#ffe96b', l: '#5c1414' }, grid: [
      'l....l', 'll..ll', '.aaaa.', 'aaeaea', 'aaaaaa', '.abba.', 'l.bb.l'] },
    magmite: { pal: { a: '#ff6b2e', b: '#8a2c0a', e: '#ffe96b', d: '#3a1404' }, grid: [
      '.bbbb.', 'baaaab', 'baeaeb', 'bdaadb', 'baaaab', '.bbbb.', 'd....d'] },
    icefang: { pal: { a: '#bfeaff', b: '#5ca8d6', e: '#1f3a5c', w: '#fff' }, grid: [
      'a....a', '.a..a.', '.aaaa.', 'aaeaea', 'aawwaa', '.aww..', '..w...'] },
    sparkmite: { pal: { a: '#ffe93e', b: '#a8861f', e: '#fff' }, grid: [
      '..a...', '.aaa..', 'aaeaa.', '.aaa..', 'a.a.a.', '.a.a..'] },
    voideye: { pal: { a: '#6b2ea8', b: '#2a0f52', e: '#f05cf0', w: '#d8b8ff' }, grid: [
      '.bbbb.', 'baaaab', 'bawwab', 'baweab', 'baaaab', '.bbbb.'] },
    bloomling: { pal: { a: '#ff8cc9', b: '#b8407a', e: '#ffe96b', g: '#5ce86b' }, grid: [
      '.a..a.', 'aaaaaa', 'aaeaea', 'aaaaaa', '.aaaa.', '..gg..', '..g...', '.gg...'] },
    rusthound: { pal: { a: '#b8703a', b: '#6b3a14', e: '#ffe96b', d: '#3a1c08' }, grid: [
      'a.....', 'aa.aaa', '.aaaaa', '.aeaea', '.aaaaa', '.ad.da', '.d...d'] },
    glasswing: { pal: { a: '#d8f0f5', b: '#7ab8c9', e: '#2a6b8a', w: '#fff' }, grid: [
      'w..a..', 'ww.aa.', 'wwaaea', 'ww.aa.', 'w..a..', '...a..'] },
    owlet: { pal: { a: '#a88a5c', b: '#6b522a', e: '#ffe96b', w: '#e8d8b8' }, grid: [
      'a....a', 'aa..aa', 'awewea', 'awaawa', '.aaaa.', '.abba.', '..b.b.'] },
    lurkfish: { pal: { a: '#3a6b8a', b: '#14344a', e: '#5cf0c9', t: '#7ab8d6' }, grid: [
      '......', 't.aaa.', 'taaeaa', 'taaaaa', 't.aaa.', '...a..', '..a...'] },
    barnacle: { pal: { a: '#8a8a7a', b: '#52523f', e: '#ff5c5c', m: '#d65c8a' }, grid: [
      '..mm..', '.maam.', '.aaea.', 'aaaaaa', 'abbbba', 'bbbbbb'] },
    fumebat: { pal: { a: '#5c5c8a', b: '#2c2c4a', e: '#a8f05c', s: '#8a8ab8' }, grid: [
      'b....b', 'bb.sbb', 'bbsasb', '.baea.', '..aaa.', '.s..s.'] },
    thornling: { pal: { a: '#5ce86b', b: '#1f8a3a', e: '#ffd23e', t: '#0f4a1f' }, grid: [
      't.t.t.', '.aaa..', 'taeat.', '.aaa..', 't.a.t.', '..b...', '.bb...'] },
    coilworm: { pal: { a: '#d6a85c', b: '#8a642a', e: '#3a2408' }, grid: [
      '.aaa..', 'aaeaa.', 'a.aaa.', '.aa.a.', 'aa..a.', 'a..aa.', '.aaa..'] },
    gravekite: { pal: { a: '#c9c9d8', b: '#6e6e85', e: '#5cf0c9', d: '#2c2c3a' }, grid: [
      '..a...', '.aaa..', 'aaeaa.', 'daaad.', '.aaa..', '..a...', '..d...', '..d...'] },
    sunmote: { pal: { a: '#ffd23e', b: '#c98a14', e: '#fff', r: '#ff8c42' }, grid: [
      'r..r..', '.aaa..', 'raear.', '.aaa..', 'r..r..', '......'] },
    inkling: { pal: { a: '#2c2c44', b: '#14141f', e: '#f05cf0', s: '#5c5c8a' }, grid: [
      '.aaaa.', 'aaeaea', 'aaaaaa', '.asas.', 's.s.s.', '.s.s..'] },
    bramblebear: { pal: { a: '#6b8a3a', b: '#3a521f', e: '#ff5c5c', t: '#24340f' }, grid: [
      '.a..a.', 'aaaaaa', 'aaeaea', 'aaaaaa', 'taaaat', 'aabbaa', 'tb..bt'] },
    chimeling: { pal: { a: '#d6c95c', b: '#8a7e2a', e: '#3ae0ff', w: '#fff8d0' }, grid: [
      '..aa..', '.aaaa.', '.aeae.', '.aaaa.', 'w.aa.w', '..ww..', '..w...'] },
    boneworm: { pal: { a: '#e8e3d5', b: '#a89e8a', e: '#ff5c2e' }, grid: [
      '.aaa..', 'aaeaa.', 'ab.ba.', '.aab..', '..aab.', '.aab..', 'aab...'] },
    ashwalker: { pal: { a: '#8a8a8a', b: '#4a4a4a', e: '#ff6b2e', d: '#2a2a2a' }, grid: [
      '..aa..', '.aaaa.', '.aeae.', '.aaaa.', '.dada.', '.a..a.', '.d..d.'] },
    pearlsnail: { pal: { a: '#e8d8f0', b: '#a88ac9', e: '#2a1a4a', s: '#fff' }, grid: [
      'a.....', 'ae.sss', 'a.s.ss', 'aass.s', 'aasssb', 'aaaaaa'] },
    stormcrow: { pal: { a: '#3a4a6b', b: '#1c2438', e: '#ffe93e', w: '#7a8ab8' }, grid: [
      'b.....', 'bb.aa.', 'bbbaae', '.bwaaa', '..waa.', '.w.a..', '....a.'] },
    maweater: { pal: { a: '#8a3a6b', b: '#4a1438', e: '#ffe96b', t: '#fff' }, grid: [
      '.aaaa.', 'aaaaaa', 'aeaaea', 'atatat', 'aat.ta', '.aaaa.', '..aa..'] },
    gildedmoth: { pal: { a: '#ffd23e', b: '#a8741f', e: '#fff', w: '#fff3c4' }, grid: [
      'ww..ww', 'wwwwww', 'wwaaww', 'w.aea.', '..aa..', '..aa..', '...a..', '..a...'] },
    toad: { pal: { a: '#8ac93a', b: '#4a8a14', e: '#ffd23e', u: '#d8ffb0' }, grid: [
      '.a..a.', '.aaaa.', 'aaeaea', 'aaaaaa', 'auuuua', 'auuuua', '.aaaa.', 'b....b'] },
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
  const SPOOL = { pal: { a: '#d65cb1', b: '#7a2c66', s: '#e8d8b0', g: '#ffd23e' }, grid: [
    '.ss.', 'saas', 'aaag', 'aaaa', 'aaag', 'saas', '.ss.'] };
  const MAGNET = { pal: { a: '#3ae0ff', b: '#1f6b9e', w: '#fff' }, grid: ['aa.', 'aab', 'a..', 'a..', 'aab', 'aa.', 'w.w'] };
  const COIN = { pal: { a: '#ffd23e', b: '#a8741f', w: '#fff8d0' }, grid: ['.aa', 'aab', 'awb', 'aab', '.aa'] };
  const URN = { pal: { a: '#5c8aff', b: '#2a4aa8', g: '#ffd23e', d: '#1a2a5c' }, grid: [
    '.ga', 'gaa', '.aa', 'aaa', 'add', 'add', 'aaa', '.gg'] };
  const COCOON = { pal: { a: '#d8cfc0', b: '#a89a85', t: '#ff8c5c', e: '#5cf0c9' }, grid: [
    '.ta', 'taa', 'aaa', 'aea', 'aaa', 'aab', '.ab', '..t'] };
  const SHRINE = { pal: { a: '#a8743a', b: '#6b4214', g: '#ffd23e', w: '#fff8d0' }, grid: [
    'g..', '.g.', 'wgw', '.a.', 'aaa', 'a.a', 'a.a', 'bbb'] };
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
    } else if (name === 'spool') {
      out = [render(SPOOL.grid, SPOOL.pal, 4, true)];
    } else if (name === 'magnet') {
      out = [render(MAGNET.grid, MAGNET.pal, 3, false)];
    } else if (name === 'coin') {
      out = [render(COIN.grid, COIN.pal, 3, true)];
    } else if (name === 'urn') {
      out = [render(URN.grid, URN.pal, 4, true)];
    } else if (name === 'cocoon') {
      out = [render(COCOON.grid, COCOON.pal, 4, true)];
    } else if (name === 'shrine') {
      out = [render(SHRINE.grid, SHRINE.pal, 4, true)];
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
    splitter:   ['....a','....a','...aw','...aa','..a.a','.a..b','a...b','....b','...b.','..b..'],
    mortar:     ['.....','..aaa','.aaaw','.aaaa','..aaa','.....','.b.b.','b.b.b','.bbb.','..b..'],
    flail:      ['w....','.g...','..g..','...g.','...aa','..aaa','..aaw','...aa','..a.a','.....'],
    geyser:     ['...a.','..aw.','..aw.','.aaw.','.aaa.','aaaa.','.bbb.','bb.bb','.....','.....'],
    tether:     ['aa...','a.a..','.a.a.','..a.a','...aa','..a.a','.a.a.','a.a..','aa...','.....'],
    comet:      ['....a','...aw','..aww','.a.aa','a..a.','..a..','.a...','a....','.....','.....'],
    pulsar:     ['....a','..a.a','...aa','aaaaw','...aa','..a.a','....a','.....','..g..','.....'],
    scythe:     ['.aaaa','aaw..','aw...','aw...','a....','.b...','.b...','.b...','.b...','..b..'],
    wave:       ['a....','aw...','.aw..','..aw.','...aa','..aw.','.aw..','aw...','a....','.....'],
    anchor:     ['..aa.','..aa.','...a.','...a.','a..a.','aw.a.','.a.a.','..aa.','...a.','.....'],
    critter:    ['.a.a.','..a..','.aaa.','awaaa','.aaa.','a.a.a','.....','.a.a.','a.a.a','.....'],
    sticky:     ['.....','..aa.','.aaaa','.awaa','.aaaa','..aa.','.b.b.','b.b.b','.....','.....'],
    harpoon:    ['....a','...aw','..aww','...aa','...a.','..b..','.b...','b....','b....','.....'],
    jugger:     ['..aaa','.aaaa','aabaa','aaaaw','aabaw','.aaaa','..aaa','.....','.....','.....'],
    totem:      ['.aaa.','.awa.','.aaa.','..b..','.bwb.','..b..','.bbb.','..b..','.bb..','.....'],
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
    const glyph = render(grid, pal, 4, true);
    // mount the glyph on a talisman plate; tier decides the frame
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const dark = shift(def.color, -95), mid = shift(def.color, -70);
    if (def.tier === 'fusion') { // split two-tone plate
      px(4, 4, S - 8, S - 8, shift(def.color, -85));
      c.fillStyle = shift(def.color2 || def.color, -75);
      c.beginPath(); c.moveTo(S - 4, 4); c.lineTo(S - 4, S - 4); c.lineTo(4, S - 4); c.fill();
    } else {
      px(4, 4, S - 8, S - 8, dark);
      px(4, 4, S - 8, 10, mid); // top sheen band
    }
    // frame: gold for evolutions/fusions, element-tint for base
    const frame = def.tier === 'base' ? mid : '#ffd23e';
    px(4, 0, S - 8, 4, frame); px(4, S - 4, S - 8, 4, frame);
    px(0, 4, 4, S - 8, frame); px(S - 4, 4, 4, S - 8, frame);
    // notched corners (talisman cut)
    px(4, 4, 4, 4, frame); px(S - 8, 4, 4, 4, frame);
    px(4, S - 8, 4, 4, frame); px(S - 8, S - 8, 4, 4, frame);
    if (def.tier === 'fusion') { // fusion star pip
      px(S / 2 - 2, 0, 4, 4, '#fff');
    }
    c.drawImage(glyph, (S - glyph.width) / 2, (S - glyph.height) / 2);
    cache[key] = cv;
    return cv;
  }

  // solid-color silhouette of a sprite (cached) — for hit-flash / freeze tint
  const tintCache = new WeakMap();
  function tinted(cv, color) {
    let m = tintCache.get(cv);
    if (m && m._color === color) return m;
    const t = document.createElement('canvas');
    t.width = cv.width; t.height = cv.height;
    const tc = t.getContext('2d');
    tc.imageSmoothingEnabled = false;
    tc.drawImage(cv, 0, 0);
    tc.globalCompositeOperation = 'source-atop';
    tc.fillStyle = color; tc.fillRect(0, 0, t.width, t.height);
    t._color = color;
    tintCache.set(cv, t);
    return t;
  }

  return { get, getElite, MONSTERS, BOSSES, render, weaponIcon, tinted };
})();
