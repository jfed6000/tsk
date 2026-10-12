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

**No name.** He's the Man With No Name, in boots. Townsfolk just call him *the Shitkicker*.

- **What he is:** two cowboy boots joined at the shafts. A face, a hat and two stubby arms. What's left of the cowboy.
- **Who he is:** an ornery, scowling jerk with a code. He kicks first and doesn't talk, but:
  - he keeps his word,
  - he never hurts an innocent,
  - he always tips his hat to a lady (his taunt, `T`).
- **Why he kicks:** he's boots. Every move is a kick: snap kick, side kick, bicycle kick, flying kick, and the stomp.
- **His cowboy: Ringo.** An old drover who wouldn't sell his land to the gang. He's seen only in the opening:
  the hat and the boots, and a headstone carved *RINGO. R.I.P.* (The name nods to Johnny Ringo and to the Ringo Kid
  in *Stagecoach*, and it fits a headstone in the 3×5 font. The townsfolk call the hero "Ringo's boots".)

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
| 3 | **Ghost Town** | **Doc Gila**, a Gila monster card sharp | Runs the saloon. A brawl through swinging doors, tables and falling signs. |
| 4 | **The Cattle Drive** | **Jackrabbit Jack**, the rustler | A stampede chase on the back of a longhorn: the Metal Slug vehicle level. |
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
- Is Vernon (the Ugly) in or out?
- Does the hero get a non-kick weapon? Metal Slug has one; spurs that fling like throwing stars would fit.
- Lives and continues: arcade continues, or Mario-style lives with 1-ups (a spare hat?).
