# Texas Shitkickers on the F256: the port plan (P4)

*How the browser game (`game/js/brawler.js`) becomes a NitrOS-9 Level 2 program. It follows `../../game/port-guide.md`;
this file records only what is specific to this game. Started 2026-10-12.*

## What kind of port this is

An original game, so there's no arcade listing to transcribe. The **browser prototype is the reference**: its
behaviour, its numbers and its art. Art reaches the F256 only through the exporter (`tools/export.py`), never by
hand. Game logic is **translated by hand** from `brawler.js` into 6809, one system at a time. Each system is checked in
MAME against the browser before the next starts (port-guide §14: each part confirmed before the next).

## The program

One program module, **`tsk`**, assembled from:

| File | What |
|---|---|
| `src/tsk.asm` | The module header, the includes, the build switches |
| `src/data.a` | The data area: direct-page variables first, then the larger tables |
| `src/platform.a` | Start-up, asset loading, display set-up, the frame loop, input, pause, Cleanup (from Joust's `platform.a`) |
| `src/hero.a` | The Shitkickers: input → state machine → physics → animation |
| `src/draw.a` | The display list: depth sort, metasprite records, shadows, the camera and the three maps' scroll |
| later | `enemy.a` (skeleton, coyote, dillo), `combat.a`, `boss.a` (Two-Bit), `stage.a` (waves, pickups), `hud.a`, `sound.a` |

`tskview` stays as the graphics harness.

## Numbers

- **One pass per 60 Hz tick** (`F$Sleep` X = 2). If passes start overrunning, move to the SOL clock (port-guide §12.2).
- **Fixed point 12.4** for positions and velocities: 16-bit words, 4 fraction bits. x covers 0-4095 px (a stage is at
  most 2400), z is 0-80, h is height above the floor.
- Browser constants (per second, at 120 Hz) convert to per-tick 12.4:

  | | Browser | Per tick | 12.4 |
  |---|---|---|---|
  | Walk x | 105 px/s | 1.75 px | 28 |
  | Walk z | 62 px/s | 1.03 px | 17 |
  | Jump | 360 px/s | 6 px | 96 |
  | Gravity | 1150 px/s² | 0.32 px | 5 |
  | Flying kick | 170 px/s | 2.83 px | 45 |
  | Stomp drop | 560 px/s | 9.3 px | 149 |

  A jump peaks at 96² / (2×5) / 16 = 57.6 px (browser: 56).
- **Screen position:** x = world x − camera, y = FLOOR.Y + z − h. A sprite record adds 32 to both (the visible screen
  starts at 32,32).

## The display: sprites

- A **display list** each pass: one entry per character (depth z, CTRL byte, frame number, screen x, y). It is sorted
  nearest-first, because sprite 0 is on top. Each entry's frame expands into its cells (`frames.bin`), one record per
  cell. The record table is registered once (`SS.SprReg`), and **one `SS.SprPush`** sends records 0 to the highest
  used this pass or last.
- **Shadows** go after all the characters, so they're always behind them: one record each.
- Mirrored frames are frame + `<group>.Mir` (`tskassets.d`).

## The display: tiles and CLUTs

- **Tile layers:** the street (map 2) is layer 0, the hill layer 1, the sky layer 2. They scroll at 1, ½ and ¼ of
  the camera (`SS.TmScrl` ×3 a pass).
- **CLUTs:** 0 sprites, 1 hit flash (white), 2 ghost (spare), 3 tiles. The tile CLUT and its lightning copy live in an
  asset block that is mapped only for the `SS.ClutWrite`.

## Memory

- **Assets** are in blocks from `SS.GfxAlloc` and loaded one 8K window at a time.
  - Boot Hill: tiles 18 blocks, sprites 65, maps 1, CLUTs 1.
  - Stage art is loaded per stage, so Main Street replaces Boot Hill's.
- **Data area:** 8K, with the frame table (3K) in it so `BuildChar` reads it directly. When more characters push the
  frame table past ~4K, it moves to a block mapped once at start-up.
- **Module:** the budget is 40,192 bytes (port-guide §3); `make budget` fails above it.

## Input

- **`SS.LiveKeys`** once a pass gives held keys: the arrows from the sense bits, Z or space to jump, X to kick, C for the
  side kick, Q to quit. Jump, kick and side kick are edge-detected by the game.
- **Two buttons** (decided): side kick = back + kick, with C a shortcut.
- **SNES pads** (`SS.Joy`) come with the pad harness (P2 task 697); the guard rules are in port-guide §9.
- **Demo mode:** `tsk d` plays a scripted input sequence. That's the MAME test path, since held arrow keys can't be
  scripted reliably from Lua.

## Order of work

1. ✓ **Skeleton + the hero walking on Boot Hill:** start-up, loading, the three maps, the hero's state machine (walk,
   jump, the 3-kick combo, side kick, flying kick, stomp, land, taunt), camera, depth-sorted display list with a
   shadow, demo mode. *(sprint 1, 2026-10-12: `tsk` is 2.9K; verified on the host 6809 and in MAME)*
   - The port found **two bugs in the browser game**, fixed on both sides: a jump press also stomped at once (he
     couldn't jump at all), and the press that started a snap kick also queued the next (one tap gave two kicks).
2. **Enemies:** the skeleton gunslinger (rise, approach, aim, shoot, bullets) and dillos. Then hit boxes, damage,
   knockdowns and KO with shatter. **Combat feel:** hitstop, flash, shake.
3. **Waves and the stage:** screen lock, GO, barrels and pickups (whip, gun, beans), the HUD (sprite text), the
   opening (rise from the grave), Two-Bit.
4. **Main Street:** the exporter grows a stage parameter, coyotes, the night-falling CLUT fade.
5. **Sound** (SIDs or OPL3: decide from Tempest/Joust), the pad harness, co-op.

Each step has a demo script and a MAME check against the browser; the K2 run is the user's.

## Testing

- **`make host`** (`tools/hostrun.py`) runs the module on the host 6809 (Tempest's `tools/cpu6809.py`), with the OS-9
  calls answered in Python and the asset files read from `assets/`. It prints any variables from `tsk.map` pass by
  pass (`--watch hst,ht,hx,hh --every 1`) and the sprite records a pass pushed (`--records N`). It proves logic, not
  timing. This is where bugs are found: compare its numbers with the browser's.
- **`make mame`** runs `tsk d` in the Wildbits MAME and takes snapshots (`tools/tsk.lua`), proving the display.
- **The browser** can be driven headless the same way (a `requestAnimationFrame` shim, keys dispatched from a script)
  to check a behaviour on the reference side.
