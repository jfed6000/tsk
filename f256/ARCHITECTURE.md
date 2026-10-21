# How Texas Shitkickers is built

A side-scrolling brawler for the Wildbits F256 under NitrOS-9 Level 2, written in 6809 assembly: seven stages, seven
bosses, General MIDI music on the SAM2695, about 1.7 MB of graphics streamed in stage by stage. This guide explains how
it's put together, and why, so it can serve as a worked example for your own game. It assumes you know 6809 assembly
and have used NitrOS-9; it doesn't assume you know the F256's video hardware.

The short version:

1. **Design the game in a browser, under the F256's rules.** `game/` is a complete JavaScript version of the game,
   held to the F256's display limits. It is where every mechanic, every sprite and every tune is worked out, because
   iterating there takes seconds.
2. **Export, don't redraw.** A headless Chromium run of the prototype writes the F256's binary assets (sprite cells,
   frame records, tiles, maps, palettes) and an include file of equates. The 6809 code never hard-codes art.
3. **Port the behaviour by hand,** routine by routine, with the browser as the reference for every number.
4. **Test on a host 6809 first,** then in MAME, then on the machine. Each catches what the one before can't.

The rest of this document goes through those in turn, then the runtime design, the tools, the pitfalls we hit, and
how to start a new game from this one.

**This directory is the F256 side.** The browser prototype (`game/`) lives beside it in the full Texas Shitkickers
repository; this guide describes it because it's half of how the game was made. Without it you can build, install
and run everything here (the exported assets are in `assets/`), but not re-export the art or recompose the music
(`make assets`, `make music`).

---

## 1. Repository map

Paths in this guide are relative to the full repository; this directory is its `f256/`.

```
game/                     the browser prototype (open game/index.html; not in the F256-only package)
  js/brawler.js           the game itself: input, the hero, enemies, waves, bosses, HUD, the frame loop
  js/sprites.js           procedural pixel art; the palette snapping; text; the speech bubble
  js/<stage>.js           each stage's art, its gimmicks and its boss (boothill.js, mainstreet.js, ghosttown.js, ...)
  js/levels.js            level data and the bosses' lines
  js/export.js            draws and packs every asset for the F256 (run by f256/tools/export.py)
  music/                  the songs: .mid (sent to the F256) and .mp3 (what the browser plays)
  port-guide.md           a pointer to the F256 porting guide (https://github.com/jfed6000/f256_porting)
  docs/                   the design: status.md (where things stand), story.md, f256-plan.md
f256/                     the 6809 side
  src/tsk.asm + *.a       tsk, the game's core module
  src/tsk<stage>.asm      the stage modules: each stage's own code, at most 8K, loaded with the stage
  src/tskview.asm         tskview: a standalone asset viewer, the first thing that ran on the hardware
  tools/                  the exporter, the music converter, the host 6809 runner, the checks, MAME scripts
  assets/                 generated binaries (not in git)
  pkg/                    what goes in the release zip besides the binaries
  docs/port-plan.md       the original porting plan, sprint by sprint
```

Build-time requirements: `lwasm` (LWTOOLS), the NitrOS-9 source tree (for its defs), ToolShed's `os9` (to put files
on a disk image), Python 3 with Pillow, Chromium (headless export and browser tests), fluidsynth and a GM soundfont
(music previews), and for testing the Wildbits MAME build and a NitrOS-9 disk image. `tools/hostrun.py` uses a 6809
core in Python (`cpu6809.py`, from the Tempest port).

---

## 2. The hardware rules the whole design follows

The F256 porting guide (https://github.com/jfed6000/f256_porting) is the authority; these are the parts that shaped this game. The prototype obeys them too, so
nothing designed in the browser is impossible on the machine.

| | |
|---|---|
| Screen | 320×240, 8 bits a pixel through a 256-entry palette (a CLUT) |
| Layers | three tile layers (16×16 tiles), used here for parallax: the street at full speed, the hills at 1/2, the sky at 1/4 |
| Sprites | 32×32 only; an 8-bit image each; up to 128 sprite records; no flipping, rotating or blending |
| Palettes | four CLUTs. This game: 0 the sprites, 1 a hit flash (every colour white), 2 a ghost tint, 3 the tiles |
| Transparency | colour index 0 |
| Memory | sprites, tiles and bitmaps live in ordinary RAM that VICKY reads; you allocate it from the OS in 8K blocks |

Consequences you'll see everywhere below:

- **A character is several sprites.** A 64-pixel-tall outlaw is a "frame": a short list of 32×32 cells, each with an
  offset from his feet. Drawing him means writing one sprite record per cell.
- **Left-facing art is stored twice.** No hardware flip, so every frame that can face left has a mirrored copy. It's
  about 43% of all the sprite memory, the single biggest cost in the game.
- **Text is sprites too.** All three layers are scenery, so there is nothing to print on. Fixed words are pre-drawn by
  the exporter; changing text (the score, names) is drawn by the 6809 into sprite cells reserved for it.
- **Colour is a budget.** Each stage's sprites and tiles share 255 colours with the art common to every stage.

---

## 3. The browser prototype

`game/index.html` runs the whole game in a browser. It isn't a mock-up: every stage, enemy, boss, sound and
cutscene was built and played there first, and the F256 code is a translation of `brawler.js`.

What keeps it honest:

- **All art is drawn at 1:1 and "pixelized".** Sprites are drawn with canvas shapes, then every pixel is snapped to a
  fixed palette and alpha is thresholded (`sprites.js`, `T.pixelize`). The result looks hand-placed, stays posable
  from code, and uses exactly the colours the F256 will have.
- **The palette is tracked as it's used.** Every colour a sprite or tile uses is registered with the CLUT it belongs to,
  so the exporter knows each palette exactly (and refuses a stage that needs more than 255 colours).
- **The same three layers, the same 32×32 cells.** A sprite sheet view (`?sheet`) shows every frame cut into cells,
  with the count of unique cells: the memory the F256 will need.

URL flags make it testable: `?bot` (an autopilot plays), `?god`, `?ff=N` (fast forward), `?stage=name&wave=N` (start
anywhere), `?debug`, and `?export` (used by the exporter). A headless Chromium with a small `requestAnimationFrame`
shim runs it for screenshots and state dumps in tests.

Why bother? Because on the 6809 a change to a jump arc or a boss pattern is an assemble, an install on a disk image and
a reboot; in the browser it's a reload. Every design question (how long a boss's line stays up, whether a hidden item
is findable) was settled by playing, before any 6809 was written.

---

## 4. The asset pipeline

```
game/js (drawn at runtime)  --tools/export.py (headless Chromium, ?export)-->  f256/assets/*.bin
                                                                            +  f256/src/tskassets.d (equates)
                                                                            +  f256/assets/preview/*.png (rebuilt from the .bin files)
game/music/*.mid  --tools/midi2tsk.py-->  f256/assets/mus_*.bin  +  f256/src/tskmusic.d
```

`make assets` runs both. Nothing in the F256 source mentions a cell number or a palette index by hand.

### Sprites: cells, frames, groups

`export.js` cuts every frame into 32×32 cells, **deduplicates identical cells**, and writes:

- `sprites.bin`: the cells shared by every stage, 1K each.
- `spr_<stage>.bin`: each stage's own cells (its boss, its props, its words), loaded into one fixed slot after the
  shared cells.
- `frr.bin` and `frr_<stage>.bin`, the **frame records**: per frame, a cell count, then for each cell its dx, dy (signed
  bytes, from the frame's origin) and cell number. `fri.bin` indexes them: two bytes a frame.
- `src/tskassets.d`, equates for everything. Frames are grouped by character, so the code says `HR.walk` (the hero's
  first walk frame), `HR.walk.N` (how many), `HR.walk.T` (frames of animation per frame), `HR.Mir` (how far on the
  mirrored copies start). Fixed words are `TX.<name>`.

A group can be **shared** (always loaded) or belong to a **stage bank**. A stage's bank holds what only that stage
draws, so a 2 MB machine can hold seven stages' worth of bosses. The cost of this design is a discipline: **a frame
must only ever be drawn on a stage whose bank holds it**, or it points at someone else's cells (see Pitfalls).

### Tiles and maps

Each stage's three layers are exported as unique 16×16 tiles (`tiles_<stage>.bin`, 256 bytes each) and three maps
(`maps_<stage>.bin`). Its tile palette is `tpal_<stage>.bin`. Stages with a day-to-night fade (Main Street, the train's
tunnels, the Mission) have `shade_<stage>.bin`: 61 copies of the tile palette at steps toward night, so the 6809 fades
by switching CLUTs, not by computing colour.

### Palettes

The sprite CLUT is split: colours used by shared art are numbered up from 1; each stage's own colours are numbered down
from 255. A stage's full sprite palette is `pal_<stage>.bin`, loaded with the stage. The exporter fails the build if a
stage needs more than 255.

### The proof

`export.py` finishes by rebuilding preview PNGs **from the binaries alone**: every frame from its cells and records,
every layer from its tiles and maps. If the preview is right, the data is right; that settles format bugs before the
6809 ever sees them.

### Music

The songs are composed as code (`tools/compose.py`, General MIDI, rockabilly and blues) but any `.mid` works.
`midi2tsk.py` turns each into one 8K block: records of (wait in frames, length, MIDI bytes), with loop points from MIDI
markers. Song numbers are pinned in its `ORDER` list (new songs go on the end, so old numbers don't move).
`render.py` renders the same MIDI through fluidsynth to MP3 for the browser, so both versions play the same notes.

---

## 5. The runtime

### Modules and memory

The game is a set of OS-9 modules, run from its own directory (`chd /dd/TSK ; tsk`):

| | Size | Where |
|---|---|---|
| `tsk`, the core | ≤ 32K (the build enforces it) | `CMDS` |
| a stage module: `tskms`, `tskgt`, `tskcd`, `tskth`, `tskmi`, `tskhn`, `tsken` | ≤ 8K each | `TSK`, loaded with its stage |
| the data area | one 8K block: the direct page, variables, tables, 512 bytes of stack | allocated by OS-9 for the process |

A Level 2 process sees 64K as eight 8K blocks. Ours hold the data area, the core, the current stage module, and the
windows through which the 6809 reaches graphics memory (`F$MapBlk`, two at once at most). The top block ends with the
system's own 768 bytes, so the music window is mapped first and kept there, out of the way of everything else.

**Graphics memory** is allocated once, at start-up, with `SS.GfxAlloc` (`platform.a`, `Alloc`), in 8K blocks:

| | |
|---|---|
| sprites | the shared cells, then a slot sized for the biggest stage's bank, then three blocks of **dynamic cells** |
| tiles | a slot for the biggest stage's tiles (also reused for the ending's full-screen bitmap) |
| maps | the three layers' maps |
| shades | 61 tile CLUTs for the fades |
| music | one block per song (13 songs) |
| frame records | one block: the shared records, then the current stage's |
| CLUTs | one block |

About 1.7 MB in all. If any allocation fails, `tsk` says how much it needs and exits cleanly (`NoMem`); the figure is
computed when the game is built, from what `Alloc` asks for.

Nothing is allocated after start-up. Changing stage only **reloads** the slots: its tiles, maps, sprite bank, frame
records, palettes and shades, and swaps its stage module.

### The stage modules

Each stage's own code (its boss, its gimmicks: the train's tunnels, the Mission's siege, High Noon's duel) lives in
its own module, `F$Link`ed or `F$Load`ed with the stage and unlinked when the next stage comes (`stgmod.a`). This keeps
the core under 32K and gives every stage a fresh 8K of code.

The core and a module call each other through **slots in the data area**, never by address: `HK.*` slots are stage
routines the core calls (pointing at a do-nothing routine when the stage has none), `CV.*` slots are core routines a
module calls. `tools/stagegen.py` reads the sources and writes all the glue (`tskvec.d`, `tskhook.a`, `tskhk_<stage>.a`,
`tskcore.d`), so a module just calls `Shk` or `PopWord` by name and gets a jump through the right slot.

### The frame loop

One pass per 60 Hz tick (`platform.a`, `Main`):

```
F$Sleep one tick
Input       SS.LiveKeys -> the input bits (and the demo script or the autopilot, which write the same bits)
Stage       the phase machine (title, intro, play, clear, game over, ending); in play: the hero, the stage's hooks,
            the waves
Enemies     every enemy slot (the boss is an enemy slot too)
Skulls, EBullets, Clods, Parts, Items, HBullets   projectiles, particles, pickups
Amb         ambience (night falling, tumbleweeds)
Pops        the popup words and numbers
Camera      follows the hero; the three layers' scroll
Sound       the sequencer's next notes, the effects' queue; MidiFlush
Hud         redraws one changed thing into the dynamic cells (see below)
Draw        the display list -> sprite records -> one SS.SprPush; the tile layers' scroll
```

A hit "hitstop" freezes the action for a few passes while sound and drawing carry on. Positions are 12.4 fixed point
(x, depth z, height h); x holds 2,047 pixels, which caps a stage's width.

### Entities and state machines

The posse are slots in one table (`EN.*` offsets, six at once). The hero is variables in the direct page. Each kind of
behaviour is a **state number plus a clock**, and states dispatch through tables of **offsets** (`fdb DIntro-DsTab`):
the code is position-independent, so a table of addresses would be wrong once the module loads somewhere else.

Bosses are enemy slots of a boss type; `bkind` says which boss, `bst` is his state. The boss entrance (`entr.a`) is a
good small example of a feature that touches every stage: each boss's start routine calls `EntrStart`, the core holds
everything else still, and the boss's own intro state is held open until the entrance lets him go.

### Drawing

`Draw` works in two passes:

1. **The display list.** Every character puts one entry in a list (`Ent`: frame, position, shadow, palette), which is
   sorted nearest first: sprite 0 is drawn on top.
2. **The sprite records.** Each entry's frame expands, through its frame record, into one record per cell. HUD
   elements are built first, so they sit in front of everything. One `SS.SprPush` sends the records used this pass.

A hit flash is the same frame through CLUT 1 (all white); the afterimage of a dash is CLUT 2.

**Dynamic cells** are sprite cells the 6809 draws into at run time: the HUD's health bars and score (cells 0-7),
score popups (8-15), the Mission's doors bar (16-19), a boss's name as it types on (20-23). Text is stamped from a
3×5 font with an outline (`tsktabs.a`, `GlyTab`), and spread over several passes (`TextQ`, five letters a pass;
`EntrHud`, a letter a pass at double size) so no pass runs long. `Hud` redraws only what changed, one thing a pass.

### Sound

The SAM2695 is a General MIDI synth, so the 6809 plays notes, not samples: a few bytes a frame, almost no CPU
(`snd.a`). The sequencer steps one song at a time; sound effects are short lists of notes (mostly on the drum
channel, a few on channels the songs leave free), with note-offs and delayed notes in a small queue. Everything is
written once a frame (`MidiFlush`) straight into the MIDI FIFO at `$FF30`.

---

## 6. Testing without (and then with) the hardware

Each layer catches what the one before can't.

### The browser, headless

`?bot` plays the game; `?god` keeps it alive; `?stage=…&wave=…` starts anywhere. Driven by headless Chromium, it gives
screenshots and the game's state as JSON, which is how every mechanic was checked before its port.

### The host 6809: `tools/hostrun.py`

The real `tsk` binary runs on a 6809 emulated in Python, with the OS-9 calls answered by the script: files read from
`assets/`, graphics blocks handed out, sprite pushes recorded, keys scripted. It runs about 2,000 passes a minute and
can print any variable from `tsk.map` every pass:

```
python3 tools/hostrun.py --args bg --passes 5000 --every 100 --watch phase,wavei,score --enemies --slow 80000
```

`--slow` reports any pass over a cycle budget; `--profile` shows where a pass's cycles went. Most logic bugs were found
here: it's deterministic, it's fast, and you can hook any instruction (several one-off scripts patched in an input, or
moved the hero to a spot, by wrapping `hostrun`'s step function).

Checks built on it:

| | |
|---|---|
| `tools/dlcheck.py ARGS PASSES` | every pass's display list: no stray hero frame, no frame past the end of the table |
| `tools/bankchk.py ARGS PASSES` | every frame drawn belongs to a shared group or to the loaded stage's bank |
| `tools/dpcheck.py` (in the build) | every direct-page operand is a direct-page variable |

`tsk`'s own arguments make these runs useful: `b` (the autopilot plays), `g` (nothing hurts him), `k` (straight to the
boss), stage letters (`m`, `h`, `c`, `t`, `i`, `n`), `f` (any hit kills: the death scene), `s` (start with five hats).

### MAME

The Wildbits MAME (`wbjr2`) runs the real disk image. `tools/mame.sh` installs the build onto a copy of the image and
runs a Lua script that types the commands and takes snapshots on a timeline (`tools/tsk*.lua`, `make mame…`). It's the
first check of anything visual: sprite placement, palettes, scrolling, the HUD.

**What MAME won't show you:**

- **Uninitialised memory.** MAME starts RAM at zero; the machine doesn't. A sprite pointing at cells nothing was
  loaded into is invisible in MAME and a square of noise on the hardware. Clear what you allocate (`DynClear`), and
  check bank membership on the host (`bankchk.py`).
- **The SAM2695.** MAME doesn't play it. `tools/midicap.py` captures the MIDI the game sends so you can listen to it.
- **Timing at the edges.** The real machine is the final word on what fits in a frame.

### The machine

Then it goes to the K2. Install with `make install DSK=…`, or build the release zip with `make dist`.

---

## 7. Pitfalls (each of these cost real time)

**Assembler and code**

- lwasm here runs with `nosymbolcase`: `quit` and `Quit` are the same symbol. A variable can't share a name with a
  routine, and a state name can't share one with an exported frame group (`DB.Draw` vs `DB.draw`).
- Short local labels (`pp1`, `bw1`) are global across every `use`d file. Give each file its own prefix.
- `ldd #x` followed by `lda` or `ldb` overwrites half of D. It happened more than once.
- The code is position-independent: **tables hold offsets, not addresses**. A table of `fdb Label` in a loaded module
  points into nowhere.
- A loop whose body calls shared code must keep its counter on the stack or in its own variable; the shared scratch
  variables (`tmpn`, `tmpi`, `kcnt`, …) get reused by the routines it calls.
- In drawing code, Y is the sprite-record pointer: don't touch it.
- A new source file must be added to the makefile's source list, or `make` won't rebuild when it changes.
- In `stagegen`, a module local whose name matches a core label becomes a call to the core. Prefix module locals.

**Memory**

- The process has eight 8K blocks; the top one ends with the system's 768 bytes. An 8K load landing there fails.
- `SS.GfxAlloc` memory is whatever was in RAM before. Clear it.
- A sprite group drawn on several stages must be in **every** one of their banks, and first in each. (High Noon's
  rattlesnakes weren't in High Noon's bank: noise on the hardware, nothing in MAME.)
- A frame's cells must sit within -128..127 pixels of its origin (the offsets are signed bytes). Anchor wide things,
  like a long speech bubble, inside themselves.
- x is 12.4 fixed point: past 2,047 pixels it wraps. Work in differences.

**Hardware and OS**

- The DMA engine only runs in vertical blank and stalls the CPU while it does: good for a whole-screen clear once a
  frame, bad for many small copies (port guide, section 6a).
- `SS.GfxAlloc`'s error when you're out of memory is just a number to the player. Say what's needed (`NoMem`).
- Files in a release zip: `tsk` and `TSK/` collide on a case-insensitive disk (macOS's default, Windows'). Ship the
  module as `CMDS/tsk`.

---

## 8. Budgets as built

| | Used | Limit |
|---|---|---|
| `tsk` (core) | 29.3K | 32K |
| stage modules | 0.9K - 5.6K | 8K each |
| data area (with the stack) | 6.0K | 7.75K |
| frame records (shared + the biggest stage's) | 6.2K | 8K |
| sprite memory | 1,222K | (the machine's) |
| everything allocated at start-up | 1,736K | about 1,820K free on a K2 with nothing else running |
| worst pass measured | about 98K cycles (a death in the middle of the Cattle Drive's ride) | about 105K at 60 Hz |

Where the sprite memory goes: the hero alone is about 520K (262 cells, nearly all mirrored). A hardware flip bit would
save about 510K across the game.

---

## 9. Making your own game from this

**Reusable more or less as is:**

| | |
|---|---|
| `platform.a` | start-up, the arguments, allocating and loading, the display set-up, the frame loop, input, pause (the terminal hidden), clean exit |
| `draw.a` | the camera, the display list, frames to sprite records |
| `hud.a` (its first half) | dynamic cells, mapping a block, text stamping, bars, popups |
| `snd.a`, `midi2tsk.py`, `compose.py`, `render.py` | the music and effects |
| `stgmod.a`, `stagegen.py` | loadable stage modules and their glue |
| `export.js`/`export.py` | the asset pipeline (the groups and banks are this game's) |
| `hostrun.py`, `dlcheck.py`, `bankchk.py`, `mame.sh` | the test harnesses |

**This game's, to replace:** `hero.a`, `enemy.a`, `stage.a`, the bosses and stage modules, `brawler.js` and the stage
art.

A suggested order, the one this game followed:

1. Read the port guide; write down your game's budget (cells, colours, code).
2. Build the browser prototype first and play it until the design settles.
3. Export the assets and write a **viewer** (`tskview` here) that only shows them: that proves the formats, the
   palettes and the sprite records on the hardware before there's any game code to blame.
4. Port the hero, then one enemy, then one stage. Run each on the host 6809 before MAME, and MAME before the machine.
5. Split stages into modules when the core nears 32K, not before.

---

## Further reading in this repo

- The F256 porting guide, https://github.com/jfed6000/f256_porting: the F256 under NitrOS-9 in depth, the hardware facts read from the FPGA
  source, and the lessons of Joust, Tempest and this game
- `game/docs/f256-plan.md`: how the prototype maps onto the F256 (layers, CLUTs, budgets)
- `f256/docs/port-plan.md`: the port, sprint by sprint
- `f256/README.md`: the build, the tools and the asset formats
- `game/README.md`: the prototype, its controls and URL flags
- `game/docs/story.md`: the design decisions and why
