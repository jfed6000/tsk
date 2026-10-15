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
  const VW = 320, VH = 240, FLOOR = 150, ZMAX = 80, MAX_SPRITES = 128;
  const WALK_X = 105, WALK_Z = 62, JUMP_V = 360, GRAV = 1150, LANE = 12;
  const MAX_HP = 16, BOSS_HP = 36;
  const PAL = T.PAL;

  // ---------------------------------------------------------------- shared art
  const HAT = T.buildHat();
  const H = T.HERO, CB = T.BOSS, E = T.ENEMY;
  const SKEL = T.buildSkeleton();
  const MANGY = T.buildCoyote('mangy');
  const PROPS = T.buildProps();
  const TUMBLE = T.buildTumbleweed();
  const PICK = T.buildPick();

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
      name: 'BOOT HILL', sub: 'MIDNIGHT', W: 1920, gang: COYOTE, lightning: true, intro: true, next: 'mainstreet',
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
      name: 'MAIN STREET', sub: 'DUSK', W: 2400, gang: MANGY, dusk: true, next: null,
      art: () => T.buildMainStreet(VW, VH, FLOOR),
      waves: [
        { cam: 0, gang: ['coyote', 'coyote', 'dillo'] },
        { cam: 380, gang: ['coyote', 'skel', 'coyote', 'dillo'] },
        { cam: 780, gang: ['skel', 'coyote', 'skel', 'dillo'] },
        { cam: 1200, gang: ['coyote', 'skel', 'coyote', 'skel'] },
        { cam: 1660, gang: ['skel', 'coyote', 'skel', 'coyote', 'coyote', 'skel'] },
      ],
      barrels: [[250, 20, 'beans'], [560, 60, 'whip'], [960, 10, 'beans'], [1330, 50, 'gun'], [1520, 15, 'whip'], [1800, 66, 'gun'], [1900, 20, 'beans']],
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
  const SONGS = { title: true, boothill: true, clear: false, over: false, boogie: true };     // name: loops
  let song = null, songName = null, musicOff = false;
  function music(name) {
    if (name === songName) return;
    if (song) { song.pause(); song = null; }
    songName = name;
    if (!name || musicOff) return;
    song = new Audio('music/' + name + '.mp3');
    song.loop = SONGS[name]; song.volume = 0.6;
    song.play().catch(() => {});                 // (no sound until a key's been pressed: the browser's rule)
  }
  let hiScore = 0;
  try { hiScore = +localStorage.getItem('tsk-hi') || 0; } catch (e) {}
  function saveHi() { if (score > hiScore && !params.has('bot')) { hiScore = score; try { localStorage.setItem('tsk-hi', hiScore); } catch (e) {} } }

  function resetPlayer(keep) {
    player = Object.assign({ x: 70, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: 1, state: 'idle', t: 1, hp: MAX_HP, lives: 3, inv: 0,
      weapon: params.get('weapon') ? { type: params.get('weapon'), ammo: params.get('weapon') === 'gun' ? 6 : 14 } : null,
      held: null, step: 0, queued: false, hitSet: new Set(), knees: 0, anim: 'idle', frame: 0, chainT: 0 }, keep || {});
  }

  // ---------------------------------------------------------------- the title screen (f256/src/title.a)
  let titleDir = 1;
  function toTitle() {
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
    if (pressed.jump) { loadStage('boothill'); }
  }

  function loadStage(name, keep) {
    S = STAGES[name]; W = S.W;
    ART = artCache[name] || (artCache[name] = S.art());
    enemies = []; items = []; bullets = []; ebullets = []; clods = []; skulls = []; parts = []; popups = []; boss = null; tumble = null;
    barrels = S.barrels.map(([x, z, item]) => ({ x, z, item, alive: true }));
    camX = 0; lock = null; waveI = 0; goT = 0; dark = 0; titleT = 0; lastHit = null;
    resetPlayer(keep);
    phase = S.intro && !params.has('nointro') && !keep ? 'intro' : 'play'; phaseT = 0;
    intro.hatOn = false;
    if (phase === 'intro') { player.x = 96; player.z = 34; }
    music(name === 'boothill' ? 'boothill' : 'title');
  }

  // ---------------------------------------------------------------- spawning
  function spawn(type, side, i) {
    const rising = type === 'skel@';
    if (rising) type = 'skel';
    const x = rising ? camX + 50 + Math.random() * (VW - 100) : side > 0 ? camX + VW + 24 + i * 18 : camX - 24 - i * 18;
    const e = {
      type, x, z: 8 + Math.random() * (ZMAX - 16), h: 0, vx: 0, vz: 0, vh: 0, face: -side, state: rising ? 'rise' : 'enter', t: 0,
      flash: 0, cd: 0.6 + Math.random() * 1.4, slot: side, anim: Math.random() * 3,
      name: type === 'coyote' ? NAMES[(Math.random() * NAMES.length) | 0] : type === 'skel' ? DEAD_NAMES[(Math.random() * DEAD_NAMES.length) | 0] : 'DILLO',
      hp: { coyote: 9, dillo: 4, skel: 7 }[type], ammo: 6, skull: true,
    };
    e.max = e.hp;
    if (rising) { e.face = Math.sign(player.x - e.x) || 1; dirt(e.x, e.z, 8); sfx('dig'); }
    enemies.push(e);
    return e;
  }
  function startWave() {
    const w = S.waves[waveI];
    lock = w.cam;
    if (w.boss) { startBoss(); return; }
    w.gang.forEach((type, i) => spawn(type, i % 2 ? -1 : 1, i >> 1));
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
  const eHeight = e => ({ coyote: 44, dillo: 16, skel: 46, twobit: 44 }[e.type]);
  const inLane = (a, b, tol = LANE) => Math.abs(a.z - b.z) < tol;
  function heroHitBox() {
    const p = player, a = HERO[p.anim], hb = a.hits && a.hits[p.frame];
    if (!hb) return null;
    const [hx, hy, hw, hh] = hb;
    const x0 = p.face > 0 ? p.x + hx : p.x - hx - hw;
    return { x0, x1: x0 + hw, h0: p.h - hy - hh, h1: p.h - hy };
  }
  const hits = (b, e) => b.x0 < e.x + 11 && b.x1 > e.x - 11 && b.h0 < e.h + eHeight(e) && b.h1 > e.h;
  const hittable = e => !['down', 'getup', 'ko', 'held', 'enter', 'rise', 'under', 'rumble', 'dig', 'intro'].includes(e.state) && !(e.state === 'air' && e.thrown);
  const allFoes = () => (boss ? enemies.concat([boss]) : enemies);

  // light hits stagger; knockdowns launch; out of health = kicked into the next county (or back to the grave)
  function hitE(e, dmg, knock, dir = player.face) {
    if (e.type === 'twobit') return hitBoss(dmg, dir);
    e.hp -= dmg; e.flash = 0.1; lastHit = e; lastHitT = 2.2;
    spark(e.x - dir * 6, e.z, e.h + eHeight(e) * 0.6, dmg >= 2);
    if (e.hp <= 0) return koE(e, dir);
    if (e.type === 'skel' && knock && e.skull && Math.random() < 0.5) {      // the skull comes clean off
      e.skull = false; e.state = 'headless'; e.t = 0; e.vx = dir * 40;
      skulls.push({ x: e.x, z: e.z, h: 44, vx: dir * 110, vh: 200, state: 'fly', owner: e, anim: 0 });
      sfx('hit'); hitstop = 0.07; shake = Math.max(shake, 3);
      popup(e.x, FLOOR + e.z - 58, 'HEADS UP!', '#ffd34a', 1);
      addScore(60, e.x, FLOOR + e.z - 46);
      return;
    }
    if (knock) {
      e.state = 'air'; e.thrown = false; e.vx = dir * 150; e.vh = 220; e.t = 0;
      sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3); addScore(30, e.x, FLOOR + e.z - eHeight(e));
    } else {
      if (e.state !== 'headless') { e.state = 'stagger'; e.t = 0; }
      e.vx = dir * 70;
      sfx('hit'); hitstop = 0.04; shake = Math.max(shake, 1.5); addScore(10, e.x, FLOOR + e.z - eHeight(e));
    }
  }
  function koE(e, dir) {
    e.state = 'ko'; e.vx = dir * 240; e.vh = 330; e.t = 0;
    sfx('ko'); hitstop = 0.08; shake = Math.max(shake, 4);
    const y = FLOOR + e.z - eHeight(e);
    addScore({ coyote: 300, dillo: 150, skel: 350 }[e.type], e.x, y);
    if (e.type === 'skel') {
      shatter(e); popup(e.x, y - 16, BONE_WORDS[(Math.random() * BONE_WORDS.length) | 0]);
      if (Math.random() < 0.35) items.push({ type: 'gun', x: e.x, z: e.z, h: 20, vh: 140, ammo: 2 + ((Math.random() * 5) | 0) });
      for (const s of skulls) if (s.owner === e) s.owner = null;
    } else popup(e.x, y - 16, KO_WORDS[(Math.random() * KO_WORDS.length) | 0]);
    if (player.held === e) player.held = null;
  }

  function hurtPlayer(from, dmg) {
    const p = player;
    if (p.inv > 0 || phase !== 'play' || params.has('god')) return false;
    if (p.held) { p.held.state = 'stagger'; p.held.t = 0; p.held = null; }
    p.hp -= dmg; p.inv = 0.9; p.state = 'hurt'; p.t = 0; p.vx = -(Math.sign(from.x - p.x) || p.face) * 120; p.vz = 0; p.vh = 0;
    sfx('hurt'); shake = Math.max(shake, 3);
    if (p.weapon && p.weapon.type === 'whip') dropWeapon();
    if (p.hp <= 0) {
      p.lives--;
      if (p.lives <= 0) { phase = 'over'; phaseT = 0; saveHi(); music('over'); popup(p.x, FLOOR + p.z - 60, 'GAME OVER', '#ff6b4a', 2, 9); return true; }
      p.hp = MAX_HP; p.inv = 2.2; p.weapon = null;
      popup(p.x, FLOOR + p.z - 56, 'DAGNABBIT!', '#ff6b4a', 2, 1.4);
      for (const e of enemies) if (hittable(e) && Math.abs(e.x - p.x) < 120) { e.state = 'air'; e.vx = Math.sign(e.x - p.x || 1) * 160; e.vh = 200; e.t = 0; }
      ebullets = []; clods = [];
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
    return items.find(it => it.type !== 'beans' && it.h <= 0 && Math.abs(it.x - p.x) < 16 && Math.abs(it.z - p.z) < 10);
  }
  function grabTarget(dir) {
    const p = player;
    return enemies.find(e => (e.state === 'stagger' || e.state === 'approach' || e.state === 'headless') && inLane(e, p, 9) && Math.sign(e.x - p.x) === dir && Math.abs(e.x - p.x) < 24 && e.h <= 0);
  }

  function updatePlayer(dt) {
    const p = player;
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    p.t += dt; p.inv -= dt; p.chainT -= dt;
    const free = p.state === 'idle' || p.state === 'walk' || (p.state === 'land' && p.t > 0.08);
    if (free) {
      const back = dx !== 0 && dx !== p.face;              // pressing away from where he faces
      p.vx = dx * WALK_X; p.vz = dz * WALK_Z; if (dx) p.face = dx;
      const it = underfoot();
      if (pressed.jump) { setS('jump'); p.vh = JUMP_V; p.vz *= 0.5; sfx('jump'); }
      else if (pressed.snap && it) {                                  // X over a weapon picks it up
        items.splice(items.indexOf(it), 1);
        p.weapon = { type: it.type, ammo: it.type === 'gun' ? (it.ammo ?? 6) : (it.ammo ?? 14) };
        sfx('tip'); popup(p.x, FLOOR + p.z - 54, it.type === 'gun' ? 'SIX-SHOOTER!' : 'BULLWHIP!', '#ffd34a', 1, 1.2);
      } else if ((pressed.snap && back) || pressed.side) { setS('side'); sfx('whoosh'); }   // back + kick: turn into the side kick (C: shortcut)
      else if (pressed.snap && p.weapon && p.weapon.type === 'whip') { setS('whip'); sfx('whoosh'); }
      else if (pressed.snap && p.weapon && p.weapon.type === 'gun') { setS('shoot'); fire(); }
      else if (pressed.snap) { p.step = p.chainT > 0 && p.step < 3 ? p.step + 1 : 1; setS('snap'); sfx('whoosh'); }
      else if (pressed.taunt) { setS('taunt'); sfx('tip'); }
      else if (dx && grabTarget(dx)) { p.held = grabTarget(dx); p.held.state = 'held'; setS('grab'); p.knees = 0; sfx('land'); }
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
      case 'hurt':                                   // knocked back; hit in the air, he falls (he used to hang there)
        p.vx *= Math.pow(0.02, dt);
        if (p.h > 0 || p.vh) { p.vh -= GRAV * dt; p.h += p.vh * dt; if (p.h <= 0) { p.h = 0; p.vh = 0; } }
        if (p.t > 0.4) setS('idle');
        break;
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    p.z = Math.max(0, Math.min(ZMAX, p.z));
    const lo = (lock ?? camX) + 10, hi = lock !== null ? lock + VW - 10 : W - 10;
    p.x = Math.max(lo, Math.min(hi, p.x));
    if (!['knee', 'grab', 'throw'].includes(p.state)) resolveHeroAttacks();
    for (const it of items) if (it.type === 'beans' && it.h <= 0 && Math.abs(it.x - p.x) < 14 && Math.abs(it.z - p.z) < 10) {
      it.gone = true; p.hp = Math.min(MAX_HP, p.hp + 7); sfx('check'); popup(it.x, FLOOR + it.z - 30, 'BEANS!', '#ffd34a', 1);
    }
    items = items.filter(it => !it.gone);
    pickAnim(p);
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

  function breakBarrel(b) {
    b.alive = false; sfx('break'); hitstop = 0.04; shake = Math.max(shake, 2);
    for (let i = 0; i < 10; i++) parts.push({ k: 'chunk', img: FX.chunk[(Math.random() * FX.chunk.length) | 0], x: b.x, z: b.z, h: 10 + Math.random() * 14,
      vx: (Math.random() - 0.5) * 200, vh: 100 + Math.random() * 180, life: 1, max: 1 });
    if (b.item) items.push({ type: b.item, x: b.x, z: b.z, h: 10, vh: 160 });
    addScore(50, b.x, FLOOR + b.z - 24);
  }

  function pickAnim(p) {
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
      const coy = e.type === 'coyote', skel = e.type === 'skel';
      switch (e.state) {
        case 'enter':
          e.vx = -e.slot * 60; e.face = -e.slot;
          if (e.x > camX + 20 && e.x < camX + VW - 20) e.state = 'approach';
          break;
        case 'rise': e.vx = e.vz = 0; if (e.t > 0.9) { e.state = 'approach'; e.cd = 0.8; } break;
        case 'approach': {
          const side = Math.sign(e.x - p.x) || e.slot, busy = attackers >= 2;
          const tx = p.x + side * (skel ? 100 : busy ? 80 : coy ? 36 : 28), tz = p.z;
          const sp = skel ? 46 : coy ? 58 : 72;
          e.vx = Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x) * 4, sp);
          e.vz = Math.sign(tz - e.z) * Math.min(Math.abs(tz - e.z) * 4, 42);
          e.face = Math.sign(p.x - e.x) || e.face;
          if (phase !== 'play') break;
          if (skel) { if (e.cd <= 0 && Math.abs(tz - e.z) < 5 && Math.abs(tx - e.x) < 40) { e.state = 'aim'; e.t = 0; e.vx = e.vz = 0; sfx('shell'); } }
          else if (!busy && e.cd <= 0 && Math.abs(tx - e.x) < 8 && Math.abs(tz - e.z) < 5) { e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; }
          break;
        }
        case 'aim':
          e.vx = e.vz = 0; e.face = Math.sign(p.x - e.x) || e.face;
          if (e.t > 0.55) { e.state = 'shoot'; e.t = 0; ebullets.push({ x: e.x + e.face * 22, z: e.z, h: 28, vx: e.face * 230 }); sfx('break'); e.ammo--; }
          break;
        case 'shoot': if (e.t > 0.35) { if (e.ammo <= 0) { e.state = 'reload'; e.t = 0; } else { e.state = 'approach'; e.cd = 0.8 + Math.random(); } } break;
        case 'reload': e.vx = e.vz = 0; if (e.t > 1.5) { e.ammo = 6; e.state = 'approach'; e.cd = 0.3; } break;
        case 'windup': e.vx = e.vz = 0; if (e.t > (coy ? 0.42 : 0.3)) { e.state = 'strike'; e.t = 0; e.hitDone = false; sfx('whoosh'); } break;
        case 'strike':
          if (coy) {
            e.vx = 0;
            if (!e.hitDone && e.t < 0.2 && inLane(e, p, 10) && p.h < 24 && Math.sign(p.x - e.x) === e.face && Math.abs(p.x - e.x) < 44) { e.hitDone = true; hurtPlayer(e, 2); }
            if (e.t > 0.25) { e.state = 'recover'; e.t = 0; }
          } else {                                 // the dillo curls up and rolls at you
            e.vx = e.face * 190; e.vz = 0;
            if (!e.hitDone && inLane(e, p, 10) && p.h < 14 && Math.abs(p.x - e.x) < 16) { e.hitDone = true; hurtPlayer(e, 1); }
            if (e.t > 0.5) { e.state = 'recover'; e.t = 0; }
          }
          break;
        case 'recover': e.vx *= Math.pow(0.001, dt); e.vz = 0; if (e.t > 0.55) { e.state = 'approach'; e.cd = 0.8 + Math.random() * 1.2; } break;
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
        case 'air':                                // knocked down or thrown: an arc, then flat on the ground
          e.vh -= GRAV * dt; e.h += e.vh * dt;
          if (e.thrown) for (const o of allFoes()) if (o !== e && hittable(o) && inLane(o, e, 14) && Math.abs(o.x - e.x) < 22 && o.h < 30) {
            hitE(o, 3, true, Math.sign(e.vx) || 1); spark(o.x, o.z, 20, true);
          }
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
      if (lock !== null && e.state !== 'enter' && e.state !== 'ko') e.x = Math.max(lock + 6, Math.min(lock + VW - 6, e.x));
    }
    enemies = enemies.filter(e => !(e.state === 'ko' && (e.h < -260 || e.type === 'skel')));
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
  function startBoss() {
    boss = { type: 'twobit', name: 'TWO-BIT', x: lock + 250, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: -1, hp: BOSS_HP, max: BOSS_HP,
      state: 'intro', t: 0, n: 0, flash: 0, mx: 0, mz: 0, said: false, summoned: false, anim: 0 };
    sfx('dig'); dirt(boss.x, boss.z, 10);
  }
  function bSet(s) { boss.state = s; boss.t = 0; }
  function hitBoss(dmg, dir) {
    const b = boss;
    if (b.state === 'daze') dmg = Math.ceil(dmg * 1.5);
    b.hp -= dmg; b.flash = 0.12; lastHit = b; lastHitT = 99;
    spark(b.x - dir * 6, b.z, 28, true); sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3); score += dmg * 50;
    if (b.hp <= 0) {
      b.hp = 0; bSet('ko'); b.vx = dir * 180; b.vh = 420; b.face = -dir;
      sfx('ko'); hitstop = 0.18; shake = 9; score += 5000; clods = []; ebullets = [];
      popup(b.x, FLOOR + b.z - 70, 'YEEHAW!', '#ffd34a', 3, 1.6);
      for (const e of enemies) if (e.state !== 'ko') { e.hp = 0; koE(e, Math.sign(e.x - b.x) || 1); }
      return;
    }
    if (['approach', 'recover', 'throw'].includes(b.state)) { bSet('stagger'); b.vx = dir * 70; }
    if (!b.summoned && b.hp < BOSS_HP / 2) {                         // he calls up the dead
      b.summoned = true; popup(b.x, FLOOR + b.z - 66, 'RISE, BOYS!', '#ff9d3c', 1, 1.6);
      spawn('skel@', 1, 0); spawn('skel@', -1, 0);
    }
  }
  function updateBoss(dt) {
    const b = boss, p = player;
    if (!b) return;
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
      if (Math.abs(b.x - p.x) < 9 && inLane(b, p, 8) && b.h > p.h && b.h < p.h + 40 && hurtPlayer(b, 2)) b.dead = true;
      if (b.x < camX - 20 || b.x > camX + VW + 20) b.dead = true;
    }
    ebullets = ebullets.filter(b => !b.dead);
    for (const it of items) if (it.h > 0 || it.vh > 0) { it.vh -= GRAV * dt; it.h = Math.max(0, it.h + it.vh * dt); if (it.h === 0) it.vh = 0; }
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
  function updateWaves(dt) {
    if (lock !== null && !boss && !enemies.some(e => e.state !== 'ko')) {
      lock = null; waveI++; goT = 3; sfx('check');
      if (waveI >= S.waves.length) stageClear();
    }
    goT -= dt;
    if (lock === null && waveI < S.waves.length && phase === 'play' && camX >= S.waves[waveI].cam - 1) startWave();
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
      ['X ON A WEAPON', 'PICK IT UP'], ['', 'KICK BULLETS, KICK SKULLS'], ['H', 'HIDE THIS']];
    const w = 236, h = 20 + lines.length * 9, c = T.canvas(w, h), x = c.getContext('2d');
    x.fillStyle = PAL.out; x.fillRect(0, 0, w, h);
    x.fillStyle = PAL.n2; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
    T.drawText(x, 'HOW TO KICK', w / 2, 5, '#ff9d3c', 1, null, 'center');
    lines.forEach(([k, v], i) => { T.drawText(x, k, 8, 16 + i * 9, '#ffd34a', 1, null); T.drawText(x, v, 80, 16 + i * 9, '#fff3c4', 1, null); });
    return (helpImg = T.pixelize(c, { a: PAL.out, b: PAL.n2, c: '#ff9d3c', d: '#ffd34a', e: '#fff3c4' }, null, T.CLUT.spr));
  }

  function enemyImg(e) {
    if (e.type === 'coyote') {
      const C = S.gang;
      return { enter: C.walk[(e.anim * 8 | 0) % 4], approach: (e.vx || e.vz) ? C.walk[(e.anim * 8 | 0) % 4] : C.idle[(e.anim * 2 | 0) % 2],
        windup: C.windup, strike: C.swing, recover: C.idle[0], stagger: C.hurt, held: C.hurt, air: C.hurt, down: C.down,
        getup: C.daze[(e.anim * 8 | 0) % 4], ko: C.ko }[e.state];
    }
    if (e.type === 'skel') {
      const K = SKEL, moving = Math.abs(e.vx) + Math.abs(e.vz) > 4;
      if (!e.skull && !['down', 'getup', 'air'].includes(e.state)) return K.headless[(e.anim * 5 | 0) % 2];
      return { enter: K.walk[(e.anim * 7 | 0) % 4], approach: moving ? K.walk[(e.anim * 7 | 0) % 4] : K.idle[(e.anim * 2 | 0) % 2],
        aim: K.aim, shoot: e.t < 0.1 ? K.shoot : K.aim, reload: K.reload[(e.anim * 6 | 0) % 2], stagger: K.hurt, held: K.hurt, air: K.hurt,
        down: K.heap, getup: K.rise[Math.min(4, (e.t / 0.6 * 5) | 0)], rise: K.rise[Math.min(4, (e.t / 0.9 * 5) | 0)] }[e.state] || K.idle[0];
    }
    return ['strike', 'air', 'ko', 'down'].includes(e.state) ? DILLO.ball[(e.anim * 24 | 0) % 8] : e.state === 'windup' ? DILLO.ball[0]
      : e.state === 'held' || e.state === 'stagger' ? DILLO.walk[0] : DILLO.walk[(e.anim * 8 | 0) % 4];
  }
  function bossImg(b) {
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
      center(T.textSprite('TEXAS', '#ffe7b0', 4), 26); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 54);
      center(T.textSprite('HE DIED WITH HIS BOOTS ON', '#e8a070', 1), 92); center(T.textSprite('NOW THE BOOTS WANT REVENGE', '#e8a070', 1), 102);
      if (Math.floor(phaseT * 2) % 2 === 0) center(T.textSprite('PRESS JUMP', '#ffd34a', 2), 204);
    } else if (phase !== 'intro') {
      put(T.bossBar('SHITKICKERS', Math.max(0, p.hp), MAX_HP), 6, 6, 0, 0, 0);
      for (let i = 0; i < p.lives; i++) put(HAT, 108 + i * 24, 6, 0, 0, 0);
      put(T.textSprite('SCORE ' + String(score).padStart(7, '0'), '#fff3c4', 1), 6, 26, 0, 0, 0);
      if (p.weapon) {
        if (p.weapon.type === 'gun') for (let i = 0; i < p.weapon.ammo; i++) put(PICK.bulletIcon, 10 + i * 6, 38, 4, 4, 0);
        else put(T.textSprite('WHIP ' + p.weapon.ammo, '#ffd34a', 1), 6, 35, 0, 0, 0);
      }
      if (lastHit && lastHitT > 0 && lastHit.state !== 'ko') { const b = T.bossBar(lastHit.name, Math.max(0, lastHit.hp), lastHit.max); put(b, VW - 6 - b.width, 6, 0, 0, 0); }
      else if (boss) { const b = T.bossBar(boss.name, Math.max(0, boss.hp), boss.max); put(b, VW - 6 - b.width, 6, 0, 0, 0); }
      if (comboT > 0 && combo > 1) { const t = T.textSprite(combo + ' HIT COMBO!', '#ffd34a', 1); put(t, VW - 6 - t.width, 26, 0, 0, 0); }
      if (goT > 0 && lock === null && phase === 'play' && Math.floor(goT * 4) % 2) put(T.textSprite('GO >>', '#ffd34a', 3), VW - 70, 70, 0, 0, 0);
      if (titleT < 3.2 && phase === 'play') {
        if (S.intro) { center(T.textSprite('TEXAS', '#ffe7b0', 4), 50); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 78); }
        center(T.textSprite(S.name, '#ffd34a', S.intro ? 2 : 3), S.intro ? 114 : 66); center(T.textSprite(S.sub, '#e8a070', 1), S.intro ? 132 : 88);
      }
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
    } else if (!(p.inv > 0 && Math.floor(p.inv * 18) % 2) && phase !== 'over') put(HERO[p.anim].frames[p.frame], wx(p.x), sy(p.z, p.h), H.OX, H.OY, depth(p.z) - 0.001, p.face);
    if (phase !== 'intro' || phaseT >= IN.rise) put(PICK.shadow, wx(p.x), sy(p.z, 0), 16, 4, 9);
    if (S.intro) {                               // Ringo's headstone, and the grave he came out of
      put(PROPS.headstone, wx(STONE.x), sy(STONE.z, 0), PROPS.headstone.ox, PROPS.headstone.oy, depth(STONE.z));
      put(phase === 'intro' && phaseT < IN.rise ? PROPS.mound : PROPS.hole, wx(96), sy(34, 0), 20, 11, 8.9);
    }
    for (const e of enemies) {
      if (e.type === 'skel' && e.state === 'ko') continue;
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
        if (b.state !== 'ko') put(PICK.shadow, wx(b.x), sy(b.z, 0), 16, 4, 9);
      }
    }
    for (const s of skulls) { put(SKEL.skull[s.state === 'ground' ? 0 : (s.anim * 12 | 0) % 4], wx(s.x), sy(s.z, s.h + 6), 8, 8, depth(s.z)); put(PICK.shadowS, wx(s.x), sy(s.z, 0), 12, 4, 9); }
    for (const b of barrels) if (b.alive) { put(BARREL, wx(b.x), sy(b.z, 0), T.BARREL.OX, T.BARREL.OY, depth(b.z)); put(PICK.shadowS, wx(b.x), sy(b.z, 0), 12, 4, 9); }
    for (const it of items) { put(PICK[it.type], wx(it.x), sy(it.z, it.h), 12, 12, depth(it.z) + 0.002); if (Math.floor(time * 4) % 2 && it.type !== 'beans') put(T.textSprite('X', '#ffd34a', 1), wx(it.x), sy(it.z, it.h) - 18, 1, 0, 1); }
    if (tumble) { put(TUMBLE[(time * 10 | 0) % 4], wx(tumble.x), sy(tumble.z, tumble.h), 12, 22, depth(tumble.z)); put(PICK.shadowS, wx(tumble.x), sy(tumble.z, 0), 12, 4, 9); }
    for (const b of bullets) put(PICK.bullet, wx(b.x), sy(b.z, b.h), 4, 4, depth(b.z) - 0.002, Math.sign(b.vx));
    for (const b of ebullets) { put(SKEL.bullet, wx(b.x), sy(b.z, b.h), 4, 4, depth(b.z) - 0.002, Math.sign(b.vx)); put(PICK.shadowS, wx(b.x), sy(b.z, 0), 12, 4, 9); }
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
  }

  function render() {
    const sx = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0, syy = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
    const cx = Math.round(camX), lit = flashT > 0;
    // three tile maps: far sky, middle, and the street that scrolls with the floor. Dusk and lightning are CLUT tricks.
    const layer = (img, scroll) => {
      const src = lit && img.idx ? T.flashOf(img) : S.dusk ? T.shadeOf(img, dark) : img, off = -(Math.floor(scroll) % img.width);
      for (let x = off; x < VW; x += img.width) ctx.drawImage(src, x + sx, syy);
    };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    layer(ART.far, cx * 0.25); layer(ART.mid, cx * 0.5); layer(ART.street, cx);
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
    if (boss && (boss.state === 'under' || boss.state === 'rumble')) {   // get away from the mound
      keys[p.x > boss.mx ? 'right' : 'left'] = true; keys[p.z > boss.mz ? 'down' : 'up'] = true; return;
    }
    const live = allFoes().filter(e => hittable(e) || e.state === 'enter');
    const it = items.find(i => i.type !== 'beans' && Math.abs(i.x - p.x) < 120);
    if (it && !p.weapon && !live.some(e => Math.abs(e.x - p.x) < 50)) {
      keys[it.x > p.x ? 'right' : 'left'] = Math.abs(it.x - p.x) > 6; keys[it.z > p.z ? 'down' : 'up'] = Math.abs(it.z - p.z) > 4;
      if (Math.abs(it.x - p.x) < 10 && Math.abs(it.z - p.z) < 8 && botT <= 0) { pressed.snap = true; botT = 0.3; }
      return;
    }
    const e = live.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
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
    else if (botT <= 0 && Math.abs(dz) < 8) { p.face = Math.sign(dx) || 1; pressed[Math.random() < 0.3 && !p.weapon ? 'side' : 'snap'] = true; botT = 0.22; }
  }

  function simulate(dt) {
    runBot(dt);
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
    else if (phase === 'play') updatePlayer(dt);
    else if (phase === 'clear') {
      const p = player; p.t += dt; if (p.state === 'taunt' && p.t >= HERO.taunt.dur) setS('idle'); pickAnim(p);
      if (phaseT > 3.5) { if (S.next) loadStage(S.next, { lives: p.lives, hp: Math.min(MAX_HP, p.hp + 6), weapon: null }); else { phase = 'end'; phaseT = 0; saveHi(); music('title'); } }
    } else if ((phase === 'end' || phase === 'over') && phaseT > 2 && pressed.jump) toTitle();
    updateEnemies(dt); updateBoss(dt); updateSkulls(dt); updateShots(dt); updateClods(dt); updateParts(dt);
    if (phase === 'play') updateWaves(dt);
    if (S.dusk) dark += (DARK[Math.min(waveI, DARK.length - 1)] - dark) * Math.min(1, dt * 0.6);
    // ambience: a tumbleweed now and then; on Main Street, dust motes in the low sun
    if (!S.intro && !tumble && (tumbleT -= dt) <= 0) tumble = { x: camX - 20, z: Math.random() * ZMAX, h: 0, vh: 0, vx: 55 + Math.random() * 40 };
    if (tumble) {
      tumble.x += tumble.vx * dt; tumble.vh -= GRAV * 0.5 * dt; tumble.h += tumble.vh * dt;
      if (tumble.h <= 0) { tumble.h = 0; tumble.vh = 90 + Math.random() * 70; }
      if (tumble.x > camX + VW + 30) { tumble = null; tumbleT = 6 + Math.random() * 8; }
    }
    if (S.dusk && Math.random() < dt * 2.5) parts.push({ k: 'mote', x: camX + Math.random() * VW, z: Math.random() * ZMAX, h: 20 + Math.random() * 90, vx: 8 + Math.random() * 10, vh: -3, life: 4, max: 4 });
    const target = lock !== null ? lock : Math.max(camX, Math.min(W - VW, player.x - VW * 0.45));
    camX += (target - camX) * Math.min(1, dt * 5);
    if (lock !== null && Math.abs(camX - lock) < 0.5) camX = lock;
    for (const k in pressed) pressed[k] = false;
  }

  loadStage(STAGES[params.get('stage')] ? params.get('stage') : 'boothill');
  if (!params.has('stage') && !params.has('nointro') && !params.has('bot') && !params.has('god')) toTitle();
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
