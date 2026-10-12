# Texas Shitkickers: status

*The handoff document: what exists, what's verified, what's next. Last updated 2026-10-12.*

## What exists

A browser prototype (`index.html`, no build step) that follows the F256 display rules (`f256-plan.md`).

| Part | State |
|---|---|
| **Hero** | Final design: two cowboy boots joined to a very high crotch, a face across both, hat, arms. Profile when moving, faces the camera when standing. 58 frames. Moves: run, jump, X snap kick (oversized boot), C side kick (turns to camera, the slow heavy one), bicycle kick, flying side kick, stomp, hat tip |
| **Story** | `story.md`: "died with his boots on" revenge western. Ringo's boots against the Diamondback Gang, 7 levels, critter roster |
| **Level 1: Boot Hill** | Built: wordless opening (rise from the grave), graveyard level with signposts that teach each move, buzzards and dillos, open-grave pits, 3 checkpoints, boss **Two-Bit** (shovel swing, dirt clods, dig-and-burst into dizzy), clear screen |
| **Desert test range** | `?level=desert`: every move, endless outlaws, no boss |
| **Brawler test** | `?mode=brawler` (`js/brawler.js`): a Final Fight-style belt-scroller on the desert, built to compare genres. Depth band, waves with screen lock, combos, knockdowns, grab/knee/throw, a coyote and dillo gang, pickups (bullwhip, six-shooter with six shots, beans). Verified by autopilot screenshots only |
| **Systems** | 3-hat health, checkpoints, respawn, combos, Mario head-bounces, dillo shells, lightning as a CLUT swap, sprite-record budget (I key) |

## Files

| File | What |
|---|---|
| `js/sprites.js` | Palette/CLUTs, pixelizer, hero (pose system), dillo, barrel, effects, desert + night tiles, desert backdrop, 3×5 font, sheet |
| `js/boothill.js` | Night backdrop, Buzzard, Two-Bit, Ringo's headstone and grave, lanterns, signposts, boss bar |
| `js/levels.js` | Level data: Boot Hill and the desert, all on the 16 px grid |
| `js/game.js` | Game: input, physics, hero, enemies, boss, intro, display list (128-record budget), render |
| `docs/story.md` | Story, villain, levels, roster, beats, open questions |
| `docs/f256-plan.md` | How the display maps onto the F256: layers, sprites, CLUTs, tile counts |
| `port-guide.md` | The user's generic F256 / NitrOS-9 porting guide |

URL flags: `?sheet`, `?lineup`, `?level=desert`, `?start=X` (2300 = boss), `?demo`, `?debug`, `?cells`, `?ff=SECONDS`,
`?bot`, `?god`.

## Verified (headless Chromium screenshots only)

- Opening sequence frame by frame. Every section of Boot Hill. Desert test range and its scripted demo.
- Boss: every attack seen. The autopilot (`?bot`) loses normally and wins with `?god`; the clear screen appears.
- Budget: busiest frame seen was 54 of 128 sprite records. Hero ≤ 4, boss 3-4. Sprite CLUT 103/255, Boot Hill tile
  CLUT 39/255.

## Not verified

- **Nobody has played it by hand.** Feel, difficulty and the boss balance are unknown. The knobs: boss HP (16),
  wind-up 0.45 s, 3 clods, contact damage only mid-walk.
- Nothing has run on an F256.

## Next

1. **Genre decision:** play `?mode=brawler` against Boot Hill and decide: platformer, Ninja Gaiden, brawler, or the
   middle path (`story.md`). Pickup weapons (whip, six-shooter) are wanted either way.
2. **Gameplay thinking (the user, next session).** Open questions in `story.md`: a non-kick weapon (spurs?), lives
   versus continues, the vulture subplot, placeholder names.
2. Playtest Boot Hill and tune it.
3. Toward hardware, in the guide's order: an asset exporter (indexed frames, cell lists, CLUTs, tile sets/maps as
   `.bin` plus a generated defs file), then an F256 viewer program showing the hero animations.
4. Watch the sprite CLUT: likely a per-level sprite CLUT once more enemies exist.
5. The next level (The Desert, with Big Shell Dillon) or the next enemy (Coyote gunslinger).
