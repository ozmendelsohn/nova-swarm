// ---- audio.js : WebAudio synth SFX + chiptune loop ----
const Snd = (() => {
  let ctx = null, master = null, musicGain = null, started = false, muted = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  }

  function blip(freq, dur, type = 'square', vol = 0.18, slide = 0) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol = 0.15) {
    if (!ctx || muted) return;
    const n = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(master); s.start();
  }

  const SFX = {
    shoot: () => blip(700, 0.06, 'square', 0.04, -300),
    hit: () => blip(220, 0.05, 'sawtooth', 0.05, -100),
    kill: () => { blip(330, 0.1, 'square', 0.08, -200); noise(0.07, 0.06); },
    gem: () => blip(880, 0.08, 'sine', 0.1, 400),
    levelup: () => { blip(440, 0.12, 'square', 0.12); setTimeout(() => blip(660, 0.12, 'square', 0.12), 90); setTimeout(() => blip(880, 0.2, 'square', 0.12), 180); },
    hurt: () => { blip(140, 0.2, 'sawtooth', 0.2, -60); noise(0.15, 0.1); },
    dash: () => blip(500, 0.12, 'sine', 0.1, 600),
    explode: () => noise(0.3, 0.2),
    elite: () => { blip(180, 0.3, 'sawtooth', 0.15, -80); },
    boss: () => { blip(110, 0.6, 'sawtooth', 0.25, -40); setTimeout(() => blip(98, 0.6, 'sawtooth', 0.25, -30), 300); },
    fusion: () => { for (let i = 0; i < 6; i++) setTimeout(() => blip(440 + i * 160, 0.15, 'square', 0.12), i * 70); noise(0.4, 0.12); },
    bosskill: () => { noise(0.6, 0.3); for (let i = 0; i < 5; i++) setTimeout(() => blip(220 + i * 110, 0.25, 'square', 0.15), i * 100); },
  };

  function play(name) { if (ctx && SFX[name]) SFX[name](); }

  // --- chiptune loop: simple bass + arp pattern in A minor ---
  const BASS = [110, 110, 130.8, 98, 110, 110, 87.3, 98];
  const ARP = [220, 261.6, 329.6, 440, 329.6, 261.6, 392, 329.6];
  let step = 0, musicTimer = null;

  function musicTick() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    // bass
    const b = ctx.createOscillator(), bg = ctx.createGain();
    b.type = 'triangle'; b.frequency.value = BASS[step % 8] / 2;
    bg.gain.value = 0.5; bg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t + 0.24);
    // arp
    if (step % 2 === 0) {
      const a = ctx.createOscillator(), ag = ctx.createGain();
      a.type = 'square'; a.frequency.value = ARP[(step / 2 | 0) % 8] * (step % 16 < 8 ? 1 : 1.5);
      ag.gain.value = 0.12; ag.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      a.connect(ag); ag.connect(musicGain); a.start(t); a.stop(t + 0.14);
    }
    step++;
  }

  function startMusic() {
    if (started) return;
    started = true;
    musicTimer = setInterval(musicTick, 130);
  }

  function toggleMute() { muted = !muted; return muted; }

  return { init, play, startMusic, toggleMute };
})();
