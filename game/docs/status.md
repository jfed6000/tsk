# Texas Shitkickers: status

*The handoff document: what exists, what's verified, what's next. Last updated 2026-10-12.*

Tracked in PPM as `texas-shitkickers` (id 658): the roadmap, the user's tasks, and a journal entry after each session.

## Decided

- **Genre: a brawler** (Final Fight / Double Dragon), decided 2026-10-12 after playing both. The platformer is kept at
  `?mode=platformer` for reference.
- **Tone: darker**, "darker but still fun" (Main Street at dusk), with an **undead posse** for the menace.
- **Controls: two buttons** (jump, kick); side kick = back + kick; C is a shortcut for SNES pads (3 buttons).
- **Pickup weapons:** bullwhip and six-shooter (six shots, then tossed).
- **The hero is called "Shitkickers"**, the boots themselves. Ringo is the cowboy who died wearing them.

## What exists

A browser prototype (`index.html`, no build step) that follows the F256 display rules (`f256-plan.md`).

| Part | State |
|---|---|
| **Hero** | Final design: two cowboy boots joined to a very high crotch, a face across both, hat, arms. Profile when moving, faces the camera when standing. 74 frames, including grab, throw, whip and shoot |
| **Story** | `story.md`: "died with his boots on" revenge western. the Shitkickers (the boots Ringo died in) against the Diamondback Gang |
| **Stage 1: Boot Hill (brawler)** | The wordless opening (rise from the grave, the hat hops on), the graveyard, five waves of skeletons clawing out of the ground plus dillos, lightning, boss **Two-Bit** (shovel swing, clods thrown across lanes, tunnels through depth and bursts up into a daze, raises two dead at half health) |
| **Stage 2: Main Street at dusk** | False fronts, sunset, night falling a step per wave (a CLUT fade that spares the lights), mangy coyotes and skeleton gunslingers, five waves, then "TO BE CONTINUED..." |
| **Brawler systems** | Depth band with shadows, waves with screen lock and "GO >>", 3-kick combo, side kick, flying kick, stomp, grab/knee/throw, weapon pickups, beans, health bar plus lives (hats), last-hit enemy bar, combos, game over |
| **Skeleton gunslinger** | Keeps distance, aligns to your lane, aims (eyes flare), fires dodgeable bullets, reloads after six; heap and reassemble; skull knocked off, headless body gropes for it, skull kickable into others; shatters into bones; sometimes drops its gun |
| **F256: asset exporter** | `f256/tools/export.py` + `game/js/export.js`: Boot Hill → tiles.bin (576 tiles, 3 sets), maps.bin, sprites.bin (514 cells), frames.bin (186 frames), CLUTs, generated `f256/src/tskassets.d`; preview PNGs rebuilt from the binaries |
| **F256: tsk (the game)** | `f256/src/tsk.asm` + `.a` files, P4 sprint 1: the hero on Boot Hill with every move, camera, display list, shadow, `tsk d` demo. Verified on the host 6809 (`make host`) and in MAME; K2 run pending |
| **F256: tskview** | `f256/src/tskview.asm`: the asset viewer and graphics harness. Three scrolling tile layers, hero and skeleton as metasprites cycling their animations, mirrored frames, lightning and hit flash as CLUT swaps, clean exit. **Runs in MAME** (`make mame`) **and on the K2** (user, 2026-10-12: "looks pretty smooth"; no visible 8 px tile offset) |
| **Platformer** | `?mode=platformer`: the earlier Boot Hill (pits, platforms, buzzards, Two-Bit) and the desert test range |

## Files

| File | What |
|---|---|
| `js/sprites.js` | Palette/CLUTs, pixelizer, hero (pose system), dillo, barrel, effects, tiles, desert backdrop, font, sheet |
| `js/boothill.js` | Night sky, Buzzard, Two-Bit (normal and mangy), Ringo's headstone and grave, props, boss bar |
| `js/undead.js` | Skeleton gunslinger sprites; the Boot Hill graveyard street for the brawler |
| `js/mainstreet.js` | Main Street at dusk, night-fall shading (`T.shadeOf`), tumbleweed |
| `js/brawler.js` | **The game**: stages, waves, combat, enemies, boss, opening, depth-sorted display list |
| `js/levels.js`, `js/game.js` | The platformer; `game.js` also does the shared asset, input and sound setup and hands off |
| `docs/story.md` | Story, villain, levels, roster, beats, decisions and open questions |
| `docs/f256-plan.md` | How the display maps onto the F256: layers, sprites, CLUTs, tile counts |
| `port-guide.md` | The user's generic F256 / NitrOS-9 porting guide |

## Verified (headless Chromium screenshots only)

- The opening frame by frame; every wave of both stages; Two-Bit's attacks and the "RISE, BOYS!" summon.
- The autopilot (`?bot&god`) reaches "TO BE CONTINUED..." in three of three runs (about 200 s), through the stage
  hand-off.
- Platformer (`?mode=platformer`) and `?stage=desert` still load.
- Budget: the busiest frame seen was 62 of 128 sprite records. Hero ≤ 6 sprites (wide whip/gun frames), skeleton and
  coyote 3-4. Sprite CLUT 118/255.

## Not verified

- **Nobody has played the brawler by hand with the skeletons.** Difficulty is unknown: skeleton fire rate, bullet
  speed (230 px/s), aim time 0.55 s, Two-Bit's 36 HP.
- On the F256 the viewer runs on the K2 (smooth); the game (`tsk`, P4 sprint 1) moves the hero on Boot Hill in MAME
  and on the host 6809, no enemies yet, not yet run on the K2.
- **Fixed 2026-10-12**, found by the port: in the brawler the jump button stomped at once (no jumping at all since
  the stomp was added in 45d1f15), and one tap of X gave two snap kicks. Each press now queues one kick. SNES pad support is untested on real pads (`port-guide.md` section 9).

## Next

1. **Playtest** both stages, ideally on an SNES-style pad, and tune.
2. **Two-player co-op** (two SNES pads, `SS.Joy` reads both): a second pair of boots.
3. ~~Run tskview on a K2~~: done. **P4 has started** (`f256/docs/port-plan.md`): sprint 1, the hero moving on
   Boot Hill, is done. Next: the skeleton gunslinger and combat.
4. A per-stage sprite CLUT (118 colours already, all enemies in one).
5. A boss for Main Street, and the next stages from `story.md` reworked for the brawler.
6. Open questions in `story.md`: lives vs. continues, the vulture subplot, how violent (the blood CLUT entry).
