# Texas Shitkickers: the F256 side

NitrOS-9 Level 2 on the Wildbits F256 (6809). Built the way `../game/port-guide.md` section 14 says: convert the
assets on the host, show them with a standalone viewer, and prove every graphics primitive before any game code.

## Pieces

| | |
|---|---|
| `tools/export.py` | The asset exporter. It runs the browser prototype headless with `?export` (`../game/js/export.js` draws and packs), writes `assets/*.bin` and the generated `src/tskassets.d`, then rebuilds `assets/preview/*.png` **from the binaries alone** to prove the data |
| `src/tsk.asm` + `src/*.a` | **tsk**, the game (P4, `docs/port-plan.md`) |
| `src/tskview.asm` | **tskview**, the asset viewer and graphics harness |
| `tools/hostrun.py` | The game on the host 6809 with the OS-9 calls answered in Python: a pass-by-pass trace of any variable |
| `tools/mame.sh`, `tools/tsk.lua`, `tools/tskview.lua` | Run the game's demo or tskview headless in the Wildbits MAME (`wbjr2`), with scripted keys and snapshots in `mame/snap/wbjr2/` |

## Asset formats (all big-endian)

| File | Contents |
|---|---|
| `tiles.bin` | Unique 16×16 tiles, 256 bytes each (8bpp, linear). Tile 0 of every 256-tile set is empty: MAME skips tile number 0 |
| `maps.bin` | The three maps back to back: tile number, then attribute (tile set bits 2:0, CLUT bits 5:3), 15 rows |
| `sprites.bin` | 32×32 cells, 1K each |
| `frames.bin` | Frame count, a 16-bit offset per frame, then per frame: cell count, and per cell dx, dy (signed, from the feet) and cell number. Mirrored frames are separate data (no flip bit) |
| `clut_spr.bin`, `clut_tile.bin`, `clut_flash.bin` | 256 × B,G,R,A. `clut_flash` is the lightning-lit tile CLUT |
| `src/tskassets.d` | Generated equates: sizes, counts, map widths and offsets, animation frame ranges (`HR.run`, `HR.run.N`, `HR.run.T`, `HR.Mir`, ...) |
| `src/tsktabs.a` | Generated tables: `HitTab`, the hero's attack box (dx, dy, w, h from the feet) for each frame; `GlyTab`, the HUD font as outlined 5x7 stamps; the HUD colours (`CI.*`) |

CLUT plan: 0 sprites, 1 hit flash (all white), 2 afterimage (ghost), 3 tiles.

Boot Hill comes to 576 tiles (3 sets, 144K), 825 sprite cells (825K) and 400 frames: the hero's 74, the skeleton's
19, the dillo's 12, Two-Bit's 20 and 44 effects (each in both directions), 13 props and pickups, and 36 text frames
(no mirrors).

## tsk: the game

```
make                 # tsk (17.2K of the 40,192-byte budget; data area 11.2K) and tskview
make install DSK=/absolute/path/to/image.dsk
make host            # the demo on the host 6809, the hero's state every 10 passes
make mame            # the demo in MAME, snapshots in mame/snap/wbjr2/
make mamebot         # the autopilot playing the opening and the first waves in MAME
make mameboss        # straight to Two-Bit (tsk kg) in MAME
python3 tools/hostrun.py --args bg --passes 5000 --every 100 --watch phase,wavei,score --enemies --slow 80000
```

On the machine: `chd /dd/TSK`, then `tsk` to play. Other letters can be combined:

| Argument | Does |
|---|---|
| `d` | The scripted demo |
| `b` | The autopilot plays |
| `g` | Nothing hurts him |
| `k` | Start at Two-Bit, skipping the opening and the waves |

| Key | Does |
|---|---|
| Arrows | Walk (up and down move along the street's depth) |
| Z or space | Jump; again in the air: the stomp |
| X | Snap kick; three presses chain the combo. In the air: the flying kick. Back + X: the side kick. Over a weapon: pick it up; holding one: use it |
| C | Side kick |
| T | Taunt |
| Q | Quit |

**Sprint 1** (2026-10-12): the hero on Boot Hill with every ground and air move, the camera, and the depth-sorted
display list with his shadow.

**Sprint 2** (2026-10-13): the skeleton gunslingers and combat. Hitstop, the white hit flash and screen shake.

**Sprint 3** (2026-10-14): all of Boot Hill.
- **The opening:** he claws out of Ringo's grave and the hat hops onto his head.
- **The stage:** four waves of skeletons and dillos, each locking the screen, then GO.
- **Barrels:** beans, the bullwhip and the six-shooter.
- **The HUD:** health, score, lives, weapon, the enemy's name and bar, and the combo. Popups and titles.
- **Two-Bit:** the swing, the clods, the dig-tunnel-pop, and raising the dead at half health.
- **The ending:** the clear, TO BE CONTINUED, or game over, and jump to play again.

Verified on the host and in MAME; not yet run on the K2. Not yet ported: the grab and throw, sound.

## tskview

```
make assets          # re-export from the browser prototype (after changing art in game/js)
make                 # tskview (about 1.9K; data area 6.6K)
make install DSK=/absolute/path/to/image.dsk     # CMDS/tskview, assets in /dd/TSK
make mame            # headless MAME run; snapshots in mame/snap/wbjr2/
```

On the machine: `chd /dd/TSK` then `tskview`.

| Key | Does |
|---|---|
| S | Pan the camera across the level (street 1×, hill ½, sky ¼) |
| L | Flip both characters (mirrored frames) |
| F | Lightning (also automatic every ~8.5 s) |
| H | Hit flash on the skeleton |
| N | The hero's next move |
| Q | Quit (maps, sets and sprites off, mode restored, blocks freed) |

What it exercises:
- `SS.GfxAlloc` / `SS.GfxFree` for the asset blocks, loaded through one 8K window at a time.
- `SS.TsSet` ×3, `SS.TmSet` ×3, `SS.Layer`, `SS.MCR`, and `SS.TmScrl` every frame.
- `SS.SprReg` and one `SS.SprPush` a frame for 16 records. Each character is up to 8 records, rebuilt every tick from the frame table.
- `SS.ClutWrite` for the sprite, flash and tile CLUTs, and for the lightning swap.

**Verified in MAME** (`wbjr2`, Longview, 2026-10-12): all of the above, including the three layers, the parallax,
mirrored frames, the hit flash, the lightning and the clean exit to the shell.

**Verified on the K2** (2026-10-12): "looks pretty smooth". The photo matches MAME, with no visible 8 px tile
offset against the sprites (port-guide §6); that hasn't been measured to the pixel.
