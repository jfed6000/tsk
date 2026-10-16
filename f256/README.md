# Texas Shitkickers: the F256 side

NitrOS-9 Level 2 on the Wildbits F256 (6809). Built the way `../game/port-guide.md` section 14 says: convert the
assets on the host, show them with a standalone viewer, and prove every graphics primitive before any game code.

## Pieces

| | |
|---|---|
| `tools/export.py` | The asset exporter. It runs the browser prototype headless with `?export` (`../game/js/export.js` draws and packs), writes `assets/*.bin` and the generated `src/tskassets.d`, then rebuilds `assets/preview/*.png` **from the binaries alone** to prove the data |
| `src/tsk.asm` + `src/*.a` | **tsk**, the game's core (P4, `docs/port-plan.md`) |
| `src/tskms.asm`, `tskgt.asm`, `tskcd.asm`, `tskth.asm`, `tskmi.asm` | **The stage modules**: Main Street's, Ghost Town's, the Cattle Drive's, the Train Heist's and the Mission's own code (`dillon.a`; `ghost.a`; `ride.a`, `jack.a`; `train.a`, `sting.a`; `mission.a`, `toro.a`), at most 8K each, `F$Load`ed with the stage from the game's directory (`src/stgmod.a`, port-plan item 12) |
| `tools/stagegen.py` | Writes the glue between tsk and the stage modules (`src/tskvec.d`, `tskhook.a`, `tskhk_*.a`, `tskcore.d`); run by make |
| `src/tskview.asm` | **tskview**, the asset viewer and graphics harness |
| `tools/compose.py`, `tools/render.py` | The music, written as code into `game/music/*.mid`, and rendered to MP3 through fluidsynth (previews, and the browser's music) |
| `tools/midi2tsk.py` | `game/music/*.mid` → `assets/mus_*.bin` (one 8K block a song) and the generated `src/tskmusic.d` |
| `tools/midicap.py` | The MIDI the game sends, as a `.mid`: from the host 6809, or from MAME's log (`make mametitle`) |
| `tools/dpcheck.py` | The build fails on a direct-page operand that isn't a direct-page variable |
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

Assets: Boot Hill 576 tiles and Main Street 650 (3 sets each); 732 shared sprite cells, plus each stage's own
(Boot Hill 113, Main Street 88) loaded at cell `SPR.Base`; 444 frames; the sprite CLUT 143 of 255, the tile CLUT 96.
Files are per stage where they differ: `tiles_bh.bin`/`tiles_ms.bin`, `maps_*`, `spr_*`, and `clut_dusk.bin`
(Main Street's 13 shades of night).

## tsk: the game

```
make                 # tsk (26.8K of 32,768; data area 5.6K of 7,936), the stage modules tskms, tskgt, tskcd, tskth, tskmi (8K each), tskview
make install DSK=/absolute/path/to/image.dsk   # tsk to CMDS; the assets and the stage modules (tskms, tskgt, tskcd, tskth, tskmi) to TSK
make host            # the demo on the host 6809, the hero's state every 10 passes
make mame            # the demo in MAME, snapshots in mame/snap/wbjr2/
make mamebot         # the autopilot playing the opening and the first waves in MAME
make mameboss        # straight to Two-Bit (tsk kg) in MAME
make mametitle       # the title screen in MAME; the MIDI it sent as mame/midi.mid
make mamems          # Main Street (tsk mbg) in MAME
make mamedillon      # straight to Big Shell Dillon (tsk mkbg) in MAME
make mamedeath       # the death scene: Dillon against a frail hero (tsk mkf), four deaths and game over
make mamegila        # straight to Doc Gila (tsk hkg) in MAME
make mamecattle      # the Cattle Drive: the ride, the corral, Jackrabbit Jack (tsk cbg) in MAME
make mametrain       # the Train Heist: the roofs, the tunnels, Sting (tsk tbg) in MAME
make mamemission     # the Mission: the siege of the church doors, El Toro (tsk ibg) in MAME
make music           # compose, convert and render the music (game/music/*.mid, *.mp3)
python3 tools/hostrun.py --args bg --passes 5000 --every 100 --watch phase,wavei,score --enemies --slow 80000
```

On the machine: `chd /dd/TSK`, then `tsk`: the title screen, then jump to play. The music and effects play on the
SAM2695 (General MIDI), written straight into the MIDI FIFO at $FF30. Other letters can be combined, and skip the title:

| Argument | Does |
|---|---|
| `d` | The scripted demo |
| `b` | The autopilot plays |
| `g` | Nothing hurts him |
| `k` | Start at the stage's boss (Two-Bit; with `m` Big Shell Dillon, with `h` Doc Gila, with `c` Jackrabbit Jack, with `t` Sting, with `i` El Toro), skipping the opening and the waves |
| `m` | Start on Main Street |
| `h` | Start in Ghost Town (haunted) |
| `c` | Start on the Cattle Drive |
| `t` | Start on the Train Heist |
| `i` | Start at the Mission |
| `f` | Frail: any hit kills (to see the death scene) |

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

**Sprint 4** (2026-10-14): the title screen (with attract mode and a high score) and sound. Music and effects on the
SAM2695: the title shuffle, Boot Hill's theme, the clear and game-over tags, sixteen effects.

**Sprint 5** (2026-10-14): Main Street. It follows Boot Hill: per-stage art and sprite banks, mangy coyotes,
skeletons walking in, night falling a step each wave, tumbleweeds, "Graveyard Boogie". Then TO BE CONTINUED.

Verified on the host and in MAME; not yet run on the K2. Not yet ported: the grab and throw.

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
