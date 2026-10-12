# Texas Shitkickers on the F256: display plan

Target: Wildbits F256 under NitrOS-9 Level 2, 320×240, following `../port-guide.md`.
This is an original game, not an arcade port, so the guide's "keep the original's logic" parts don't apply.
Its platform rules do: hardware does the drawing, assets are converted on the host, and module/data budgets apply.

The web prototype (`index.html`) is the design tool, and **it already obeys the display rules below**.
Anything that works there is meant to carry over unchanged.

## Layers (three is the hardware limit)

| Front → back | F256 source | Contents | Scroll |
|---|---|---|---|
| sprite layer | sprites | hero, dillos, barrels, effects, all text and the HUD | — |
| layer 0 | tile map 0 | ground, pits, planks, crates (`FRONT[][]` in `game.js`), 212×15 cells | camera |
| layer 1 | tile map 1 | dunes and saguaros, 800 px period, transparent above | camera × 0.5 |
| layer 2 | tile map 2 | sky bands, clouds, mesas, 640 px period, opaque | camera × 0.25 |

There's no bitmap layer, so text goes out as sprites (`T.textSprite`). If we later want a bitmap HUD or a
title screen, it takes one of the parallax layers.

## Sprites

- 32×32 cells, 8bpp. A frame is a **metasprite**: the opaque pixels' bounding box is covered by a 32×32 grid
  anchored at its top-left, and each non-empty cell is one hardware record (`T.cells`).
- **There's no flip bit**, so the left-facing frames are separate data with their own cell lists.
- **No rotation or blending in hardware.** Spinning enemies use pre-drawn frames.
  The hit flash and the afterimages are **CLUT swaps**.
- `game.js` builds a display list each frame, sorted front to back. Sprite 0 is on top.
  Records beyond 128 are dropped and counted. Press `I` in game to see the count.

| Measured in the prototype | |
|---|---|
| Hero frames | 58 (116 with mirrors). The front-facing idle is symmetric, so its mirror copies could be dropped |
| Hero cells | 408 × 1K = **~408K of sprite data** (outside the 64K) |
| Hero records per frame | 2 standing, 2-4 moving and kicking, 4 max |
| Dillo / barrel / buzzard | 1 record each (32×32) |
| Two-Bit (boss) | 3-4 records (64×64 frame) |
| Busiest frame seen (stomp + combo + afterimages) | 56 / 128 records |

## CLUTs (4 × 256, entry 0 transparent)

| CLUT | Use | Prototype count |
|---|---|---|
| 0 | sprites: hero, enemies, boss, props, effects, text | 103 colours |
| 1 | sprite hit flash (every entry white) | derived |
| 2 | sprite afterimage (blue ghost of CLUT 0) | derived |
| 3 | all three tile maps | 34 colours |

## Tiles (16×16, 8bpp, 256 bytes each)

| Map | Unique tiles |
|---|---|
| Desert: back (sky/mesas) | 194 |
| Desert: middle (dunes) | 80 |
| Desert: front set | 18 |
| Boot Hill: back (night sky, moon, mission) | 169 |
| Boot Hill: middle (hill, crosses, fence) | 82 |
| Boot Hill: front set (incl. headstones, coffins) | 22 |

Each level loads its own tile CLUT (Boot Hill uses 39 colours). The lightning on Boot Hill is one `SS.ClutWrite`
of a washed-out copy of that CLUT for a few frames.

All maps fit the hardware's 256-tile sets with room to spare.
Level geometry is on the 16 px grid: ground at y = 208, plank tops and crates on tile rows.

## Next steps toward hardware (from the guide's section 14 order)

1. **Converter:** a headless export mode of this page that writes the indexed frames
   (`cv.idx`), the cell lists, the CLUTs, and the tile sets/maps as `.bin`, plus a generated `tskassets.d`.
   The art stays defined in one place, in `js/sprites.js`.
2. **Viewer harness** on the F256: load the assets and show the three maps, plus the hero metasprite
   cycling through every animation. Photograph and compare it with `?sheet` and `?cells`.
3. Then the skeleton (Joust/Tempest `platform.a`), and the game logic ported from `game.js`.
   The physics there use floats and should become 8.8 fixed point.
