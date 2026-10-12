# Texas Shitkickers — character prototype

Open `index.html` in a browser (no build step, no server needed). It starts on **Boot Hill**: the opening
(press jump to skip), the graveyard level with signposts that teach each move, and the boss, Two-Bit.

You have three hats of health (the hats in the top left). Lanterns are checkpoints.

| Key | Move |
|---|---|
| Arrows / WASD | Move |
| Space / Z | Jump (hold for higher) |
| X | Front snap kick: knee up, then the whole boot thrust out sole-first, oversized on impact (in the air: **bicycle kick**) |
| C | Side kick, the heavy one: he turns square to the camera, winds up, drives one long boot out sideways and turns back. About twice as long as the snap kick (in the air: **flying side kick**) |
| Down (in air) | **Stomp**: ground-pound shockwave |
| Down + Jump | Drop through a wooden plank |
| T | Tip yer hat |
| H / M / P / I | Move list / mute / download sprite sheet PNG / F256 budget overlay |

Gamepads work too (A jump, X snap, B side, Y taunt).

Mario rules apply: jump on an Outlaw Dillo and it curls into a ball you can kick into its buddies.

The view is 320×240 and follows the F256's display rules: three tile layers, 32×32 hardware sprites (max 128),
and shared CLUTs. See `docs/f256-plan.md`. Press `I` in game for the live sprite and tile budget.

## URL flags
- `?level=desert`: the desert test range (endless outlaws, no boss)
- `?start=2300`: start at that x, skipping the opening (2300 is the boss arena)
- `?bot`: a crude autopilot that fights the boss; `?god`: no damage (both for testing, with `?ff`)
- `?sheet`: sprite sheet and F256 budget view (blue = 32×32 hardware sprite cells, red = attack hitboxes)
- `?lineup`: the key poses side by side at game scale
- `?cells`: outline every hardware sprite cell in game
- `?demo`: scripted attract mode
- `?debug`: draw hitboxes in game
- `?ff=4`: fast-forward N seconds at load (for headless screenshots)

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
- Arms are IK fist targets, or `arms: 'crossed'` as in the original drawing.
- There are no eyebrows: the scowl is the slanted upper eyelids, which lets the eyes sit right under the hat brim.
- Cowboy-boot cues: a thin leather sole and a tall stacked-leather riding heel (no dark rubber), a gap under the arch, a narrow upturned toe, a darker vamp under
  the dipped instep seam, toe stitching, and a brass spur. Kicking boots can be drawn oversize (`sc`).

Each frame is then pixelized: alpha threshold, snap to the palette, 1px outline. The result keeps its CLUT
indices, which is what the F256 converter will export. To add or tweak a move, edit the poses in `heroAnims()`.
