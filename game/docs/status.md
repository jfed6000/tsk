# Texas Shitkickers: status

*The handoff document: what exists, what's verified, what's next. Last updated 2026-10-15.*

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
| **Hero** | Final design: two cowboy boots joined to a very high crotch, a face across both, hat, arms. Profile when moving, faces the camera when standing. 88 frames, including grab, throw, whip, shoot, and the death scene |
| **Death scene** | Losing a life: the hat crumbles, he topples over backwards; a hat lifts off the lives and drifts down, he reaches up, catches it, gets up and it goes on: "STILL KICKIN'!". The gang hangs back, the boss waits. With no hats left he just lies there: GAME OVER (the hats are spare lives). Browser and F256 (`tsk f`: any hit kills) |
| **Story** | `story.md`: "died with his boots on" revenge western. the Shitkickers (the boots Ringo died in) against the Diamondback Gang |
| **Stage 1: Boot Hill (brawler)** | The wordless opening (rise from the grave, the hat hops on), the graveyard, five waves of skeletons clawing out of the ground plus dillos, lightning, boss **Two-Bit** (shovel swing, clods thrown across lanes, tunnels through depth and bursts up into a daze, raises two dead at half health) |
| **Stage 2: Main Street at dusk** | False fronts, sunset, night falling a step per wave (a CLUT fade that spares the lights), outlaw coyotes and skeleton gunslingers, five waves, boss **Big Shell Dillon** (giant armadillo: claw swipe, curls and rolls down your lane; kick the shell back and he crashes dizzy; Outlaw Dillos at half health) |
| **Stage 3: Ghost Town at moonrise** (browser, 2026-10-15) | An abandoned mining town under a huge moon (boarded windows, cobwebs, a dead mine above), then through the batwing doors into Doc Gila's LAST CHANCE saloon (bar, cracked mirror, bottles, piano, curtain, lamplight). Hanging signs creak and fall as you pass ("TIMBER!": 2 to you, 3 to outlaws); card tables break like barrels. New outlaw: the **rattler henchman** (keeps 70 px off, coils with a rattle, lunges low and long: jump it, then kick it while it's stretched out). Boss **Doc Gila**, the Gila monster card sharp: a fan of three cards across the lanes, a bite up close, and every third move a flipped card table to deal from behind (break it with three kicks, or side kick it into him: "ANTE UP!", "BUSTED!", dizzy); "DEAL 'EM IN!" brings two rattlers. A big hit (a knockdown blow) sets off one of his tricks, turn about: the card trick (gone in a burst of cards for 0.7 s, back behind you: "PICK A CARD!" and straight into a move) or the leap (off the top of the screen, his shadow hunting you, down on it: "SQUASHED!", 3; he lands heavy and is open a while). Dizzy, he can't escape. Music: "Dead Man's Hand". |
| **Stage 4: the Cattle Drive at sunup** (browser and F256, 2026-10-15) | The vehicle level. He rides a longhorn down the cattle trail while the screen scrolls itself (120 px/s, about 20 s: the first 1,280 px the trail's first 640 runs under him twice with the camera still - a treadmill, no extra tiles - then the camera rolls on to the corral): move about and kick from the saddle, jump to make the steer leap; rustlers on horseback gallop up alongside and swing lassos (kick them out of the saddle and the horse bolts), and a third of them are gunslingers (the roster's coyote gunslinger): they hang back 130 px, mostly behind you, line up in your lane, aim with a glint (0.55 s) and fire at saddle height - jump it, change lane, or kick it out of the air - and after six shots ride in with the lasso; split-rail fences across the trail and rocks in single lanes to jump (2 if you hit them). A death mid-ride: he's back in the saddle after. At the LAZY J corral: WHOA!, on foot, a wave, then **Jackrabbit Jack** the rustler ("FINDERS KEEPERS, BOOTS!"): he hops from spot to spot (hit him as he lands), hops clean over a kick at him standing ("TOO SLOW!"), won't be pinned (cornered within 70 px of the edge, or staggered twice running, he hops over your head to the open side: "NOT TODAY!", and lands straight into a move), mule-kicks up close, and spins and throws his lasso down his lane (caught: ROPED!, yanked in and kicked); "STAMPEDE!" at half health sends steers across the corral. Music: "Stampede!". Then "TO BE CONTINUED..." |
| **Stage 5: the Train Heist at midday** (browser and F256, 2026-10-15) | Along the roofs of a moving train, caboose to engine: the caboose, two boxcars, the cattle car (steers through the slats), the Pullman coach, the express car (the gold), the tender and the engine. The desert streams by on its own (the scenery scrolls with time, not the camera: one layer scroll each on the F256), and the roof is a narrower walking band (48 deep, not 80). **Gaps** between the cars show the ground rushing by: jump them; fall in and it's 3 and back up on the car ("WATCH YER STEP!"); outlaws hop them and stop at the edge on their feet; one knocked flying (a knockdown or a throw) into a gap is gone ("SEE YA!"), as is anything that lands in one. No locked screen has an edge over a gap (the stage warns if one does). **Tunnels** every 24 s: the whistle, the rumble, "TUNNEL! DUCK! HOLD DOWN" (2.4 s) - holding down then means duck (he hits the deck, hat held on) - and the mouth sweeps across, drawn down over every lane: anyone standing is knocked flat (3), an outlaw clean off the train ("SWEPT OFF!"), though half the coyotes hit the deck too; then at mid-screen the rock wall takes the scenery's place behind the train and it's dark (to 0.6), and two timber pit-props sweep through in the dark (a creak, "DUCK!" - each one another duck, or 3), until the way out. Five waves of the mangy gang, skeletons and rattlers, then on the tender **Sting**, the scorpion with too much dynamite (`js/sting.js`): he drops off the engine's cab ("NOBODY GETS OFF THIS TRAIN!"). His pincers guard his front: a kick from in front - or from inside him, anything short of 8 px behind his middle - glances off ("CLANK!") unless he's open, and he's solid: walk into him while he's guarding and a claw swipes you back out the front (1; get round him quick, or jump) - his tail sting (cocked with a glint, then low and long in front: jump it; a miss sticks it in the roof and he's open), the pinch up close, and dynamite every third move (every other one below half health): he backs off, lights up on his cigar and lobs it where you stand, more sticks as he weakens - 1, 2 below three quarters, 3 below half, 4 below a quarter, a lane or so apart (1.6 s fuse, 3 to anyone near). Kick a lit stick back at him: 6 and he's dizzy ("BACK AT YA!"); hit him while he's lighting one and he drops it at his feet ("UH OH!"); his own only singes him. At half health, "LIGHT 'EM ALL!": five sticks, every lane. He flattens for the tunnels. Knocked out, his bandolier goes up and he's blown clean off the train. Then "TO BE CONTINUED...". Music: "Iron Horse" (the whistle, then a shuffle boogie in D over a chugging train beat, the harmonica wailing, a stop-time tunnel, a slide ride-out). |
| **Stage 6: the Mission at sundown** (browser and F256, 2026-10-15) | The last stand: the only stage where he defends. The edge of town at sundown (a well, a cart wheel, the town's lit windows behind), along the mission's long adobe wall to its gate (two waves), then the courtyard - the cloister arcades and the church of San Roque, its doors barred with the townsfolk inside (the doors are tiles, a 64x80 patch of the street map a state, so the sprite limit can never drop them) - locked for the **siege**: four waves, the bell tolling for each ("HERE THEY COME!"), the gang vaulting over the courtyard walls from both sides as night falls. The coyotes and rattlers go for **the doors** (a bar on the right: 30) and batter them; two at most turn on you when you're close, the rest keep at it. Skeletons and dillos come for you. Bust the doors and it costs a hat ("THEY'RE IN! THAT COST YA A HAT!"; no hats left and the town's fallen: game over); the townsfolk throw them out and bar the doors again. Then through the side gate at a charge, **El Toro** (`js/mission.js`), Diamondback's enforcer, a minotaur in jeans with a ring through his nose ("SAY YER PRAYERS, BOOTS!"): he walks you down; paws the dirt, snorting, lines up on your lane and **charges**, trampling his own, till his horns go into a wall (STUCK!: open, half again damage) or into the church doors (CRASH!: 6 off them - don't dodge him in front of the doors); up close the horn hook (3, tosses you), or he backs off for a run, or rears up and **stomps** (a wall of dust rolling out both ways along the ground: jump it); his hide shrugs off hits on the move and on the third he turns on you (SNORT!); he's solid like Sting (walk into him: 1). At half health "SEEIN' RED!": quicker, every charge comes straight back, two more coyotes at the doors. Knocked out, a word out of the dark: "HIGH NOON, BOOTS. MAIN STREET. - DIAMONDBACK". Music: "Last Stand" (the bell and a lone trumpet's Deguello over tremolo strings, then a galloping D minor drive down Dm-C-Bb-A, two trumpets, a war-drum break). On the F256: `tsk i` (`ik`: El Toro), `make mamemission`. |
| **Stage 7: High Noon on Main Street** (browser, 2026-10-15) | The last stand of the gang: back down Main Street in the white glare of noon (the same false fronts as stage 2, bleached; `js/highnoon.js`), three waves of what's left of the gang, then the plaza at the end, the town hall's clock tower at 11:59, and **Diamondback** waiting: a giant rattlesnake in a flat black hat and a bolo tie, a six-shooter in the curl of his tail. **The duel**: you walk to your mark (the controls are his), "I'VE BEEN NEEDIN' A NEW PAIR." (the music: "Standoff", a pocket watch's chime, the clock ticking), and when the clock strikes noon - DRAW! - kick: in time, a stone off your boot knocks the gun from his tail ("OUTDRAWN!", 6, dizzy); too soon ("JUMPED THE GUN!") or too slow ("TOO SLOW, BOOTS!") and he shoots you (3). Then **the fight** ("Showdown"): he keeps his distance and fans the hammer, three shots down your lane (six to a reload: open); up close he coils, rattling, and strikes long and low (jump it; a miss leaves him stretched out: open, half again damage), or whips his tail round if you crowd him. At half health "GET 'EM, POSSE!": two skeletons rise, and his volleys double. Knocked out, the gang's done. **The ending**: Boot Hill at sundown, the boots walk up to Ringo's grave, tip the hat, and walk off into the sunset ("Boot Hill" plays). THE END. Then the boot shop, a painted bitmap (cut to 248 colours: on the F256 the bitmap layer with its own CLUT): a lamplit shop at night, red damask, a mahogany wainscot, FINE BOOTS in gold leaf, an oil lamp, plain boots in the shadows, and on the polished shelf a fine pair of diamondback snakeskin boots, a tag on a string - "GENUINE DIAMONDBACK, 5 BITS". The right-hand boot is a sprite over the bitmap: it twitches, and something rattles. (`?ending=shop` goes straight there.) Not yet: the F256 port (the songs are in its music set already). |
| **Brawler systems** | Depth band with shadows, waves with screen lock and "GO >>", 3-kick combo, side kick, flying kick, stomp, grab/knee/throw, weapon pickups, beans, health bar plus lives (hats), last-hit enemy bar, combos, game over |
| **Skeleton gunslinger** | Keeps distance, aligns to your lane, aims (eyes flare), fires dodgeable bullets, reloads after six; heap and reassemble; skull knocked off, headless body gropes for it, skull kickable into others; shatters into bones; sometimes drops its gun |
| **F256: asset exporter** | `f256/tools/export.py` + `game/js/export.js`: Boot Hill → tiles.bin (576 tiles, 3 sets), maps.bin, sprites.bin (551 cells), frames.bin (234 frames, with the combat effects), CLUTs, generated `f256/src/tskassets.d` and `tsktabs.a` (the hero's attack boxes); preview PNGs rebuilt from the binaries |
| **F256: tsk (the game)** | `f256/src/tsk.asm` + `.a` files, P4 sprints 1-3: **all of Boot Hill** - the opening, four waves of skeletons and dillos, barrels and pickups, the HUD, Two-Bit, the clear and game over. Verified on the host 6809 and in MAME; K2 run of sprint 3 pending |
| **F256: tskview** | `f256/src/tskview.asm`: the asset viewer and graphics harness. Three scrolling tile layers, hero and skeleton as metasprites cycling their animations, mirrored frames, lightning and hit flash as CLUT swaps, clean exit. **Runs in MAME** (`make mame`) **and on the K2** (user, 2026-10-12: "looks pretty smooth"; no visible 8 px tile offset) |
| **Platformer** | `?mode=platformer`: the earlier Boot Hill (pits, platforms, buzzards, Two-Bit) and the desert test range |

## Files

| File | What |
|---|---|
| `js/sprites.js` | Palette/CLUTs, pixelizer, hero (pose system), dillo, barrel, effects, tiles, desert backdrop, font, sheet |
| `js/boothill.js` | Night sky, Buzzard, Two-Bit (normal and mangy), Ringo's headstone and grave, props, boss bar |
| `js/undead.js` | Skeleton gunslinger sprites; the Boot Hill graveyard street for the brawler |
| `js/mainstreet.js` | Main Street at dusk, night-fall shading (`T.shadeOf`), tumbleweed |
| `js/dillon.js` | Big Shell Dillon, Main Street's boss (64x64 frames, the rolling ball) |
| `js/ghosttown.js` | Ghost Town's backdrop (one 2,032-px street strip: the street, then the saloon inside), the hanging signs, card tables |
| `js/critters.js` | The rattler henchman |
| `js/gila.js` | Doc Gila, Ghost Town's boss, and his cards |
| `js/ranch.js` | The Cattle Drive: the dawn backdrop and corral, the longhorn, the rustlers' horses, fences and rocks, Jackrabbit Jack and his lasso |
| `js/train.js` | The Train Heist: the midday sky, the desert going by, the train (its cars and gaps), the tunnel's rock wall and mouth |
| `js/sting.js` | Sting, the Train Heist's boss: the scorpion, his lit dynamite, the bang |
| `js/highnoon.js` | High Noon: the noon sky, Main Street bleached, the plaza and the town hall's clock tower; the clock's hands, Diamondback, the snakeskin boots; the ending's backdrops (Boot Hill at sundown, the boot shop) |
| `js/mission.js` | The Mission: the sundown sky, the town, the mission's wall and gate, the courtyard and the church; the church doors (four states) and a splinter; El Toro, its boss |
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
- **Music and the title screen (2026-10-14):** the songs are in `game/music/` (composed by `f256/tools/compose.py`,
  rendered to MP3). The browser now opens on a title screen and plays them (M mutes the music). On the F256 they play
  on the SAM2695, verified in MAME by capturing the MIDI. The user hears it on the K2 when testing (confirmed 2026-10-15).
- On the F256, `tsk` plays the whole game (Boot Hill, then Main Street) in MAME and on the host 6809 (P4 sprint 5).
  Main Street's music is "Graveyard Boogie" in the browser and on the F256. Sprint 2 ran on the K2
  ("game looks awesome", 2026-10-14); everything in the browser is now on the F256 too (2026-10-15).
- **Skeletons stack:** every skeleton heads for the same spot (100 px from you, in your lane), so two or three left
  alone merge into one figure. True in the browser too; a matter for the playtest and tuning.
- **Fixed 2026-10-13**, found by the port: a hit in mid-air froze the hero's height (no gravity in the hurt state),
  so he could be left walking in the air.
- **Fixed 2026-10-12**, found by the port: in the brawler the jump button stomped at once (no jumping at all since
  the stomp was added in 45d1f15), and one tap of X gave two snap kicks. Each press now queues one kick.
- SNES pad support is untested on real pads (`port-guide.md` section 9).

## Next

1. **Playtest** both stages, ideally on an SNES-style pad, and tune.
2. **Two-player co-op** (two SNES pads, `SS.Joy` reads both): a second pair of boots.
3. **P4** (`f256/docs/port-plan.md`): sprints 1-5 done. The whole browser game now runs on the F256: the title,
   Boot Hill, Main Street, the music. Big Shell Dillon, the death scene, the grab/knee/throw and Ghost Town are in (2026-10-15): the whole browser game runs on the F256. Next: pads, the next stages.
4. ✓ A sprite palette and a tile palette per stage (2026-10-15).
5. ✓ Ghost Town on the F256 (2026-10-15): `tsk` 26.9K of 32,768, data 15.1K, peak memory about 1.55 MB.
6. ✓ The Cattle Drive on the F256 (2026-10-15): the ride, the gunslingers, the corral, Jackrabbit Jack and his
   stampede; `tsk c`, `make mamecattle`. `tsk` 32.7K of 40,960, data 4.9K of 7,936.
7. ✓ Stage modules on the F256 (2026-10-15, works on the K2, merged): each stage's
   own code is an 8K module loaded with the stage (`tskms`, `tskgt`, `tskcd`), so the core is 25.1K of 32,768 and
   every new stage has a whole 8K of its own. A sprite palette per stage followed (120 shared colours, each stage up to 86
   more of its own free).
8. ✓ The Train Heist on the F256 (2026-10-15): `tsk t`, `make mametrain`.
9. ✓ The Mission in the browser and on the F256 (2026-10-15): `?stage=mission` (`&wave=6`: El Toro); `tsk i`, `make mamemission`.
10. ✓ High Noon and the ending in the browser (2026-10-15): `?stage=highnoon` (`&wave=3`: the duel). Next: the user's playtest, then the F256 port.
11. Open questions in `story.md`: lives vs. continues, the vulture subplot, how violent (the blood CLUT entry).
