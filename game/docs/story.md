# Texas Shitkickers: story

*Working draft. Names marked (placeholder) are open.*

## Logline

An old cowboy is gunned down by the Diamondback Gang and buried on Boot Hill with his boots on.
The man stays dead. **The boots don't.** They claw out of the grave with his hat, a scowl and a grudge,
and set off across Texas to kick every member of the gang into the next county.

## Tone

- **A spaghetti western played for laughs.** Played straight in the framing (dusty towns, high noon, a revenge
  quest, a lone stranger) and ridiculous in the content (he is a pair of boots, the outlaws are desert critters).
- **Crude and irreverent, never mean or gory.** The title sets the register. Defeated critters get "kicked into the
  next county": they fly off screen with a "YEEHAW!", the way Metal Slug's soldiers flee and flail rather than die.
- **Almost wordless.** Metal Slug tells its whole story with pictures. We get a title card per level, a line or two
  before each boss, and a short ending (see "Telling it" below).

## The hero

**Shitkickers.** That's his name (the user's call, 2026-10-12): cowboy-boot slang, half the game's title, and plural
the way a pair of jeans is. He has no other name; he's the Man With No Name, in boots. He is **not** Ringo: Ringo
is the cowboy who was killed wearing him.

- **What he is:** two cowboy boots joined at the shafts. A face, a hat and two stubby arms. What's left of the cowboy.
- **Who he is:** an ornery, scowling jerk with a code. He kicks first and doesn't talk, but:
  - he keeps his word,
  - he never hurts an innocent,
  - he always tips his hat to a lady (his taunt, `T`).
- **Why he kicks:** he's boots. Every move is a kick: snap kick, side kick, bicycle kick, flying kick, and the stomp.
- **His cowboy: Ringo.** An old drover who wouldn't sell his land to the gang. He's seen only in the opening:
  the hat and the boots, and a headstone carved *RINGO. R.I.P.* (The name nods to Johnny Ringo and to the Ringo Kid
  in *Stagecoach*, and it fits a headstone in the 3×5 font.)

## The villain: Diamondback

A giant rattlesnake in a black hat and a bolo tie, boss of the Diamondback Gang. He's buying up (or burning out)
everything between the river and the railroad, and Hoot was in the way.

**The dark joke:** snakeskin is a boot leather, and Diamondback knows it. He wants a matching pair. From his first
scene on, he's sizing the hero up as footwear.

## The gang: one lieutenant per level

| # | Level | Boss | Bit |
|---|---|---|---|
| 1 | **Boot Hill** (built) | **Two-Bit**, a coyote gravedigger | He buried Ringo and is robbing the graves. He's the first to find out the boots got up. |
| 2 | **The Desert** | **Big Shell Dillon**, the giant armadillo | Boss of the Outlaw Dillos. He curls up and rolls like a boulder, so kick the shell back at him. |
| 3 | **Ghost Town** (built, browser) | **Doc Gila**, a Gila monster card sharp | Runs the saloon. A brawl through swinging doors, tables and falling signs. |
| 4 | **The Cattle Drive** (built, browser) | **Jackrabbit Jack**, the rustler | A stampede chase on the back of a longhorn: the Metal Slug vehicle level. |
| 5 | **The Train Heist** | **Sting**, a scorpion with too much dynamite | Fighting along the roofs of a moving train. The tunnel ducking writes itself. |
| 6 | **The Mission** | Waves, then Diamondback's enforcer | A last stand defending the town, *Magnificent Seven* or Alamo style. The Texas level. |
| 7 | **High Noon** | **Diamondback** | The showdown on Main Street. It opens with a quick-draw duel, except he kicks. |

### Optional subplot: the Ugly

**Vernon Vulture** (placeholder), a bounty hunter after the gang's buried gold, turns up in levels 2-5. He picks off
the hero's KOs, steals bonus loot, and shows up in boss fights to grab the reward. He's *The Good, the Bad and the
Ugly*'s Tuco as a buzzard. In the Mission he finally fights *with* the hero, for a cut. This is cuttable if the
module budget gets tight.

## The critter roster

Each enemy has a job, Mario-style: one clear behaviour, readable at a glance.

| Critter | Behaviour | Answer |
|---|---|---|
| **Outlaw Dillo** (built) | Walks; stomp it and it curls up | Kick the ball into its friends |
| **Coyote gunslinger** | Metal Slug soldier: walks, ducks, fires a six-shooter | Close in, or stomp from above |
| **Buzzard** (built) | Perches on a headstone, takes off as you near, circles, then dive-bombs | Bicycle kick out of the air, or bounce off its back |
| **Scorpion** | Low; a tail sting with a wind-up | Jump it, or side kick during the wind-up |
| **Jackrabbit** | Fast, hops over low kicks | Snap kick on the landing |
| **Prairie dog sniper** | Pops out of holes and throws rocks (the Piranha Plant role) | Stomp the hole |
| **Skeleton gunslinger** (built, the undead posse) | Keeps its distance, lines up in your lane, aims (eyes flare), shoots; reloads after six; skull can be kicked off | Step out of the lane or jump; punish the reload; kick the skull into the others |
| **Rattler henchman** | Coils, then lunges a long way | Bait the lunge, then kick |
| **Tumbleweed** | A hazard that rolls with the wind | Kick it back for points |

## Story beats

1. **Opening (no words, built):** night on Boot Hill. A fresh grave, the hat on Ringo's headstone. Lightning, and the
   ground rumbles. The boots claw up out of the dirt, eyes shut, and wake. The hat hops off the headstone onto
   them. **TEXAS SHITKICKERS. BOOT HILL. MIDNIGHT.**
2. **Each level:** a title card (*BOOT HILL. MIDNIGHT.*), the level, then a lieutenant who recognises the boots too
   late and gets one line before the fight.
3. **The Mission:** the gang's full assault on the town Hoot wouldn't sell, and the only level where he defends
   rather than hunts. Vernon switches sides here, if he's in.
4. **High Noon:** Diamondback, Main Street, clock tower. A duel, then the fight.
5. **Ending:** Diamondback is down and the gang is scattered. The boots walk back up Boot Hill and stand on Hoot's
   grave. A hat tip. He walks into the sunset, scowling.
6. **After the credits:** a pair of fine new *snakeskin* boots sits on a shop shelf. One of them twitches.

## Telling it on the F256

Text costs module space (40,192 bytes total, `../port-guide.md` section 3), so the story is mostly pictures:

- One title card per level, a boss line per lieutenant, and the ending, all of it in the 3×5 pixel font that's
  already in `js/sprites.js`.
- The opening and the ending are short scripted scenes made of sprites over a tile background, with no new
  machinery. The opening could double as the attract mode.
- Sample lines to set the voice:
  - **Two-Bit:** *"I BURIED YOU MYSELF!"*
  - **Doc Gila:** *"CARE TO CUT THE DECK, PARDNER?"*
  - **Sting:** *"NOBODY GETS OFF THIS TRAIN!"*
  - **Diamondback:** *"I'VE BEEN NEEDIN' A NEW PAIR."*

## Open questions

- The placeholder names above (Ringo is settled).
- **Player 2's name, for co-op: "Stompers"** (the user's pick, 2026-10-12; not yet final). Other candidates were:
  **Bootleggers** (boots, legs and outlaws: the sly one; my favourite), Asskickers (the straight crude match), Ropers (a
  real boot style), Stompers, or Heartbreakers (if player 2 is a pair of women's riding boots, e.g. Jessa's).
  Player 2 should look different at a glance (colours and hat). On the F256 a CLUT swap is cheapest, but all four
  CLUTs are in use (sprites, flash, ghost, tiles), so either fold the ghost CLUT or give player 2 its own frames.
  Story: a second victim of the gang buried on Boot Hill, rising from the next grave over in the same opening.
- Is Vernon (the Ugly) in or out?
- **Pickup weapons (wanted, 2026-10-12):** a bullwhip and a six-shooter with exactly six shots, then he tosses it.
  Both are in the brawler test. Throwing spurs are still an option for a permanent sub-weapon.
- Lives and continues: arcade continues, or Mario-style lives with 1-ups (a spare hat?).
- **What kind of game? DECIDED (2026-10-12): a brawler.** The user: "let's add the undead posse skeleton gunslingers and
  make a brawler." The platformer is kept at `?mode=platformer`. The options considered were:
  - **Ninja Gaiden** (action platformer): the natural evolution of what's built. Sharper combat, a wall-kick, the
    spurs as the sub-weapon (its shuriken), Ninja Gaiden-style cutscenes between levels for the story beats.
  - **Final Fight / Double Dragon** (belt-scroller brawler): it fits a kicking-only hero (combos, grabs, throws) and adds
    2-player co-op (player 2 as another pair of boots, e.g. Jessa's). But it's a rebuild: a depth axis, street/saloon
    levels instead of platforms, and hit/knockdown/get-up animations for every enemy.
  - **Middle path:** single plane, with brawler-style combat. The screen locks while a group of enemies comes in, then
    "GO ->", with short platforming in between.
  - The `?mode=brawler` test is built (`js/brawler.js`). User's first reaction (2026-10-12): "a tough call... it is
    kind of fun as a brawler."
  - **Controls on the F256** (`port-guide.md` section 9): an Atari stick gives only 1 button on the current cores; an
    **SNES pad gives 3**, and `SS.Joy` reads two pads at once (co-op); the keyboard gives plenty. The brawler needs
    jump + kick + side kick. Design for 2 buttons (side kick as a direction + kick) with the third SNES button as a
    shortcut. Pad support is untested on real pads (Tempest's was read from the RTL), so it needs a harness.
- **Darker, if it's a brawler (user, 2026-10-12):** "if we go this route the game needs to feel a bit darker."
  The levers, cheapest first:
  - dusk, night, rain and storm lighting (day-to-night fades, lightning and muzzle flashes are CLUT writes);
  - grim places: Main Street with wanted posters, a burning ranch, the mine, the train yard;
  - the critters made mean (mangy, scarred, yellow-eyed), plus Diamondback's **posse of dead men** (skeletons, ghouls in
    dusters) for menace without gore;
  - a straighter story with a cold open of Ringo's killing, a frightening Diamondback, and gallows humour;
  - Metal Slug-level violence using the reserved blood CLUT entry;
  - revenant touches on the hero (a bullet-holed hat, stitched leather, faintly glowing eyes at night);
  - a Morricone minor key.
  **Mock-up built:** `?mode=brawler` opens on Main Street at dusk (`js/mainstreet.js`). The user's verdict (2026-10-12):
  **"It is darker but still fun."** The darker tone is approved for the brawler route.
- **How violent?** Somewhere between Mario (bonk, vanish), Metal Slug (slapstick gore, played for laughs) and
  House of the Dead (horror gore). Undecided. Things to weigh:
  - The title already rules out a kids' game, and the premise (a dead man's boots, an undertaker boss) is Weird West.
  - Gore on cute critters reads as mean in a way gore on human outlaws doesn't.
  - Leaning: the Metal Slug middle. Keep the critters cartoonish (feathers, X-eyes, flattened). Get brutal-but-bloodless
    satisfaction from **undead outlaws** (skeleton gunslingers on Boot Hill: kick the skull off, shatter the bones),
    and maybe from human gunmen in later levels.
  - **This can be deferred.** Draw every splatter in one reserved sprite-CLUT entry, so "blood" is red or tan dust
    by a single CLUT write, the way some 16-bit games toned down. Design deaths for both and decide later.
  - The cost is art time, not hardware: Metal Slug's charm is a unique death for each enemy.
