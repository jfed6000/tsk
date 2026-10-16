# Texas Shitkickers

How the prototype, the exporter and the F256 game fit together: [`../f256/ARCHITECTURE.md`](../f256/ARCHITECTURE.md).

A Final Fight / Double Dragon style brawler, prototyped in the browser for the Wildbits F256.
Open `index.html` (no build step, no server needed).

Ringo, an old cowboy, was gunned down and buried on **Boot Hill** with his boots on. At midnight the boots,
the **Shitkickers**, climb out of his grave and kick their way through the undead posse to Two-Bit the gravedigger. Then they head down **Main Street at dusk**, where the night falls as you fight.

## Controls

Designed for two buttons (jump and kick), with C as a shortcut for pads that have a third.

| Key | Move |
|---|---|
| Arrows / WASD | Move; up/down walks into and out of the screen |
| Z / Space | Jump |
| X X X | Kick combo; the third kick knocks them down |
| Back + X (or C) | Side kick: he turns round into it, so it boots whoever is behind you (a knockdown) |
| Z, then X | Flying kick |
| Z, then Z | Stomp: a shockwave that knocks down everyone close |
| Walk into a staggered outlaw | Grab him: X knees him, C or Z throws him into his friends |
| X on a weapon | Pick it up |
| T | Tip yer hat |
| H / M / P / I | Move list / mute / download sprite sheet PNG / F256 budget overlay (platformer) |

Gamepads work too: bottom face button (A on a standard layout, B on an SNES-style pad) jumps, left kicks,
right side kicks, top tips the hat.

**Pickups** come out of barrels, and skeletons sometimes drop their guns:
- **Bullwhip:** long reach, wears out after 14 cracks, and you drop it when you're hit.
- **Six-shooter:** six shots, then he tosses the empty gun.
- **Beans:** health.

## The gang

- **Skeleton gunslingers (the undead posse):** they keep their distance, line up in your lane and shoot. The red
  flare in the eye sockets is your warning: step out of the lane or jump. After six shots they must reload.
  Knocked down, they fall into a heap of bones and reassemble.
  A hard kick can **knock the skull off**. The headless body gropes for it, and you can **kick the skull** down the
  lane into the others. You can also kick bullets out of the air.
- **Coyote outlaws:** they flank you and swing shovels, no more than two at a time. On Main Street they're mangy
  and yellow-eyed.
- **Dillos:** they curl up and roll at you.
- **Two-Bit (Boot Hill's boss):** a shovel swing up close, thrown clods at range, and every third attack he tunnels
  through the dirt and bursts up under you, which leaves him dizzy (hits do half again as much). At half health he
  raises two of the dead.

## URL flags

- `?stage=mainstreet`, `?stage=ghosttown`, `?stage=cattledrive`, `?stage=train`, `?stage=mission`, `?stage=highnoon` or `?stage=desert`: start on another stage (the desert is the original test floor)
- `?wave=N` (with `?stage=`): start at that wave of the stage (e.g. `?stage=mission&wave=6`, Bullrush)
- `?duel=early` or `?duel=slow` (with `?bot`, High Noon): the autopilot misses the draw (to see him shoot)
- `?ending` (or `?ending=shop`): the ending, or straight to its last scene
- `?noduck` (with `?bot`): the autopilot doesn't duck the train's tunnels (to see the knock)
- `?hug` (with `?bot`): at Sting or Bullrush, the autopilot walks into his middle and kicks (to see the guard and the shove)
- `?nointro`: skip the title screen and the Boot Hill opening (`?stage`, `?bot` and `?god` skip the title too)
- Music: `music/*.mp3`, rendered from `music/*.mid` (`f256/tools/compose.py`, `render.py`); M mutes it. The title screen
  keeps a high score in localStorage.
- `?weapon=whip` or `?weapon=gun`: start holding a weapon
- `?bot`: a crude autopilot; `?god`: no damage; `?ff=SECONDS`: fast-forward at load (all for testing)
- `?debug`: sprite-record count, wave and enemy states
- `?sheet`: sprite sheet and F256 budget view (blue = 32×32 hardware sprite cells, red = attack hitboxes)
- `?lineup`: the hero's key poses side by side at game scale
- `?mode=platformer`: the original platformer (Boot Hill with pits and platforms, `?level=desert`, `?start=X`,
  `?demo`, `?cells`), kept for reference

The view is 320×240 and follows the F256's display rules: three tile layers, 32×32 hardware sprites (max 128),
and shared CLUTs. See `docs/f256-plan.md`.

## Files

| File | What |
|---|---|
| `js/sprites.js` | Palette/CLUTs, pixelizer, the hero (pose system), dillo, barrel, effects, tiles, desert backdrop, font, sheet |
| `js/boothill.js` | Night sky, Buzzard (platformer), Two-Bit, Ringo's headstone and grave, props |
| `js/undead.js` | The skeleton gunslinger, and the Boot Hill graveyard for the brawler |
| `js/mainstreet.js` | Main Street at dusk, the night-fall shading, the tumbleweed |
| `js/brawler.js` | **The game**: stages, waves, combat, the gang, Two-Bit, the opening, display list |
| `js/levels.js`, `js/game.js` | The platformer (and the shared input, sound and asset setup) |

## How the sprites work

The hero is **two cowboy boots joined from the shaft tops down to a very high crotch**. There's no body: a face
across the joined shafts, a hat on top, and arms out of the sides. Below the crotch each boot is a short leg that
swings from the hip. `js/sprites.js` draws every frame from a **pose**:
- `yaw` turns him: 0 faces the player (standing, tipping his hat), 1 is profile (everything else). Facing us, the
  joined top is two shafts wide; in profile it's one. The face slides around and is clipped by the leather, so in
  profile you see one eye and the front of the grimace.
- `nl`/`fl` are the near and far legs: `a` is the swing from the hip, `lift` raises the boot (negative stretches
  the leg, which the kicks use). Walking, the boots scissor and trade front and back; the far one is shaded darker.
- Legs marked `kick: true` define the attack hitbox automatically.
- Arms are IK fist targets, or `arms: 'crossed'` as in the original drawing. `whip` and `gun` draw a weapon in hand.
- There are no eyebrows: the scowl is the slanted upper eyelids, which lets the eyes sit right under the hat brim.
- Cowboy-boot cues: a thin leather sole and a tall stacked-leather riding heel (no dark rubber), a gap under the
  arch, a narrow upturned toe, a darker vamp under the dipped instep seam, toe stitching, and a brass spur. Kicking
  boots can be drawn oversize (`sc`).

Each frame is then pixelized: alpha threshold, snap to the palette, 1px outline. The result keeps its CLUT
indices, which is what the F256 converter will export. To add or tweak a move, edit the poses in `heroAnims()`.
