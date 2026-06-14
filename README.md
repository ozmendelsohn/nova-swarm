# NOVA SWARM

A reverse bullet hell (Vampire Survivors-like) set on the **Loomworld** — a
living tapestry unraveling into monsters. Pure HTML5 Canvas + vanilla JS,
no build step, no dependencies.

**Play it: https://nova-swarm.onrender.com**

## Features
- **252 weapon forms**: 28 base weapons × 2 evolution branches + 168 joint
  evolutions (fuse two mastered weapons), built on **36 behavior archetypes**
- **38 animated pixel-art enemies** + 6 bosses with bullet-hell patterns
- **4 playable characters** with abilities that unlock by level
- **Prestige**: Weaver's Coins persist across runs; spend them in the Loom Shop
- Touch support (virtual joystick + two-finger dash), desktop WASD + Space
- Living world: dye-field provinces, warp-thread blessings, loom shrines,
  moth plagues, breakable props

## Design docs
- [`ART_STYLE.md`](ART_STYLE.md) — the "Arcade Folklore" visual rules
  (layer lightness budgets, the 7-dye palette, gold = reward only)
- [`LORE.md`](LORE.md) — the Loomworld fiction that drives every visual

Read both before changing any art.

## Repo layout
```
index.html              screens + script loading order
css/style.css           UI (arcade-cabinet framing, cards, shop)
js/util.js              math, RNG, spatial hash
js/sprites.js           procedural pixel-art (monsters, icons, props)
js/particles.js         pooled particles + damage numbers
js/projectiles.js       pooled player/enemy projectiles
js/audio.js             WebAudio synth SFX + chiptune
js/meta.js              prestige: coins + permanent upgrades (localStorage)
js/characters.js        playable characters + level perks
js/player.js            movement, input (keys + touch), HP/XP
js/enemies.js           38 enemy types, bosses, wave spawner
js/world.js             terrain rendering, pickups, breakable props
js/ui.js                HUD, level-up cards, codex, screens
js/main.js              game loop, state machine, combat API, wiring
js/weapons/archetypes.js  36 weapon behaviors (logic)
js/weapons/weaponfx.js    weapon drawing
js/weapons/weapons.js     28 base + 56 branch definitions (data)
js/weapons/fusions.js     168 fusion recipes (generated data)
js/weapons/manager.js     slots, leveling, branching, fusion offers
scripts/validate.js     data sanity checks
```

## Develop
```bash
python3 -m http.server 8741   # then open http://localhost:8741
```

Validate before pushing:
```bash
for f in js/*.js js/weapons/*.js; do node --check "$f" || break; done
node scripts/validate.js
```

## Global scoreboard + comments (Supabase)
The end-of-run screen submits the player's name, run stats, an optional public
comment, and an optional private note (dev-only feedback) to Supabase. The top
runs show on the main menu and game-over screens. To enable:

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
   This makes the `scores` table (RLS: anon may insert, never select) and a
   `public_scores` view that omits `private_note`.
2. Paste your project URL + anon key into `js/config.js`. The anon key is safe
   to ship — RLS protects the data, and private notes are only readable from the
   Supabase dashboard.

If `js/config.js` is left blank the game runs fully offline (the submit form and
leaderboard simply hide).

## Deploy
Push to `main` → Render auto-deploys the static site (config in
`render.yaml`). Nothing else to do.
