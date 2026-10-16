// Texas Shitkickers — the game: a Final Fight / Double Dragon style belt-scroller.
//
//   * a floor band you walk into and out of: every actor has x (along), z (into the screen) and h (height)
//   * screen y = FLOOR + z - h; sprites are depth-sorted every frame (nearer = lower sprite number = on top),
//     and every actor has a shadow so you can read depth in a jump
//   * stages in sequence: Boot Hill (midnight; the opening, the dead rising, Two-Bit) then Main Street (dusk)
//   * waves: the screen locks while a gang comes in, then "GO >>"
//   * X: kick combo (the third knocks down), back + X (or C): side kick, jump then X: flying kick,
//     jump again: stomp; walk into a staggered outlaw to grab him: X knees, C/jump throws him into his friends
//   * pickups from barrels: whip (long reach, wears out), six-shooter (six shots, then he tosses it), beans (health)
//   * the gang: mangy coyotes (shovels), dillos (roll at you), and the undead posse: skeleton gunslingers who keep
//     their distance and shoot down your lane, reload after six, and can have their skulls kicked off
(function () {
'use strict';
const T = window.TSK;

// the pickups and their shadows (also drawn by the F256 exporter, js/export.js)
T.buildPick = function () {
  const PAL = T.PAL;
  const mk = (w, h, ox, oy, pal, fn, outline = PAL.out) => {
    const c = T.canvas(w, h), x = c.getContext('2d'); x.translate(ox, oy); fn(x);
    const o = T.pixelize(c, pal, outline, T.CLUT.spr); o.ox = ox; o.oy = oy; return o;
  };
  const ell = (x, cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
  const IP = { out: PAL.out, b0: PAL.buckle, b1: PAL.band, bean0: '#7a3a1a', bean1: '#a8582a', plate: '#efe6cc', sh: '#2a1a1e', y0: '#ffd34a', y1: '#fff3c4', n2: PAL.n2, n0: PAL.n0 };
  return {
    whip: mk(24, 16, 12, 12, IP, x => {
      for (const [col, lw] of [[PAL.out, 3], [PAL.n2, 1.4]]) { x.strokeStyle = col; x.lineWidth = lw; ell(x, 0, -3, 7, 3.4); x.stroke(); ell(x, -1, -3.4, 4.4, 2); x.stroke(); }
      x.strokeStyle = PAL.n0; x.lineWidth = 2.4; x.beginPath(); x.moveTo(5, -2); x.lineTo(10, 1); x.stroke();
    }),
    gun: mk(24, 16, 12, 12, IP, x => {
      x.fillStyle = PAL.band; x.beginPath(); x.moveTo(-6, -2); x.lineTo(-9, 3); x.lineTo(-5, 3.6); x.lineTo(-3, -1); x.fill();
      x.fillStyle = PAL.buckle; x.fillRect(-4, -4, 5, 4); x.fillRect(1, -3.4, 9, 2.4);
      x.fillStyle = IP.y1; x.fillRect(2, -3.4, 7, 0.8);
    }),
    beans: mk(24, 16, 12, 12, IP, x => {
      ell(x, 0, -1, 10, 3.2); x.fillStyle = IP.plate; x.fill();
      ell(x, 0, -3, 6, 2.6); x.fillStyle = IP.bean1; x.fill();
      x.fillStyle = IP.bean0; for (const [bx, by] of [[-3, -3], [0, -4], [3, -3], [-1, -2], [2, -2]]) x.fillRect(bx, by, 1.4, 1);
    }),
    bullet: mk(8, 8, 4, 4, IP, x => { x.fillStyle = IP.y1; x.fillRect(-4, -0.5, 7, 1.4); x.fillStyle = IP.y0; x.fillRect(1, -1, 2.4, 2.4); }, null),
    shadow: mk(32, 8, 16, 4, { s: IP.sh }, x => { ell(x, 0, 0, 13, 3.4); x.fillStyle = IP.sh; x.fill(); }, null),
    shadowS: mk(24, 8, 12, 4, { s: IP.sh }, x => { ell(x, 0, 0, 8, 2.4); x.fillStyle = IP.sh; x.fill(); }, null),
    bulletIcon: mk(8, 8, 4, 4, IP, x => { x.fillStyle = PAL.buckle; x.fillRect(-1, -3, 2.4, 5); x.fillStyle = IP.y1; x.fillRect(-1, -3, 2.4, 1.4); }),
  };
};

T.runBrawler = function (A) {
  const { HERO, DILLO, BARREL, FX, COYOTE, keys, pressed, sfx, pollPad, params } = A;
  const VW = 320, VH = 240, FLOOR = 150, MAX_SPRITES = 128;
  let ZMAX = 80;                                 // the walking band's depth (a stage may narrow it: the train's roof)
  const WALK_X = 105, WALK_Z = 62, JUMP_V = 360, GRAV = 1150, LANE = 12;
  const MAX_HP = 16, BOSS_HP = 36;
  const PAL = T.PAL;

  // ---------------------------------------------------------------- shared art
  const HAT = T.buildHat();
  const HAT_BITS = T.buildHatBits(HAT);           // the hat crumbling, in the death scene
  let death = null;                              // the death scene, while it plays
  let signs = [];                                // Ghost Town's hanging signs
  let ride = null, obstacles = [], runners = [], stampede = [];   // the Cattle Drive: the ride, fences and rocks, horses and steers running free
  const H = T.HERO, CB = T.BOSS, E = T.ENEMY;
  const SKEL = T.buildSkeleton();
  const MANGY = T.buildCoyote('mangy');
  const PROPS = T.buildProps();
  const TUMBLE = T.buildTumbleweed();
  const DILLON = T.buildDillon();
  const RATTLER = T.buildRattler(), GILA = T.buildGila(), GPROPS = T.buildGhostProps();
  const RSP = T.buildRanchSprites(), JACK = T.buildJack(), RIDE_V = 120, SADDLE = T.RANCH.SADDLE;
  const PICK = T.buildPick();
  const TRS = T.buildTrainSprites(FLOOR), TR = T.TRAIN;   // the Train Heist: the tunnel's mouth; the cars and gaps
  const STING = T.buildSting();                    // its boss, Sting, and his dynamite
  let sticks = [], booms = [];                     // lit sticks of dynamite (flying, lying, kicked); the bangs
  const MI = T.MISSION, MSP = T.buildMissionSprites(), TORO = T.buildToro();   // the Mission: the church doors; Bullrush
  let door = null, shocks = [], siegeT = 0;
  const NO = T.NOON, NSP = T.buildNoonSprites(), DBK = T.buildDiamondback();   // High Noon: the clock's hands, the snakeskin boots; Diamondback
  let pebble = null, struck = false, ending = null;
  const SECRETS = T.buildSecrets(), MAX_HATS = 9, HAT_EVERY = 30000;   // the hidden hats (one a stage); a hat every 30,000 points
  let secret = null, nextHat = HAT_EVERY;   // the duel's kicked stone; the clock's struck noon; the ending, while it plays        // the doors (hp, shaking, busted), his stomp's shockwaves, the lull between siege waves
  let tunnel = null, tunnelT = 0, tdark = 0;
  const tally = { fell: 0, swept: 0, ko: 0, clank: 0, shove: 0, kicked: 0 };   // (for the test harness: outlaws down the gaps, swept off, KO'd)       // a tunnel coming or going by; the next one's in tunnelT; the dark in it

  // ---------------------------------------------------------------- the stages
  // waves: lock the screen at cam and send the gang in. 'skel@' = a skeleton claws up out of the ground on screen.
  const deserted = () => {                       // the original desert: tile rows drawn into one floor strip
    const TILES = T.buildTiles('desert'), L = T.buildLayers(VW, VH, FLOOR, 'desert');
    const st = T.canvas(960, VH), s = st.getContext('2d');
    for (let tx = 0; tx < 60; tx++) { const v = (tx * 7 + (tx >> 2)) % 4; s.drawImage(TILES['top' + v], tx * 16, 144); for (let ty = 10; ty < 15; ty++) s.drawImage(TILES['low' + ((v + ty) % 4)], tx * 16, ty * 16); }
    return { far: L.far, mid: L.mid, street: st };
  };
  const STAGES = {
    boothill: {
      name: 'BOOT HILL', sub: 'MIDNIGHT', W: 1920, secret: [1060, 2, 'bh'],  gang: COYOTE, lightning: true, intro: true, next: 'mainstreet',
      art: () => { const L = T.buildNightLayers(VW, VH, FLOOR); return { far: L.far, mid: L.mid, street: T.buildGraveyardStreet(VW, VH, FLOOR) }; },
      waves: [
        { cam: 0, gang: ['skel@', 'dillo', 'skel@'] },
        { cam: 360, gang: ['skel@', 'skel@', 'dillo', 'skel@'] },
        { cam: 760, gang: ['dillo', 'skel@', 'dillo', 'skel@'] },
        { cam: 1160, gang: ['skel@', 'skel@', 'skel@', 'skel@'] },
        { cam: 1600, boss: 'twobit' },
      ],
      barrels: [[300, 64, 'beans'], [700, 20, 'whip'], [1100, 60, 'beans'], [1350, 30, 'gun'], [1560, 50, 'beans']],
    },
    mainstreet: {
      name: 'MAIN STREET', sub: 'DUSK', W: 2400, secret: [1530, 2, 'ms'],  gang: MANGY, dusk: true, next: 'ghosttown',
      art: () => T.buildMainStreet(VW, VH, FLOOR),
      waves: [
        { cam: 0, gang: ['coyote', 'coyote', 'dillo'] },
        { cam: 380, gang: ['coyote', 'skel', 'coyote', 'dillo'] },
        { cam: 780, gang: ['skel', 'coyote', 'skel', 'dillo'] },
        { cam: 1200, gang: ['coyote', 'skel', 'coyote', 'skel'] },
        { cam: 1660, gang: ['skel', 'coyote', 'skel', 'coyote', 'coyote', 'skel'] },
        { cam: 1700, boss: 'dillon' },
      ],
      barrels: [[250, 20, 'beans'], [560, 60, 'whip'], [960, 10, 'beans'], [1330, 50, 'gun'], [1520, 15, 'whip'], [1800, 66, 'gun'], [1900, 20, 'beans']],
    },
    ghosttown: {                                 // level 3: Doc Gila's town, the street then his saloon
      name: 'GHOST TOWN', sub: 'MOONRISE', W: T.GHOST.W, secret: [1500, 2, 'gt'],  gang: MANGY, next: 'cattledrive',
      art: () => T.buildGhostTown(VW, VH, FLOOR),
      waves: [
        { cam: 0, gang: ['rattler', 'coyote', 'skel'] },
        { cam: 360, gang: ['rattler', 'coyote', 'rattler', 'skel'] },
        { cam: 720, gang: ['skel', 'rattler', 'coyote', 'skel'] },
        { cam: 1060, gang: ['coyote', 'rattler', 'coyote', 'rattler'] },             // at the saloon doors
        { cam: 1360, gang: ['rattler', 'skel', 'coyote', 'rattler', 'coyote', 'skel'] },   // inside
        { cam: 1712, boss: 'gila' },
      ],
      barrels: [[240, 20, 'beans'], [520, 60, 'whip'], [880, 30, 'beans'], [1000, 62, 'gun']],
      tables: [[1300, 24, null], [1420, 58, 'beans'], [1560, 34, 'whip'], [1640, 66, null], [1780, 20, 'gun'], [1880, 50, 'beans']],
      signs: [[200, 'BARBER'], [470, 'DENTIST'], [760, 'WHISKEY'], [980, 'GUNS']],   // hanging signs that fall as you pass
    },
    cattledrive: {                               // level 4: on a longhorn along the trail, then Jackrabbit Jack's corral
      name: 'THE CATTLE DRIVE', sub: 'SUNUP', W: T.RANCH.W, secret: [1300, 2, 'cd'],  gang: MANGY, next: 'train',
      art: () => T.buildRanch(VW, VH, FLOOR),
      // the ride (d = how far he's ridden): the first TREAD px the camera holds still and the trail runs under him (its
      // first LOOP px, twice: ranch.js), then the camera rolls on to the corral; it ends at camera end: WHOA!
      ride: { end: T.RANCH.GATE - 150, tread: 2 * T.RANCH.LOOP,
        spawns: [[40, 'rider', -1], [150, 'rider', 1], [300, 'gunner', -1], [380, 'rider', 1], [520, 'rider', -1], [600, 'gunner', 1],
          [690, 'rider', -1], [800, 'gunner', -1], [900, 'rider', 1], [1020, 'rider', -1], [1150, 'gunner', -1], [1260, 'rider', 1],
          [1400, 'gunner', -1], [1480, 'rider', 1], [1600, 'rider', -1], [1700, 'gunner', 1], [1820, 'rider', -1], [1900, 'gunner', -1],
          [2000, 'rider', 1], [2120, 'gunner', -1], [2200, 'rider', 1]] },   // (gunner: a gunslinger, a third of them, mostly behind you)
      obstacles: [['rock', 380, 20], ['rock', 470, 62], ['fence', 560], ['rock', 700, 40], ['rock', 790, 14], ['fence', 900], ['rock', 1000, 70],
        ['rock', 1100, 30], ['fence', 1230], ['rock', 1340, 50], ['rock', 1420, 12], ['rock', 1520, 66], ['fence', 1650], ['rock', 1760, 36],
        ['rock', 1840, 70], ['fence', 1960], ['rock', 2080, 24], ['rock', 2180, 58], ['fence', 2280], ['rock', 2340, 40]],
      waves: [
        { cam: 1150, gang: ['coyote', 'rattler', 'coyote', 'skel'] },               // at the corral gate, on foot
        { cam: 1712, boss: 'jack' },
      ],
      barrels: [[1300, 30, 'beans'], [1420, 64, 'whip'], [1560, 20, 'gun'], [1660, 50, 'beans']],
    },
    train: {                                     // level 5: along the roofs of a moving train, caboose to engine
      name: 'THE TRAIN HEIST', sub: 'MIDDAY', W: TR.W, secret: [1500, 2, 'th'],  gang: MANGY, next: 'mission', zmax: TR.ZMAX, train: true,
      art: () => T.buildTrain(VW, VH, FLOOR),
      gaps: TR.GAPS,                             // between the cars: jump them (fall in: 3, and back on the car)
      tunnel: { first: 12, every: 24, warn: 2.4, inside: 5, props: [0.6, 2.6] },   // TUNNEL! - duck (hold down) or be knocked flat; then two pit-props in the dark
      waves: [
        { cam: 0, gang: ['coyote', 'coyote', 'rattler'] },
        { cam: 360, gang: ['coyote', 'skel', 'coyote'] },
        { cam: 700, gang: ['rattler', 'coyote', 'skel', 'coyote'] },
        { cam: 1040, gang: ['skel', 'coyote', 'skel', 'rattler'] },
        { cam: 1370, gang: ['coyote', 'skel', 'coyote', 'rattler', 'coyote'] },   // (no gap under a locked screen's edges)
        { cam: 1712, boss: 'sting' },              // on the tender: Sting
      ],
      barrels: [[300, 16, 'beans'], [640, 30, 'whip'], [980, 10, 'beans'], [1300, 36, 'gun'], [1600, 20, 'beans'], [1800, 30, 'beans']],
    },
    mission: {                                   // level 6: the last stand at the mission, from sundown into the night
      name: 'THE MISSION', sub: 'SUNDOWN', W: MI.W, secret: [700, 2, 'mi'],  gang: MANGY, next: 'highnoon', dusk: true, dark: [0, 0.06, 0.14, 0.22, 0.3, 0.38, 0.46],
      art: () => T.buildMission(VW, VH, FLOOR),
      door: { x: MI.DOOR, hp: 30 },              // the church doors, the town barred in behind them: the gang batters them
      waves: [
        { cam: 0, gang: ['coyote', 'coyote', 'rattler'] },
        { cam: 400, gang: ['skel', 'coyote', 'coyote', 'rattler'] },
        // the siege: the courtyard locked, the bell tolls, and they come over the walls from both sides - the coyotes and
        // rattlers for the doors (two at most turn on you; the rest keep at it), the skeletons and dillos for you
        { cam: MI.YARD, siege: true, gang: ['coyote', 'coyote', 'rattler', 'coyote'] },
        { cam: MI.YARD, siege: true, gang: ['coyote', 'skel', 'rattler', 'coyote', 'rattler'] },
        { cam: MI.YARD, siege: true, gang: ['rattler', 'coyote', 'skel', 'coyote', 'dillo', 'coyote'] },
        { cam: MI.YARD, siege: true, gang: ['coyote', 'rattler', 'skel', 'coyote', 'rattler', 'dillo'] },   // (six at most: the F256's NEn)
        { cam: MI.YARD, boss: 'toro' },            // and through the side gate: Bullrush
      ],
      barrels: [[250, 30, 'beans'], [560, 60, 'whip'], [820, 20, 'gun'], [1000, 70, 'beans'], [1250, 64, 'whip']],
    },
    highnoon: {                                  // level 7: back down Main Street at noon, the last of the gang; at the clock tower, Diamondback
      name: 'HIGH NOON', sub: 'MAIN STREET', W: NO.W, secret: [1010, 2, 'hn'],  gang: MANGY, next: null, noon: true,
      art: () => T.buildNoon(VW, VH, FLOOR),
      waves: [
        { cam: 0, gang: ['coyote', 'skel', 'rattler', 'coyote'] },
        { cam: 420, gang: ['skel', 'coyote', 'dillo', 'rattler', 'coyote'] },
        { cam: 860, gang: ['coyote', 'skel', 'coyote', 'rattler', 'skel', 'coyote'] },
        { cam: NO.PLAZA, boss: 'diamondback' },   // the duel at the clock tower, then the fight
      ],
      barrels: [[300, 30, 'beans'], [620, 60, 'gun'], [1000, 20, 'beans'], [1180, 64, 'whip']],
    },
    desert: {
      name: 'THE DESERT', sub: 'NOON', W: 2400, gang: COYOTE, next: null, art: deserted,
      waves: [
        { cam: 0, gang: ['coyote', 'coyote', 'dillo'] },
        { cam: 380, gang: ['coyote', 'coyote', 'coyote', 'dillo'] },
        { cam: 780, gang: ['dillo', 'dillo', 'dillo', 'coyote', 'dillo'] },
        { cam: 1200, gang: ['coyote', 'coyote', 'coyote', 'coyote'] },
        { cam: 1660, gang: ['coyote', 'dillo', 'coyote', 'coyote', 'dillo', 'coyote'] },
      ],
      barrels: [[250, 20, 'beans'], [560, 60, 'whip'], [960, 10, 'beans'], [1330, 50, 'gun'], [1520, 15, 'whip'], [1800, 66, 'gun'], [1900, 20, 'beans']],
    },
  };
  const DARK = [0, 0.12, 0.24, 0.36, 0.48, 0.6];                  // Main Street: night falls a step per wave
  const SNAKE_NAMES = ['SIDEWINDER', 'SLIM', 'FANGS', 'HISS', 'COPPERHEAD', 'SLITHER', 'NOODLE', 'DIAMOND JIM'];
  const NAMES = ['DUSTY', 'SCRUFF', 'MANGY', 'HOWLER', 'LOBO', 'SNARL', 'CHIGGER', 'SKUNK'];
  const DEAD_NAMES = ['DEAD EYE', 'BONES', 'OL\' RATTLER', 'HOLLOW JACK', 'GRAVES', 'MORT', 'BLACKHAT', 'BONEY'];
  const KO_WORDS = ['YEEHAW!', 'KICKED!', 'GIT!', 'BOOTED!', 'WHOOP!', 'SKEDADDLE!'];
  const BONE_WORDS = ['BONE DRY!', 'RATTLED!', 'DUST TO DUST!', 'BACK TO THE GRAVE!', 'KICKED THE BUCKET!'];

  // ---------------------------------------------------------------- state
  let S, ART, W, player, enemies = [], items = [], bullets = [], ebullets = [], clods = [], skulls = [], parts = [], popups = [], barrels = [];
  let camX = 0, lock = null, waveI = 0, goT = 0, shake = 0, hitstop = 0, score = 0, combo = 0, comboT = 0, time = 0;
  let phase = 'play', phaseT = 0, showHelp = false, helpAuto = true, lastHit = null, lastHitT = 0, titleT = 0;
  let dark = 0, tumble = null, tumbleT = 4, flashT = 0, nextBolt = 7, boss = null;
  const artCache = {};

  // ---------------------------------------------------------------- music: the songs rendered from game/music/*.mid
  // (f256/tools/compose.py -> render.py), the same notes the F256 sends its SAM2695. M mutes.
  const SONGS = { title: true, boothill: true, clear: false, over: false, boogie: true, deadman: true, stampede: true, heist: true, laststand: true, standoff: true, showdown: true, entrance: false, bossfight: true };     // name: loops
  let song = null, songName = null, musicOff = false;
  function music(name) {
    if (name === songName) return;
    if (song) { song.pause(); song = null; }
    songName = name;
    if (!name || musicOff) return;
    song = new Audio('music/' + name + '.mp3');
    song.loop = SONGS[name]; song.volume = 0.6;
    song.play().catch(() => { songBlocked = true; });   // (no sound until a key's been pressed: the browser's rule;
  }                                              //  the first key starts it)
  let songBlocked = false;
  addEventListener('keydown', () => { if (songBlocked && song) { songBlocked = false; song.play().catch(() => { songBlocked = true; }); } });
  let hiScore = 0;
  try { hiScore = +localStorage.getItem('tsk-hi') || 0; } catch (e) {}
  function saveHi() { if (score > hiScore && !params.has('bot')) { hiScore = score; try { localStorage.setItem('tsk-hi', hiScore); } catch (e) {} } }

  function resetPlayer(keep) {
    player = Object.assign({ x: 70, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: 1, state: 'idle', t: 1, hp: MAX_HP, lives: 3, inv: 0,
      weapon: params.get('weapon') ? { type: params.get('weapon'), ammo: params.get('weapon') === 'gun' ? 6 : 14 } : null,
      held: null, step: 0, queued: false, hitSet: new Set(), knees: 0, anim: 'idle', frame: 0, chainT: 0 }, keep || {});
  }

  // ---------------------------------------------------------------- the title screen (f256/src/title.a)
  let titleDir = 1, story = false;               // the story's page, over the title's backdrop
  const STORY = [
    ['RINGO WAS IN THE WAY', '#fff3c4', 1, 30], ['THE DIAMONDBACK GANG GUNNED HIM DOWN', '#fff3c4', 1, 44],
    ['AND BURIED HIM ON BOOT HILL', '#fff3c4', 1, 54], ['WITH HIS BOOTS ON', '#fff3c4', 1, 64],
    ['RINGO STAYED DEAD', '#e8a070', 2, 82], ["HIS BOOTS DIDN'T", '#ff9d3c', 2, 102],
    ['THEY CLAWED UP OUT OF THE GRAVE', '#fff3c4', 1, 128], ['WITH HIS HAT, A SCOWL AND A GRUDGE', '#fff3c4', 1, 138],
    ['NOW THE BOOTS WANT REVENGE', '#ffd34a', 1, 158],
  ];
  function toTitle() {
    story = false;
    loadStage('boothill');
    barrels = []; phase = 'title'; phaseT = 0;
    player.x = 160; player.z = 24; player.face = 1; setS('idle'); player.t = 0.2;
    music('title');
  }
  function updateTitle(dt) {
    const p = player;
    camX += titleDir * 30 * dt;                 // the camera drifts along the hill and back
    if (camX >= W - VW) { camX = W - VW; titleDir = -1; } else if (camX <= 0) { camX = 0; titleDir = 1; }
    p.x = camX + 160; p.t += dt;
    if (p.state === 'idle' && p.t > 4) setS('taunt');
    else if (p.state === 'taunt' && p.t >= HERO.taunt.dur) { setS('idle'); p.t = 0.2; }
    pickAnim(p);
    if (pressed.jump) { if (story) loadStage('boothill'); else { story = true; phaseT = 0; } }   // jump: the story; jump again: the game
  }

  function loadStage(name, keep) {
    S = STAGES[name]; W = S.W;
    ART = artCache[name] || (artCache[name] = S.art());
    enemies = []; items = []; bullets = []; ebullets = []; clods = []; skulls = []; parts = []; popups = []; boss = null; entr = null; tumble = null; death = null;
    barrels = S.barrels.map(([x, z, item]) => ({ x, z, item, alive: true }))
      .concat((S.tables || []).map(([x, z, item]) => ({ x, z, item, alive: true, table: true })));
    signs = (S.signs || []).map(([x, name]) => ({ x, z: 10, h: FLOOR + 10 - 97, vh: 0, state: 'hang', t: 0, img: GPROPS.sign(name) }));
    camX = 0; lock = null; waveI = 0; goT = 0; dark = 0; titleT = 0; lastHit = null;
    resetPlayer(keep);
    phase = S.intro && !params.has('nointro') && !keep ? 'intro' : 'play'; phaseT = 0;
    intro.hatOn = false;
    if (phase === 'intro') { player.x = 96; player.z = 34; }
    music(name === 'boothill' ? 'boothill' : name === 'mainstreet' ? 'boogie' : name === 'ghosttown' ? 'deadman' : name === 'cattledrive' ? 'stampede' : name === 'train' ? 'heist' : name === 'mission' ? 'laststand' : name === 'highnoon' ? 'boogie' : 'title');
    ZMAX = S.zmax || 80;
    for (const w of S.waves) for (const x of [w.cam + 10, w.cam + VW - 10]) if (S.gaps && S.gaps.some(g => x > g[0] && x < g[1]))   // a locked edge
      console.warn(`${name}: the wave at ${w.cam} has a screen edge in a gap at ${x}`);                                            // over a gap traps him
    tunnel = null; tunnelT = S.tunnel ? S.tunnel.first : 0; tdark = 0;
    ride = S.ride ? { on: true, spawnI: 0, d: 0 } : null; player.mounted = !!S.ride;
    obstacles = (S.obstacles || []).map(([kind, d, z]) => ({ kind, d, x: d, z: z ?? 40, hit: false }));
    runners = []; stampede = []; sticks = []; booms = [];
    door = S.door ? { x: S.door.x, hp: S.door.hp, max: S.door.hp, bustT: 0 } : null; shocks = []; siegeT = 0;
    pebble = null; struck = false; ending = null;
    secret = S.secret ? { x: S.secret[0], z: S.secret[1], key: S.secret[2], open: false } : null;
    if (!keep) { score = 0; nextHat = HAT_EVERY; }    // (a new game)
  }

  // ---------------------------------------------------------------- spawning
  function spawn(type, side, i) {
    const rising = type === 'skel@', gunner = type === 'gunner';
    if (rising) type = 'skel';
    if (gunner) type = 'rider';                    // a gunslinger: a rider with a six-shooter
    const x = rising ? camX + 50 + Math.random() * (VW - 100) : side > 0 ? camX + VW + 24 + i * 18 : camX - 24 - i * 18;
    const e = {
      type, x, z: 8 + Math.random() * (ZMAX - 16), h: 0, vx: 0, vz: 0, vh: 0, face: -side, state: rising ? 'rise' : 'enter', t: 0,
      flash: 0, cd: 0.6 + Math.random() * 1.4, slot: side, anim: Math.random() * 3,
      name: type === 'coyote' ? NAMES[(Math.random() * NAMES.length) | 0] : type === 'skel' ? DEAD_NAMES[(Math.random() * DEAD_NAMES.length) | 0]
        : type === 'rattler' ? SNAKE_NAMES[(Math.random() * SNAKE_NAMES.length) | 0] : type === 'rider' ? NAMES[(Math.random() * NAMES.length) | 0] : 'DILLO',
      hp: { coyote: 9, dillo: 4, skel: 7, rattler: 7, rider: 6 }[type], ammo: 6, skull: true,
    };
    e.max = e.hp;
    if (gunner) { e.gun = true; e.ammo = 6; }
    if (rising) { e.face = Math.sign(player.x - e.x) || 1; dirt(e.x, e.z, 8); sfx('dig'); }
    enemies.push(e);
    return e;
  }
  function startWave() {
    const w = S.waves[waveI];
    lock = w.cam;
    if (w.boss) { startBoss(w.boss); return; }
    w.gang.forEach((type, i) => { const e = spawn(type, i % 2 ? -1 : 1, i >> 1); if (w.siege) overWall(e, i * 0.45); });
    if (w.siege) { sfx('bell'); popup(lock + VW / 2, 60, 'HERE THEY COME!', '#ff9d3c', 2, 1.6); }
  }
  function overWall(e, wait) {                   // the siege: he comes over the courtyard wall (after `wait` s), for the doors
    e.state = 'vault'; e.t = -wait; e.x = e.slot > 0 ? lock + VW + 8 : lock - 8;
    e.raid = e.type === 'coyote' || e.type === 'rattler'; e.post = 8 + Math.random() * 18;   // (where at the doors he'll stand)
  }

  // ---------------------------------------------------------------- effects
  function puff(x, z, n, h = 0) {
    for (let i = 0; i < n; i++) parts.push({ k: 'dust', x: x + (Math.random() - 0.5) * 12, z, h: h + 2, vx: (Math.random() - 0.5) * 80, vh: Math.random() * 40, life: 0.45, max: 0.45, s: (Math.random() * 3) | 0 });
  }
  function dirt(x, z, n) {
    for (let i = 0; i < n; i++) parts.push({ k: 'chunk', img: PROPS.clod, x: x + (Math.random() - 0.5) * 16, z, h: 2, vx: (Math.random() - 0.5) * 140, vh: 120 + Math.random() * 180, life: 0.9, max: 0.9 });
  }
  function spark(x, z, h, big) {
    parts.push({ k: 'star', x, z, h, life: big ? 0.18 : 0.12, max: big ? 0.18 : 0.12, big });
    for (let i = 0; i < (big ? 6 : 3); i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 140; parts.push({ k: 'bit', x, z, h, vx: Math.cos(a) * v, vh: Math.sin(a) * v, life: 0.22, max: 0.22, c: i % 2 }); }
  }
  function shatter(e) {                          // a skeleton comes apart
    for (let i = 0; i < 9; i++) parts.push({ k: 'chunk', img: SKEL.bones[i % 3], x: e.x, z: e.z, h: 10 + Math.random() * 30, vx: (Math.random() - 0.5) * 220, vh: 120 + Math.random() * 220, life: 1.3, max: 1.3 });
    parts.push({ k: 'chunk', img: SKEL.hat, x: e.x, z: e.z, h: 44, vx: (Math.random() - 0.5) * 80, vh: 260, life: 1.6, max: 1.6 });
    if (e.skull) parts.push({ k: 'chunk', img: SKEL.skull[0], spin: SKEL.skull, x: e.x, z: e.z, h: 40, vx: (Math.random() - 0.5) * 160, vh: 300, life: 1.6, max: 1.6 });
  }
  function popup(x, y, text, color = '#ffd34a', s = 2, life = 0.9) { popups.push({ x, y, text, color, s, life }); }
  function addScore(n, x, y) {
    combo = comboT > 0 ? combo + 1 : 1; comboT = 1.4;
    const m = Math.min(combo, 8); score += n * m;
    popup(x, y - 12, (n * m) + (m > 1 ? ' X' + m : ''), '#fff3c4', 1);
  }
  function bolt() { flashT = 0.16; sfx('thunder'); }

  // ---------------------------------------------------------------- hit boxes in (x, height) space, plus a lane check
  const eHeight = e => ({ coyote: 44, dillo: 16, skel: 46, twobit: 44, dillon: 48, rattler: 22, gila: 46, rider: 66, jack: 50, sting: 36, toro: 56, diamondback: 44 }[e.type]);
  const inLane = (a, b, tol = LANE) => Math.abs(a.z - b.z) < tol;
  function heroHitBox() {
    const p = player, a = HERO[p.anim], hb = a.hits && a.hits[p.frame];
    if (!hb) return null;
    const [hx, hy, hw, hh] = hb;
    const x0 = p.face > 0 ? p.x + hx : p.x - hx - hw, lift = p.mounted ? SADDLE : 0;   // (in the saddle he's higher)
    return { x0, x1: x0 + hw, h0: p.h + lift - hy - hh, h1: p.h + lift - hy };
  }
  const hits = (b, e) => b.x0 < e.x + 11 && b.x1 > e.x - 11 && b.h0 < e.h + eHeight(e) && b.h1 > e.h;
  const hittable = e => !['down', 'getup', 'ko', 'held', 'enter', 'rise', 'under', 'rumble', 'dig', 'intro', 'curl', 'roll', 'vanish', 'leap', 'hang', 'drop', 'hopping', 'leave', 'vault'].includes(e.state) && !(e.state === 'air' && e.thrown) && !e.cover;
  const allFoes = () => (boss ? enemies.concat([boss]) : enemies);

  // light hits stagger; knockdowns launch; out of health = kicked into the next county (or back to the grave)
  function hitE(e, dmg, knock, dir = player.face) {
    if (e === boss) {
      if (boss.type === 'sting' && ['approach', 'windup', 'pinchw', 'pinch', 'sting', 'intro', 'duck'].includes(boss.state)
        && (player.x - boss.x) * boss.face > -8) {   // his pincers up in front - or you're in him: it glances off (open him up, or get round behind)
        boss.flash = 0.05; spark(boss.x + boss.face * 18, boss.z, 24, false); sfx('shell'); hitstop = 0.03; tally.clank++;
        if (!boss.clankT || time - boss.clankT > 0.6) { boss.clankT = time; popup(boss.x + boss.face * 16, FLOOR + boss.z - 46, 'CLANK!', '#c3c8d8', 1, 0.6); }
        return;
      }
      tally.kicked++;
      return hitBoss(dmg, dir, knock);
    }
    e.hp -= dmg; e.flash = 0.1; lastHit = e; lastHitT = 2.2;
    spark(e.x - dir * 6, e.z, e.h + eHeight(e) * 0.6, dmg >= 2);
    if (e.hp <= 0) return koE(e, dir);
    if (e.type === 'skel' && knock && e.skull && Math.random() < 0.5) {      // the skull comes clean off
      e.skull = false; e.state = 'headless'; e.t = 0; e.vx = dir * 40;
      skulls.push({ x: e.x, z: e.z, h: 44, vx: dir * 110, vh: 200, state: 'fly', owner: e, anim: 0 });
      sfx('hit'); hitstop = 0.07; shake = Math.max(shake, 3);
      popup(e.x, FLOOR + e.z - 70, 'HEADS UP!', '#ffd34a', 1);
      addScore(60, e.x, FLOOR + e.z - 46);
      return;
    }
    if (knock) {
      if (e.type === 'rider') unhorse(e);
      e.state = 'air'; e.thrown = false; e.vx = dir * 150; e.vh = 220; e.t = 0;
      sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3); addScore(30, e.x, FLOOR + e.z - eHeight(e));
    } else {
      if (e.state !== 'headless') { e.state = 'stagger'; e.t = 0; }
      e.vx = dir * 70;
      sfx('hit'); hitstop = 0.04; shake = Math.max(shake, 1.5); addScore(10, e.x, FLOOR + e.z - eHeight(e));
    }
  }
  function unhorse(e) {                          // knocked out of the saddle: on foot now, and the horse bolts
    e.type = 'coyote'; e.h = Math.max(e.h, 24);
    runners.push({ x: e.x, z: e.z, vx: RIDE_V + 170, img: 'horse', face: 1 });
  }
  function koE(e, dir) {
    if (e.type === 'rider') unhorse(e);
    e.state = 'ko'; e.vx = dir * 240; e.vh = 330; e.t = 0; tally.ko++;
    sfx('ko'); hitstop = 0.08; shake = Math.max(shake, 4);
    const y = FLOOR + e.z - eHeight(e);
    addScore({ coyote: 300, dillo: 150, skel: 350, rattler: 250, rider: 350 }[e.type] || 300, e.x, y);
    if (e.type === 'skel') {
      shatter(e); popup(e.x, y, BONE_WORDS[(Math.random() * BONE_WORDS.length) | 0]);
      if (Math.random() < 0.35) items.push({ type: 'gun', x: e.x, z: e.z, h: 20, vh: 140, ammo: 2 + ((Math.random() * 5) | 0) });
      for (const s of skulls) if (s.owner === e) s.owner = null;
    } else popup(e.x, y, KO_WORDS[(Math.random() * KO_WORDS.length) | 0]);
    if (player.held === e) player.held = null;
  }

  // the train: a gap between the cars under x, or null; an outlaw dropped down one (or swept off by a tunnel)
  const gapAt = x => S.gaps ? S.gaps.find(g => x > g[0] + 3 && x < g[1] - 3) || null : null;
  function fallOff(e, swept) {
    if (player.held === e) player.held = null;
    for (const s of skulls) if (s.owner === e) s.owner = null;
    if (e.type === 'skel' && swept) { tally.swept++; e.hp = 0; koE(e, -1); return; }   // a skeleton swept off comes apart (as on the F256)
    e.state = 'ko'; e.t = 0; e.fell = !swept; tally[swept ? 'swept' : 'fell']++; e.vx = swept ? -260 : 0; e.vh = swept ? 160 : -60;
    sfx('ko'); shake = Math.max(shake, 3);
    const y = FLOOR + e.z - eHeight(e);
    addScore({ coyote: 400, dillo: 200, skel: 450, rattler: 350 }[e.type] || 400, e.x, y);
    popup(e.x, y, swept ? 'SWEPT OFF!' : 'SEE YA!', '#ffd34a', 2);
  }
  // the tunnel's rock wall in place of the scenery: from the mouth at mid-screen to the way out at mid-screen (on the
  // F256 the middle layer's map changes, all at once: the mouth's own rock face covers the change)
  const rockOn = () => !!tunnel && ((tunnel.st === 'mouth' && tunnel.x < VW / 2) || tunnel.st === 'inside' || (tunnel.st === 'exit' && tunnel.x >= VW / 2));
  // TUNNEL!: the warning's up, the mouth's coming, or a pit-prop - down is duck now
  const duckNow = () => !!tunnel && (tunnel.st === 'warn' || (tunnel.st === 'mouth' && tunnel.x > player.x - camX - 24)
    || tunnel.props.some(pr => pr.x > player.x - camX - 16 && pr.x < VW + 40));
  function sweep(x, hit) {                         // the mouth or a prop passing screen x: anyone up there is knocked flat
    const p = player, over = a => !hit.has(a) && Math.abs(a.x - camX - x) < 10;
    if (over(p)) {
      hit.add(p);
      if (p.state !== 'duck' && p.state !== 'fall' && !death && phase === 'play' && hurtPlayer({ x: p.x + 10 }, 3)) {
        p.vx = -170; shake = Math.max(shake, 7); hitstop = 0.1; popup(p.x, FLOOR + p.z - 64, 'MIND YER HEAD!', '#ff6b4a', 2, 1.4);
      }
    }
    for (const e of enemies) if (over(e)) {
      hit.add(e);
      if (e.type !== 'rattler' && e.type !== 'dillo' && e.state !== 'ko' && e.state !== 'down' && hittable(e)) fallOff(e, true);
    } else if (e.type === 'coyote' && !hit.has(e) && !(hit.guessed || (hit.guessed = new Set())).has(e)) {   // 70 px ahead of it,
      const ahead = e.x - camX - x;                                                                         // half the coyotes
      if (ahead > 0 && ahead < 70) { hit.guessed.add(e); if (['approach', 'recover'].includes(e.state) && Math.random() < 0.5) { e.state = 'down'; e.t = 0; e.vx = e.vz = 0; } }   // hit the deck
    }
  }

  function hurtPlayer(from, dmg) {
    const p = player;
    if (p.inv > 0 || phase !== 'play' || death || params.has('god')) return false;
    if (p.held) { p.held.state = 'stagger'; p.held.t = 0; p.held = null; }
    p.hp -= dmg; p.inv = 0.9; p.state = 'hurt'; p.t = 0; p.vx = -(Math.sign(from.x - p.x) || p.face) * 120; p.vz = 0; p.vh = 0;
    sfx('hurt'); shake = Math.max(shake, 3);
    if (p.weapon && p.weapon.type === 'whip') dropWeapon();
    if (p.hp <= 0) {                               // the death scene: the hat crumbles, he topples over
      p.hp = 0; p.inv = 0; p.weapon = null; p.held = null; setS('die'); p.vx *= 0.6;
      if (p.mounted) { p.mounted = false; p.remount = true; }
      sfx('ko'); shake = Math.max(shake, 5); hitstop = 0.12; ebullets = []; clods = [];
      for (let i = 0; i < 8; i++) parts.push({ k: 'chunk', img: HAT_BITS[i], x: p.x + p.face * ((i % 4) * 8 - 12), z: p.z, h: 44 - (i >> 2) * 8,
        vx: ((i % 4) - 1.5) * 40 + (Math.random() - 0.5) * 50, vh: 100 + Math.random() * 120, life: 0.7 + Math.random() * 0.3, max: 1 });
      puff(p.x, p.z, 5, 38);
      for (const e of enemies) if (hittable(e) && Math.abs(e.x - p.x) < 120) { e.state = 'air'; e.vx = Math.sign(e.x - p.x || 1) * 160; e.vh = 200; e.t = 0; }
      if (boss && (boss.state === 'curl' || boss.state === 'roll')) { bSet('recover'); boss.vx = 0; }   // Dillon uncurls to wait
      // no hats left (the hats are the spare lives): game over
      if (p.lives <= 0) { phase = 'over'; phaseT = 0; saveHi(); music('over'); popup(p.x, FLOOR + p.z - 60, 'GAME OVER', '#ff6b4a', 2, 9); return true; }
      death = { t: 0, hat: null, caught: false, hop: 0 };
      popup(p.x, FLOOR + p.z - 56, 'DAGNABBIT!', '#ff6b4a', 2, 1.4);
    } else popup(p.x, FLOOR + p.z - 52, 'OUCH!', '#ff6b4a', 2);
    return true;
  }
  function dropWeapon() {
    const p = player;
    items.push({ type: p.weapon.type, x: p.x - p.face * 10, z: p.z, h: 20, vh: 120, ammo: p.weapon.ammo });
    p.weapon = null;
  }

  // ---------------------------------------------------------------- the hero
  const SIDE_HIT0 = Math.min(...Object.keys(HERO.side.hits).map(Number));
  function setS(s) { const p = player; p.state = s; p.t = 0; p.hitSet.clear(); }
  function underfoot() {
    const p = player;
    return items.find(it => it.type !== 'beans' && it.type !== 'hat' && it.h <= 0 && Math.abs(it.x - p.x) < 16 && Math.abs(it.z - p.z) < 10);
  }
  function grabTarget(dir) {
    const p = player;
    return enemies.find(e => (e.state === 'stagger' || e.state === 'approach' || e.state === 'headless') && inLane(e, p, 9) && Math.sign(e.x - p.x) === dir && Math.abs(e.x - p.x) < 24 && e.h <= 0);
  }

  // the death scene: he falls, a hat lifts off the lives and floats down like a leaf; he reaches up, catches it,
  // gets up with it held high and puts it on. Those near him are blown back as he falls and again as he gets up;
  // meanwhile the gang hangs back and the boss waits.
  const HUD_HAT = i => [108 + (i >= 3 ? 0 : i) * 24 + T.HAT.OX, 6 + T.HAT.OY];   // a lives hat's place on the screen (four or more: the one with the count)
  function updateDeath(dt) {
    const p = player, d = death;
    d.t += dt; p.t += dt;
    p.vh -= GRAV * dt; p.h = Math.max(0, p.h + p.vh * dt); if (p.h <= 0) p.vh = 0;
    p.x = Math.max(camX + 12, Math.min(camX + VW - 12, p.x + p.vx * dt)); p.vx *= Math.pow(0.02, dt); p.vz = 0;
    if (p.state === 'die' && p.t >= HERO.die.dur) setS('dead');
    if (!d.hat && d.t > 1.1) {                     // a hat off the lives
      p.lives--; const [hx, hy] = HUD_HAT(p.lives);
      d.hat = { x0: camX + hx, y0: hy, x: camX + hx, y: hy, t: 0 }; sfx('tip');
    }
    const hand = (anim, f) => { const h = HERO[anim].hand[f]; return [p.x + p.face * h[0], sy(p.z, p.h) + h[1] - 1]; };
    if (d.hat && !d.caught) {                     // drifting down, rocking side to side
      const h = d.hat, [tx, ty] = hand('reach', 0), k = Math.min(1, (h.t += dt) / 2);
      const e = k * k * (3 - 2 * k);
      h.x = h.x0 + (tx - h.x0) * e + Math.sin(h.t * 4.5) * 16 * (1 - k); h.y = h.y0 + (ty - h.y0) * (0.5 * k + 0.5 * e);
      if (p.state === 'dead' && h.t > 0.7) setS('reach');
      if (k >= 1 && p.state === 'reach') { d.caught = true; setS('getup'); sfx('land'); }
    } else if (d.caught) {                         // in his hand as he gets up; at the top it goes on
      const f = Math.min(HERO.getup.frames.length - 1, Math.floor(p.t * HERO.getup.fps));
      [d.hat.x, d.hat.y] = hand('getup', f);
      if (p.t >= HERO.getup.dur) {
        d.hop += dt;
        const k = Math.min(1, d.hop / 0.16), hx = p.x + p.face * 0.6, hy = sy(p.z, p.h) - 31.6;
        d.hat.x += (hx - d.hat.x) * k; d.hat.y += (hy - d.hat.y) * k;
        if (k >= 1) {
          if (p.remount) { p.remount = false; p.mounted = !!(ride && ride.on); }
          death = null; setS('idle'); p.hp = MAX_HP; p.inv = 2.2; sfx('tip'); shake = Math.max(shake, 3);
          popup(p.x, FLOOR + p.z - 56, "STILL KICKIN'!", '#ffd34a', 2, 1.4);
          for (const e of enemies) if (hittable(e) && Math.abs(e.x - p.x) < 120) { e.state = 'air'; e.vx = Math.sign(e.x - p.x || 1) * 160; e.vh = 200; e.t = 0; }
        }
      }
    }
    pickAnim(p);
  }

  function updatePlayer(dt) {
    const p = player;
    if (death) return updateDeath(dt);
    if (boss && boss.type === 'diamondback' && boss.state === 'duel') return duelPlayer(dt);
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    p.t += dt; p.inv -= dt; p.chainT -= dt;
    const free = p.state === 'idle' || p.state === 'walk' || (p.state === 'land' && p.t > 0.08);
    if (free) {
      const back = dx !== 0 && dx !== p.face;              // pressing away from where he faces
      p.vx = dx * WALK_X; p.vz = dz * WALK_Z; if (dx) p.face = dx;
      const it = underfoot();
      if (keys.down && duckNow()) { setS('duck'); p.vx = p.vz = 0; }   // TUNNEL!: down is duck
      else if (pressed.jump) { setS('jump'); p.vh = JUMP_V; p.vz *= 0.5; sfx('jump'); }
      else if (pressed.snap && it) {                                  // X over a weapon picks it up
        items.splice(items.indexOf(it), 1);
        p.weapon = { type: it.type, ammo: it.type === 'gun' ? (it.ammo ?? 6) : (it.ammo ?? 14) };
        sfx('tip'); popup(p.x, FLOOR + p.z - 54, it.type === 'gun' ? 'SIX-SHOOTER!' : 'BULLWHIP!', '#ffd34a', 1, 1.2);
      } else if ((pressed.snap && back) || pressed.side) { setS('side'); sfx('whoosh'); }   // back + kick: turn into the side kick (C: shortcut)
      else if (pressed.snap && p.weapon && p.weapon.type === 'whip') { setS('whip'); sfx('whoosh'); }
      else if (pressed.snap && p.weapon && p.weapon.type === 'gun') { setS('shoot'); fire(); }
      else if (pressed.snap) { p.step = p.chainT > 0 && p.step < 3 ? p.step + 1 : 1; setS('snap'); sfx('whoosh'); }
      else if (pressed.taunt) { setS('taunt'); sfx('tip'); }
      else if (dx && !p.mounted && grabTarget(dx)) { p.held = grabTarget(dx); p.held.state = 'held'; setS('grab'); p.knees = 0; sfx('land'); }
      else { const want = dx || dz ? 'walk' : 'idle'; if (p.state !== want) { p.from = p.state; setS(want); } }
    }
    switch (p.state) {
      case 'snap':
        p.vx = p.vz = 0;
        if (pressed.snap && p.t > 0) p.queued = true;       // a later press queues the next kick (not the one that started this)
        if (p.t >= HERO.snap.dur * 0.8) {
          if (p.queued && p.step < 3) { p.queued = false; p.step++; setS('snap'); sfx('whoosh'); }
          else if (p.t >= HERO.snap.dur) { p.queued = false; setS('idle'); p.chainT = 0.45; }
        }
        break;
      case 'side': p.vz = 0; p.vx = p.frame === SIDE_HIT0 ? p.face * 90 : 0; if (p.t >= HERO.side.dur) setS('idle'); break;
      case 'taunt': p.vx = p.vz = 0; if (p.t >= HERO.taunt.dur) setS('idle'); break;
      case 'jump': case 'jumpkick': case 'stomp':
        if (p.t > 0) {                                  // not the press that started the jump (it would stomp at once)
          if (p.state === 'jump' && pressed.snap) setS('jumpkick');
          else if (p.state !== 'stomp' && pressed.jump) { setS('stomp'); p.vh = -560; p.vx = 0; sfx('whoosh'); }
        }
        if (p.state === 'jumpkick') p.vx = p.face * 170;
        p.vh -= GRAV * dt; p.h += p.vh * dt;
        if (p.h <= 0) {
          p.h = 0; p.vh = 0;
          if (p.state === 'stomp') stompShock();
          setS('land'); p.vx = p.vz = 0; puff(p.x, p.z, 3); sfx('land');
        }
        break;
      case 'land': p.vx *= 0.5; break;
      case 'roped': {                                 // on the end of Jack's lasso: yanked to him (no say in it)
        const b = boss;
        if (!b || b.state !== 'reel') { setS('idle'); break; }
        p.vx = Math.sign(b.x - p.x) * 220; p.vz = Math.abs(b.z - p.z) > 2 ? Math.sign(b.z - p.z) * 80 : 0; p.face = Math.sign(b.x - p.x) || p.face;
        break;
      }
      case 'grab': {
        const e = p.held;
        p.vx = p.vz = 0;
        if (!e || e.state !== 'held') { p.held = null; setS('idle'); break; }
        e.x = p.x + p.face * 17; e.z = p.z + 0.5; e.face = -p.face;
        if (pressed.snap) { setS('knee'); sfx('whoosh'); }
        else if (pressed.side || pressed.jump) setS('throw');
        else if (p.t > 1.6) { e.state = e.skull === false ? 'headless' : 'stagger'; e.t = 0; e.vx = p.face * 60; p.held = null; setS('idle'); }
        break;
      }
      case 'knee':
        if (p.held) { p.held.x = p.x + p.face * 17; p.held.z = p.z + 0.5; }
        if (p.held && p.frame >= 1 && !p.hitSet.has(p.held)) {
          p.hitSet.add(p.held); p.knees++;
          const e = p.held; e.hp -= 1; e.flash = 0.1; lastHit = e; lastHitT = 2.2;
          spark(e.x, e.z, 22, false); sfx('hit'); hitstop = 0.04; addScore(20, e.x, FLOOR + e.z - 44);
          if (e.hp <= 0) koE(e, p.face);
        }
        if (p.t >= HERO.snap.dur) { if (!p.held) setS('idle'); else if (p.knees >= 3) setS('throw'); else { setS('grab'); p.t = 0.4; } }
        break;
      case 'throw':
        if (p.held && p.frame >= 1) {
          const e = p.held; p.held = null;
          e.state = 'air'; e.thrown = true; e.vx = p.face * 280; e.vh = 210; e.h = 14; e.t = 0;
          sfx('whoosh'); popup(e.x, FLOOR + e.z - 50, 'YEE-HAW!', '#ffd34a', 1);
        }
        if (p.t >= HERO.throw.dur + 0.1) setS('idle');
        break;
      case 'whip':
        p.vx = p.vz = 0;
        if (p.frame === 1 && !p.hitSet.has('w')) {
          p.hitSet.add('w');
          const box = { x0: p.face > 0 ? p.x + 6 : p.x - 66, x1: p.face > 0 ? p.x + 66 : p.x - 6, h0: p.h + 8, h1: p.h + 40 };
          let any = false;
          for (const e of allFoes()) if (hittable(e) && inLane(e, p, 16) && hits(box, e)) { hitE(e, 2, false); any = true; }
          for (const b of barrels) if (b.alive && inLane(b, p, 16) && Math.abs(b.x - p.x - p.face * 36) < 32) breakBarrel(b);
          for (const b of ebullets) if (inLane(b, p, 16) && b.x > box.x0 && b.x < box.x1) { b.dead = true; spark(b.x, b.z, b.h, false); }
          sfx(any ? 'hit' : 'shell');
          if (--p.weapon.ammo <= 0) { p.weapon = null; popup(p.x, FLOOR + p.z - 54, 'WHIP BROKE!', '#ff9d3c', 1); }
        }
        if (p.t >= HERO.whip.dur + 0.05) setS('idle');
        break;
      case 'shoot':
        p.vx = p.vz = 0;
        if (p.t >= HERO.shoot.dur + 0.05) {
          if (p.weapon && p.weapon.ammo <= 0) {        // out of rounds: toss the empty gun, Metal Slug style
            parts.push({ k: 'chunk', img: PICK.gun, x: p.x, z: p.z, h: 26, vx: -p.face * 90, vh: 200, life: 1.2, max: 1.2 });
            p.weapon = null; popup(p.x, FLOOR + p.z - 54, 'CLICK!', '#ff9d3c', 1);
          }
          setS('idle');
        }
        break;
      case 'duck': p.vx = p.vz = 0; if (!keys.down || !duckNow()) setS('idle'); break;   // flat on the roof, hat held on
      case 'fall':                                   // down a gap between the cars
        p.vx = p.vz = 0; p.vh -= GRAV * dt; p.h += p.vh * dt;
        if (p.t > 0.6) {                             // back up on the car he came from, sore
          const g = p.fallGap, [lo, hi] = heroBounds(), sides = p.fallFrom < 0 ? [g[0] - 14, g[1] + 14] : [g[1] + 14, g[0] - 14];
          p.x = sides.find(x => x >= lo && x <= hi) ?? sides[0]; p.h = 0; p.vh = 0; setS('idle'); p.inv = 0;   // (a side the screen lets him stand on)
          if (!hurtPlayer({ x: p.x - p.fallFrom }, 3) || p.hp > 0) popup(p.x, FLOOR + p.z - 64, 'WATCH YER STEP!', '#ffd34a', 1, 1.2);
          if (!death) p.inv = Math.max(p.inv, 1.4);
        }
        break;
      case 'hurt':                                   // knocked back; hit in the air, he falls (he used to hang there)
        p.vx *= Math.pow(0.02, dt);
        if (p.h > 0 || p.vh) { p.vh -= GRAV * dt; p.h += p.vh * dt; if (p.h <= 0) { p.h = 0; p.vh = 0; } }
        if (p.t > 0.4 && p.h <= 0) setS('idle');     // (tossed: not till he's down again)
        break;
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (p.mounted && ride && ride.on && !rideTread()) p.x += RIDE_V * dt;   // carried along at the gallop (when the camera moves)
    p.z = Math.max(0, Math.min(ZMAX, p.z));
    const [lo, hi] = heroBounds();
    p.x = Math.max(lo, Math.min(hi, p.x));
    const gp = p.h <= 0 && p.state !== 'fall' && p.state !== 'die' && p.state !== 'dead' ? gapAt(p.x) : null;
    if (gp) {                                        // over a gap, feet down: he drops
      p.fallGap = gp; p.fallFrom = p.x - p.vx * dt < (gp[0] + gp[1]) / 2 ? -1 : 1; if (p.held) { p.held.state = 'stagger'; p.held.t = 0; p.held = null; }
      setS('fall'); p.vh = 0; p.h = 0; sfx('hurt');
    }
    if (!['knee', 'grab', 'throw', 'fall'].includes(p.state)) resolveHeroAttacks();
    for (const it of items) if ((it.type === 'beans' || it.type === 'hat') && it.h <= 0 && Math.abs(it.x - p.x) < 14 && Math.abs(it.z - p.z) < 10) {
      it.gone = true;
      if (it.type === 'hat') gainHat(it.x, it.z);
      else { p.hp = Math.min(MAX_HP, p.hp + 7); sfx('check'); popup(it.x, FLOOR + it.z - 30, 'BEANS!', '#ffd34a', 1); }
    }
    items = items.filter(it => !it.gone);
    pickAnim(p);
  }

  function heroBounds() {                        // where he may stand: the screen while it's locked, the saddle's margins
    const p = player;
    return [(lock ?? camX) + (p.mounted ? 24 : 10), lock !== null ? lock + VW - 10 : p.mounted ? camX + VW - 30 : W - 10];
  }

  function fire() {
    const p = player;
    p.weapon.ammo--;
    bullets.push({ x: p.x + p.face * 24, z: p.z, h: p.h + 22, vx: p.face * 380 });
    sfx('break'); shake = Math.max(shake, 1);
  }

  function resolveHeroAttacks() {
    const p = player, b = heroHitBox();
    if (!b) return;
    const kind = p.state;
    for (const e of allFoes()) {
      if (!hittable(e) || p.hitSet.has(e) || !inLane(e, p) || !hits(b, e)) continue;
      p.hitSet.add(e);
      if (kind === 'snap') hitE(e, p.step >= 3 ? 3 : 2, p.step >= 3);
      else if (kind === 'side') hitE(e, 4, true);
      else if (kind === 'jumpkick') hitE(e, 3, true);
    }
    for (const br of barrels) if (br.alive && !p.hitSet.has(br) && inLane(br, p) && b.x0 < br.x + 9 && b.x1 > br.x - 9) { p.hitSet.add(br); breakBarrel(br); }
    kickShell(b); kickTable(b); kickSticks(b);
    if (secret && !secret.open && inLane(secret, p, 14) && b.x0 < secret.x + 12 && b.x1 > secret.x - 12 && b.h0 < 30) openSecret();
    for (const s of skulls) if (s.state === 'ground' && !p.hitSet.has(s) && inLane(s, p) && b.x0 < s.x + 6 && b.x1 > s.x - 6 && b.h0 < 14) {
      p.hitSet.add(s); s.state = 'kicked'; s.vx = p.face * 330; s.vh = 70; s.h = 6;      // kick the skull down the lane
      sfx('hit'); spark(s.x, s.z, 6, true); popup(s.x, FLOOR + s.z - 20, 'FORE!', '#ffd34a', 1);
    }
    for (const q of ebullets) if (inLane(q, p) && q.x > b.x0 - 4 && q.x < b.x1 + 4 && q.h > b.h0 && q.h < b.h1) { q.dead = true; spark(q.x, q.z, q.h, false); sfx('shell'); }   // kick a bullet out of the air
    for (const c of clods) if (inLane(c, p) && c.x > b.x0 - 4 && c.x < b.x1 + 4 && c.h > b.h0 - 4 && c.h < b.h1 + 4) { c.dead = true; dirt(c.x, c.z, 3); sfx('hit'); }
  }

  function stompShock() {
    const p = player;
    shake = 6; hitstop = 0.05; sfx('stomp');
    parts.push({ k: 'ring', x: p.x, z: p.z, h: 0, life: 0.35, max: 0.35 });
    popup(p.x, FLOOR + p.z - 56, 'STOMP!', '#ff8a3c', 2);
    for (const e of allFoes()) if (hittable(e) && Math.abs(e.x - p.x) < 64 && Math.abs(e.z - p.z) < 24 && e.h < 10) hitE(e, 2, true, Math.sign(e.x - p.x) || 1);
  }

  // the church doors: battered, they splinter; at nothing they're busted in - and it costs a hat (the town's his to keep)
  // before the townsfolk throw the gang back out and bar them again
  function hitDoor(n) {
    if (!door || door.hp <= 0) return;
    door.hp -= n; sfx('thud');
    for (let i = 0; i <= n; i++) parts.push({ k: 'chunk', img: MSP.splinter, x: door.x + (Math.random() - 0.5) * 30, z: 1, h: 16 + Math.random() * 34,
      vx: (Math.random() - 0.5) * 160, vh: 80 + Math.random() * 120, life: 0.8, max: 0.8 });
    if (door.hp <= 0) bustDoor();
  }
  function bustDoor() {
    const p = player;
    door.hp = 0; door.bustT = 2; shake = Math.max(shake, 6); sfx('break');
    popup(door.x, 64, "THEY'RE IN!", '#ff6b4a', 2, 1.8);
    if (p.lives <= 0 && !params.has('god')) {     // no hat to lose: the town's fallen
      p.hp = 0; setS('die'); phase = 'over'; phaseT = 0; saveHi(); music('over'); popup(p.x, FLOOR + p.z - 60, 'GAME OVER', '#ff6b4a', 2, 9);
      return;
    }
    if (!params.has('god')) p.lives--;
    popup(door.x, 84, 'THAT COST YA A HAT!', '#ffd34a', 1, 1.8);
  }
  function updateDoor(dt) {
    if (!door) return;
    if (door.bustT > 0 && (door.bustT -= dt) <= 0) {   // the townsfolk throw them out and bar the doors again
      door.bustT = 0; door.hp = door.max; sfx('tip'); popup(door.x, 64, 'BARRED AGAIN!', '#fff3c4', 1, 1.4);
      for (const e of enemies) if (e.raid && hittable(e) && Math.abs(e.x - door.x) < 60 && e.z < 30) { e.state = 'air'; e.vx = Math.sign(e.x - door.x || 1) * 150; e.vh = 260; e.t = 0; }
    }
  }

  // the hidden hat: kick the thing at the back of the street (its glint's the tell) and a hat tumbles out of it
  function openSecret() {
    secret.open = true; sfx('break'); hitstop = 0.05; shake = Math.max(shake, 3);
    for (let i = 0; i < 8; i++) parts.push({ k: 'chunk', img: FX.chunk[(Math.random() * FX.chunk.length) | 0], x: secret.x, z: secret.z, h: 8 + Math.random() * 16,
      vx: (Math.random() - 0.5) * 160, vh: 80 + Math.random() * 140, life: 0.9, max: 0.9 });
    items.push({ type: 'hat', x: secret.x, z: secret.z + 10, h: 24, vh: 230 });
  }
  function gainHat(x, z) {                        // a hat: a spare life (at most nine); a full rack, points instead
    const p = player;
    if (p.lives < MAX_HATS) { p.lives++; sfx('tip'); popup(x, FLOOR + z - 44, 'ANOTHER HAT!', '#ffd34a', 1, 1.4); }
    else { score += 5000; sfx('check'); popup(x, FLOOR + z - 44, 'FULL HAT RACK!', '#ffd34a', 1, 1.4); }
  }

  function breakBarrel(b) {
    b.alive = false; sfx('break'); hitstop = 0.04; shake = Math.max(shake, 2);
    for (let i = 0; i < 10; i++) parts.push({ k: 'chunk', img: FX.chunk[(Math.random() * FX.chunk.length) | 0], x: b.x, z: b.z, h: 10 + Math.random() * 14,
      vx: (Math.random() - 0.5) * 200, vh: 100 + Math.random() * 180, life: 1, max: 1 });
    if (b.item) items.push({ type: b.item, x: b.x, z: b.z, h: 10, vh: 160 });
    addScore(50, b.x, FLOOR + b.z - 24);
  }

  function pickAnim(p) {
    if (p.mounted && (p.state === 'idle' || p.state === 'walk')) { p.anim = 'jump'; p.frame = 1; return; }   // in the saddle
    if (p.state === 'roped') { p.anim = 'hurt'; p.frame = 0; return; }
    const at = (name, loop) => { const a = HERO[name]; p.anim = name; const f = Math.floor(p.t * a.fps); p.frame = loop ? f % a.frames.length : Math.min(f, a.frames.length - 1); };
    switch (p.state) {
      case 'idle': if (p.t < 0.1) { p.anim = 'turn'; p.frame = 0; } else { p.anim = 'idle'; p.frame = Math.floor((p.t - 0.1) * HERO.idle.fps) % HERO.idle.frames.length; } break;
      case 'walk': p.anim = 'run'; p.frame = Math.floor(time * 10) % 6; break;
      case 'jump': p.anim = 'jump'; p.frame = p.vh > 120 ? 0 : p.vh > -120 ? 1 : 2; break;
      case 'jumpkick': p.anim = 'airside'; p.frame = 0; break;
      case 'stomp': p.anim = 'stomp'; p.frame = 1; break;
      case 'land': p.anim = 'land'; p.frame = 0; break;
      case 'snap': case 'knee': at('snap'); break;
      case 'side': at('side'); break;
      case 'taunt': at('taunt'); break;
      case 'grab': p.anim = 'grab'; p.frame = 0; break;
      case 'throw': at('throw'); break;
      case 'whip': at('whip'); break;
      case 'shoot': at('shoot'); break;
      case 'hurt': p.anim = 'hurt'; p.frame = p.t < 0.2 ? 0 : 1; break;
      case 'fall': p.anim = 'hurt'; p.frame = 1; break;
      case 'duck': at('duck'); break;
      case 'die': at('die'); break;
      case 'dead': p.anim = 'dead'; p.frame = 0; break;
      case 'reach': at('reach', true); break;
      case 'getup': at('getup'); break;
    }
  }

  // ---------------------------------------------------------------- the gang
  // coyotes and dillos: enter -> approach (a flanking spot beside you, in your lane) -> wind up -> strike -> ...
  // skeletons: keep their distance, line up in your lane, aim (the eyes flare), fire; reload after six.
  // At most two close in to attack at once; the rest circle, as in Final Fight.
  function updateEnemies(dt) {
    const p = player;
    const attackers = enemies.filter(e => ['windup', 'strike'].includes(e.state)).length;
    for (const e of enemies) {
      e.t += dt; e.flash -= dt; e.anim += dt; e.cd -= dt;
      if (ride && ride.on && !death) {
        if (e.type === 'rider') { if (!rideTread()) e.x += RIDE_V * dt; }      // keeping up at the gallop
        else if (rideTread() && e.state !== 'ko') e.x -= RIDE_V * dt;            // on foot on the treadmill: the trail carries him back
      }
      const coy = e.type === 'coyote' || e.type === 'rider', skel = e.type === 'skel';
      switch (e.state) {
        case 'enter':
          e.vx = -e.slot * 60; e.face = -e.slot;
          if (e.x > camX + 20 && e.x < camX + VW - 20) e.state = 'approach';
          break;
        case 'rise': e.vx = e.vz = 0; if (e.t > 0.9) { e.state = 'approach'; e.cd = 0.8; } break;
        case 'vault':                              // up on the wall, then the leap down into the courtyard
          if (e.t < 0) { e.vx = e.vz = 0; break; }
          if (!e.leapt) { e.leapt = true; e.h = 46; e.vh = 140; sfx('jump'); }
          e.vx = -e.slot * 80; e.vh -= GRAV * dt; e.h += e.vh * dt;
          if (e.h <= 0) { e.h = 0; e.vh = 0; e.vx = 0; e.state = 'approach'; e.cd = 0.6; puff(e.x, e.z, 3); sfx('land'); }
          break;
        case 'batter':                             // at the doors: a blow every 0.8 s
          e.vx = e.vz = 0; e.face = Math.sign(door.x - e.x) || -e.slot;
          if (!door.bustT && Math.abs(p.x - e.x) < 40 && Math.abs(p.z - e.z) < 16 && attackers < 2 && !death) { e.state = 'approach'; e.cd = 0.3; break; }   // he's here: turn on him
          if (e.t > 0.8) { e.t = 0; hitDoor(1); }
          break;
        case 'approach': {
          const side = Math.sign(e.x - p.x) || e.slot, busy = attackers >= 2;
          if (e.raid && door && !door.bustT && phase === 'play' && (busy || death || !(Math.abs(p.x - e.x) < 40 && Math.abs(p.z - e.z) < 16))) {
            const tx = door.x + e.slot * e.post, tz = 2;                  // for the doors, unless he's in the way (and not two on him already)
            e.vx = Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x) * 4, e.type === 'rattler' ? 64 : 58);
            e.vz = Math.sign(tz - e.z) * Math.min(Math.abs(tz - e.z) * 4, 42);
            e.face = Math.sign(tx - e.x) || e.face;
            if (Math.abs(tx - e.x) < 5 && Math.abs(tz - e.z) < 4) { e.state = 'batter'; e.t = 0; e.vx = e.vz = 0; }
            break;
          }
          const rat = e.type === 'rattler';                   // a rattler keeps 70 px off: its lunge is long
          const gunsl = e.type === 'rider' && e.gun && e.ammo > 0;   // a gunslinger hangs back 130 px and shoots
          const tx = p.x + side * (skel || death ? 100 : gunsl ? 130 : busy ? 80 : rat ? 70 : e.type === 'rider' ? 44 : coy ? 36 : 28), tz = p.z;   // (the death scene: they hang back)
          const sp = skel ? 46 : rat ? 64 : coy ? 58 : 72;
          e.vx = Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x) * 4, sp);
          e.vz = Math.sign(tz - e.z) * Math.min(Math.abs(tz - e.z) * 4, 42);
          e.face = Math.sign(p.x - e.x) || e.face;
          if (phase !== 'play' || death) break;
          if (skel || gunsl) { if (e.cd <= 0 && Math.abs(tz - e.z) < 5 && Math.abs(tx - e.x) < 40) { e.state = 'aim'; e.t = 0; e.vx = e.vz = 0; sfx('shell'); } }
          else if (!busy && e.cd <= 0 && Math.abs(tx - e.x) < 8 && Math.abs(tz - e.z) < 5) { e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; if (rat) sfx('rattle'); }
          break;
        }
        case 'aim':
          e.vx = e.vz = 0; e.face = Math.sign(p.x - e.x) || e.face;
          if (e.type === 'rider' && e.t > 0.25 && !e.glint) { e.glint = true; parts.push({ k: 'star', x: e.x + e.face * 20, z: e.z, h: 56, life: 0.12, max: 0.12, big: false }); }   // the glint: it's coming
          if (e.t > 0.55) { e.state = 'shoot'; e.t = 0; e.glint = false; ebullets.push({ x: e.x + e.face * 22, z: e.z, h: e.type === 'rider' ? 54 : 28, vx: e.face * 230 }); sfx('break'); e.ammo--; }
          break;
        case 'shoot': if (e.t > 0.35) { if (e.ammo <= 0) { e.state = e.type === 'rider' ? 'approach' : 'reload'; e.t = 0; } else { e.state = 'approach'; e.cd = 0.8 + Math.random(); } } break;
        case 'reload': e.vx = e.vz = 0; if (e.t > 1.5) { e.ammo = 6; e.state = 'approach'; e.cd = 0.3; } break;
        case 'windup': e.vx = e.vz = 0; if (e.t > (coy ? 0.42 : e.type === 'rattler' ? 0.6 : 0.3)) { e.state = 'strike'; e.t = 0; e.hitDone = false; sfx('whoosh'); } break;
        case 'strike':
          if (coy) {
            e.vx = 0;
            const reach = e.type === 'rider' ? 58 : 44, high = e.type === 'rider' ? 34 : 24;   // a rider's lasso reaches further
            if (!e.hitDone && e.t < 0.2 && inLane(e, p, 10) && p.h < high && Math.sign(p.x - e.x) === e.face && Math.abs(p.x - e.x) < reach) { e.hitDone = true; hurtPlayer(e, 2); }
            if (e.t > 0.25) { e.state = 'recover'; e.t = 0; }
          } else if (e.type === 'rattler') {       // the lunge: low and long - jump it, then kick it while it's stretched out
            e.vx = e.t < 0.28 ? e.face * 270 : 0; e.vz = 0;
            if (!e.hitDone && e.t < 0.3 && inLane(e, p, 10) && p.h < 14 && Math.abs(p.x - (e.x + e.face * 16)) < 16) { e.hitDone = true; hurtPlayer(e, 2); }
            if (e.t > 0.35) { e.state = 'recover'; e.t = 0; }
          } else {                                 // the dillo curls up and rolls at you
            e.vx = e.face * 190; e.vz = 0;
            if (!e.hitDone && inLane(e, p, 10) && p.h < 14 && Math.abs(p.x - e.x) < 16) { e.hitDone = true; hurtPlayer(e, 1); }
            if (e.t > 0.5) { e.state = 'recover'; e.t = 0; }
          }
          break;
        case 'recover': e.vx *= Math.pow(0.001, dt); e.vz = 0; if (e.t > (e.type === 'rattler' ? 1.0 : 0.55)) { e.state = 'approach'; e.cd = 0.8 + Math.random() * 1.2; } break;
        case 'stagger': e.vx *= Math.pow(0.01, dt); e.vz = 0; if (e.t > 0.4) { e.state = e.skull === false ? 'headless' : 'approach'; e.cd = 0.4; } break;
        case 'headless': {                         // blind, groping for its head
          const s = skulls.find(q => q.owner === e);
          e.vx = s ? Math.sign(s.x - e.x) * 30 + Math.sin(e.t * 9) * 25 : Math.sin(e.t * 5) * 30;
          e.vz = s ? Math.sign(s.z - e.z) * 20 : Math.cos(e.t * 4) * 20;
          if (s && s.state === 'ground' && Math.abs(s.x - e.x) < 7 && Math.abs(s.z - e.z) < 6) {
            skulls.splice(skulls.indexOf(s), 1); e.skull = true; e.state = 'approach'; e.cd = 1; sfx('tip');
          }
          if (!s && e.t > 0.5) { e.hp = 0; koE(e, Math.sign(e.vx) || 1); }
          break;
        }
        case 'held': e.vx = e.vz = 0; break;
        case 'leave': e.vx = 240; e.vz = 0; if (e.x > camX + VW + 80) e.gone = true; break;   // a rider making off at the ride's end
        case 'air':                                // knocked down or thrown: an arc, then flat on the ground
          e.vh -= GRAV * dt; e.h += e.vh * dt;
          if (e.thrown) for (const o of allFoes()) if (o !== e && hittable(o) && inLane(o, e, 14) && Math.abs(o.x - e.x) < 22 && o.h < 30) {
            hitE(o, 3, true, Math.sign(e.vx) || 1); spark(o.x, o.z, 20, true);
          }
          if (e.h <= 0 && gapAt(e.x)) { fallOff(e); break; }
          if (e.h <= 0) {
            e.h = 0; e.vh = 0; e.vx = 0; puff(e.x, e.z, 4); sfx('land');
            if (e.thrown) { e.thrown = false; e.hp -= 3; e.flash = 0.1; if (e.hp <= 0) { koE(e, 1); break; } }
            e.state = 'down'; e.t = 0;
          }
          break;
        case 'down': e.vx = e.vz = 0; if (e.t > 0.9) { e.state = 'getup'; e.t = 0; } break;
        case 'getup': if (e.t > (skel ? 0.6 : 0.35)) { e.state = e.skull === false ? 'headless' : 'approach'; e.cd = 0.6; } break;
        case 'ko': e.vh -= GRAV * 0.7 * dt; e.h += e.vh * dt; break;
      }
      e.x += e.vx * dt; e.z += e.vz * dt;
      e.z = Math.max(0, Math.min(ZMAX, e.z));
      if (S.gaps && e.state !== 'ko') {           // the train: they hop the gaps; dropped in one, they're gone
        if (e.hop) { e.vh -= GRAV * dt; e.h += e.vh * dt; if (e.h <= 0) { e.h = 0; e.vh = 0; e.hop = false; } }
        const walking = ['enter', 'approach', 'headless', 'leave'].includes(e.state);
        if (walking && !e.hop && e.h <= 0 && e.vx && gapAt(e.x + Math.sign(e.vx) * 14) && !gapAt(e.x)) { e.hop = true; e.vh = 280; }
        else if (!e.hop && e.h <= 0 && e.state !== 'air') {   // on his feet (staggered, sliding): he stops at the edge
          const g = gapAt(e.x); if (g) e.x = e.x - g[0] < g[1] - e.x ? g[0] - 1 : g[1] + 1;
        }
      }
      if (lock !== null && e.state !== 'enter' && e.state !== 'ko' && e.state !== 'leave' && e.state !== 'vault') e.x = Math.max(lock + 6, Math.min(lock + VW - 6, e.x));   // (riders leaving go)
    }
    enemies = enemies.filter(e => !e.gone && !(e.state === 'ko' && (e.h < -260 || e.type === 'skel')));
  }

  // skulls: knocked off, they bounce to the floor; a headless body gropes for its own; kicked, they bowl outlaws over
  function updateSkulls(dt) {
    for (const s of skulls) {
      s.anim += dt;
      if (s.state === 'fly' || s.state === 'kicked') {
        s.x += s.vx * dt; s.vh -= GRAV * 0.8 * dt; s.h += s.vh * dt;
        if (s.state === 'kicked') for (const o of allFoes()) if (!s.dead && hittable(o) && o !== s.owner && inLane(o, s, 12) && Math.abs(o.x - s.x) < 14 && o.h < 30) {
          hitE(o, 3, true, Math.sign(s.vx)); s.dead = true;
        }
        if (s.h <= 0 && gapAt(s.x)) s.dead = true;          // (down between the cars)
        if (s.h <= 0) { s.h = 0; s.vh = s.state === 'kicked' ? 70 : 0; if (s.state === 'fly') { s.state = 'ground'; s.vx = 0; } }
        if (s.x < camX - 20 || s.x > camX + VW + 20) s.dead = true;
      }
      if (s.state === 'ground' && !s.owner && (s.t = (s.t || 0) + dt) > 4) s.dead = true;
      if (s.dead) {
        for (let i = 0; i < 4; i++) parts.push({ k: 'chunk', img: SKEL.bones[i % 3], x: s.x, z: s.z, h: s.h + 4, vx: (Math.random() - 0.5) * 160, vh: 100 + Math.random() * 150, life: 1, max: 1 });
        if (s.owner && s.owner.state === 'headless') { s.owner.hp = 0; koE(s.owner, Math.sign(s.vx) || 1); }
      }
    }
    skulls = skulls.filter(s => !s.dead);
  }

  // ---------------------------------------------------------------- Two-Bit, the gravedigger, as a brawler boss
  // approach -> (close) wind up + shovel swing | (far) fling three clods at you | (every third) dig in, tunnel through
  // the dirt toward you and burst up underneath, which leaves him dizzy. At half health he raises two of the dead.
  function startBoss(kind) {
    if (kind === 'diamondback') {                  // waiting at the clock tower: the duel first
      boss = { type: 'diamondback', name: 'DIAMONDBACK', x: lock + 240, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: -1, hp: 64, max: 64,
        state: 'duel', t: 0, n: 0, flash: 0, said: false, summoned: false, anim: 0, ammo: 6, shots: 0, rage: false,
        drawAt: 3.2 + Math.random() * 1.6, drawT: 0, res: null, kicked: false };
      music('standoff');
      return;
    }
    if (kind === 'toro') {                         // Bullrush comes through the side gate at a charge
      boss = { type: 'toro', name: 'BULLRUSH', x: lock + VW + 40, z: 40, h: 0, vx: -340, vz: 0, vh: 0, face: -1, hp: 60, max: 60,
        state: 'intro', t: 0, n: 0, flash: 0, said: false, summoned: false, anim: 0, armor: 0, rage: false, second: false };
      sfx('bellow'); shake = Math.max(shake, 4); startEntrance();
      return;
    }
    if (kind === 'sting') {                        // Sting drops down off the engine's cab
      boss = { type: 'sting', name: 'STING', x: lock + 250, z: 24, h: 70, vx: 0, vz: 0, vh: -60, face: -1, hp: 56, max: 56,
        state: 'intro', t: 0, n: 0, flash: 0, said: false, summoned: false, anim: 0 };
      startEntrance();
      return;
    }
    if (kind === 'jack') {                         // Jackrabbit Jack hops in over the corral fence
      boss = { type: 'jack', name: 'JACKRABBIT JACK', x: lock + 250, z: 40, h: 60, vx: 0, vz: 0, vh: -100, face: -1, hp: 46, max: 46,
        state: 'intro', t: 0, n: 0, flash: 0, said: false, summoned: false, anim: 0, lasso: null, tx: 0, tz: 0 };
      startEntrance();
      return;
    }
    if (kind === 'gila') {                         // Doc Gila deals himself in
      boss = { type: 'gila', name: 'DOC GILA', x: lock + 250, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: -1, hp: 44, max: 44,
        state: 'intro', t: 0, n: 0, flash: 0, said: false, summoned: false, anim: 0, table: null, cover: false, volleys: 0 };
      sfx('card'); puff(boss.x, boss.z, 4); startEntrance();
      return;
    }
    if (kind === 'dillon') {                       // Big Shell Dillon rolls in from the right
      boss = { type: 'dillon', name: 'BIG SHELL DILLON', x: lock + 260, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: -1, hp: 40, max: 40,
        state: 'intro', t: 0, n: 2, flash: 0, said: false, summoned: false, anim: 0, bounces: 0, deflected: false };   // n 2: he opens with the roll
      sfx('land'); puff(boss.x, boss.z, 6); startEntrance();
      return;
    }
    boss = { type: 'twobit', name: 'TWO-BIT', x: lock + 250, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: -1, hp: BOSS_HP, max: BOSS_HP,
      state: 'intro', t: 0, n: 0, flash: 0, mx: 0, mz: 0, said: false, summoned: false, anim: 0 };
    sfx('dig'); dirt(boss.x, boss.z, 10); startEntrance();
  }
  function bSet(s) { boss.state = s; boss.t = 0; }

  // ---------------------------------------------------------------- a boss's entrance (every boss but Diamondback, whose
  // duel is his): the music cuts to the sting, everything else holds (the hero, his gang, their shots), he arrives in his
  // own way and says his line (his 'intro', held open), his name and what he is come up, then a line about Ringo; at the
  // end FIGHT! and the boss theme. A kick after the first beat skips it. (story.md: the user's lines, 2026-10-16)
  // His name and what he is sit just over his head; his two lines (his own, then Ringo's) come one after the other right
  // in front of his face in a speech bubble, held still (the user, 2026-10-16).
  const ENTRANCE = T.ENTRANCE;                   // (levels.js: the exporter draws the F256's from it too)
  // The order (the user, 2026-10-16): he arrives; a second after he's down and still, his name types on over his head, a telegraph
  // click a letter, and what he is stamps on under it; a second and a half; then his line, then Ringo's, ~3 s each
  // ("about 2 seconds more on each line"); FIGHT!. The boss theme comes in as the sting ends (4.6 s in).
  const ENT = { arrive: 0.6, settle: 1.0, letter: 0.045, stamp: 0.15, pause: 1.5, line: 3.0, theme: 4.6, skip: 0.8, hold: 2.0 };
  const BUBBLE = !params.has('nobubble');        // (the user liked the bubble; ?nobubble for the bare words)
  let entr = null;
  function startEntrance() { entr = { t: 0, arr: null, n: 0, stamped: false }; boss.said = true; music('entrance'); }   // (his lines are the entrance's)
  function entrMarks() {                         // when each part comes, from his arrival (s into the entrance)
    const name = entr.arr + boss.name.length * ENT.letter, nick = name + ENT.stamp, line = nick + ENT.pause;
    return { name, nick, line, ringo: line + ENT.line, end: line + 2 * ENT.line };
  }
  function say(b, text, dur) { b.say = text; b.sayEnd = time + dur; }   // a boss's line, in a bubble (Diamondback's)
  function updateEntrance(dt) {                  // (before the boss's own update)
    const b = boss;
    if (!entr || !b) { entr = null; return; }
    entr.t += dt;
    if (entr.arr === null && entr.t >= ENT.arrive && b.h <= 0 && !(b.type === 'toro' && b.vx)) entr.arr = entr.t + ENT.settle;   // down and still; a second, then his name
    if (entr.t >= ENT.theme) music('bossfight');   // (music() ignores the song already playing)
    let end = false;
    if (entr.arr !== null) {
      const M = entrMarks(), n = Math.max(0, Math.min(b.name.length, Math.floor((entr.t - entr.arr) / ENT.letter) + 1));
      if (n > entr.n) { if (b.name[n - 1] !== ' ') sfx('tick'); entr.n = n; }       // a click a letter
      if (!entr.stamped && entr.t >= M.nick) { entr.stamped = true; sfx('stamp'); shake = Math.max(shake, 2); }
      end = entr.t >= M.end;
    }
    if ((pressed.snap || pressed.side || pressed.jump) && entr.t > ENT.skip) end = true;
    if (end) {                                   // FIGHT!
      entr = null; if (b.state === 'intro') b.t = 99;
      popup(lock + VW / 2, 66, 'FIGHT!', '#ff9d3c', 3, 1.0); sfx('bell'); music('bossfight');
    }
  }
  function hitBoss(dmg, dir, knock) {
    const b = boss;
    if (b.type === 'diamondback' && b.state === 'stretch') dmg = Math.ceil(dmg * 1.5);   // a missed strike: stretched out, wide open
    if (b.type === 'jack' && ['approach', 'intro'].includes(b.state) && Math.random() < 0.65) {   // too quick for you: over the kick
      b.dodge = true; bSet('crouch'); b.vx = 0; popup(b.x, FLOOR + b.z - 66, 'TOO SLOW!', '#ffd34a', 1); sfx('whoosh'); return;
    }
    if (b.state === 'daze' || (b.type === 'toro' && b.state === 'stuck')) dmg = Math.ceil(dmg * 1.5);
    if (b.type === 'dillon' && b.state === 'daze' && (b.dazeDmg = (b.dazeDmg || 0) + dmg) >= 14 && b.hp > dmg) bSet('approach');   // he shakes it off
    b.hp -= dmg; b.flash = 0.12; lastHit = b; lastHitT = 99;
    spark(b.x - dir * 6, b.z, 28, true); sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3); score += dmg * 50;
    if (b.hp <= 0) {
      b.hp = 0; bSet('ko'); b.vx = dir * 180; b.vh = 420; b.face = -dir;
      if (b.type === 'sting') { b.vx = dir * 260; b.vh = 480; sticks = []; for (let i = 0; i < 3; i++) booms.push({ x: b.x + (i - 1) * 16, z: b.z, t: -i * 0.12 }); sfx('boom'); }   // his whole bandolier goes up
      sfx('ko'); hitstop = 0.18; shake = 9; score += 5000; clods = []; ebullets = [];
      popup(b.x, FLOOR + b.z - 70, 'YEEHAW!', '#ffd34a', 3, 1.6);
      for (const e of enemies) if (e.state !== 'ko') { e.hp = 0; koE(e, Math.sign(e.x - b.x) || 1); }
      return;
    }
    // staggered; Big Shell Dillon's armour shrugs off hits while he walks: only a whiff leaves him open
    if (b.type === 'sting' && b.state === 'light' && !b.salvo) {   // hit with a lit stick in his claw: he drops it at his feet
      sticks.push({ x: b.x + b.face * 14, z: b.z, h: 20, vx: 0, vz: 0, vh: 60, fuse: 1.1, kicked: false }); popup(b.x, FLOOR + b.z - 60, 'UH OH!', '#ff9d3c', 1);
    }
    if ((b.type === 'dillon' ? ['recover'] : b.type === 'gila' ? ['recover', 'deal'] : b.type === 'jack' ? ['land', 'recover', 'spin']
      : b.type === 'sting' ? ['recover', 'stuck', b.salvo ? '' : 'light', 'toss', 'pinchw'] : b.type === 'toro' ? ['recover']
      : b.type === 'diamondback' ? ['recover', 'reload', 'stretch'] : ['approach', 'recover', 'throw']).includes(b.state)) {   // (lighting the lot, he braces)
      if (b.type === 'jack' && ((b.stagN || 0) >= 2 || b.x < lock + 70 || b.x > lock + VW - 70)) jackEscape();   // no pinning him down
      else { bSet('stagger'); b.vx = dir * 70; b.lasso = null; b.stagN = (b.stagN || 0) + 1; }
    }
    if (b.type === 'toro' && ['approach', 'paw'].includes(b.state) && ++b.armor >= 3) {   // a hide like a saddle: on the third he turns on you
      b.armor = 0; bSet('hookw'); b.vx = b.vz = 0; popup(b.x, FLOOR + b.z - 66, 'SNORT!', '#ff9d3c', 1);
    }
    if (!b.summoned && b.hp < b.max / 2) {                           // half health: he calls in his own
      b.summoned = true;
      if (b.type === 'diamondback') {               // the posse rises for him; and he fans two volleys now
        say(b, T.DKSAY.posse, 2.0); sfx('rattle'); b.rage = true;
        spawn('skel@', 1, 0); spawn('skel@', -1, 0);
      } else if (b.type === 'toro') {                      // red: quicker, and every charge comes straight back; two more at the doors
        popup(b.x, FLOOR + b.z - 70, "SEEIN' RED!", '#ff6b4a', 1, 1.6); sfx('bellow'); b.rage = true;
        for (const sd of [1, -1]) { const e = spawn('coyote', sd, 0); overWall(e, 0.3); }
      } else
      if (b.type === 'dillon') { popup(b.x, FLOOR + b.z - 70, 'ROLL OUT, BOYS!', '#ff9d3c', 1, 1.6); spawn('dillo', 1, 0); spawn('dillo', -1, 0); }
      else if (b.type === 'gila') { popup(b.x, FLOOR + b.z - 70, "DEAL 'EM IN!", '#ff9d3c', 1, 1.6); spawn('rattler', 1, 0); spawn('rattler', -1, 0); }
      else if (b.type === 'sting') {                // every stick he's got: one down each lane
        popup(b.x, FLOOR + b.z - 66, "LIGHT 'EM ALL!", '#ff9d3c', 1, 1.6); sfx('shell');
        b.salvo = true; if (b.state !== 'stagger') bSet('retreat');   // back off, then a stick down every lane
      }
      else if (b.type === 'jack') {                 // the herd, turned loose on you
        popup(b.x, FLOOR + b.z - 70, 'STAMPEDE!', '#ff9d3c', 1, 1.6); shake = Math.max(shake, 6);
        [10, 40, 70].forEach((z, i) => stampede.push({ x: camX + VW + 60 + i * 90, z, vx: -260 }));
      }
      else { popup(b.x, FLOOR + b.z - 66, 'RISE, BOYS!', '#ff9d3c', 1, 1.6); spawn('skel@', 1, 0); spawn('skel@', -1, 0); }
    }
    // Doc Gila won't stand for a big hit: a card trick (gone, then back behind you) or a leap to land on you, turn about
    if (b.type === 'gila' && knock && ['approach', 'recover', 'stagger', 'deal', 'flick', 'jaws', 'bite'].includes(b.state)) gilaEscape();
  }
  function updateBoss(dt) {
    const b = boss, p = player;
    if (!b) return;
    if (death && b.state !== 'ko') { b.flash -= dt; b.vx = b.vz = 0; return; }   // the death scene: he waits
    if (entr && b.state === 'intro' && b.t > ENT.hold) b.t = ENT.hold;      // his entrance: held at his word
    if (b.type === 'dillon') return updateDillon(dt);
    if (b.type === 'gila') return updateGila(dt);
    if (b.type === 'jack') return updateJack(dt);
    if (b.type === 'sting') return updateSting(dt);
    if (b.type === 'toro') return updateToro(dt);
    if (b.type === 'diamondback') return updateDiamondback(dt);
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    switch (b.state) {
      case 'intro':
        b.face = toward;
        if (!b.said && b.t > 0.3) { b.said = true; popup(b.x, FLOOR + b.z - 70, 'I BURIED YOU MYSELF!', '#fff3c4', 1, 2); }
        if (b.t > 2.2) bSet('approach');
        break;
      case 'approach': {
        b.face = toward;
        const tx = p.x - toward * 40;
        b.vx = Math.abs(tx - b.x) > 4 ? Math.sign(tx - b.x) * 50 : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 38 : 0;
        if (b.t > 1.1 || (Math.abs(tx - b.x) < 8 && Math.abs(dz) < 6 && b.t > 0.4)) {
          b.n++; b.vx = b.vz = 0;
          if (b.n % 3 === 0) { bSet('dig'); sfx('dig'); }
          else if (Math.abs(dx) < 70 && Math.abs(dz) < 10) bSet('windup');
          else bSet('throwWind');
        }
        break;
      }
      case 'windup': b.vx = b.vz = 0; if (b.t > 0.45) { bSet('swing'); sfx('whoosh'); b.hitDone = false; } break;
      case 'swing':
        b.vx = b.t < 0.15 ? b.face * 90 : 0;
        if (!b.hitDone && b.t < 0.22 && inLane(b, p, 12) && p.h < 26 && Math.sign(dx) === b.face && Math.abs(dx) < 48) { b.hitDone = true; hurtPlayer(b, 3); }
        if (b.t > 0.32) bSet('recover');
        break;
      case 'recover': b.vx = b.vz = 0; if (b.t > 0.65) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.28) bSet('approach'); break;
      case 'throwWind': b.vx = b.vz = 0; b.face = toward; if (b.t > 0.35) { bSet('throw'); flingClods(); } break;
      case 'throw': if (b.t > 0.5) bSet('recover'); break;
      case 'dig': b.vx = b.vz = 0; if (b.t > 0.4) { bSet('under'); b.mx = b.x; b.mz = b.z; dirt(b.x, b.z, 8); } break;
      case 'under':                       // a mound of dirt tunnels toward you, through depth as well
        b.mx += Math.sign(p.x - b.mx) * Math.min(Math.abs(p.x - b.mx), 115 * dt);
        b.mz += Math.sign(p.z - b.mz) * Math.min(Math.abs(p.z - b.mz), 60 * dt);
        b.mx = Math.max(lock + 20, Math.min(lock + VW - 20, b.mx));
        if (Math.random() < 0.2) puff(b.mx, b.mz, 1);
        if ((Math.abs(p.x - b.mx) < 6 && Math.abs(p.z - b.mz) < 5) || b.t > 1.8) { bSet('rumble'); sfx('dig'); }
        break;
      case 'rumble': if (Math.random() < 0.4) dirt(b.mx, b.mz, 1); if (b.t > 0.5) { bSet('pop'); b.x = b.mx; b.z = b.mz; b.vh = 230; dirt(b.x, b.z, 12); shake = Math.max(shake, 5); sfx('stomp'); } break;
      case 'pop':
        if (b.t < 0.2 && Math.abs(p.x - b.x) < 18 && Math.abs(p.z - b.z) < 12 && p.h < 30) hurtPlayer(b, 3);
        if (b.t > 0.35 && b.h <= 0) { bSet('daze'); popup(b.x, FLOOR + b.z - 62, 'DIZZY!', '#ffd34a', 1); }
        break;
      case 'daze': b.vx = b.vz = 0; if (b.t > 1.8) bSet('approach'); break;
      case 'ko':
        b.vh -= GRAV * 0.6 * dt; b.h += b.vh * dt; b.x += b.vx * dt;
        if (b.t > 2 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    if (b.state !== 'under' && b.state !== 'rumble') {
      b.vh -= GRAV * dt; b.h = Math.max(0, b.h + b.vh * dt); if (b.h === 0) b.vh = 0;
      b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
      b.x = Math.max(lock + 14, Math.min(lock + VW - 14, b.x));
    }
  }
  function flingClods() {
    const b = boss, p = player;
    for (let k = 0; k < 3; k++) {
      const tx = p.x + (k - 1) * 22, tz = p.z + (k - 1) * 10, tt = 0.7 + k * 0.08;
      clods.push({ x: b.x + b.face * 16, z: b.z, h: 34, vx: (tx - b.x) / tt, vz: (tz - b.z) / tt, vh: 0.5 * GRAV * 0.75 * tt - 34 / tt });
    }
    sfx('dig');
  }
  function updateClods(dt) {
    const p = player;
    for (const c of clods) {
      c.vh -= GRAV * 0.75 * dt; c.x += c.vx * dt; c.z += c.vz * dt; c.h += c.vh * dt;
      if (Math.abs(c.x - p.x) < 10 && Math.abs(c.z - p.z) < 9 && c.h > p.h - 2 && c.h < p.h + 40 && hurtPlayer(c, 2)) c.dead = true;
      if (c.h <= 0) { c.dead = true; puff(c.x, c.z, 2); dirt(c.x, c.z, 2); }
    }
    clods = clods.filter(c => !c.dead);
  }

  function updateShots(dt) {
    const p = player;
    for (const b of bullets) {                   // yours
      b.x += b.vx * dt;
      for (const e of allFoes()) if (!b.dead && hittable(e) && inLane(e, b, 10) && Math.abs(e.x - b.x) < 12) { b.dead = true; hitE(e, 4, true, Math.sign(b.vx)); }
      for (const br of barrels) if (!b.dead && br.alive && inLane(br, b, 10) && Math.abs(br.x - b.x) < 9) { b.dead = true; breakBarrel(br); }
      if (b.x < camX - 20 || b.x > camX + VW + 20) b.dead = true;
    }
    bullets = bullets.filter(b => !b.dead);
    for (const b of ebullets) {                  // the posse's: step out of the lane, or jump them
      b.x += b.vx * dt;
      if (ride && ride.on && !rideTread()) b.x += RIDE_V * dt;           // (fired from the gallop: they keep its pace)
      const lift = p.mounted ? SADDLE : 0;                               // in the saddle his body's higher
      if (Math.abs(b.x - p.x) < 9 && inLane(b, p, 8) && b.h > p.h + lift && b.h < p.h + lift + 40 && hurtPlayer(b, 2)) b.dead = true;
      if (b.x < camX - 20 || b.x > camX + VW + 20) b.dead = true;
    }
    ebullets = ebullets.filter(b => !b.dead);
    for (const it of items) if (it.h > 0 || it.vh > 0) { it.vh -= GRAV * dt; it.h = Math.max(0, it.h + it.vh * dt); if (it.h === 0) it.vh = 0; }
    if (S.gaps) items = items.filter(it => !(it.h <= 0 && gapAt(it.x)));   // the train: what lands in a gap is gone
  }

  function updateParts(dt) {
    for (const q of parts) {
      q.life -= dt;
      if (q.vx !== undefined) q.x += q.vx * dt;
      if (q.vh !== undefined) { q.h += q.vh * dt; if (q.k !== 'dust' && q.k !== 'bit' && q.k !== 'mote') q.vh -= GRAV * 0.8 * dt; if (q.h < 0) { q.h = 0; q.vh *= -0.3; q.vx *= 0.6; } }
    }
    parts = parts.filter(q => q.life > 0);
    for (const u of popups) { u.life -= dt; if (u.life < 1.5) u.y -= 30 * dt; }
    popups = popups.filter(u => u.life > 0);
  }

  // waves: walk right to trigger the next gang; clear it to get "GO >>"
  // the train's tunnels: TUNNEL! (warn), the mouth sweeps across from the right at the scenery's speed (anyone up
  // when it passes over him is knocked flat - an outlaw clean off the train), the dark inside, then the way out
  function updateTunnel(dt) {
    if (!S.tunnel) return;
    const TN = S.tunnel;
    if (!tunnel) {
      if (phase === 'play' && !death && (tunnelT -= dt) <= 0) {
        tunnel = { st: 'warn', t: 0, x: VW + 8, hit: new Set(), props: [], np: 0 }; sfx('whistle');
      }
      tdark = Math.max(0, tdark - dt * 3);
      return;
    }
    const tn = tunnel; tn.t += dt;
    if (tn.st === 'warn') { if (tn.t > TN.warn - 0.8) shake = Math.max(shake, 1.2); if (tn.t >= TN.warn) { tn.st = 'mouth'; tn.t = 0; sfx('roar'); } return; }   // the rumble of it coming
    for (const pr of tn.props) { pr.x -= TR.V * dt; sweep(pr.x, pr.hit); }   // the pit-props: duck each one
    tn.props = tn.props.filter(pr => pr.x > -30);
    if (tn.st === 'inside') {
      tdark = Math.min(TR.DARK, tdark + dt * 4); shake = Math.max(shake, 0.8);
      if (tn.np < TN.props.length && tn.t >= TN.props[tn.np]) {    // a prop coming: the creak, and the coyotes' guess
        tn.np++; tn.props.push({ x: VW + 12, hit: new Set() }); sfx('creak');
      }
      if (tn.t >= TN.inside) { tn.st = 'exit'; tn.t = 0; tn.x = VW + 8; }
      return;
    }
    tn.x -= TR.V * dt;                                // the mouth (or the way out) going by
    if (tn.st === 'mouth') {
      sweep(tn.x + 8, tn.hit);
      tdark = Math.min(TR.DARK, tdark + dt * 0.8);   // in the mountain's shadow
      shake = Math.max(shake, 2);
      if (tn.x < -70) { tn.st = 'inside'; tn.t = 0; }
    } else {
      if (tn.x < VW / 2) tdark = Math.max(0, tdark - dt * 4);
      if (tn.x < -70) { tunnel = null; tunnelT = TN.every; }
    }
  }

  function updateWaves(dt) {
    if (lock !== null && !boss && !enemies.some(e => e.state !== 'ko' && e.state !== 'leave')) {
      lock = null; waveI++; goT = 3; sfx('check');
      if (waveI >= S.waves.length) stageClear();
    }
    goT -= dt;
    if (lock === null && waveI < S.waves.length && phase === 'play' && camX >= S.waves[waveI].cam - 1) {
      const w = S.waves[waveI], lull = w.siege || (w.boss && waveI > 0 && S.waves[waveI - 1].siege);   // (the siege: a breather between waves)
      if (lull && waveI > 0 && S.waves[waveI - 1].cam === w.cam && (siegeT += dt) < 2.2) return;
      siegeT = 0; startWave();
    }
  }
  function stageClear() { phase = 'clear'; phaseT = 0; music('clear'); setS('taunt'); player.vx = player.vz = 0; }

  // ---------------------------------------------------------------- the opening on Boot Hill: the Shitkickers climb out of Ringo's grave
  const STONE = { x: 66, z: 4 };
  const IN = { bolt: 0.7, rumble: 1.1, rise: 1.5, wake: 1.5 + HERO.rise.dur + 0.3 };
  IN.hop = IN.wake + 0.3; IN.land = IN.hop + 0.55; IN.end = IN.land + 0.2;
  const intro = { hx: 0, hy: 0, hatOn: false };
  function updateIntro(dt) {
    const t = phaseT, p = player;
    if ((pressed.jump || pressed.snap || pressed.side) && t < IN.land) phaseT = IN.land - 0.01;
    if (t >= IN.bolt && t - dt < IN.bolt) bolt();
    if (t >= IN.rumble && t < IN.rise) { shake = Math.max(shake, 1.5); if (Math.random() < 0.3) dirt(p.x, p.z, 1); }
    if (t >= IN.rise && t - dt < IN.rise) { dirt(p.x, p.z, 14); sfx('dig'); }
    const x0 = STONE.x, y0 = FLOOR + STONE.z - 34, x1 = p.x, y1 = FLOOR + p.z - 31.6;
    const k = Math.max(0, Math.min(1, (t - IN.hop) / (IN.land - IN.hop)));
    intro.hx = x0 + (x1 - x0) * k; intro.hy = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 26;
    if (t >= IN.land && !intro.hatOn) { intro.hatOn = true; sfx('tip'); puff(p.x, p.z, 4); }
    if (t >= IN.end) { phase = 'play'; phaseT = 0; titleT = 0; player.state = 'idle'; player.t = 0.2; }
  }

  // ---------------------------------------------------------------- display list: depth-sorted sprites
  const view = document.getElementById('view'), vctx = view.getContext('2d');
  const buf = T.canvas(VW, VH), ctx = buf.getContext('2d');
  let scale = 2;
  function resize() { scale = Math.max(1, Math.floor(Math.min(innerWidth / VW, innerHeight / VH))); view.width = VW * scale; view.height = VH * scale; vctx.imageSmoothingEnabled = false; }
  addEventListener('resize', resize); resize();
  let DL = [], stats = { records: 0, dropped: 0 };
  function put(img, x, y, ox, oy, pri, face = 1, clut = null) {
    const left = face < 0 ? Math.round(x) - (img.width - ox) : Math.round(x) - ox, top = Math.round(y) - oy;
    if (left >= VW || top >= VH || left + img.width <= 0 || top + img.height <= 0) return;
    DL.push({ img, left, top, pri, face, clut, n: T.cells(img, face < 0).length });
  }
  const center = (img, y) => put(img, (VW - img.width) >> 1, y, 0, 0, 0);
  const depth = z => 3 + (ZMAX - z) / 100;          // nearer (bigger z) = smaller priority = drawn on top
  const sy = (z, h) => FLOOR + z - h;

  let helpImg = null;
  function helpSprite() {
    if (helpImg) return helpImg;
    const lines = [['ARROWS', 'MOVE (UP/DOWN = DEPTH)'], ['Z', 'JUMP'], ['X X X', 'KICK COMBO'], ['BACK + X', 'SIDE KICK (KNOCKDOWN)'],
      ['Z THEN X', 'FLYING KICK'], ['Z THEN Z', 'STOMP'], ['WALK INTO', 'A STAGGERED OUTLAW: GRAB'], ['  GRABBED', 'X: KNEE  C: THROW'],
      ['X ON A WEAPON', 'PICK IT UP'], ['TUNNEL!', 'HOLD DOWN: DUCK'], ['', 'KICK BULLETS, KICK SKULLS'], ['H', 'HIDE THIS']];
    const w = 236, h = 20 + lines.length * 9, c = T.canvas(w, h), x = c.getContext('2d');
    x.fillStyle = PAL.out; x.fillRect(0, 0, w, h);
    x.fillStyle = PAL.n2; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
    T.drawText(x, 'HOW TO KICK', w / 2, 5, '#ff9d3c', 1, null, 'center');
    lines.forEach(([k, v], i) => { T.drawText(x, k, 8, 16 + i * 9, '#ffd34a', 1, null); T.drawText(x, v, 80, 16 + i * 9, '#fff3c4', 1, null); });
    return (helpImg = T.pixelize(c, { a: PAL.out, b: PAL.n2, c: '#ff9d3c', d: '#ffd34a', e: '#fff3c4' }, null, T.CLUT.spr));
  }

  function enemyImg(e) {
    if (e.type === 'rattler') {
      const R = RATTLER;
      return { vault: R.coil[0], batter: e.t < 0.4 ? R.coil[(e.anim * 14 | 0) % 2] : R.lunge, enter: R.walk[(e.anim * 8 | 0) % 4], approach: R.walk[(e.anim * 8 | 0) % 4], windup: R.coil[(e.anim * 14 | 0) % 2], strike: R.lunge,
        recover: R.recover, stagger: R.hurt, held: R.hurt, air: R.hurt, down: R.down, getup: R.down, ko: R.ko }[e.state] || R.walk[0];
    }
    if (e.type === 'coyote') {
      const C = S.gang;
      return { vault: C.windup, batter: e.t < 0.45 ? C.windup : C.swing, enter: C.walk[(e.anim * 8 | 0) % 4], approach: (e.vx || e.vz) ? C.walk[(e.anim * 8 | 0) % 4] : C.idle[(e.anim * 2 | 0) % 2],
        windup: C.windup, strike: C.swing, recover: C.idle[0], stagger: C.hurt, held: C.hurt, air: C.hurt, down: C.down,
        getup: C.daze[(e.anim * 8 | 0) % 4], ko: C.ko }[e.state];
    }
    if (e.type === 'skel') {
      const K = SKEL, moving = Math.abs(e.vx) + Math.abs(e.vz) > 4;
      if (!e.skull && !['down', 'getup', 'air'].includes(e.state)) return K.headless[(e.anim * 5 | 0) % 2];
      return { vault: K.walk[1], enter: K.walk[(e.anim * 7 | 0) % 4], approach: moving ? K.walk[(e.anim * 7 | 0) % 4] : K.idle[(e.anim * 2 | 0) % 2],
        aim: K.aim, shoot: e.t < 0.1 ? K.shoot : K.aim, reload: K.reload[(e.anim * 6 | 0) % 2], stagger: K.hurt, held: K.hurt, air: K.hurt,
        down: K.heap, getup: K.rise[Math.min(4, (e.t / 0.6 * 5) | 0)], rise: K.rise[Math.min(4, (e.t / 0.9 * 5) | 0)] }[e.state] || K.idle[0];
    }
    return ['strike', 'air', 'ko', 'down'].includes(e.state) ? DILLO.ball[(e.anim * 24 | 0) % 8] : e.state === 'windup' ? DILLO.ball[0]
      : e.state === 'held' || e.state === 'stagger' ? DILLO.walk[0] : DILLO.walk[(e.anim * 8 | 0) % 4];
  }
  // Big Shell Dillon: approach -> (close) wind up + claw swipe | (else) curl up and roll down your lane, bouncing
  // off the screen's edges. Kick the rolling shell and it goes back the way it came; when it hits the edge he
  // crashes, and he's dizzy (half again damage). At half health his Outlaw Dillos roll in.
  function updateDillon(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 24, L1 = lock + VW - 24;
    switch (b.state) {
      case 'intro':
        b.face = toward;
        if (!b.said && b.t > 0.3) { b.said = true; popup(b.x, FLOOR + b.z - 72, "THIS HERE'S MY TOWN!", '#fff3c4', 1, 2); }
        if (b.t > 2.2) bSet('approach');
        break;
      case 'approach': {
        b.face = toward;
        const tx = p.x - toward * 44;
        b.vx = Math.abs(tx - b.x) > 4 ? Math.sign(tx - b.x) * 40 : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 34 : 0;
        if (b.t > 1.2 || (Math.abs(tx - b.x) < 8 && Math.abs(dz) < 6 && b.t > 0.4)) {
          b.n++; b.vx = b.vz = 0;
          if (Math.abs(dx) < 70 && Math.abs(dz) < 10 && b.n % 3 !== 0) bSet('windup');
          else { bSet('curl'); sfx('whoosh'); }
        }
        break;
      }
      case 'windup': b.vx = b.vz = 0; b.face = toward; if (b.t > 0.5) { bSet('swipe'); sfx('whoosh'); b.hitDone = false; } break;
      case 'swipe':
        b.vx = b.t < 0.15 ? b.face * 80 : 0;
        if (!b.hitDone && b.t < 0.22 && inLane(b, p, 12) && p.h < 26 && Math.sign(dx) === b.face && Math.abs(dx) < 52) { b.hitDone = true; hurtPlayer(b, 3); }
        if (b.t > 0.35) bSet('recover');
        break;
      case 'recover': b.vx = b.vz = 0; if (b.t > 0.7) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.3) bSet('approach'); break;
      case 'curl': b.vx = b.vz = 0; b.face = toward; if (b.t > 0.45) { bSet('roll'); b.vx = b.face * 210; b.bounces = 0; b.deflected = false; sfx('land'); } break;
      case 'roll':                                  // a boulder down the lane
        b.vz = 0;
        if (Math.abs(dx) < 20 && inLane(b, p, 12) && p.h < 26) hurtPlayer(b, 3);
        if (Math.random() < 0.3) puff(b.x, b.z, 1);
        if ((b.x <= L0 && b.vx < 0) || (b.x >= L1 && b.vx > 0)) {
          if (b.deflected) {                        // kicked back into the wall: he crashes
            b.vx = 0; bSet('daze'); b.dazeDmg = 0; shake = Math.max(shake, 6); hitstop = 0.08; sfx('stomp'); dirt(b.x, b.z, 8);
            popup(b.x, FLOOR + b.z - 62, 'DIZZY!', '#ffd34a', 1);
          } else if (++b.bounces >= 3) { b.vx = 0; bSet('recover'); }
          else { b.vx = -b.vx; b.face = Math.sign(b.vx); sfx('land'); shake = Math.max(shake, 2); }
        }
        if (b.t > 4) { b.vx = 0; bSet('recover'); }
        break;
      case 'daze': b.vx = b.vz = 0; if (b.t > 2.2) bSet('approach'); break;
      case 'ko':
        b.vh -= GRAV * 0.6 * dt; b.h += b.vh * dt; b.x += b.vx * dt;
        if (b.t > 2 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  // Doc Gila: approach -> (close) the jaws and a bite | (else) deal: a fan of three cards across the lanes | (every
  // third move) flip a card table and play from behind it - two volleys over it, then he kicks it away. Kick the
  // table and it breaks (three); side kick it and it slides into him: BUSTED, and he's dizzy. At half health two
  // rattlers. He can't be hit behind the table.
  function updateGila(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 24, L1 = lock + VW - 24;
    if (b.table) updateTable(dt);
    const stop = () => { b.vx = b.vz = 0; };
    switch (b.state) {
      case 'intro':
        b.face = toward; stop();
        if (!b.said && b.t > 0.3) { b.said = true; popup(b.x, FLOOR + b.z - 72, "READ 'EM AND WEEP, BOOTS!", '#fff3c4', 1, 2.2); }
        if (b.t > 2.4) bSet('approach');
        break;
      case 'approach': {
        b.face = toward;
        const tx = p.x - toward * 80;
        b.vx = Math.abs(tx - b.x) > 4 ? Math.sign(tx - b.x) * 44 : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 36 : 0;
        const close = Math.abs(dx) < 56 && Math.abs(dz) < 10;
        if (b.t > 1.3 || (Math.abs(tx - b.x) < 8 && Math.abs(dz) < 6 && b.t > 0.5) || (close && b.t > 0.4)) {
          b.n++; stop();
          if (b.n % 3 === 0) {                      // every third: the card table, flipped on its side in front of him
            b.table = { x: b.x + b.face * 22, z: Math.min(ZMAX, b.z + 1), hp: 3, vx: 0, sliding: false };
            b.cover = true; b.volleys = 0; bSet('cover'); sfx('break'); shake = Math.max(shake, 3); puff(b.table.x, b.table.z, 4);
            if (close) { p.vx = Math.sign(dx) * 150; }   // (it shoves you back)
          } else if (close) bSet('jaws');           // up close: the bite
          else bSet('deal');                        // else a fan of cards
        }
        break;
      }
      case 'deal': stop(); if (b.t > 0.5) { flickCards(); bSet('flick'); } break;
      case 'flick': stop(); if (b.t > 0.4) bSet(b.cover && b.table ? 'cover' : 'recover'); break;
      case 'jaws': stop(); b.face = toward; if (b.t > 0.45) { bSet('bite'); sfx('whoosh'); b.hitDone = false; } break;
      case 'bite':
        b.vx = b.t < 0.18 ? b.face * 160 : 0; b.vz = 0;
        if (!b.hitDone && b.t < 0.22 && inLane(b, p, 12) && p.h < 26 && Math.sign(dx) === b.face && Math.abs(dx) < 48) {
          b.hitDone = true; if (hurtPlayer(b, 3)) popup(p.x, FLOOR + p.z - 62, 'CHOMP!', '#ff6b4a', 1);
        }
        if (b.t > 0.4) bSet('recover');
        break;
      case 'recover': stop(); if (b.t > 0.8) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.3) bSet('approach'); break;
      case 'cover':                                 // behind the table, dealing over it
        stop();
        if (!b.table) { b.cover = false; bSet('stagger'); break; }
        if (b.t > 0.9 && b.volleys < 2) { b.volleys++; bSet('deal'); }
        else if (b.t > 1.0) { breakTable(); b.cover = false; bSet('approach'); }   // done: he kicks it away
        break;
      case 'daze': stop(); if (b.t > 2.2) bSet('approach'); break;
      case 'vanish':                                // the card trick: gone, then back on your other side
        stop();
        if (b.t > 0.7) {
          let nx = p.x - p.face * 64;
          if (nx < L0 || nx > L1) nx = p.x + p.face * 64;
          b.x = Math.max(L0, Math.min(L1, nx)); b.z = p.z; b.face = Math.sign(p.x - b.x) || 1;
          cardBurst(6); sfx('card'); popup(b.x, FLOOR + b.z - 66, 'PICK A CARD!', '#ffd34a', 1);
          if (Math.abs(p.x - b.x) < 60) bSet('jaws'); else { bSet('deal'); b.t = 0.25; }
        }
        break;
      case 'land': stop(); if (b.t > 1.2) bSet('approach'); break;
      case 'crouch': stop(); b.face = toward; if (b.t > 0.25) { bSet('leap'); b.vh = 720; sfx('jump'); } break;   // (720: off the top of the screen)
      case 'leap': case 'hang': case 'drop': {    // up off the screen, his shadow hunting you, then down on it
        const track = b.state === 'drop' ? 0 : 130;
        b.vx = Math.abs(dx) > 2 ? Math.sign(dx) * Math.min(Math.abs(dx) * 3, track) : 0;
        b.vz = Math.abs(dz) > 2 ? Math.sign(dz) * Math.min(Math.abs(dz) * 3, track * 0.6) : 0;
        if (b.state === 'leap') { b.vh -= GRAV * dt; b.h += b.vh * dt; if (b.vh <= 0 || b.h > 170 + b.z) { bSet('hang'); b.vh = 0; } }
        else if (b.state === 'hang') { if (b.t > 0.6) { bSet('drop'); b.vh = -700; } }
        else {
          b.h += b.vh * dt;
          if (b.h <= 0) {
            b.h = 0; b.vh = 0; stop(); shake = Math.max(shake, 8); hitstop = 0.06; puff(b.x, b.z, 8); sfx('stomp');
            if (Math.abs(p.x - b.x) < 24 && inLane(b, p, 12) && p.h < 20 && hurtPlayer(b, 3)) popup(p.x, FLOOR + p.z - 62, 'SQUASHED!', '#ff6b4a', 1);
            bSet('land');                           // he lands heavy: open a while, no tricks
          }
        }
        break;
      }
      case 'ko':
        b.vh -= GRAV * 0.6 * dt; b.h += b.vh * dt; b.x += b.vx * dt;
        if (b.t > 2 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  // Jackrabbit Jack: hop from spot to spot (open as he lands) | up close, turn and mule-kick | every third, spin the
  // lasso and throw it down his lane: caught, you're yanked to him and kicked. A kick at him on his feet he hops clean
  // over (TOO SLOW!) - hit him as he lands. STAMPEDE! at half health.
  // Jack's way out, cornered or pinned: a quick hop clean over your head to the open side; he lands in his next move
  function jackEscape() {
    const b = boss;
    b.over = true; b.stagN = 0; b.lasso = null; bSet('crouch'); b.t = 0.1; b.vx = b.vz = 0;
    popup(b.x, FLOOR + b.z - 66, 'NOT TODAY!', '#ffd34a', 1); sfx('whoosh');
  }
  function updateJack(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 24, L1 = lock + VW - 24;
    const stop = () => { b.vx = b.vz = 0; };
    if (b.lasso) {                                   // the rope flying down the lane
      const L2 = b.lasso; L2.x += L2.vx * dt; L2.d += Math.abs(L2.vx) * dt;
      if (p.state !== 'roped' && !death && Math.abs(p.x - L2.x) < 12 && inLane(L2, p, 10) && p.h < 20 && p.inv <= 0 && !p.mounted && phase === 'play') {
        setS('roped'); p.vx = p.vz = 0; sfx('whoosh'); popup(p.x, FLOOR + p.z - 62, 'ROPED!', '#ff6b4a', 1); b.lasso = null; bSet('reel');
      } else if (L2.d > 150) b.lasso = null;
    }
    switch (b.state) {
      case 'intro':                                  // in over the fence
        if (b.h > 0) { b.vh -= GRAV * dt; b.h = Math.max(0, b.h + b.vh * dt); if (b.h === 0) { puff(b.x, b.z, 5); sfx('land'); } break; }
        b.face = toward; stop();
        if (!b.said && b.t > 0.6) { b.said = true; popup(b.x, FLOOR + b.z - 66, 'FINDERS KEEPERS, BOOTS!', '#fff3c4', 1, 2.2); }
        if (b.t > 2.6) bSet('approach');
        break;
      case 'approach': {
        b.face = toward; stop();
        if (b.t > 0.7) {
          b.n++; b.stagN = 0;
          const close = Math.abs(dx) < 46 && Math.abs(dz) < 10;
          if (b.n % 3 === 0) {                                                       // the lasso: from a distance
            if (close) { b.dodge = true; b.next = 'spin'; bSet('crouch'); } else { bSet('spin'); sfx('whoosh'); }
          } else if (close) bSet('turn');                                           // up close: the mule kick
          else bSet('crouch');                                                      // a hop somewhere new
        }
        break;
      }
      case 'crouch': stop(); if (b.t > 0.18) {
        const side = b.dodge ? -toward : (Math.random() < 0.5 ? -1 : 1);
        if (b.dodge && (b.x - toward * 70 < L0 + 20 || b.x - toward * 70 > L1 - 20)) b.over = true;   // a wall behind: over you instead
        b.tx = Math.max(L0, Math.min(L1, b.over ? p.x + toward * 70 : b.dodge ? b.x - toward * 70 : p.x + side * (60 + Math.random() * 40)));
        if (b.over) { b.next = 'approach'; b.over = false; }
        b.tz = Math.max(0, Math.min(ZMAX, b.dodge ? b.z : p.z + (Math.random() - 0.5) * 40));
        b.vx = (b.tx - b.x) / 0.6; b.vz = (b.tz - b.z) / 0.6; b.vh = 330; b.dodge = false; bSet('hopping'); sfx('jump');
      } break;
      case 'hopping':
        b.vh -= GRAV * 0.8 * dt; b.h += b.vh * dt; b.face = Math.sign(b.vx) || b.face;
        if (b.h <= 0) {
          b.h = 0; b.vh = 0; stop(); puff(b.x, b.z, 3); sfx('land'); b.face = toward;
          if (b.next === 'approach') { bSet('approach'); b.t = 0.55; b.next = null; }       // from an escape: straight into a move
          else if (b.next) { bSet(b.next); b.next = null; sfx('whoosh'); } else bSet('land');
        }
        break;
      case 'land': stop(); if (b.t > 0.45) bSet('approach'); break;               // open: hit him now
      case 'turn': stop(); b.face = -toward; if (b.t > 0.3) { bSet('kick'); sfx('whoosh'); b.hitDone = false; } break;
      case 'kick':                                   // both hind feet, backwards into you
        stop();
        if (!b.hitDone && b.t < 0.15 && inLane(b, p, 12) && p.h < 26 && Math.sign(dx) === -b.face && Math.abs(dx) < 44) { b.hitDone = true; hurtPlayer(b, 3); }
        if (b.t > 0.35) bSet('recover');
        break;
      case 'spin': stop(); b.face = toward;
        if (b.t > 0.6) { bSet('throw'); b.lasso = { x: b.x + b.face * 16, z: b.z, vx: b.face * 280, d: 0 }; sfx('whoosh'); }
        break;
      case 'throw': stop(); if (b.t > 0.55 && !b.lasso) bSet('recover'); break;
      case 'reel':                                   // you, on the end of his rope: pulled in, and kicked
        stop(); b.face = toward;
        if (p.state !== 'roped') bSet('recover');
        else if (Math.abs(p.x - b.x) < 30) { p.state = 'idle'; hurtPlayer(b, 3); popup(p.x, FLOOR + p.z - 62, 'HOG-TIED!', '#ff6b4a', 1); bSet('recover'); }
        break;
      case 'recover': stop(); if (b.t > 0.7) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.3) bSet('approach'); break;
      case 'daze': stop(); if (b.t > 2) bSet('approach'); break;
      case 'ko':
        b.vh -= GRAV * 0.6 * dt; b.h += b.vh * dt; b.x += b.vx * dt;
        if (b.t > 2 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  // Sting: scuttles in close; the tail sting (cocked, a glint - jump it; a miss sticks it in the roof: open), the pinch
  // up close, and dynamite - lit on his cigar and lobbed where you stand (1.6 s fuse: kick it back at him); flat for
  // the tunnels; at half health, a stick down every lane. Knocked out, he's blown clean off the train.
  function updateSting(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 24, L1 = lock + VW - 24;
    const stop = () => { b.vx = b.vz = 0; };
    const tunnelNear = tunnel && b.state !== 'ko' && (tunnel.st === 'warn' || (tunnel.st === 'mouth' && tunnel.x + camX > b.x - 30));
    if (tunnelNear && !['duck', 'intro', 'daze'].includes(b.state)) { bSet('duck'); stop(); }   // he knows this line
    // he's solid: walk into him while he's guarding and a claw swipes you back out the front (1). Get round him quick, or jump
    if (['approach', 'windup', 'pinchw', 'duck', 'light', 'toss'].includes(b.state) && Math.abs(dx) < 14 && inLane(b, p, 8) && p.h < 20
      && hurtPlayer({ x: b.x - b.face * 4 }, 1)) { tally.shove++; sfx('shell'); }
    switch (b.state) {
      case 'intro':                                  // down off the cab
        if (b.h > 0) { b.vh -= GRAV * dt; b.h = Math.max(0, b.h + b.vh * dt); if (b.h === 0) { puff(b.x, b.z, 6); sfx('land'); shake = Math.max(shake, 4); } break; }
        b.face = toward; stop();
        if (!b.said && b.t > 0.5) { b.said = true; popup(b.x, FLOOR + b.z - 66, 'NOBODY GETS OFF THIS TRAIN!', '#fff3c4', 1, 2.4); }
        if (b.t > 2.8) bSet('approach');
        break;
      case 'approach': {
        b.face = toward;
        if (b.salvo) { stop(); if (Math.abs(dx) < 80) bSet('retreat'); else { bSet('light'); sfx('shell'); } break; }   // LIGHT 'EM ALL! first
        const close = Math.abs(dx) < 58 && Math.abs(dz) < 8;
        const tx = p.x - toward * 46;
        b.vx = Math.abs(tx - b.x) > 4 ? Math.sign(tx - b.x) * 52 : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 34 : 0;
        if (b.t > 0.8) {
          b.n++;
          if (b.n % (b.hp < b.max / 2 ? 2 : 3) === 0 || (!close && b.t > 2.4)) { if (Math.abs(dx) < 80) bSet('retreat'); else { bSet('light'); sfx('shell'); } stop(); }   // dynamite: from a safe distance
          else if (close) { bSet(b.n % 2 ? 'windup' : 'pinchw'); stop(); }
          else b.t = 0.5;
        }
        break;
      }
      case 'pinchw': stop(); b.face = toward; if (b.t > 0.32) { bSet('pinch'); b.hitDone = false; sfx('whoosh'); } break;
      case 'pinch':
        stop();
        if (!b.hitDone && b.t < 0.15 && inLane(b, p, 10) && p.h < 30 && dx * b.face > -8 && Math.abs(dx) < 50) { b.hitDone = true; hurtPlayer(b, 2); }
        if (b.t > 0.35) bSet('recover');
        break;
      case 'windup':                                 // the tail cocked; the glint: it's coming
        stop(); b.face = toward;
        if (b.t > 0.35 && !b.glint) { b.glint = true; sfx('shell'); parts.push({ k: 'star', x: b.x - b.face * 6, z: b.z, h: 56, life: 0.14, max: 0.14, big: true }); }
        if (b.t > 0.65) { bSet('sting'); b.hitDone = false; b.glint = false; sfx('whoosh'); }
        break;
      case 'sting':                                  // the tail lashes out low and long in front of him: jump it
        stop();
        if (!b.hitDone && b.t < 0.16 && inLane(b, p, 10) && p.h < 22 && dx * b.face > -8 && Math.abs(dx) < 62) {
          b.hitDone = true; hurtPlayer(b, 3); popup(p.x, FLOOR + p.z - 62, 'STUNG!', '#ff6b4a', 1);
        }
        if (b.t > 0.25) { if (b.hitDone) bSet('recover'); else { bSet('stuck'); sfx('land'); spark(b.x + b.face * 30, b.z, 4, false); } }
        break;
      case 'stuck': stop(); if (b.t > 1.0) bSet('recover'); break;   // the sting stuck in the roof: hit him now
      case 'retreat':                                // a quick scuttle back, out of his own blast
        b.face = toward; b.vx = -toward * 150; b.vz = 0;
        if (b.t > 0.5 || b.x <= L0 || b.x >= L1) { stop(); bSet('light'); sfx('shell'); }
        break;
      case 'light': stop(); b.face = toward; if (b.t > 0.75) {
        bSet('toss');
        // the fewer his hit points, the more sticks: 1, 2 below three quarters, 3 below half, 4 below a quarter; at half,
        // LIGHT 'EM ALL!: five, every lane. Around where you stand, a lane or so apart
        const f = b.hp / b.max, k = b.salvo ? 5 : f > 0.75 ? 1 : f > 0.5 ? 2 : f > 0.25 ? 3 : 4;
        const spots = [[0, 0], [26, -16], [-26, 16], [-30, -18], [32, 18]];
        for (let i = 0; i < k; i++) tossStick(b, p.x + spots[i][0] + (Math.random() - 0.5) * 10, p.z + spots[i][1], 0.75 + i * 0.1);
        b.salvo = false;
      } break;
      case 'toss': stop(); if (b.t > 0.4) bSet('recover'); break;
      case 'recover': stop(); if (b.t > 0.75) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.35) bSet('approach'); break;
      case 'daze': stop(); if (b.t > 1.6) bSet('approach'); break;
      case 'duck': stop(); if (!tunnelNear) bSet('approach'); break;
      case 'ko':                                     // blown clean off the train
        b.vh -= GRAV * 0.6 * dt; b.h += b.vh * dt; b.x += b.vx * dt;
        if (b.t > 2 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  // Bullrush: walks you down, paws the dirt and snorts - then charges down the lane he's lined up on, trampling anyone
  // in it, till his horns go into a wall (stuck: open, and half again damage) or into the church doors (6 off them:
  // don't dodge him in front of the doors). Up close the horn hook (it launches you); now and then he rears up and
  // stomps, and a wall of dust rolls out both ways along the ground (jump it). His hide shrugs off hits on the move -
  // the third, he turns on you. He's solid, like Sting. At half health he sees red: quicker, every charge straight back.
  // Knocked out, there's a word from Diamondback, from somewhere off in the dark.
  function updateToro(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 26, L1 = lock + VW - 26;
    const stop = () => { b.vx = b.vz = 0; };
    if (['approach', 'paw', 'rear', 'hookw', 'recover'].includes(b.state) && Math.abs(dx) < 16 && inLane(b, p, 8) && p.h < 20
      && hurtPlayer({ x: b.x - b.face * 4 }, 1)) { tally.shove++; sfx('shell'); }       // solid: walk into him and he shoves you out the front
    switch (b.state) {
      case 'intro':                                  // through the gate at a charge, a skid, a word
        if (b.vx) { b.x += b.vx * dt; if (b.x <= lock + 230) { b.vx = 0; b.t = 0; puff(b.x, b.z, 8); shake = Math.max(shake, 5); sfx('stomp'); } return; }
        b.face = toward;
        if (!b.said && b.t > 0.4) { b.said = true; popup(b.x, FLOOR + b.z - 66, 'SAY YER PRAYERS, BOOTS!', '#fff3c4', 1, 2.4); }
        if (b.t > 2.6) bSet('approach');
        break;
      case 'approach': {
        b.face = toward;
        const tx = p.x - toward * 50;
        b.vx = Math.abs(tx - b.x) > 4 ? Math.sign(tx - b.x) * (b.rage ? 56 : 44) : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 34 : 0;
        if (b.t > (b.rage ? 0.6 : 0.9)) {
          b.n++; stop();
          const close = Math.abs(dx) < 58 && Math.abs(dz) < 10;
          if (close) bSet(['hookw', 'backoff', 'rear'][b.n % 3]);   // up close: the hook, or he backs off to charge, or the stomp
          else if (b.n % 4 === 0) bSet('rear');
          else { bSet('paw'); sfx('bellow'); }
        }
        break;
      }
      case 'backoff':                                // a few steps back for a run at you
        b.face = toward; b.vx = -toward * 130; b.vz = 0;
        if (b.t > 0.5 || b.x <= L0 + 30 || b.x >= L1 - 30) { stop(); bSet('paw'); sfx('bellow'); }
        break;
      case 'paw':                                    // lining up on your lane, then the dirt flies
        b.vx = 0; b.face = toward;
        b.vz = b.t < 0.5 && Math.abs(dz) > 2 ? Math.sign(dz) * 40 : 0;
        if ((b.t * 4 | 0) !== ((b.t - dt) * 4 | 0)) puff(b.x - b.face * 10, b.z, 2);
        if (b.t > (b.rage ? 0.55 : 0.9)) { bSet('charge'); b.hitDone = false; b.trampled = []; sfx('roar'); }
        break;
      case 'charge': {
        b.vz = 0; b.vx = b.face * (b.rage ? 340 : 300);
        if ((b.t * 10 | 0) !== ((b.t - dt) * 10 | 0)) puff(b.x - b.face * 14, b.z, 1);
        if (!b.hitDone && inLane(b, p, 12) && Math.abs(dx) < 20 && p.h < 26 && hurtPlayer(b, 3)) { b.hitDone = true; p.vx = b.face * 220; p.vh = 180; popup(p.x, FLOOR + p.z - 62, 'GORED!', '#ff6b4a', 1); }
        for (const e of enemies) if (hittable(e) && !b.trampled.includes(e) && inLane(e, b, 12) && Math.abs(e.x - b.x) < 18 && e.h < 30) { b.trampled.push(e); hitE(e, 4, true, b.face); }   // his own, flattened
        const nx = b.x + b.vx * dt;
        if (door && door.hp > 0 && b.z < 18 && (nx - door.x) * (b.x - door.x) <= 0) {   // into the church doors
          b.x = door.x - b.face * 18; hitDoor(6); popup(door.x, 70, 'CRASH!', '#ff9d3c', 2); toroStuck(); return;
        }
        if (nx <= L0 || nx >= L1) {                  // into the wall
          b.x = Math.max(L0, Math.min(L1, nx));
          if (b.rage && !b.second) { b.second = true; b.face = -b.face; stop(); bSet('paw'); b.t = 0.35; sfx('bellow'); return; }   // and straight back
          toroStuck(); return;
        }
        if (b.t > 2.5) { stop(); bSet('recover'); }
        break;
      }
      case 'stuck': stop(); if (b.t > 1.6) { bSet('recover'); puff(b.x + b.face * 16, b.z, 4); } break;   // horns in the adobe: get in there
      case 'hookw': stop(); b.face = toward; if (b.t > 0.45) { bSet('hook'); b.hitDone = false; sfx('whoosh'); } break;
      case 'hook':
        stop();
        if (!b.hitDone && b.t < 0.15 && inLane(b, p, 10) && p.h < 30 && dx * b.face > -8 && Math.abs(dx) < 48 && hurtPlayer(b, 3)) { b.hitDone = true; p.vx = b.face * 160; p.vh = 260; }   // tossed
        if (b.t > 0.35) bSet('recover');
        break;
      case 'rear': stop(); if (b.t > 0.55) {        // up, and down: the shockwave
        bSet('stomp'); shocks.push({ x: b.x + b.face * 10, z: b.z, r: 0, hit: [] }); shake = Math.max(shake, 7); sfx('stomp'); puff(b.x, b.z, 6);
      } break;
      case 'stomp': stop(); if (b.t > 0.5) bSet('recover'); break;
      case 'recover': stop(); if (b.t > 0.7) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.35) bSet('approach'); break;
      case 'daze': stop(); if (b.t > 1.6) bSet('approach'); break;
      case 'ko':                                     // out cold; then a word out of the dark
        b.vh -= GRAV * 0.6 * dt; b.h = Math.max(0, b.h + b.vh * dt); if (b.h > 0) b.x = Math.max(L0 + 10, Math.min(L1 - 10, b.x + b.vx * 0.5 * dt));   // (he lands where you can see him)
        if (b.h === 0 && !b.landed) { b.landed = true; puff(b.x, b.z, 8); shake = Math.max(shake, 6); sfx('stomp'); }
        if (b.t > 1.4 && !b.said2) { b.said2 = true; sfx('rattle'); popup(lock + VW / 2, 52, 'HIGH NOON, BOOTS.', '#9ad46a', 2, 3.4); popup(lock + VW / 2, 74, 'MAIN STREET.', '#9ad46a', 2, 3.4); popup(lock + VW / 2, 94, '- DIAMONDBACK', '#c3c8d8', 1, 3.4); }
        if (b.t > 5 && phase === 'play') { boss = null; lock = null; waveI++; stageClear(); }
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  // Diamondback: the duel (the clock strikes noon: DRAW! - kick in time and a kicked stone knocks his gun from his tail:
  // OUTDRAWN!, and he's dizzy; too soon or too slow and he shoots), then the fight: he keeps his distance and fans the
  // hammer - three shots down your lane (two volleys once he's hurt), six to a reload (open); up close he coils, rattling,
  // and strikes long and low (jump it; a miss leaves him stretched out: open, half again damage), or whips his tail round
  // if you crowd him. At half health the posse rises. Knocked out: the gang's done, and the ending.
  function duelPlayer(dt) {                       // the standoff: walk to your mark, wait for it, kick on DRAW!
    const p = player, b = boss, tx = lock + 90;
    p.t += dt; p.inv -= dt;
    const far = Math.abs(p.x - tx) > 2 || Math.abs(p.z - b.z) > 2;
    if (p.state !== 'side') {
      p.vx = Math.abs(p.x - tx) > 2 ? Math.sign(tx - p.x) * WALK_X : 0; p.vz = Math.abs(p.z - b.z) > 2 ? Math.sign(b.z - p.z) * WALK_Z : 0;
      if (p.vx) p.face = Math.sign(p.vx);
      const want = far ? 'walk' : 'idle'; if (p.state !== want) setS(want);
      if (!far) p.face = 1;
    } else { p.vx = p.vz = 0; if (p.t >= HERO.side.dur) setS('idle'); }
    if ((pressed.snap || pressed.side) && b.t > 1.2 && !b.res && !far) { b.kicked = true; p.face = 1; setS('side'); sfx('whoosh'); }
    p.x += p.vx * dt; p.z += p.vz * dt;
    pickAnim(p);
  }
  function dbFire() {                             // a shot down his lane
    const b = boss;
    ebullets.push({ x: b.x + b.face * 26, z: b.z, h: 30, vx: b.face * 260 }); sfx('break'); b.flashT = 0.08; b.ammo--;
  }
  function updateDiamondback(dt) {
    const b = boss, p = player;
    b.t += dt; b.flash -= dt; b.anim += dt; b.flashT = (b.flashT || 0) - dt;
    const dx = p.x - b.x, dz = p.z - b.z, toward = Math.sign(dx) || b.face;
    const L0 = lock + 26, L1 = lock + VW - 26;
    const stop = () => { b.vx = b.vz = 0; };
    if (b.ringoT && time >= b.ringoT) { b.ringoT = 0; say(b, T.DKSAY.slow, 3.0); }   // (a lost draw)
    switch (b.state) {
      case 'duel':
        stop(); b.face = -1;
        if (!b.said && b.t > 0.8) { b.said = true; say(b, T.DKSAY.needin, 2.4); }
        if (!b.drawT && b.t >= b.drawAt && !b.res) { b.drawT = b.t; struck = true; sfx('bell'); }
        if (!b.res) {
          if (b.kicked) b.res = b.drawT ? 'win' : 'early';
          else if (b.drawT && b.t - b.drawT > 0.55) b.res = 'slow';
          if (b.res) music('showdown');
          if (b.res === 'win') {                    // OUTDRAWN!: the stone off his boot, the gun out of his tail
            popup(p.x, FLOOR + p.z - 62, 'OUTDRAWN!', '#ffd34a', 2, 1.4);
            pebble = { x: p.x + 16, z: p.z, h: 24, vx: 460 }; b.t = 0;
          } else if (b.res) {                       // too soon, too slow: he shoots
            popup(b.res === 'early' ? p.x : b.x, FLOOR + (b.res === 'early' ? p.z : b.z) - 62, b.res === 'early' ? 'JUMPED THE GUN!' : 'TOO SLOW, BOOTS!', '#ff6b4a', 1, 1.6);
            struck = true; bSet('fan'); b.shots = 0; b.t = 0; b.flashT = 0.12; b.ammo--; sfx('break');   // (quicker than a bullet: it lands)
            b.ringoT = time + 1.7;                  // and rubs it in
            hurtPlayer({ x: b.x }, 3);
          }
        }
        if (b.res === 'win' && !pebble && b.t > 1.2) bSet('approach');   // (if the stone missed somehow)
        break;
      case 'approach': {                            // his distance: 120 px off, in your lane
        b.face = toward;
        const tx = p.x - toward * 120;
        b.vx = Math.abs(tx - b.x) > 6 ? Math.sign(tx - b.x) * 54 : 0;
        b.vz = Math.abs(dz) > 3 ? Math.sign(dz) * 36 : 0;
        if (b.t > 0.9) {
          b.n++; stop();
          const close = Math.abs(dx) < 64 && Math.abs(dz) < 12;
          if (close) bSet(b.n % 3 === 0 || Math.abs(dx) < 30 ? 'whip' : 'coil');
          else if (b.n % 4 === 0 && Math.abs(dx) < 150) bSet('coil');
          else bSet('draw');
          if (b.state === 'coil') sfx('rattle');
        }
        break;
      }
      case 'draw': stop(); b.face = toward; if (b.t > 0.35) { bSet('fan'); b.shots = b.rage ? 6 : 3; b.t = 0.2; } break;
      case 'fan':                                   // fanning the hammer: a shot every 0.16 s
        stop();
        if (b.shots > 0 && b.ammo > 0 && b.t > 0.16) { b.t = 0; b.shots--; dbFire(); if (b.rage && b.shots === 3) b.t = -0.3; }
        if ((b.shots <= 0 || b.ammo <= 0) && b.t > 0.3) { if (b.ammo <= 0) { bSet('reload'); sfx('shell'); } else bSet('recover'); }
        break;
      case 'reload': stop(); if (b.t > 1.4) { b.ammo = 6; bSet('approach'); } break;   // spinning the cylinder: get in there
      case 'coil':                                  // drawn back, rattling, lining up: the strike's coming
        stop(); b.face = toward; if (b.t < 0.3 && Math.abs(dz) > 2) b.vz = Math.sign(dz) * 30;
        if (b.t > 0.55) { bSet('strike'); b.hitDone = false; sfx('whoosh'); }
        break;
      case 'strike':                                // long and low: jump it
        b.vz = 0; b.vx = b.t < 0.26 ? b.face * 420 : 0;
        if (!b.hitDone && b.t < 0.3 && inLane(b, p, 10) && p.h < 16 && Math.abs(p.x - (b.x + b.face * 22)) < 22 && hurtPlayer(b, 3)) { b.hitDone = true; popup(p.x, FLOOR + p.z - 62, 'SNAKEBIT!', '#ff6b4a', 1); }
        if (b.t > 0.32) { stop(); bSet(b.hitDone ? 'recover' : 'stretch'); }
        break;
      case 'stretch': stop(); if (b.t > 0.9) bSet('approach'); break;
      case 'whip':                                  // the tail round him: crowd him and it's 2
        stop();
        if (!b.hitDone && b.t > 0.15 && b.t < 0.32 && Math.abs(dx) < 44 && inLane(b, p, 14) && p.h < 20 && hurtPlayer(b, 2)) b.hitDone = true;
        if (b.t > 0.5) { b.hitDone = false; bSet('recover'); }
        break;
      case 'recover': stop(); if (b.t > 0.5) bSet('approach'); break;
      case 'stagger': b.vx *= Math.pow(0.01, dt); b.vz = 0; if (b.t > 0.35) bSet('approach'); break;
      case 'daze': stop(); if (b.t > 1.6) bSet('approach'); break;
      case 'ko':                                    // out cold: the gang's done; then the ending
        b.vh -= GRAV * 0.6 * dt; b.h = Math.max(0, b.h + b.vh * dt); if (b.h > 0) b.x = Math.max(L0 + 10, Math.min(L1 - 10, b.x + b.vx * 0.5 * dt));
        if (b.h === 0 && !b.landed) { b.landed = true; puff(b.x, b.z, 8); shake = Math.max(shake, 6); sfx('stomp'); }
        if (b.t > 3 && phase === 'play') startEnding();
        return;
    }
    b.x += b.vx * dt; b.z = Math.max(0, Math.min(ZMAX, b.z + b.vz * dt));
    b.x = Math.max(L0 - 4, Math.min(L1 + 4, b.x));
  }
  function updatePebble(dt) {                     // the duel's stone, off his boot at the gun
    if (!pebble) return;
    pebble.x += pebble.vx * dt;
    if (boss && pebble.x >= boss.x - 10) {
      pebble = null; spark(boss.x + boss.face * 14, boss.z, 24, true); sfx('hit');
      boss.res = 'win'; hitBoss(6, 1, false); if (boss.state !== 'ko') { bSet('daze'); popup(boss.x, FLOOR + boss.z - 62, 'DIZZY!', '#ffd34a', 1); }
    }
  }
  // the ending: Boot Hill at sundown - the boots walk up to Ringo's grave, tip the hat, and walk off into the sunset. THE
  // END. Then a boot shop's shelf, a fine pair of snakeskin boots; one of them twitches.
  function startEnding() {
    phase = 'ending'; phaseT = 0; boss = null; lock = null; enemies = []; ebullets = []; bullets = []; parts = []; popups = []; items = [];
    barrels = []; skulls = []; tumble = null; lastHit = null;
    ART = artCache.ending || (artCache.ending = T.buildEnding(VW, VH, FLOOR));
    W = VW; camX = 0; ending = { step: 'walk', t: 0, twitch: 0 };
    player.x = -24; player.z = 40; player.h = 0; player.vx = player.vz = player.vh = 0; player.face = 1; player.weapon = null; setS('walk');
    music('boothill');
  }
  function updateEnding(dt) {
    const p = player, e = ending;
    e.t += dt; p.t += dt;
    if (e.step === 'walk') { p.x += 52 * dt; if (p.x >= STONE.x + 30) { setS('idle'); p.face = -1; e.step = 'stand'; e.t = 0; } }
    else if (e.step === 'stand') { if (e.t > 1.4) { setS('taunt'); sfx('tip'); e.step = 'tip'; e.t = 0; } }   // a hat tip to Ringo
    else if (e.step === 'tip') { if (p.state === 'taunt' && p.t >= HERO.taunt.dur) setS('idle'); if (e.t > 2.8) { p.face = 1; setS('walk'); e.step = 'leave'; e.t = 0; } }
    else if (e.step === 'leave') { p.x += 46 * dt; if (p.x > VW + 30) { e.step = 'theend'; e.t = 0; } }
    else if (e.step === 'theend') { if (e.t > 4.5) { e.step = 'shop'; e.t = 0; music(null); } }
    else if (e.step === 'shop') {
      if (e.t > 2.4 && !e.twitched) { e.twitched = true; e.twitch = 0.3; sfx('rattle'); }
      e.twitch -= dt;
      if (e.t > 3.5 && pressed.jump) toTitle();
    }
    pickAnim(p);
  }
  function toroStuck() {
    const b = boss;
    b.vx = b.vz = 0; b.second = false; bSet('stuck'); shake = Math.max(shake, 7); sfx('stomp'); hitstop = 0.06;
    puff(b.x + b.face * 18, b.z, 6); popup(b.x, FLOOR + b.z - 62, 'STUCK!', '#ffd34a', 1);
  }
  function updateShocks(dt) {                      // his stomp's dust rolling out: jump it (2), and it bowls over his own
    const p = player;
    for (const s of shocks) {
      s.r += 240 * dt;
      if (!s.hit.includes(p) && p.h < 6 && Math.abs(Math.abs(p.x - s.x) - s.r) < 10 && Math.abs(p.z - s.z) < 36 && hurtPlayer({ x: s.x }, 2)) s.hit.push(p);
      for (const e of enemies) if (!s.hit.includes(e) && hittable(e) && e.h < 6 && Math.abs(Math.abs(e.x - s.x) - s.r) < 10 && Math.abs(e.z - s.z) < 36) { s.hit.push(e); hitE(e, 2, true, Math.sign(e.x - s.x) || 1); }
    }
    shocks = shocks.filter(s => s.r < 150);
  }
  function tossStick(b, tx, tz, flight) {         // a lit stick lobbed to land at tx, tz in `flight` s (1.6 s fuse in all)
    const x = b.x + b.face * 20, h = 30, g = GRAV * 0.8;
    tx = Math.max(lock + 16, Math.min(lock + VW - 16, tx)); tz = Math.max(0, Math.min(ZMAX, tz));
    sticks.push({ x, z: b.z, h, vx: (tx - x) / flight, vz: (tz - b.z) / flight, vh: (0.5 * g * flight * flight - h) / flight, fuse: 0.8 + flight, kicked: false });
  }
  function explode(s) {                           // the bang: 3 to him and to anyone near it, 6 to Sting (and he's dizzy)
    booms.push({ x: s.x, z: s.z, t: 0 }); sfx('boom'); shake = Math.max(shake, 7); hitstop = Math.max(hitstop, 0.05);
    const p = player, near = (o, r) => Math.abs(o.x - s.x) < r && Math.abs(o.z - s.z) < 14;
    if (near(p, 30) && p.h < 30 && hurtPlayer(s, 3)) popup(p.x, FLOOR + p.z - 62, 'KA-BOOM!', '#ff6b4a', 1);
    for (const e of enemies) if (hittable(e) && near(e, 30)) hitE(e, 3, true, Math.sign(e.x - s.x) || 1);
    const b = boss;
    if (b && b.type === 'sting' && b.state !== 'ko' && near(b, 34)) {
      if (s.kicked) {                              // his own stick, kicked back at him: 6, and he's dizzy
        hitBoss(6, Math.sign(b.x - s.x) || 1, true);
        if (boss && boss.state !== 'ko') { bSet('daze'); popup(b.x, FLOOR + b.z - 64, 'DIZZY!', '#ffd34a', 1); }
      } else hitBoss(2, Math.sign(b.x - s.x) || 1, false);   // caught in his own: singed
    }
    for (let i = 0; i < 6; i++) parts.push({ k: 'chunk', img: FX.chunk[(Math.random() * FX.chunk.length) | 0], x: s.x, z: s.z, h: 6 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 240, vh: 120 + Math.random() * 160, life: 0.9, max: 0.9 });
  }
  function updateSticks(dt) {
    for (const s of sticks) {
      s.fuse -= dt;
      if (s.h > 0 || s.vh > 0) {                   // flying
        s.vh -= GRAV * 0.8 * dt; s.h += s.vh * dt; s.x += s.vx * dt; s.z = Math.max(0, Math.min(ZMAX, s.z + s.vz * dt));
        if (s.h <= 0) { s.h = 0; s.vh = 0; s.vz = 0; if (!s.kicked) s.vx = 0; sfx('land'); }
      } else if (s.kicked) {                       // sliding down the lane where it was kicked
        s.x += s.vx * dt;
        const b = boss;
        if (b && b.type === 'sting' && b.state !== 'ko' && inLane(b, s, 14) && Math.abs(b.x - s.x) < 20) { s.fuse = 0; }
        for (const e of enemies) if (hittable(e) && inLane(e, s, 12) && Math.abs(e.x - s.x) < 14) s.fuse = 0;
        if (lock !== null && (s.x < lock + 6 || s.x > lock + VW - 6)) s.fuse = 0;
      }
      if (s.h <= 0 && gapAt(s.x)) { s.gone = true; continue; }   // down between the cars: fizzled
      if (s.fuse <= 0) { s.gone = true; explode(s); }
    }
    sticks = sticks.filter(s => !s.gone);
    for (const q of booms) q.t += dt;
    booms = booms.filter(q => q.t < 0.5);
  }
  function kickSticks(box) {                       // kick a lying stick back down the lane
    const p = player;
    for (const s of sticks) if (!s.kicked && s.h < 12 && inLane(s, p, 12) && box.x0 < s.x + 6 && box.x1 > s.x - 6 && box.h0 < 16) {
      s.kicked = true; s.vx = p.face * 320; s.h = 2; s.vh = 0; spark(s.x, s.z, 6, true); sfx('hit');
      popup(s.x, FLOOR + s.z - 22, 'BACK AT YA!', '#ffd34a', 1);
    }
  }
  function cardBurst(n) {                        // a puff of cards: the trick
    const b = boss;
    for (let i = 0; i < n; i++) parts.push({ k: 'chunk', img: GILA.card[i % 4], x: b.x, z: b.z, h: 20 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 220, vh: 80 + Math.random() * 160, life: 0.8, max: 0.8 });
    puff(b.x, b.z, 5, 10);
  }
  function gilaEscape() {
    const b = boss;
    b.vx = b.vz = 0;
    b.trick = (b.trick || 0) + 1;
    if (b.trick % 2) { bSet('vanish'); cardBurst(10); sfx('card'); sfx('whoosh'); }
    else { bSet('crouch'); sfx('whoosh'); }
  }
  function flickCards() {                         // three cards: his lane and one each side of it
    const b = boss; sfx('card');
    for (const d of [-16, 0, 16]) ebullets.push({ x: b.x + b.face * 16, z: Math.max(0, Math.min(ZMAX, b.z + d)), h: b.cover ? 30 : 26, vx: b.face * 210, card: true });
  }
  function breakTable() {
    const t = boss && boss.table; if (!t) return;
    boss.table = null; sfx('break');
    for (let i = 0; i < 8; i++) parts.push({ k: 'chunk', img: GPROPS.plank, x: t.x, z: t.z, h: 6 + Math.random() * 18, vx: (Math.random() - 0.5) * 200, vh: 100 + Math.random() * 160, life: 1, max: 1 });
  }
  function updateTable(dt) {                      // a kicked table sliding into him, or into anyone
    const b = boss, t = b.table;
    if (!t.sliding) return;
    t.x += t.vx * dt;
    for (const e of enemies) if (hittable(e) && inLane(e, t, 14) && Math.abs(e.x - t.x) < 18) hitE(e, 3, true, Math.sign(t.vx));
    if (Math.abs(t.x - b.x) < 18 && Math.sign(b.x - t.x + t.vx * 0.01) === Math.sign(t.vx)) {
      breakTable(); b.cover = false; shake = Math.max(shake, 6); hitstop = 0.08; sfx('stomp');
      hitBoss(4, Math.sign(t.vx)); if (boss && boss.state !== 'ko') { bSet('daze'); popup(b.x, FLOOR + b.z - 62, 'BUSTED!', '#ffd34a', 1); }
    } else if (t.x < camX - 30 || t.x > camX + VW + 30) breakTable();
  }
  // a kick that meets the table: a side kick slides it (into him, if he's behind it); others break it, three
  function kickTable(box) {
    const b = boss, p = player;
    if (!b || b.type !== 'gila' || !b.table || b.table.sliding) return;
    const t = b.table;
    if (p.hitSet.has(t) || !inLane(t, p, 14) || !(box.x0 < t.x + 16 && box.x1 > t.x - 16 && box.h0 < 30)) return;
    p.hitSet.add(t); spark(t.x, t.z, 16, true); sfx('hit'); hitstop = 0.05;
    if (p.state === 'side' || p.state === 'jumpkick') { t.sliding = true; t.vx = p.face * 300; popup(t.x, FLOOR + t.z - 40, 'ANTE UP!', '#ffd34a', 1); }
    else if (--t.hp <= 0) { breakTable(); b.cover = false; }
  }
  // the Cattle Drive: riders join the chase on a schedule; fences (every lane) and rocks (one lane) to jump; at the
  // corral the ride ends - WHOA! - and he's on foot. Horses and steers running loose; Jack's stampede.
  const rideTread = () => ride && ride.on && ride.d < S.ride.tread;
  function updateRide(dt) {
    const p = player;
    if (ride) for (const o of obstacles) o.x = o.d - (ride.d - camX);   // where the trail's put them
    if (ride && ride.on) {
      const sp = S.ride.spawns;
      const riders = enemies.filter(e => e.type === 'rider' && e.state !== 'ko').length;   // three in the saddle at most
      if (ride.spawnI < sp.length && ride.d >= sp[ride.spawnI][0] && phase === 'play' && riders < 3) { const [, type, side] = sp[ride.spawnI++]; spawn(type, side, 0); }
      for (const e of enemies) if (e.x < camX - 70 && e.state !== 'ko') e.gone = true;   // left behind on the trail
      for (const o of obstacles) {
        if (o.hit || !p.mounted || death || p.h >= 14 || Math.abs(p.x - o.x) > 14) continue;
        if (o.kind === 'fence' || inLane(p, o, 10)) {
          o.hit = true;
          if (o.kind === 'fence') { sfx('break'); for (let i = 0; i < 6; i++) parts.push({ k: 'chunk', img: GPROPS.plank, x: o.x, z: p.z, h: 8 + Math.random() * 14, vx: (Math.random() - 0.2) * 200, vh: 100 + Math.random() * 140, life: 1, max: 1 }); }
          if (hurtPlayer(o, 2)) popup(p.x, FLOOR + p.z - 70, 'OOF!', '#ff6b4a', 1);
        }
      }
      if (camX >= S.ride.end && !death && phase === 'play') {                  // the corral: off he gets
        ride.on = false; p.mounted = false; p.h = 0; p.vh = 0; setS('land'); sfx('land'); puff(p.x, p.z, 4);
        popup(p.x, FLOOR + p.z - 66, 'WHOA!', '#ffd34a', 2);
        runners.push({ x: p.x, z: p.z, vx: 200, img: 'steer', face: 1 });
        for (const e of enemies) if (e.type === 'rider' && e.state !== 'ko') { e.state = 'leave'; e.t = 0; }
      }
    }
    for (const r of runners) { r.x += (r.vx - (rideTread() ? RIDE_V : 0)) * dt; if (r.x > camX + VW + 80 || r.x < camX - 80) r.gone = true; }
    runners = runners.filter(r => !r.gone);
    for (const c of stampede) {                       // Jack's stampede: steers charging across the corral
      c.x += c.vx * dt;
      if (!c.hit && Math.abs(c.x - p.x) < 20 && inLane(c, p, 12) && p.h < 16 && hurtPlayer(c, 2)) { c.hit = true; popup(p.x, FLOOR + p.z - 62, 'TRAMPLED!', '#ff6b4a', 1); }
      for (const e of enemies) if (hittable(e) && inLane(e, c, 12) && Math.abs(e.x - c.x) < 20) hitE(e, 3, true, Math.sign(c.vx));
      if (c.x < camX - 80) c.gone = true;
    }
    stampede = stampede.filter(c => !c.gone);
  }

  // Ghost Town's hanging signs: one creaks as you pass, then drops; it hits whoever's under it
  function updateSigns(dt) {
    const p = player;
    for (const g of signs) {
      g.t += dt;
      if (g.state === 'hang' && phase === 'play' && Math.abs(p.x - g.x) < 34) { g.state = 'creak'; g.t = 0; sfx('shell'); }
      else if (g.state === 'creak' && g.t > 0.35) { g.state = 'fall'; g.t = 0; }
      else if (g.state === 'fall') {
        g.vh -= GRAV * dt; g.h += g.vh * dt;
        if (g.h <= 24) {
          g.state = 'down'; g.h = 0; sfx('break'); shake = Math.max(shake, 4); puff(g.x, g.z, 5);
          let hit = false;
          if (Math.abs(p.x - g.x) < 22 && inLane(p, g, 14) && p.h < 20) hit = hurtPlayer(g, 2);
          for (const e of enemies) if (hittable(e) && Math.abs(e.x - g.x) < 22 && inLane(e, g, 14)) { hitE(e, 3, true, Math.sign(e.x - g.x) || 1); hit = true; }
          if (hit) popup(g.x, FLOOR + g.z - 40, 'TIMBER!', '#ffd34a', 1);
        }
      }
    }
  }
  // a kick that meets the rolling shell sends it back
  function kickShell(box) {
    const b = boss;
    if (!b || b.type !== 'dillon' || b.state !== 'roll' || b.deflected || !inLane(b, player, 14)) return;
    if (box.x0 < b.x + 18 && box.x1 > b.x - 18 && box.h0 < 34) {
      b.deflected = true; b.vx = -b.vx * 1.3; b.face = Math.sign(b.vx); b.t = 0;
      spark(b.x, b.z, 18, true); sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3);
      popup(b.x, FLOOR + b.z - 50, 'BACK AT YA!', '#ffd34a', 1);
    }
  }

  function bossImg(b) {
    if (b.type === 'diamondback') {
      const G = DBK, slither = (b.vx || b.vz) ? G.walk[(b.anim * 8 | 0) % 4] : null;
      return { duel: b.res === 'win' ? G.nogun[(b.anim * 3 | 0) % 2] : b.drawT ? G.draw : b.said && b.t < 2.6 ? G.talk[(b.t * 6 | 0) % 2] : G.idle[(b.anim * 2 | 0) % 2],
        approach: slither || G.idle[(b.anim * 2 | 0) % 2], draw: G.draw, fan: b.flashT > 0 ? G.fire : G.draw, reload: G.reload[(b.anim * 4 | 0) % 2],
        coil: G.coil, strike: G.strike, stretch: G.stretch, whip: G.whip[(b.t * 10 | 0) % 2], recover: G.idle[0], stagger: G.hurt,
        daze: G.daze[(b.t * 8 | 0) % 4], ko: G.ko }[b.state];
    }
    if (b.type === 'toro') {
      const G = TORO;
      return { intro: b.vx ? G.charge[(b.anim * 10 | 0) % 2] : G.talk[(b.t * 6 | 0) % 2], approach: (b.vx || b.vz) ? G.walk[(b.anim * 7 | 0) % 4] : G.idle[(b.anim * 3 | 0) % 2],
        backoff: G.walk[3 - ((b.anim * 9 | 0) % 4)], paw: G.paw[(b.t * 6 | 0) % 2], charge: G.charge[(b.anim * 12 | 0) % 2], stuck: G.stuck[(b.t * 10 | 0) % 2], hookw: G.hookw, hook: G.hook,
        rear: G.rear, stomp: G.stomp, recover: G.idle[0], stagger: G.hurt, daze: G.daze[(b.t * 8 | 0) % 4], ko: G.ko }[b.state];
    }
    if (b.type === 'sting') {
      const G = STING;
      return { intro: b.h > 0 ? G.toss : G.talk[(b.t * 6 | 0) % 2], approach: (b.vx || b.vz) ? G.walk[(b.anim * 10 | 0) % 4] : G.idle[(b.anim * 3 | 0) % 2],
        pinchw: G.pinchw, pinch: G.pinch, windup: G.windup, sting: G.sting, stuck: G.stuck, light: G.light, toss: G.toss,
        recover: G.idle[0], stagger: G.hurt, daze: G.daze[(b.t * 8 | 0) % 4], duck: G.duck, ko: G.ko }[b.state];
    }
    if (b.type === 'jack') {
      const J = JACK;
      return { intro: b.h > 0 ? J.hop : J.talk[(b.t * 6 | 0) % 2], approach: J.idle[(b.anim * 3 | 0) % 2], crouch: J.crouch, hopping: J.hop,
        land: J.crouch, turn: J.crouch, kick: J.kick, spin: J.spin[(b.anim * 10 | 0) % 2], throw: J.throw, reel: J.throw, recover: J.idle[0],
        stagger: J.hurt, daze: J.daze[(b.t * 8 | 0) % 4], ko: J.ko }[b.state];
    }
    if (b.type === 'gila') {
      const G = GILA;
      return { intro: G.talk[(b.t * 6 | 0) % 2], approach: (b.vx || b.vz) ? G.walk[(b.anim * 7 | 0) % 4] : G.idle[(b.anim * 3 | 0) % 2],
        deal: G.deal, flick: G.flick, jaws: G.jaws, bite: G.bite, recover: G.idle[0], stagger: G.hurt, cover: G.duck,
        vanish: null, crouch: G.jaws, leap: G.leap, hang: G.leap, drop: G.drop, land: G.idle[0],
        daze: G.daze[(b.t * 8 | 0) % 4], ko: G.ko }[b.state];
    }
    if (b.type === 'dillon') {
      const D = DILLON;
      return { intro: D.talk[(b.t * 6 | 0) % 2], approach: (b.vx || b.vz) ? D.walk[(b.anim * 7 | 0) % 4] : D.idle[(b.anim * 3 | 0) % 2],
        windup: D.windup, swipe: D.swipe, recover: D.idle[0], stagger: D.hurt, curl: D.curl, roll: D.ball[(b.anim * 20 | 0) % 8],
        daze: D.daze[(b.t * 8 | 0) % 4], ko: D.ko }[b.state];
    }
    const C = COYOTE;
    return { intro: C.talk[(b.t * 6 | 0) % 2], approach: (b.vx || b.vz) ? C.walk[(b.anim * 8 | 0) % 4] : C.idle[(b.anim * 3 | 0) % 2],
      windup: C.windup, throwWind: C.windup, swing: C.swing, throw: C.throw, recover: C.idle[0], stagger: C.hurt, dig: C.dig,
      pop: C.pop, daze: C.daze[(b.t * 8 | 0) % 4], ko: C.ko }[b.state];
  }

  function buildDL() {
    DL = [];
    const cx = Math.round(camX), wx = x => x - cx, p = player;
    // HUD
    if (phase === 'title') {
      center(T.textSprite('HI SCORE ' + String(hiScore).padStart(7, '0'), '#ffd34a', 1), 10);
      if (story) for (const [t, c, sc, y] of STORY) center(T.textSprite(t, c, sc), y);   // the story's page
      else {
        center(T.textSprite('TEXAS', '#ffe7b0', 4), 26); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 54);
        center(T.textSprite('HE DIED WITH HIS BOOTS ON', '#e8a070', 1), 92); center(T.textSprite('NOW THE BOOTS WANT REVENGE', '#e8a070', 1), 102);
      }
      if (Math.floor(phaseT * 2) % 2 === 0) center(T.textSprite('PRESS JUMP', '#ffd34a', 2), 204);
      center(T.textSprite('JFED 2026', '#c3c8d8', 1), 228);
    } else if (phase !== 'intro' && phase !== 'ending') {
      put(T.bossBar('SHITKICKERS', Math.max(0, p.hp), MAX_HP), 6, 6, 0, 0, 0);
      if (p.lives <= 3) for (let i = 0; i < p.lives; i++) put(HAT, 108 + i * 24, 6, 0, 0, 0);   // the hats: up to three, then one and a count
      else { put(HAT, 108, 6, 0, 0, 0); put(T.textSprite('X' + p.lives, '#ffd34a', 2), 134, 10, 0, 0, 0); }
      put(T.textSprite('SCORE ' + String(score).padStart(7, '0'), '#fff3c4', 1), 6, 26, 0, 0, 0);
      if (p.weapon) {
        if (p.weapon.type === 'gun') for (let i = 0; i < p.weapon.ammo; i++) put(PICK.bulletIcon, 10 + i * 6, 38, 4, 4, 0);
        else put(T.textSprite('WHIP ' + p.weapon.ammo, '#ffd34a', 1), 6, 35, 0, 0, 0);
      }
      let ry = 6;                                // the right-hand column: the doors (in the siege), whoever you last hit or the boss, the combo
      if (door && camX >= MI.YARD - 1 && (!door.bustT || Math.floor(time * 6) % 2)) { const b = T.bossBar('THE DOORS', Math.max(0, door.hp), door.max); put(b, VW - 6 - b.width, ry, 0, 0, 0); ry += 20; }
      if (lastHit && lastHitT > 0 && lastHit.state !== 'ko') { const b = T.bossBar(lastHit.name, Math.max(0, lastHit.hp), lastHit.max); put(b, VW - 6 - b.width, ry, 0, 0, 0); }
      else if (boss) { const b = T.bossBar(boss.name, Math.max(0, boss.hp), boss.max); put(b, VW - 6 - b.width, ry, 0, 0, 0); }
      if (comboT > 0 && combo > 1) { const t = T.textSprite(combo + ' HIT COMBO!', '#ffd34a', 1); put(t, VW - 6 - t.width, ry + 20, 0, 0, 0); }
      if (goT > 0 && lock === null && phase === 'play' && !(S.waves[waveI] && S.waves[waveI].cam <= camX + 1) && Math.floor(goT * 4) % 2) put(T.textSprite('GO >>', '#ffd34a', 3), VW - 70, 70, 0, 0, 0);
      if (titleT < 3.2 && phase === 'play') {
        if (S.intro) { center(T.textSprite('TEXAS', '#ffe7b0', 4), 50); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 78); }
        center(T.textSprite(S.name, '#ffd34a', S.intro ? 2 : 3), S.intro ? 114 : 66); center(T.textSprite(S.sub, '#e8a070', 1), S.intro ? 132 : 88);
      }
      const at = (img, x, y) => put(img, Math.max(2, Math.min(VW - 2 - img.width, Math.round(x))), Math.round(y), 0, 0, 0);
      const speech = (line, top) => {            // a boss's line: in front of his face, on the side he faces
        const f = boss.face || -1, bx = wx(boss.x);
        if (!BUBBLE) { const im = T.textSprite(line, '#fff3c4', 1); at(im, f < 0 ? bx - 22 - im.width : bx + 22, top + 14); return; }
        const body = T.bubbleBody(line), y = top + 6, side = -f, tl = T.TAIL[side];   // (the tail at the end nearest him)
        const x0 = Math.max(2, Math.min(VW - 2 - body.width, f < 0 ? bx - 22 - body.width : bx + 22));
        put(body, x0, y, 0, 0, 0); put(T.bubbleTail(side), side > 0 ? x0 + body.width + tl.dx : x0 + tl.dx, y + tl.dy, 0, 0, 0);
      };
      if (entr && boss && entr.arr !== null) {   // his entrance: the name typing on, what he is, his lines
        const E2 = ENTRANCE[boss.type], M = entrMarks(), bx = wx(boss.x), top = FLOOR + boss.z - E2[3];
        const full = T.textSprite(boss.name, '#ffd34a', 2), x0 = Math.max(2, Math.min(VW - 2 - full.width, Math.round(bx - full.width / 2)));
        if (entr.n) put(T.textSprite(boss.name.slice(0, entr.n), '#ffd34a', 2), x0, top - 26, 0, 0, 0);   // (left-aligned where the whole name will sit)
        if (entr.stamped) { const nk = T.textSprite(E2[0], '#e8a070', 1); at(nk, bx - nk.width / 2, top - 13); }
        const line = entr.t >= M.ringo ? E2[2] : entr.t >= M.line ? E2[1] : null;
        if (line) speech(line, top);
      } else if (boss && boss.say && time < boss.sayEnd && boss.state !== 'ko') speech(boss.say, FLOOR + boss.z - 64);
      if (phase === 'clear') { center(T.textSprite(S.name + ' CLEAR!', '#ffd34a', 3), 70); center(T.textSprite('SCORE ' + score, '#fff3c4', 1), 96); }
      if (phase === 'end') { center(T.textSprite('TO BE CONTINUED...', '#ff9d3c', 2), 80); if (Math.floor(phaseT * 3) % 2) center(T.textSprite('PRESS JUMP TO RIDE AGAIN', '#c3c8d8', 1), 110); }
      if (phase === 'over' && phaseT > 1) center(T.textSprite('PRESS JUMP TO TRY AGAIN', '#c3c8d8', 1), 120);
      if (showHelp) { const h = helpSprite(); put(h, (VW - h.width) >> 1, 46, 0, 0, 0); }
      else if (phase === 'play') put(T.textSprite('H: MOVES', '#ffe7b0', 1), 6, VH - 10, 0, 0, 0);
    }
    for (const u of popups) { if (u.life < 0.2 && Math.floor(u.life * 30) % 2) continue; const t = T.textSprite(u.text, u.color, u.s); put(t, Math.max(2, Math.min(VW - 2 - t.width, wx(u.x) - (t.width >> 1))), u.y, 0, 0, 1); }

    // the hero (in the opening: clawing out of the grave, then the hat hops over)
    if (phase === 'intro') {
      const t = phaseT;
      if (t >= IN.rise) {
        const img = t < IN.wake ? HERO.rise.frames[Math.min(HERO.rise.frames.length - 1, Math.floor((t - IN.rise) * HERO.rise.fps))] : intro.hatOn ? HERO.idle.frames[0] : HERO.wake.frames[0];
        put(img, wx(p.x), sy(p.z, 0), H.OX, H.OY, depth(p.z));
      }
      if (!intro.hatOn) put(HAT, wx(intro.hx), intro.hy, T.HAT.OX, T.HAT.OY, depth(p.z) - 0.01);
    } else if (ending && (ending.step === 'theend' || ending.step === 'shop')) {   // the ending's last words; the boot shop
      if (ending.step === 'theend' && ending.t > 0.6) center(T.textSprite('THE END', '#ff9d3c', 4), 84);
      if (ending.step === 'shop') {
        put(ART.shopBoot[ending.twitch > 0 ? 1 : 0], 184, 168, ART.shopBoot[0].ox, ART.shopBoot[0].oy, 5);   // the right-hand boot, over the bitmap
        if (ending.t > 3.5 && Math.floor(ending.t * 2) % 2) center(T.textSprite('PRESS JUMP', '#c3c8d8', 1), 210);
      }
    } else {
      if (p.mounted) put(p.h > 0 ? RSP.steerJump : RSP.steer[(time * 10 | 0) % 4], wx(p.x), sy(p.z, p.h), CB.OX, CB.OY, depth(p.z) - 0.0005, p.face);
      if (!(p.inv > 0 && Math.floor(p.inv * 18) % 2) && !(p.state === 'fall' && p.h < -14) && !(phase === 'title' && story)) put(HERO[p.anim].frames[p.frame], wx(p.x), sy(p.z, p.h + (p.mounted ? SADDLE : 0)), H.OX, H.OY, depth(p.z) - 0.001, p.face);
    }
    if (death && death.hat) put(HAT, wx(death.hat.x), Math.round(death.hat.y), T.HAT.OX, T.HAT.OY, death.caught ? depth(p.z) - 0.002 : 0);
    if ((phase !== 'intro' || phaseT >= IN.rise) && p.state !== 'fall' && !(phase === 'title' && story) && !(ending && (ending.step === 'theend' || ending.step === 'shop'))) put(PICK.shadow, wx(p.x), sy(p.z, 0), 16, 4, 9);
    if (S.noon && !ending) put(NSP.hands[struck ? 1 : 0], wx(NO.CLOCK.x), NO.CLOCK.y, 16, 16, 8.9);   // the town hall's clock: 11:59, then noon
    if (boss && boss.type === 'diamondback' && boss.state === 'duel' && boss.drawT && boss.t - boss.drawT < 0.9 && boss.res !== 'early') center(T.textSprite('DRAW!', '#ffd34a', 4), 56);
    if (pebble) { put(PROPS.clod, wx(pebble.x), sy(pebble.z, pebble.h), 4, 4, depth(pebble.z) - 0.002); put(PICK.shadowS, wx(pebble.x), sy(pebble.z, 0), 12, 4, 9); }
    if (tunnel && (tunnel.st === 'mouth' || tunnel.st === 'exit'))   // the tunnel's mouth sweeping over, in front of everything
      put(TRS.portal, tunnel.x, 128, 0, TRS.portal.oy, 1.5, tunnel.st === 'exit' ? -1 : 1);
    if (tunnel) for (const pr of tunnel.props) put(TRS.prop, pr.x, 128, TRS.prop.ox, TRS.prop.oy, 1.5);   // the pit-props going by
    if (tunnel && tunnel.props.some(pr => pr.x > player.x - camX && pr.x < VW + 40 && Math.floor(time * 6) % 2)) center(T.textSprite('DUCK!', '#ffd34a', 2), 60);
    if (tunnel && tunnel.st === 'warn' && (tunnel.t < S.tunnel.warn - 0.6 || Math.floor(tunnel.t * 8) % 2 === 0)) {   // (steady, then it blinks: here it comes)
      center(T.textSprite('TUNNEL!', '#ff9d3c', 3), 56); center(T.textSprite('DUCK! HOLD DOWN', '#ffd34a', 1), 82);
    }
    if (ending ? ending.step !== 'shop' : S.intro) {   // (never in the boot shop, whatever stage it came from)   // Ringo's headstone, and the grave he came out of (the ending's too)
      put(PROPS.headstone, wx(STONE.x), sy(STONE.z, 0), PROPS.headstone.ox, PROPS.headstone.oy, depth(STONE.z));
      put(phase === 'intro' && phaseT < IN.rise ? PROPS.mound : PROPS.hole, wx(96), sy(34, 0), 20, 11, 8.9);   // (in the ending: still open)
    }
    for (const o of obstacles) {
      if (o.kind === 'rock') { put(RSP.rock, wx(o.x), sy(o.z, 0), RSP.rock.ox, RSP.rock.oy, depth(o.z)); continue; }
      if (!o.hit) for (const z of [6, 30, 54, 78]) put(RSP.fence, wx(o.x) + (z - 40) * 0.25, sy(z, 0), RSP.fence.ox, RSP.fence.oy, depth(z));   // a fence across the trail
    }
    for (const r of runners) put(r.img === 'steer' ? RSP.steer[(time * 12 | 0) % 4] : RSP.horse[(time * 12 | 0) % 4], wx(r.x), sy(r.z, 0), CB.OX, CB.OY, depth(r.z), r.face);
    for (const c of stampede) { put(RSP.steer[(time * 12 | 0) % 4], wx(c.x), sy(c.z, 0), CB.OX, CB.OY, depth(c.z), -1); put(PICK.shadow, wx(c.x), sy(c.z, 0), 16, 4, 9); }
    if (boss && boss.lasso) {                         // Jack's rope, out along the lane to its loop
      const L2 = boss.lasso, hx = boss.x + boss.face * 12, n = Math.floor(Math.abs(L2.x - hx) / 24);   // (24-px lengths of rope: few sprites)
      for (let i = 0; i < n; i++) put(JACK.rope, wx(hx + boss.face * (i * 24 + (boss.face < 0 ? 24 : 0))), sy(L2.z, 28), 0, 1, depth(L2.z) - 0.003);
      put(JACK.loop, wx(L2.x), sy(L2.z, 26), 8, 6, depth(L2.z) - 0.003);
    }
    for (const e of enemies) {
      if (e.type === 'skel' && e.state === 'ko' && !e.fell) continue;
      if (e.fell && e.h < -14) continue;             // gone down between the cars
      if (e.type === 'rider') {                       // a rustler in the saddle
        put(RSP.horse[(time * 12 | 0) % 4], wx(e.x), sy(e.z, e.h), CB.OX, CB.OY, depth(e.z) + 0.0005, e.face, e.flash > 0 ? 'flash' : null);
        const C = S.gang, im = e.state === 'windup' ? C.windup : e.state === 'strike' ? C.swing : e.state === 'stagger' ? C.hurt
          : e.state === 'aim' ? C.aim : e.state === 'shoot' ? (e.t < 0.1 ? C.shoot : C.aim) : C.idle[0];
        put(im, wx(e.x) - e.face * 2, sy(e.z, e.h + 24), CB.OX, CB.OY, depth(e.z), e.face, e.flash > 0 ? 'flash' : null);
        put(PICK.shadow, wx(e.x), sy(e.z, 0), 16, 4, 9);
        continue;
      }
      const img = enemyImg(e), big = e.type !== 'dillo';
      if (img) put(img, wx(e.x), sy(e.z, e.h), big ? CB.OX : E.OX, big ? CB.OY : E.OY, depth(e.z), e.face, e.flash > 0 ? 'flash' : null);
      if (e.state !== 'ko') put(big ? PICK.shadow : PICK.shadowS, wx(e.x), sy(e.z, 0), big ? 16 : 12, 4, 9);
    }
    if (boss) {
      const b = boss;
      if (b.state === 'under' || b.state === 'rumble') {
        const m = PROPS.digMound[Math.floor(time * (b.state === 'rumble' ? 16 : 6)) % 2];
        put(m, wx(b.mx) + (b.state === 'rumble' ? (Math.floor(time * 30) % 2) * 2 - 1 : 0), sy(b.mz, 0), m.ox, m.oy, depth(b.mz));
      } else {
        const img = bossImg(b);
        if (img) put(img, wx(b.x), sy(b.z, b.h), CB.OX, CB.OY, depth(b.z), b.face, b.flash > 0 ? 'flash' : null);
        if (b.state !== 'ko' && b.state !== 'vanish') put(PICK.shadow, wx(b.x), sy(b.z, 0), 16, 4, 9);
      }
    }
    for (const s of shocks) for (const sd of [-1, 1]) for (const dz of [-24, 0, 24]) {   // his stomp: a wall of dust rolling out along the ground
      const z = Math.max(0, Math.min(ZMAX, s.z + dz)), f = FX.dust[Math.min(4, (s.r / 36) | 0)][(time * 12 | 0) % 2];
      put(f, wx(s.x + sd * s.r), sy(z, 0), 4, 6, depth(z) + 0.01);
    }
    for (const s of skulls) { put(SKEL.skull[s.state === 'ground' ? 0 : (s.anim * 12 | 0) % 4], wx(s.x), sy(s.z, s.h + 6), 8, 8, depth(s.z)); put(PICK.shadowS, wx(s.x), sy(s.z, 0), 12, 4, 9); }
    for (const b of barrels) if (b.alive) {
      if (b.table) put(GPROPS.table, wx(b.x), sy(b.z, 0), GPROPS.table.ox, GPROPS.table.oy, depth(b.z));
      else put(BARREL, wx(b.x), sy(b.z, 0), T.BARREL.OX, T.BARREL.OY, depth(b.z));
      put(PICK.shadowS, wx(b.x), sy(b.z, 0), 12, 4, 9);
    }
    for (const g of signs) {
      if (g.state === 'down') { put(g.img.down, wx(g.x), sy(g.z, 0), g.img.down.ox, g.img.down.oy, depth(g.z)); continue; }
      const jig = g.state === 'creak' ? (Math.floor(time * 30) % 2) * 2 - 1 : 0;
      put(g.img.up, wx(g.x) + jig, sy(g.z, g.h), g.img.up.ox, 0, depth(g.z));
      if (g.state !== 'hang') put(PICK.shadowS, wx(g.x), sy(g.z, 0), 12, 4, 9);
    }
    if (boss && boss.table) { const t = boss.table; put(GPROPS.flipped, wx(t.x), sy(t.z, 0), GPROPS.flipped.ox, GPROPS.flipped.oy, depth(t.z)); put(PICK.shadow, wx(t.x), sy(t.z, 0), 16, 4, 9); }
    for (const it of items) {
      if (it.type === 'hat') { put(HAT, wx(it.x), sy(it.z, it.h), T.HAT.OX, T.HAT.OY, depth(it.z) + 0.002); put(PICK.shadowS, wx(it.x), sy(it.z, 0), 12, 4, 9); continue; }
      put(PICK[it.type], wx(it.x), sy(it.z, it.h), 12, 12, depth(it.z) + 0.002); if (Math.floor(time * 4) % 2 && it.type !== 'beans') put(T.textSprite('X', '#ffd34a', 1), wx(it.x), sy(it.z, it.h) - 18, 1, 0, 1);
    }
    if (secret && !ending) {                       // the hidden hat's hiding place; whole, it glints now and then
      const im = SECRETS[secret.key][secret.open ? 1 : 0];
      put(im, wx(secret.x), sy(secret.z, 0), im.ox, im.oy, depth(secret.z) + 0.003);
      if (!secret.open && (time % 2.6) < 0.16) put(FX.star[2], wx(secret.x) + 4, sy(secret.z, 26), 16, 16, 2);
    }
    if (tumble) { put(TUMBLE[(time * 10 | 0) % 4], wx(tumble.x), sy(tumble.z, tumble.h), 12, 22, depth(tumble.z)); put(PICK.shadowS, wx(tumble.x), sy(tumble.z, 0), 12, 4, 9); }
    for (const s of sticks) { put(STING.stick[(time * 14 | 0) % 2], wx(s.x), sy(s.z, s.h + 3), 8, 6, depth(s.z) - 0.002, s.vx < 0 ? -1 : 1); put(PICK.shadowS, wx(s.x), sy(s.z, 0), 12, 4, 9); }
    for (const q of booms) if (q.t >= 0) put(STING.boom[q.t < 0.08 ? 0 : q.t < 0.26 ? 1 : 2], wx(q.x), sy(q.z, 0), 24, 34, depth(q.z) - 0.004);
    for (const b of bullets) put(PICK.bullet, wx(b.x), sy(b.z, b.h), 4, 4, depth(b.z) - 0.002, Math.sign(b.vx));
    for (const b of ebullets) {
      if (b.card) put(GILA.card[(time * 16 | 0) % 4], wx(b.x), sy(b.z, b.h), 6, 6, depth(b.z) - 0.002);
      else put(SKEL.bullet, wx(b.x), sy(b.z, b.h), 4, 4, depth(b.z) - 0.002, Math.sign(b.vx));
      put(PICK.shadowS, wx(b.x), sy(b.z, 0), 12, 4, 9);
    }
    for (const c of clods) { put(PROPS.clod, wx(c.x), sy(c.z, c.h), 4, 4, depth(c.z) - 0.002); put(PICK.shadowS, wx(c.x), sy(c.z, 0), 12, 4, 9); }
    for (const q of parts) {
      const k = q.life / q.max, y = sy(q.z, q.h);
      if (q.k === 'dust') put(FX.dust[Math.min(4, q.s + ((1 - k) * 2 | 0))][k > 0.5 ? 0 : 1], wx(q.x), y, 4, 4, depth(q.z) + 0.01);
      else if (q.k === 'bit') put(FX.bit[q.c], wx(q.x), y, 4, 4, 2);
      else if (q.k === 'mote') put(FX.bit[0], wx(q.x), y, 4, 4, 8.5);
      else if (q.k === 'star') put(FX.star[Math.max(0, Math.min(5, Math.round((q.big ? 5 : 3) * (0.6 + k * 0.4))))], wx(q.x), y, 16, 16, 2);
      else if (q.k === 'chunk') { const img = q.spin ? q.spin[(time * 12 | 0) % 4] : q.img; put(img, wx(q.x), y, img.ox ?? 1, img.oy ?? 1, depth(q.z) + 0.01); }
      else if (q.k === 'ring') { const f = FX.ring[Math.min(FX.ring.length - 1, ((1 - k) * FX.ring.length) | 0)]; put(f, wx(q.x), y, f.ox, f.oy, 8); }
    }
    DL.sort((a, b) => a.pri - b.pri);
    let used = 0, dropped = 0;
    for (const d of DL) { if (used + d.n > MAX_SPRITES) { d.dropped = true; dropped += d.n; } else used += d.n; }
    stats = { records: used, dropped };
    tally.maxRec = Math.max(tally.maxRec || 0, used + dropped);
  }

  function render() {
    const sx = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0, syy = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
    const cx = Math.round(camX), lit = flashT > 0;
    // three tile maps: far sky, middle, and the street that scrolls with the floor. Dusk and lightning are CLUT tricks.
    const layer = (img, scroll) => {
      const src = lit && img.idx ? T.flashOf(img) : S.dusk ? T.shadeOf(img, dark) : tdark > 0 ? T.shadeOf(img, tdark) : img, off = -(Math.floor(scroll) % img.width);
      for (let x = off; x < VW; x += img.width) ctx.drawImage(src, x + sx, syy);
    };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    const bg = ride ? Math.min(ride.d, S.ride.tread) : 0;          // the ride: the sky layers keep going over the treadmill
    const run = S.train ? time : 0;                 // the train: the scenery streams by on its own
    if (ending && ending.step === 'shop') ctx.drawImage(ART.shopBmp, sx, syy);   // the boot shop: a bitmap (the F256's bitmap layer)
    else { layer(ART.far, (cx + bg) * 0.25 + run * TR.FAR); layer(ART.mid, (cx + bg) * 0.5 + run * TR.V); }
    if (rockOn()) layer(ART.rock, cx * 0.5 + run * TR.V);   // in the tunnel: its rock wall behind the train (the middle layer's other map)
    if (!(ending && ending.step === 'shop')) layer(ART.street, ride && ride.d < S.ride.tread ? Math.floor(ride.d) % T.RANCH.LOOP : cx);
    if (door && ART.doors) {                       // the church doors: their patch of the street map, by how battered they are
      const k = door.hp <= 0 ? 3 : door.hp <= door.max / 3 ? 2 : door.hp <= door.max * 2 / 3 ? 1 : 0, img = ART.doors[k], P = MI.DOORS;
      const src = S.dusk ? T.shadeOf(img, dark) : img;
      if (P.x - cx < VW && P.x + P.w - cx > 0) ctx.drawImage(src, P.x - cx + sx, P.y + syy);
    }
    for (let i = DL.length - 1; i >= 0; i--) {
      const d = DL[i]; if (d.dropped) continue;
      const img = d.clut ? T.variant(d.img, d.clut) : d.img;
      if (d.face < 0) { ctx.save(); ctx.translate(d.left + img.width + sx, d.top + syy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
      else ctx.drawImage(img, d.left + sx, d.top + syy);
    }
    if (params.has('debug')) T.drawText(ctx, `SPR ${stats.records}/${MAX_SPRITES}${stats.dropped ? ' DROP ' + stats.dropped : ''}`, VW - 6, 40, '#7fd4ff', 1, PAL.out, 'right');
    if (params.has('debug')) T.drawText(ctx, `W${waveI} L${lock} ${phase} ` + allFoes().map(e => e.type[0] + ':' + e.state + '@' + (e.x | 0)).join(' '), 4, VH - 20, '#7fd4ff', 1, PAL.out);
    vctx.drawImage(buf, 0, 0, VW * scale, VH * scale);
  }

  // ---------------------------------------------------------------- loop
  // ?bot: a crude autopilot (walks right, fights whoever is nearest), for testing with ?ff (and ?god)
  let botT = 0;
  function runBot(dt) {
    if (!params.has('bot') || phase !== 'play') return;
    const p = player; botT -= dt;
    keys.left = keys.right = keys.up = keys.down = false;
    if (duckNow() && !params.has('noduck')) { keys.down = true; return; }   // TUNNEL!: flat on the roof (?noduck: the test of the knock)
    if (p.state === 'grab') { if (botT <= 0) { pressed.snap = true; botT = 0.25; } return; }   // holding one: knee it (the third throws)
    if (boss && boss.type === 'dillon' && boss.state === 'roll') {      // the shell's coming: kick it back, or get out of its lane
      const dx = boss.x - p.x;
      if (!boss.deflected && Math.sign(dx) === -Math.sign(boss.vx) && Math.abs(dx) < 40 && inLane(boss, p, 10) && botT <= 0) { p.face = Math.sign(dx) || 1; pressed.side = true; botT = 0.4; }
      else if (!boss.deflected) keys[p.z > boss.z ? 'down' : 'up'] = Math.abs(p.z - boss.z) < 14 && Math.abs(dx) < 90;
      return;
    }
    if (boss && boss.type === 'diamondback' && boss.state === 'duel') {        // the duel: kick on DRAW! (?duel=early, ?duel=slow: the misses)
      const how = params.get('duel');
      if (how === 'early' ? boss.t > 2 : how === 'slow' ? false : boss.drawT && boss.t - boss.drawT > 0.15) pressed.snap = true;
      return;
    }
    if (boss && boss.type === 'diamondback' && boss.state === 'coil' && boss.t > 0.35 && inLane(boss, p, 12) && Math.abs(boss.x - p.x) < 150 && p.h <= 0 && botT <= 0) { pressed.jump = true; botT = 0.5; return; }
    if (boss && boss.type === 'toro' && boss.state !== 'ko' && !params.has('hug')) {   // Bullrush: out of his lane when he paws, jump the dust
      const b = boss, sh = shocks.find(s => Math.abs(Math.abs(p.x - s.x) - s.r) < 34 && Math.abs(p.z - s.z) < 36 && Math.abs(p.x - s.x) > s.r - 4);
      if (sh && p.h <= 0 && botT <= 0) { pressed.jump = true; botT = 0.4; return; }
      if (b.state === 'rear' && p.h <= 0 && Math.abs(b.x - p.x) < 40 && botT <= 0 && b.t > 0.4) { pressed.jump = true; botT = 0.4; return; }
      if (['paw', 'charge', 'intro', 'backoff'].includes(b.state) && Math.abs(p.z - b.z) < 20) { keys[p.z > b.z ? (p.z < ZMAX - 6 ? 'down' : 'up') : (p.z > 6 ? 'up' : 'down')] = true; return; }
    }
    if (boss && (boss.type === 'sting' || boss.type === 'toro') && boss.state !== 'ko' && params.has('hug')) {   // ?hug: the test of walking into him and kicking
      const dx = boss.x - p.x;
      if (Math.abs(boss.z - p.z) > 2) keys[boss.z > p.z ? 'down' : 'up'] = true;
      if (Math.abs(dx) > 3) keys[dx > 0 ? 'right' : 'left'] = true;
      else if (botT <= 0) { p.face = boss.face; pressed.snap = true; botT = 0.3; }
      return;
    }
    if (boss && boss.type === 'sting' && boss.state !== 'ko') {                 // Sting: his dynamite back at him; jump the sting
      const st = sticks.find(q => !q.kicked && q.h <= 0 && Math.abs(q.x - p.x) < 90 && Math.abs(q.z - p.z) < 18);
      if (st) {
        const toB = Math.sign(boss.x - st.x) || 1, tx = st.x - toB * 14;   // round to the side away from him, and kick
        if (st.fuse > 0.45) {
          if (Math.abs(st.z - p.z) > 3) keys[st.z > p.z ? 'down' : 'up'] = true;
          if (Math.abs(tx - p.x) > 4) keys[tx > p.x ? 'right' : 'left'] = true;
          else if (botT <= 0 && Math.abs(st.z - p.z) < 6) { p.face = toB; pressed.snap = true; botT = 0.3; }
        } else { keys[p.z > st.z ? 'down' : 'up'] = true; keys[p.x > st.x ? 'right' : 'left'] = true; }   // too late: clear off
        return;
      }
      if (boss.state === 'windup' && boss.t > 0.45 && inLane(boss, p, 12) && Math.abs(boss.x - p.x) < 72 && p.h <= 0 && botT <= 0) { pressed.jump = true; botT = 0.5; return; }
    }
    if (p.mounted && ride && ride.on && p.h <= 0 && botT <= 0) {                // the trail: jump fences, and rocks in the lane
      const o = obstacles.find(o2 => !o2.hit && o2.x > p.x && o2.x - p.x < 46 && (o2.kind === 'fence' || inLane(o2, p, 12)));
      if (o) { pressed.jump = true; botT = 0.3; return; }
    }
    if (boss && boss.type === 'jack' && boss.lasso) {                              // the rope coming: out of its lane
      keys[p.z > boss.lasso.z ? 'down' : 'up'] = Math.abs(p.z - boss.lasso.z) < 16; return;
    }
    if (boss && boss.type === 'gila' && ['leap', 'hang', 'drop'].includes(boss.state)) {   // his shadow: get out from under it
      keys[p.z > boss.z ? 'down' : 'up'] = Math.abs(p.z - boss.z) < 16;
      keys[p.x > boss.x ? 'right' : 'left'] = Math.abs(p.x - boss.x) < 30;
      return;
    }
    if (boss && boss.type === 'gila' && boss.table && !boss.table.sliding) {   // behind his table: side kick it into him
      const t = boss.table, side = Math.sign(t.x - boss.x) || 1, tx = t.x + side * 24;
      if (Math.abs(p.z - t.z) > 3) keys[p.z > t.z ? 'up' : 'down'] = true;
      if (Math.abs(p.x - tx) > 5) keys[p.x > tx ? 'left' : 'right'] = true;
      else if (botT <= 0 && Math.abs(p.z - t.z) < 8) { p.face = -side; pressed.side = true; botT = 0.5; }
      return;
    }
    if (boss && (boss.state === 'under' || boss.state === 'rumble')) {   // get away from the mound
      keys[p.x > boss.mx ? 'right' : 'left'] = true; keys[p.z > boss.mz ? 'down' : 'up'] = true; return;
    }
    const live = allFoes().filter(e => hittable(e) || e.state === 'enter');
    const it = items.find(i => i.type !== 'beans' && Math.abs(i.x - p.x) < 120 && i.x > camX + 12);   // (not one the camera's left behind)
    if (it && !p.weapon && !live.some(e => Math.abs(e.x - p.x) < 50)) {
      keys[it.x > p.x ? 'right' : 'left'] = Math.abs(it.x - p.x) > 6; keys[it.z > p.z ? 'down' : 'up'] = Math.abs(it.z - p.z) > 4;
      if (Math.abs(it.x - p.x) < 10 && Math.abs(it.z - p.z) < 8 && botT <= 0) { pressed.snap = true; botT = 0.3; }
      return;
    }
    const atDoor = live.filter(q => q.state === 'batter');          // the siege: the ones at the doors first
    const e = (atDoor.length && !live.some(q => Math.abs(q.x - p.x) < 30 && inLane(q, p, 10)) ? atDoor : live).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const br = barrels.find(b => b.alive && b.x > camX && b.x < camX + VW);
    if (!e && br) {
      const tx = br.x - 22; keys[tx > p.x ? 'right' : 'left'] = Math.abs(tx - p.x) > 4; keys[br.z > p.z ? 'down' : 'up'] = Math.abs(br.z - p.z) > 3;
      if (Math.abs(tx - p.x) < 6 && Math.abs(br.z - p.z) < 6 && botT <= 0) { p.face = 1; pressed.snap = true; botT = 0.4; }
      return;
    }
    if (!e) { keys.right = true; return; }
    const dx = e.x - p.x, dz = e.z - p.z, reach = p.weapon && p.weapon.type === 'whip' ? 50 : p.weapon ? 200 : 28;
    if (Math.abs(dz) > 4) keys[dz > 0 ? 'down' : 'up'] = true;
    if (Math.abs(dx) > reach) keys[dx > 0 ? 'right' : 'left'] = true;
    else if (e.state === 'stagger' && !p.weapon && Math.abs(dz) < 8) keys[dx > 0 ? 'right' : 'left'] = true;   // walk into it: the grab
    else if (botT <= 0 && Math.abs(dz) < 8) { p.face = Math.sign(dx) || 1; pressed[Math.random() < 0.3 && !p.weapon ? 'side' : 'snap'] = true; botT = 0.22; }
  }

  function botGaps() {                           // the autopilot hops the gaps between the cars it walks at
    const p = player;
    if (!params.has('bot') || phase !== 'play' || !S.gaps || p.h > 0 || !['idle', 'walk', 'land'].includes(p.state)) return;
    const dir = keys.right ? 1 : keys.left ? -1 : 0;
    if (dir && !gapAt(p.x) && gapAt(p.x + dir * 26)) pressed.jump = true;
  }

  function simulate(dt) {
    runBot(dt); botGaps();
    if (pressed.help) { showHelp = !showHelp; helpAuto = false; }
    flashT -= dt;
    if (S.lightning && phase !== 'intro' && (nextBolt -= dt) <= 0) { bolt(); nextBolt = 7 + Math.random() * 9; }
    if (hitstop > 0) { hitstop -= dt; for (const k in pressed) pressed[k] = false; return; }
    time += dt; phaseT += dt; titleT += dt; comboT -= dt; lastHitT -= dt; shake = Math.max(0, shake - 30 * dt);
    if (helpAuto && S.intro && phase === 'play' && titleT > 3.2 && titleT < 10) showHelp = true;
    if (helpAuto && titleT >= 10 && showHelp) { showHelp = false; helpAuto = false; }
    if (pressed.mute) { musicOff = !musicOff; const n = songName; songName = null; music(musicOff ? null : n); songName = n; }
    if (phase === 'title') { updateTitle(dt); for (const k in pressed) pressed[k] = false; return; }
    if (phase === 'intro') updateIntro(dt);
    else if (phase === 'ending') { updateEnding(dt); for (const k in pressed) pressed[k] = false; return; }
    else if (phase === 'play' && entr) {          // a boss's entrance: no input (he comes to rest), nothing hurts him
      updateEntrance(dt);
      const k0 = Object.assign({}, keys), p0 = Object.assign({}, pressed);
      for (const k in keys) keys[k] = false; for (const k in pressed) pressed[k] = false;
      player.inv = Math.max(player.inv, 0.3); updatePlayer(dt);
      Object.assign(keys, k0); for (const k in p0) pressed[k] = false;
    }
    else if (phase === 'play') updatePlayer(dt);
    else if (phase === 'clear') {
      const p = player; p.t += dt; if (p.state === 'taunt' && p.t >= HERO.taunt.dur) setS('idle'); pickAnim(p);
      if (phaseT > 3.5) { if (S.next) loadStage(S.next, { lives: p.lives, hp: Math.min(MAX_HP, p.hp + 6), weapon: null }); else { phase = 'end'; phaseT = 0; saveHi(); music('title'); } }
    } else if ((phase === 'end' || phase === 'over') && phaseT > 2 && pressed.jump) toTitle();
    if (phase === 'over') {                        // the last life: he topples and lies there
      const p = player; p.t += dt; p.vh -= GRAV * dt; p.h = Math.max(0, p.h + p.vh * dt); p.x += p.vx * dt; p.vx *= Math.pow(0.02, dt);
      if (p.state === 'die' && p.t >= HERO.die.dur) setS('dead');
      if (p.state === 'die' || p.state === 'dead') pickAnim(p);
    }
    if (entr) { updateBoss(dt); updateParts(dt); }   // (the entrance: his gang, their shots, everything else holds)
    else { updateEnemies(dt); updateBoss(dt); updateDoor(dt); updateShocks(dt); updatePebble(dt); updateSkulls(dt); updateShots(dt); updateClods(dt); updateParts(dt); updateSigns(dt); updateRide(dt); updateTunnel(dt); updateSticks(dt); }
    if (phase === 'play' && !death && !entr) updateWaves(dt);
    if (phase === 'play' && score >= nextHat) { nextHat += HAT_EVERY; gainHat(player.x, player.z); }   // a hat every 30,000 points
    const DK = S.dark || DARK;
    if (S.dusk) dark += (DK[Math.min(waveI, DK.length - 1)] - dark) * Math.min(1, dt * 0.6);
    // ambience: a tumbleweed now and then; on Main Street, dust motes in the low sun
    if (!S.intro && !S.train && !tumble && (tumbleT -= dt) <= 0) tumble = { x: camX - 20, z: Math.random() * ZMAX, h: 0, vh: 0, vx: 55 + Math.random() * 40 };
    if (tumble) {
      tumble.x += tumble.vx * dt; tumble.vh -= GRAV * 0.5 * dt; tumble.h += tumble.vh * dt;
      if (tumble.h <= 0) { tumble.h = 0; tumble.vh = 90 + Math.random() * 70; }
      if (tumble.x > camX + VW + 30) { tumble = null; tumbleT = 6 + Math.random() * 8; }
    }
    if (S.dusk && Math.random() < dt * 2.5) parts.push({ k: 'mote', x: camX + Math.random() * VW, z: Math.random() * ZMAX, h: 20 + Math.random() * 90, vx: 8 + Math.random() * 10, vh: -3, life: 4, max: 4 });
    if (ride && ride.on) {                         // the ride: the trail rolls by (under him first, then the camera goes)
      if (!death && phase === 'play') ride.d += RIDE_V * dt;
      camX = Math.max(0, Math.min(S.ride.end, ride.d - S.ride.tread));
    }
    else {
      const target = lock !== null ? lock : Math.max(camX, Math.min(W - VW, player.x - VW * 0.45));
      camX += (target - camX) * Math.min(1, dt * 5);
    }
    if (lock !== null && Math.abs(camX - lock) < 0.5) camX = lock;
    for (const k in pressed) pressed[k] = false;
  }

  if (params.has('bot') || params.has('dbg')) T.dbgP = () => player;
  if (params.has('bot') || params.has('dbg')) T.dbgSet = o => { if ('lock' in o) lock = o.lock; if ('camX' in o) camX = o.camX; if ('bossHp' in o && boss) boss.hp = o.bossHp; if ('doorHp' in o && door) door.hp = o.doorHp; if ('score' in o) score = o.score; };
  if (params.has('bot') || params.has('dbg')) T.dbg = () => ({ stage: S.name, zmax: ZMAX, tally, phase, camX, waveI, lock, score, time, tunnel: tunnel && { st: tunnel.st, x: tunnel.x }, tdark, door: door && door.hp, ending: ending && ending.step, duel: boss && boss.res, spr: stats.records, drop: stats.dropped, boss: boss && { type: boss.type, state: boss.state, hp: boss.hp, x: Math.round(boss.x) }, sticks: sticks.length,
    p: { x: player.x, z: player.z, h: player.h, hp: player.hp, lives: player.lives, state: player.state },
    enemies: enemies.map(e => ({ type: e.type, state: e.state, x: Math.round(e.x), h: Math.round(e.h), fell: !!e.fell })) });   // (the test harness reads it)
  loadStage(STAGES[params.get('stage')] ? params.get('stage') : 'boothill');
  if (!params.has('stage') && !params.has('nointro') && !params.has('bot') && !params.has('god')) toTitle();
  if (params.has('ending')) { startEnding(); if (params.get('ending') === 'shop') { ending.step = 'shop'; music(null); } }   // ?ending (=shop): the ending (its last scene)
  if (params.has('wave') && S.waves[+params.get('wave')]) {   // ?wave=N: start at the stage's wave N (the boss, say)
    waveI = +params.get('wave'); camX = Math.min(W - VW, S.waves[waveI].cam); player.x = camX + 80; titleT = 9;
  }
  const STEP = 1 / 120;
  if (params.has('ff')) for (let i = 0; i < parseFloat(params.get('ff')) / STEP; i++) simulate(STEP);
  shake = 0;
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    pollPad();
    acc += dt;
    while (acc >= STEP) { acc -= STEP; simulate(STEP); }
    buildDL(); render();
    requestAnimationFrame(frame);
  }
  buildDL(); render();
  requestAnimationFrame(frame);
};
})();
