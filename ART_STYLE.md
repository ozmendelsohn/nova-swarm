# NOVA SWARM — Art Style Guidelines

> The fiction behind these rules lives in **LORE.md** (the Loomworld, the
> Unraveling, the Threadbound). When a visual question isn't covered here,
> answer it from the lore: "what would this look like on a living tapestry?"

## The style: **ARCADE FOLKLORE**
The world is a living, neon-dyed **woven tapestry** — as if a folk-art textile
got possessed by an arcade cabinet. Monsters are embroidered charms that came
to life; weapons are hand-stitched talismans; magic burns holes in the fabric.

Three pillars, in priority order:

1. **Readability is sacred.** This is a bullet hell — the player must parse
   the screen in a glance, always.
2. **Everything is hand-made.** No flat programmer-art shapes; every visible
   element gets outline, shading, and asymmetric detail, like someone pixelled
   it with love.
3. **Color is the world.** Darkness is not allowed to be the default; the
   ground itself flows with dyed color. Mood comes from hue, never from black.

---

## Layer contract (back to front)
Each layer must be strictly brighter/sharper than the one behind it:

| Layer | Lightness budget | Saturation | Outline? |
|---|---|---|---|
| Terrain tiles | L 22–34% | 50–65% | no |
| Terrain decorations | L ≤ 70%, small | high | no |
| Shadows | dark plum `rgba(20,8,40,.35)`, never black | — | — |
| Monsters | L 45–75% | full | **always** `#241636` |
| Player + projectiles | brightest things on field | full + white cores | glow |
| Damage numbers / HUD | white/gold with dark backing | — | text shadow |

Rule of thumb: **if a projectile could be mistaken for a decoration, the
decoration is too bright.** Tune the ground down, never the actor up past
its budget.

## Palette
- **Base hue**: the terrain flows through the whole wheel slowly; lightness
  stays in budget so anything saturated+bright reads as "alive".
- **The 7 element families** are the fixed accent palette and may never drift:
  Fire `#ff6b2e` · Frost `#5cc9ff` · Volt `#ffe93e` · Void `#b05cff` ·
  Nature `#5ce86b` · Steel `#c9ccd6` · Arcane `#ff5cd6`
- **Gold `#ffd23e`** is reserved for *reward and rarity*: XP language, elite
  markers, fusion stars, pommels, rivets. Never use it for damage or terrain.
- **Pure white** is reserved for *energy cores and highlights* — the hottest
  pixel of anything.
- **Outline plum `#241636`** is the universal sprite outline; it doubles as
  the shadow tint. True black `#000` is forbidden outside text shadows.

## Sprites (monsters, player, pickups)
- Built as **mirrored half-grids** → folk-embroidery symmetry is the default;
  break symmetry only with small details (a tilted eye, one raised claw).
- The renderer adds, automatically, on every sprite: 1px plum outline,
  top-edge highlight (+48 light), bottom-edge shade (−38). Design grids
  assuming this — leave room for the form to "pop".
- Each monster needs a **unique silhouette readable at 50% size**. Test:
  fill the sprite solid black — can you still name it?
- 2 frames minimum; the cheap second frame nudges the bottom rows (gait).
- Elites: same grid, +50 brightness palette, red eyes, 5px scale, gold halo.
- Bosses: 6px scale, asymmetric details allowed, must dwarf the player.

## Weapons & projectiles
- **Element = silhouette language**, consistent everywhere (shots, icons):
  Fire→teardrop/flame · Frost→faceted crystal · Volt→jagged zigzag ·
  Void→dark core with bright ring · Nature→leaf/petal curve ·
  Steel→toothed disc/blade · Arcane→4-point star.
- Every projectile carries a **living trail** in its element's behavior:
  embers rise, glitter falls, sparks kick back, motes spiral, stardust twinkles.
- Persistent weapons are *objects*, not zones: orbitals are forged swords,
  auras are rotating rune-circles, beams have core/halo/ripples.
- Fusions are **two-tone**: parent A's shape, parent B's secondary color,
  and they must visibly do both parents' behaviors.
- Weapon icons use the same glyph grammar (archetype shape × element color)
  at 10×10, so a player can read a card's mechanics before reading its text.

## Motion & juice
- Nothing pops in/out — everything bursts, flashes, or fades.
- Hits: white flash on sprite + element-colored burst + damage number.
- Kills: chunky burst; bosses add hit-stop (0.35s), shake, screen flash.
- Fusion: the loudest moment in the game — freeze, double color burst, flash.
- Idle motion everywhere: sprites bob, gems sparkle-bounce, icons float,
  terrain hues drift. The tapestry is *alive*.
- Screen shake is earned: 4 explosion / 6 player hurt / 10 boss spawn /
  14–18 fusion & boss kill. Never constant.

## UI
- Framed like an **enchanted arcade cabinet**: chunky borders, stitched
  dashed seams, gold corner rivets, woven diagonal texture in panels.
- Monospace type, generous letter-spacing, UPPERCASE for ritual words
  (LEVEL UP, JOINT EVOLUTION).
- Menus sit on flowing aurora gradients — even "paused" screens stay colorful.
- Card rarity language: blue frame = normal, gold = evolution path,
  pulsing pink/gold = joint evolution. Rarity is *felt* before it's read.

## Anti-patterns (never do)
- Flat untextured fills covering large areas.
- Black backgrounds, grey UI, "tactical" muted palettes.
- Recolor-only variants presented as new content (recolors must also change
  scale, decoration, or behavior).
- Bullets/pickups that share both hue *and* shape with anything else.
