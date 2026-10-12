// Texas Shitkickers — BRAWLER TEST MODE (?mode=brawler): a Final Fight / Double Dragon style belt-scroller on the
// desert, to compare against the platformer. Self-contained apart from the art, input and sound game.js hands over.
//
//   * a floor band you walk into and out of: every actor has x (along), z (into the screen) and h (height)
//   * screen y = FLOOR + z - h; sprites are depth-sorted every frame (nearer = lower sprite number = on top),
//     and every actor has a shadow so you can read depth in a jump
//   * waves: the screen locks while a gang comes in, then "GO >>"
//   * X: kick combo (the third knocks down), C: heavy side kick, jump then X: flying kick, jump again: stomp
//   * walk into a staggered outlaw to grab him: X knees, C throws him into his friends
//   * pickups from barrels: whip (long reach, wears out), six-shooter (six shots, then he tosses it), beans (health)
(function () {
'use strict';
const T = window.TSK;

T.runBrawler = function (A) {
  const { HERO, DILLO, BARREL, FX, COYOTE, keys, pressed, sfx, pollPad, params } = A;
  const VW = 320, VH = 240, FLOOR = 150, ZMAX = 80, TS = 16, W = 2400, MAX_SPRITES = 128;
  const WALK_X = 105, WALK_Z = 62, JUMP_V = 360, GRAV = 1150, LANE = 12;
  const MAX_HP = 16;
  const PAL = T.PAL;

  // ---------------------------------------------------------------- assets
  // the stage: Main Street at dusk (the darker look; default) or the original desert (?stage=desert)
  const STAGE = params.get('stage') === 'desert' ? 'desert' : 'mainstreet';
  const MS = STAGE === 'mainstreet' ? T.buildMainStreet(VW, VH, FLOOR) : null;
  const TILES = T.buildTiles('desert');
  const LAYERS = MS ? { far: MS.far, mid: MS.mid } : T.buildLayers(VW, VH, FLOOR, 'desert');
  const GANG = MS ? T.buildCoyote('mangy') : COYOTE;              // on Main Street the gang is mangy and yellow-eyed
  const TUMBLE = T.buildTumbleweed();
  const DARK = [0, 0.12, 0.24, 0.36, 0.48, 0.6];                  // night falls a step per wave
  const HAT = T.buildHat();
  const H = T.HERO, CB = T.BOSS, E = T.ENEMY;
  const mk = (w, h, ox, oy, pal, fn, outline = PAL.out) => {
    const c = T.canvas(w, h), x = c.getContext('2d'); x.translate(ox, oy); fn(x);
    const o = T.pixelize(c, pal, outline, T.CLUT.spr); o.ox = ox; o.oy = oy; return o;
  };
  const ell = (x, cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
  const IP = { out: PAL.out, l0: PAL.n0, l1: PAL.n1, l2: PAL.n2, b0: PAL.buckle, b1: PAL.band, w: PAL.white,
    bean0: '#7a3a1a', bean1: '#a8582a', tin0: '#8a5a32', tin1: '#c48c56', plate: '#efe6cc', sh: '#6e3f1e', y0: '#ffd34a', y1: '#fff3c4' };
  const PICK = {
    whip: mk(24, 16, 12, 12, IP, x => {                       // a coiled bullwhip
      for (const [col, lw] of [[PAL.out, 3], [PAL.n2, 1.4]]) { x.strokeStyle = col; x.lineWidth = lw; ell(x, 0, -3, 7, 3.4); x.stroke(); ell(x, -1, -3.4, 4.4, 2); x.stroke(); }
      x.strokeStyle = PAL.n0; x.lineWidth = 2.4; x.beginPath(); x.moveTo(5, -2); x.lineTo(10, 1); x.stroke();
    }),
    gun: mk(24, 16, 12, 12, IP, x => {                        // a brass six-shooter on the ground
      x.fillStyle = PAL.band; x.beginPath(); x.moveTo(-6, -2); x.lineTo(-9, 3); x.lineTo(-5, 3.6); x.lineTo(-3, -1); x.fill();
      x.fillStyle = PAL.buckle; x.fillRect(-4, -4, 5, 4); x.fillRect(1, -3.4, 9, 2.4);
      x.fillStyle = IP.y1; x.fillRect(2, -3.4, 7, 0.8);
    }),
    beans: mk(24, 16, 12, 12, IP, x => {                      // a plate of beans: the Final Fight chicken, Texas style
      ell(x, 0, -1, 10, 3.2); x.fillStyle = IP.plate; x.fill();
      ell(x, 0, -3, 6, 2.6); x.fillStyle = IP.bean1; x.fill();
      x.fillStyle = IP.bean0; for (const [bx, by] of [[-3, -3], [0, -4], [3, -3], [-1, -2], [2, -2]]) x.fillRect(bx, by, 1.4, 1);
    }),
    bullet: mk(8, 8, 4, 4, IP, x => { x.fillStyle = IP.y1; x.fillRect(-4, -0.5, 7, 1.4); x.fillStyle = IP.y0; x.fillRect(1, -1, 2.4, 2.4); }, null),
    shadow: mk(32, 8, 16, 4, { s: IP.sh }, x => { ell(x, 0, 0, 13, 3.4); x.fillStyle = IP.sh; x.fill(); }, null),
    shadowS: mk(24, 8, 12, 4, { s: IP.sh }, x => { ell(x, 0, 0, 8, 2.4); x.fillStyle = IP.sh; x.fill(); }, null),
    bulletIcon: mk(8, 8, 4, 4, IP, x => { x.fillStyle = PAL.buckle; x.fillRect(-1, -3, 2.4, 5); x.fillStyle = IP.y1; x.fillRect(-1, -3, 2.4, 1.4); }),
  };

  // ---------------------------------------------------------------- the street: a floor band of desert tiles
  const MAP_W = W / TS, MAP_H = VH / TS;
  const FRONT = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(null));
  for (let tx = 0; tx < MAP_W; tx++) {
    const v = (tx * 7 + (tx >> 2)) % 4;
    FRONT[9][tx] = TILES['top' + v];
    for (let ty = 10; ty < MAP_H; ty++) FRONT[ty][tx] = TILES['low' + ((v + ty) % 4)];
  }

  // waves: lock the screen at camX, send a gang in from both sides; barrels hold the pickups
  const WAVES = [
    { cam: 0, gang: ['coyote', 'coyote', 'dillo'] },
    { cam: 380, gang: ['coyote', 'coyote', 'coyote', 'dillo'] },
    { cam: 780, gang: ['dillo', 'dillo', 'dillo', 'coyote', 'dillo'] },
    { cam: 1200, gang: ['coyote', 'coyote', 'coyote', 'coyote'] },
    { cam: 1660, gang: ['coyote', 'dillo', 'coyote', 'coyote', 'dillo', 'coyote'] },
  ];
  const BARRELS = [[250, 20, 'beans'], [560, 60, 'whip'], [960, 10, 'beans'], [1330, 50, 'gun'], [1520, 15, 'whip'], [1800, 66, 'gun'], [1900, 20, 'beans']];
  const NAMES = ['DUSTY', 'SCRUFF', 'MANGY', 'HOWLER', 'LOBO', 'SNARL', 'CHIGGER', 'SKUNK'];

  // ---------------------------------------------------------------- state
  let player, enemies = [], items = [], bullets = [], parts = [], popups = [];
  const barrels = BARRELS.map(([x, z, item]) => ({ x, z, item, alive: true }));
  let camX = 0, lock = null, waveI = 0, goT = 0, shake = 0, hitstop = 0, score = 0, combo = 0, comboT = 0, time = 0;
  let phase = 'play', phaseT = 0, showHelp = false, helpAuto = true, lastHit = null, lastHitT = 0;
  let dark = 0, tumble = null, tumbleT = 4;

  function resetPlayer() {
    player = { x: 70, z: 40, h: 0, vx: 0, vz: 0, vh: 0, face: 1, state: 'idle', t: 1, hp: MAX_HP, lives: 3, inv: 0,
      weapon: params.get('weapon') ? { type: params.get('weapon'), ammo: params.get('weapon') === 'gun' ? 6 : 14 } : null, held: null, step: 0, queued: false, hitSet: new Set(), knees: 0, anim: 'idle', frame: 0 };
  }
  resetPlayer();

  function spawn(type, side, i) {
    const x = side > 0 ? camX + VW + 24 + i * 18 : camX - 24 - i * 18;
    const e = { type, name: type === 'coyote' ? NAMES[(Math.random() * NAMES.length) | 0] : 'DILLO', x, z: 8 + Math.random() * (ZMAX - 16),
      h: 0, vx: 0, vz: 0, vh: 0, face: -side, state: 'enter', t: 0, hp: type === 'coyote' ? 9 : 4, flash: 0, cd: 0.6 + Math.random() * 1.4,
      slot: side, anim: Math.random() * 3 };
    e.max = e.hp;
    enemies.push(e);
  }
  function startWave() {
    const w = WAVES[waveI];
    lock = w.cam;
    w.gang.forEach((type, i) => spawn(type, i % 2 ? -1 : 1, i >> 1));
  }

  // ---------------------------------------------------------------- effects
  function puff(x, z, n, h = 0) {
    for (let i = 0; i < n; i++) parts.push({ k: 'dust', x: x + (Math.random() - 0.5) * 12, z, h: h + 2, vx: (Math.random() - 0.5) * 80, vh: Math.random() * 40, life: 0.45, max: 0.45, s: (Math.random() * 3) | 0 });
  }
  function spark(x, z, h, big) {
    parts.push({ k: 'star', x, z, h, life: big ? 0.18 : 0.12, max: big ? 0.18 : 0.12, big });
    for (let i = 0; i < (big ? 6 : 3); i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 140; parts.push({ k: 'bit', x, z, h, vx: Math.cos(a) * v, vh: Math.sin(a) * v, life: 0.22, max: 0.22, c: i % 2 }); }
  }
  function popup(x, y, text, color = '#ffd34a', s = 2, life = 0.9) { popups.push({ x, y, text, color, s, life }); }
  function addScore(n, x, y) {
    combo = comboT > 0 ? combo + 1 : 1; comboT = 1.4;
    const m = Math.min(combo, 8); score += n * m;
    popup(x, y - 12, (n * m) + (m > 1 ? ' X' + m : ''), '#fff3c4', 1);
  }
  const KO_WORDS = ['YEEHAW!', 'KICKED!', 'GIT!', 'BOOTED!', 'WHOOP!', 'SKEDADDLE!'];

  // ---------------------------------------------------------------- hit boxes in (x, height) space, plus a lane check
  const eHeight = e => (e.type === 'coyote' ? 44 : 16);
  const inLane = (a, b, tol = LANE) => Math.abs(a.z - b.z) < tol;
  function heroHitBox() {
    const p = player, a = HERO[p.anim], hb = a.hits && a.hits[p.frame];
    if (!hb) return null;
    const [hx, hy, hw, hh] = hb;
    const x0 = p.face > 0 ? p.x + hx : p.x - hx - hw;
    return { x0, x1: x0 + hw, h0: p.h - hy - hh, h1: p.h - hy };
  }
  const hits = (b, e) => b.x0 < e.x + 11 && b.x1 > e.x - 11 && b.h0 < e.h + eHeight(e) && b.h1 > e.h;
  const hittable = e => !['down', 'getup', 'ko', 'held', 'enter'].includes(e.state) && !(e.state === 'air' && e.thrown);

  // light hits stagger; knockdowns launch; out of health = kicked into the next county
  function hitE(e, dmg, knock, dir = player.face) {
    e.hp -= dmg; e.flash = 0.1; lastHit = e; lastHitT = 2.2;
    spark(e.x - dir * 6, e.z, e.h + eHeight(e) * 0.6, dmg >= 2);
    if (e.hp <= 0) {
      e.state = 'ko'; e.vx = dir * 240; e.vh = 330; e.t = 0;
      sfx('ko'); hitstop = 0.08; shake = Math.max(shake, 4);
      addScore(e.type === 'coyote' ? 300 : 150, e.x, FLOOR + e.z - eHeight(e));
      popup(e.x, FLOOR + e.z - eHeight(e) - 16, KO_WORDS[(Math.random() * KO_WORDS.length) | 0]);
      if (player.held === e) player.held = null;
    } else if (knock) {
      e.state = 'air'; e.thrown = false; e.vx = dir * 150; e.vh = 220; e.t = 0;
      sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3); addScore(30, e.x, FLOOR + e.z - eHeight(e));
    } else {
      e.state = 'stagger'; e.t = 0; e.vx = dir * 70;
      sfx('hit'); hitstop = 0.04; shake = Math.max(shake, 1.5); addScore(10, e.x, FLOOR + e.z - eHeight(e));
    }
  }

  function hurtPlayer(from, dmg) {
    const p = player;
    if (p.inv > 0 || phase !== 'play' || params.has('god')) return;
    if (p.held) { p.held.state = 'stagger'; p.held.t = 0; p.held = null; }
    p.hp -= dmg; p.inv = 0.9; p.state = 'hurt'; p.t = 0; p.vx = -(Math.sign(from.x - p.x) || p.face) * 120; p.vz = 0;
    sfx('hurt'); shake = Math.max(shake, 3);
    if (p.weapon && p.weapon.type === 'whip') dropWeapon();             // you drop the whip when you're hit
    if (p.hp <= 0) {
      p.lives--;
      if (p.lives <= 0) { phase = 'over'; phaseT = 0; popup(p.x, FLOOR + p.z - 60, 'GAME OVER', '#ff6b4a', 2, 9); return; }
      p.hp = MAX_HP; p.inv = 2.2; p.weapon = null;
      popup(p.x, FLOOR + p.z - 56, 'DAGNABBIT!', '#ff6b4a', 2, 1.4);
      for (const e of enemies) if (hittable(e) && Math.abs(e.x - p.x) < 120) { e.state = 'air'; e.vx = Math.sign(e.x - p.x || 1) * 160; e.vh = 200; e.t = 0; }
    } else popup(p.x, FLOOR + p.z - 52, 'OUCH!', '#ff6b4a', 2);
  }

  function dropWeapon() {
    const p = player;
    items.push({ type: p.weapon.type, x: p.x - p.face * 10, z: p.z, h: 20, vh: 120, ammo: p.weapon.ammo });
    p.weapon = null;
  }

  // ---------------------------------------------------------------- the hero
  function setS(s) { const p = player; p.state = s; p.t = 0; p.hitSet.clear(); }
  function underfoot() {
    const p = player;
    return items.find(it => it.type !== 'beans' && it.h <= 0 && Math.abs(it.x - p.x) < 16 && Math.abs(it.z - p.z) < 10);
  }
  function grabTarget(dir) {
    const p = player;
    return enemies.find(e => (e.state === 'stagger' || e.state === 'approach') && inLane(e, p, 9) && Math.sign(e.x - p.x) === dir && Math.abs(e.x - p.x) < 24 && e.h <= 0);
  }

  function updatePlayer(dt) {
    const p = player;
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    p.t += dt; p.inv -= dt; p.chainT = (p.chainT || 0) - dt;
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
        if (pressed.snap) p.queued = true;
        if (p.t >= HERO.snap.dur * 0.8) {
          if (p.queued && p.step < 3) { p.queued = false; p.step++; setS('snap'); sfx('whoosh'); }
          else if (p.t >= HERO.snap.dur) { p.queued = false; setS('idle'); p.chainT = 0.45; }
        }
        break;
      case 'side': p.vz = 0; p.vx = p.frame === Math.min(...Object.keys(HERO.side.hits).map(Number)) ? p.face * 90 : 0; if (p.t >= HERO.side.dur) setS('idle'); break;
      case 'taunt': p.vx = p.vz = 0; if (p.t >= HERO.taunt.dur) setS('idle'); break;
      case 'jump': case 'jumpkick': case 'stomp':
        if (p.state === 'jump' && pressed.snap) setS('jumpkick');
        else if (p.state !== 'stomp' && pressed.jump) { setS('stomp'); p.vh = -560; p.vx = 0; sfx('whoosh'); }
        if (p.state === 'jumpkick') p.vx = p.face * 170;
        p.vh -= GRAV * dt; p.h += p.vh * dt;
        if (p.h <= 0) {
          p.h = 0; p.vh = 0;
          if (p.state === 'stomp') stompShock();
          setS('land'); p.vx = p.vz = 0; puff(p.x, p.z, 3); sfx('land');
        }
        break;
      case 'land': p.vx *= 0.5; if (p.t > 0.12 && !free) setS('idle'); break;
      case 'grab': {
        const e = p.held;
        p.vx = p.vz = 0;
        if (!e || e.state !== 'held') { p.held = null; setS('idle'); break; }
        e.x = p.x + p.face * 17; e.z = p.z + 0.5; e.face = -p.face;
        if (pressed.snap) { setS('knee'); sfx('whoosh'); }
        else if (pressed.side || pressed.jump) { setS('throw'); }
        else if (p.t > 1.6) { e.state = 'stagger'; e.t = 0; e.vx = p.face * 60; p.held = null; setS('idle'); }
        break;
      }
      case 'knee':
        if (p.held) { p.held.x = p.x + p.face * 17; p.held.z = p.z + 0.5; }
        if (p.held && p.frame >= 1 && !p.hitSet.has(p.held)) {
          p.hitSet.add(p.held); p.knees++;
          const e = p.held; e.hp -= 1; e.flash = 0.1; lastHit = e; lastHitT = 2.2;
          spark(e.x, e.z, 22, false); sfx('hit'); hitstop = 0.04; addScore(20, e.x, FLOOR + e.z - 44);
          if (e.hp <= 0) { e.state = 'held'; hitE(e, 0, true); }
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
          for (const e of enemies) if (hittable(e) && inLane(e, p, 16) && hits(box, e)) { hitE(e, 2, false); any = true; }
          for (const b of barrels) if (b.alive && inLane(b, p, 16) && Math.abs(b.x - p.x - p.face * 36) < 32) breakBarrel(b);
          sfx(any ? 'hit' : 'shell');
          if (--p.weapon.ammo <= 0) { p.weapon = null; popup(p.x, FLOOR + p.z - 54, 'WHIP BROKE!', '#ff9d3c', 1); }
        }
        if (p.t >= HERO.whip.dur + 0.05) setS('idle');
        break;
      case 'shoot':
        p.vx = p.vz = 0;
        if (p.t >= HERO.shoot.dur + 0.05) {
          if (p.weapon && p.weapon.ammo <= 0) {        // out of rounds: toss the empty gun, Metal Slug style
            parts.push({ k: 'item', img: PICK.gun, x: p.x, z: p.z, h: 26, vx: -p.face * 90, vh: 200, life: 1.2, max: 1.2 });
            p.weapon = null; popup(p.x, FLOOR + p.z - 54, 'CLICK!', '#ff9d3c', 1);
          }
          setS('idle');
        }
        break;
      case 'hurt': p.vx *= Math.pow(0.02, dt); if (p.t > 0.4) setS('idle'); break;
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
    for (const e of enemies) {
      if (!hittable(e) || p.hitSet.has(e) || !inLane(e, p) || !hits(b, e)) continue;
      p.hitSet.add(e);
      if (kind === 'snap') hitE(e, p.step >= 3 ? 3 : 2, p.step >= 3);
      else if (kind === 'side') hitE(e, 4, true);
      else if (kind === 'jumpkick') hitE(e, 3, true);
    }
    for (const br of barrels) if (br.alive && !p.hitSet.has(br) && inLane(br, p) && b.x0 < br.x + 9 && b.x1 > br.x - 9) { p.hitSet.add(br); breakBarrel(br); }
  }

  function stompShock() {
    const p = player;
    shake = 6; hitstop = 0.05; sfx('stomp');
    parts.push({ k: 'ring', x: p.x, z: p.z, h: 0, life: 0.35, max: 0.35 });
    popup(p.x, FLOOR + p.z - 56, 'STOMP!', '#ff8a3c', 2);
    for (const e of enemies) if (hittable(e) && Math.abs(e.x - p.x) < 64 && Math.abs(e.z - p.z) < 24 && e.h < 10) hitE(e, 2, true, Math.sign(e.x - p.x) || 1);
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
  // enter -> approach (to a flanking spot beside you, in your lane) -> wind up -> strike -> recover -> approach ...
  // At most two attack at once; the rest circle at a distance, as in Final Fight.
  function updateEnemies(dt) {
    const p = player;
    const attackers = enemies.filter(e => ['windup', 'strike'].includes(e.state)).length;
    for (const e of enemies) {
      e.t += dt; e.flash -= dt; e.anim += dt; e.cd -= dt;
      const coy = e.type === 'coyote';
      switch (e.state) {
        case 'enter':
          e.vx = -e.slot * 60; e.face = -e.slot;
          if (e.x > camX + 20 && e.x < camX + VW - 20) e.state = 'approach';
          break;
        case 'approach': {
          const side = Math.sign(e.x - p.x) || e.slot, busy = attackers >= 2;
          const tx = p.x + side * (busy ? 80 : coy ? 36 : 28), tz = p.z;
          e.vx = Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x) * 4, coy ? 58 : 72);
          e.vz = Math.sign(tz - e.z) * Math.min(Math.abs(tz - e.z) * 4, 42);
          e.face = Math.sign(p.x - e.x) || e.face;
          if (!busy && e.cd <= 0 && Math.abs(tx - e.x) < 8 && Math.abs(tz - e.z) < 5 && phase === 'play') { e.state = 'windup'; e.t = 0; e.vx = e.vz = 0; }
          break;
        }
        case 'windup': e.vx = e.vz = 0; if (e.t > (coy ? 0.42 : 0.3)) { e.state = 'strike'; e.t = 0; e.hitDone = false; sfx('whoosh'); } break;
        case 'strike':
          if (coy) {
            e.vx = 0;
            if (!e.hitDone && e.t < 0.2 && inLane(e, p, 10) && p.h < 24 && Math.sign(p.x - e.x) === e.face && Math.abs(p.x - e.x) < 44) { e.hitDone = true; hurtPlayer(e, 2); }
            if (e.t > 0.25) { e.state = 'recover'; e.t = 0; }
          } else {                              // the dillo curls up and rolls at you
            e.vx = e.face * 190; e.vz = 0;
            if (!e.hitDone && inLane(e, p, 10) && p.h < 14 && Math.abs(p.x - e.x) < 16) { e.hitDone = true; hurtPlayer(e, 1); }
            if (e.t > 0.5) { e.state = 'recover'; e.t = 0; }
          }
          break;
        case 'recover': e.vx *= Math.pow(0.001, dt); e.vz = 0; if (e.t > 0.55) { e.state = 'approach'; e.cd = 0.8 + Math.random() * 1.2; } break;
        case 'stagger': e.vx *= Math.pow(0.01, dt); e.vz = 0; if (e.t > 0.4) { e.state = 'approach'; e.cd = 0.4; } break;
        case 'held': e.vx = e.vz = 0; break;
        case 'air':                             // knocked down or thrown: an arc, then flat on his back
          e.vh -= GRAV * dt; e.h += e.vh * dt;
          if (e.thrown) for (const o of enemies) if (o !== e && hittable(o) && inLane(o, e, 14) && Math.abs(o.x - e.x) < 22 && o.h < 30) {
            hitE(o, 3, true, Math.sign(e.vx) || 1); spark(o.x, o.z, 20, true);
          }
          if (e.h <= 0) {
            e.h = 0; e.vh = 0; e.vx = 0; puff(e.x, e.z, 4); sfx('land');
            if (e.thrown) { e.thrown = false; e.hp -= 3; e.flash = 0.1; if (e.hp <= 0) { e.state = 'held'; hitE(e, 0, false); break; } }
            e.state = 'down'; e.t = 0;
          }
          break;
        case 'down': e.vx = e.vz = 0; if (e.t > 0.9) { e.state = 'getup'; e.t = 0; } break;
        case 'getup': if (e.t > 0.35) { e.state = 'approach'; e.cd = 0.6; } break;
        case 'ko': e.vh -= GRAV * 0.7 * dt; e.h += e.vh * dt; break;
      }
      e.x += e.vx * dt; e.z += e.vz * dt;
      e.z = Math.max(0, Math.min(ZMAX, e.z));
      if (lock !== null && e.state !== 'enter' && e.state !== 'ko') e.x = Math.max(lock + 6, Math.min(lock + VW - 6, e.x));
    }
    enemies = enemies.filter(e => !(e.state === 'ko' && e.h < -260));
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.x += b.vx * dt;
      for (const e of enemies) if (!b.dead && hittable(e) && inLane(e, b, 10) && Math.abs(e.x - b.x) < 12) { b.dead = true; hitE(e, 4, true, Math.sign(b.vx)); }
      for (const br of barrels) if (!b.dead && br.alive && inLane(br, b, 10) && Math.abs(br.x - b.x) < 9) { b.dead = true; breakBarrel(br); }
      if (b.x < camX - 20 || b.x > camX + VW + 20) b.dead = true;
    }
    bullets = bullets.filter(b => !b.dead);
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
    if (lock !== null && !enemies.some(e => e.state !== 'ko')) {
      lock = null; waveI++; goT = 3; sfx('check');
      if (waveI >= WAVES.length) { phase = 'clear'; phaseT = 0; sfx('win'); }
    }
    goT -= dt;
    if (lock === null && waveI < WAVES.length && phase === 'play' && camX >= WAVES[waveI].cam - 1) startWave();
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
  const depth = z => 3 + (ZMAX - z) / 100;          // nearer (bigger z) = smaller priority = drawn on top
  const sy = (z, h) => FLOOR + z - h;

  let helpImg = null;
  function helpSprite() {
    if (helpImg) return helpImg;
    const lines = [['ARROWS', 'MOVE (UP/DOWN = DEPTH)'], ['Z', 'JUMP'], ['X X X', 'KICK COMBO'], ['BACK + X', 'SIDE KICK (KNOCKDOWN)'],
      ['Z THEN X', 'FLYING KICK'], ['Z THEN Z', 'STOMP'], ['WALK INTO', 'A STAGGERED OUTLAW: GRAB'], ['  GRABBED', 'X: KNEE  C: THROW'],
      ['X ON A WEAPON', 'PICK IT UP'], ['H', 'HIDE THIS']];
    const w = 236, h = 20 + lines.length * 9, c = T.canvas(w, h), x = c.getContext('2d');
    x.fillStyle = PAL.out; x.fillRect(0, 0, w, h);
    x.fillStyle = PAL.n2; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
    T.drawText(x, 'BRAWLER TEST', w / 2, 5, '#ff9d3c', 1, null, 'center');
    lines.forEach(([k, v], i) => { T.drawText(x, k, 8, 16 + i * 9, '#ffd34a', 1, null); T.drawText(x, v, 80, 16 + i * 9, '#fff3c4', 1, null); });
    return (helpImg = T.pixelize(c, { a: PAL.out, b: PAL.n2, c: '#ff9d3c', d: '#ffd34a', e: '#fff3c4' }, null, T.CLUT.spr));
  }

  function buildDL() {
    DL = [];
    const cx = Math.round(camX), wx = x => x - cx, p = player;
    // HUD
    put(T.bossBar('RINGO', Math.max(0, p.hp), MAX_HP), 6, 6, 0, 0, 0);
    for (let i = 0; i < p.lives; i++) put(HAT, 108 + i * 24, 6, 0, 0, 0);
    put(T.textSprite('SCORE ' + String(score).padStart(7, '0'), '#fff3c4', 1), 6, 26, 0, 0, 0);
    if (p.weapon) {
      if (p.weapon.type === 'gun') for (let i = 0; i < p.weapon.ammo; i++) put(PICK.bulletIcon, 10 + i * 6, 38, 4, 4, 0);
      else put(T.textSprite('WHIP ' + p.weapon.ammo, '#ffd34a', 1), 6, 35, 0, 0, 0);
    }
    if (lastHit && lastHitT > 0) { const b = T.bossBar(lastHit.name, Math.max(0, lastHit.hp), lastHit.max); put(b, VW - 6 - b.width, 6, 0, 0, 0); }
    if (comboT > 0 && combo > 1) { const t = T.textSprite(combo + ' HIT COMBO!', '#ffd34a', 1); put(t, VW - 6 - t.width, 26, 0, 0, 0); }
    if (goT > 0 && lock === null && phase === 'play' && Math.floor(goT * 4) % 2) put(T.textSprite('GO >>', '#ffd34a', 3), VW - 70, 70, 0, 0, 0);
    if (phase === 'clear') { const t = T.textSprite('BRAWL CLEAR!', '#ffd34a', 3); put(t, (VW - t.width) >> 1, 70, 0, 0, 0); }
    if (phase === 'over') { const t = T.textSprite('PRESS JUMP TO TRY AGAIN', '#c3c8d8', 1); put(t, (VW - t.width) >> 1, 120, 0, 0, 0); }
    if (time < 3.2) {                                            // title card
      const a = T.textSprite(MS ? 'MAIN STREET' : 'THE DESERT', '#ffd34a', 3), s2 = T.textSprite(MS ? 'DUSK' : 'NOON', '#e8a070', 1);
      put(a, (VW - a.width) >> 1, 66, 0, 0, 0); put(s2, (VW - s2.width) >> 1, 88, 0, 0, 0);
    }
    if (showHelp) { const h = helpSprite(); put(h, (VW - h.width) >> 1, 52, 0, 0, 0); }
    else put(T.textSprite('BRAWLER TEST   H: MOVES', '#ffe7b0', 1), 6, VH - 10, 0, 0, 0);
    for (const u of popups) { if (u.life < 0.2 && Math.floor(u.life * 30) % 2) continue; const t = T.textSprite(u.text, u.color, u.s); put(t, Math.max(2, Math.min(VW - 2 - t.width, wx(u.x) - (t.width >> 1))), u.y, 0, 0, 1); }

    // actors, each with a shadow on the floor
    if (!(p.inv > 0 && Math.floor(p.inv * 18) % 2) && phase !== 'over') put(HERO[p.anim].frames[p.frame], wx(p.x), sy(p.z, p.h), H.OX, H.OY, depth(p.z) - 0.001, p.face);
    put(PICK.shadow, wx(p.x), sy(p.z, 0), 16, 4, 9);
    for (const e of enemies) {
      let img, ox, oy;
      if (e.type === 'coyote') {
        const C = GANG; ox = CB.OX; oy = CB.OY;
        img = { enter: C.walk[(e.anim * 8 | 0) % 4], approach: (e.vx || e.vz) ? C.walk[(e.anim * 8 | 0) % 4] : C.idle[(e.anim * 2 | 0) % 2],
          windup: C.windup, strike: C.swing, recover: C.idle[0], stagger: C.hurt, held: C.hurt, air: C.hurt, down: C.down,
          getup: C.daze[(e.anim * 8 | 0) % 4], ko: C.ko }[e.state];
      } else {
        ox = E.OX; oy = E.OY;
        img = ['strike', 'air', 'ko', 'down'].includes(e.state) ? DILLO.ball[(e.anim * 24 | 0) % 8] : e.state === 'windup' ? DILLO.ball[0]
          : e.state === 'held' || e.state === 'stagger' ? DILLO.walk[0] : DILLO.walk[(e.anim * 8 | 0) % 4];
      }
      put(img, wx(e.x), sy(e.z, e.h), ox, oy, depth(e.z), e.face, e.flash > 0 ? 'flash' : null);
      if (e.state !== 'ko') put(e.type === 'coyote' ? PICK.shadow : PICK.shadowS, wx(e.x), sy(e.z, 0), e.type === 'coyote' ? 16 : 12, 4, 9);
    }
    for (const b of barrels) if (b.alive) { put(BARREL, wx(b.x), sy(b.z, 0), T.BARREL.OX, T.BARREL.OY, depth(b.z)); put(PICK.shadowS, wx(b.x), sy(b.z, 0), 12, 4, 9); }
    for (const it of items) { put(PICK[it.type], wx(it.x), sy(it.z, it.h), 12, 12, depth(it.z) + 0.002); if (Math.floor(time * 4) % 2 && it.type !== 'beans') put(T.textSprite('X', '#ffd34a', 1), wx(it.x), sy(it.z, it.h) - 18, 1, 0, 1); }
    if (tumble) { put(TUMBLE[(time * 10 | 0) % 4], wx(tumble.x), sy(tumble.z, tumble.h), 12, 22, depth(tumble.z)); put(PICK.shadowS, wx(tumble.x), sy(tumble.z, 0), 12, 4, 9); }
    for (const b of bullets) put(PICK.bullet, wx(b.x), sy(b.z, b.h), 4, 4, depth(b.z) - 0.002, Math.sign(b.vx));
    for (const q of parts) {
      const k = q.life / q.max, y = sy(q.z, q.h);
      if (q.k === 'dust') put(FX.dust[Math.min(4, q.s + ((1 - k) * 2 | 0))][k > 0.5 ? 0 : 1], wx(q.x), y, 4, 4, depth(q.z) + 0.01);
      else if (q.k === 'bit') put(FX.bit[q.c], wx(q.x), y, 4, 4, 2);
      else if (q.k === 'mote') put(FX.bit[0], wx(q.x), y, 4, 4, 8.5);
      else if (q.k === 'star') put(FX.star[Math.max(0, Math.min(5, Math.round((q.big ? 5 : 3) * (0.6 + k * 0.4))))], wx(q.x), y, 16, 16, 2);
      else if (q.k === 'chunk' || q.k === 'item') put(q.img, wx(q.x), y, q.img.ox ?? 1, q.img.oy ?? 1, depth(q.z) + 0.01);
      else if (q.k === 'ring') { const f = FX.ring[Math.min(FX.ring.length - 1, ((1 - k) * FX.ring.length) | 0)]; put(f, wx(q.x), y, f.ox, f.oy, 8); }
    }
    DL.sort((a, b) => a.pri - b.pri);
    let used = 0, dropped = 0;
    for (const d of DL) { if (used + d.n > MAX_SPRITES) { d.dropped = true; dropped += d.n; } else used += d.n; }
    stats = { records: used, dropped };
  }

  function render() {
    const sx = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0, syy = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
    const cx = Math.round(camX);
    const layer = (img, scroll) => {
      const src = MS ? T.shadeOf(img, dark) : img, off = -(Math.floor(scroll) % img.width);
      for (let x = off; x < VW; x += img.width) ctx.drawImage(src, x + sx, syy);
    };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    layer(LAYERS.far, cx * 0.25); layer(LAYERS.mid, cx * 0.5);
    if (MS) layer(MS.street, cx);
    else {
      const t0 = Math.floor(cx / TS);
      for (let ty = 0; ty < MAP_H; ty++) for (let tx = t0; tx <= t0 + VW / TS + 1 && tx < MAP_W; tx++) { const tile = FRONT[ty][tx]; if (tile) ctx.drawImage(tile, tx * TS - cx + sx, ty * TS + syy); }
    }
    for (let i = DL.length - 1; i >= 0; i--) {
      const d = DL[i]; if (d.dropped) continue;
      const img = d.clut ? T.variant(d.img, d.clut) : d.img;
      if (d.face < 0) { ctx.save(); ctx.translate(d.left + img.width + sx, d.top + syy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
      else ctx.drawImage(img, d.left + sx, d.top + syy);
    }
    if (params.has('debug')) T.drawText(ctx, `SPR ${stats.records}/${MAX_SPRITES}${stats.dropped ? ' DROP ' + stats.dropped : ''}`, VW - 6, 40, '#7fd4ff', 1, PAL.out, 'right');
    vctx.drawImage(buf, 0, 0, VW * scale, VH * scale);
  }

  // ---------------------------------------------------------------- loop
  // ?bot: a crude autopilot (walks right, fights whoever is nearest), for testing with ?ff
  let botT = 0;
  function runBot(dt) {
    if (!params.has('bot') || phase !== 'play') return;
    const p = player; botT -= dt;
    keys.left = keys.right = keys.up = keys.down = false;
    const live = enemies.filter(e => hittable(e) || e.state === 'enter');
    const it = items.find(i => i.type !== 'beans' && Math.abs(i.x - p.x) < 120);
    if (it && !p.weapon && !live.some(e => Math.abs(e.x - p.x) < 50)) {
      keys[it.x > p.x ? 'right' : 'left'] = Math.abs(it.x - p.x) > 6; keys[it.z > p.z ? 'down' : 'up'] = Math.abs(it.z - p.z) > 4;
      if (Math.abs(it.x - p.x) < 10 && Math.abs(it.z - p.z) < 8 && botT <= 0) { pressed.snap = true; botT = 0.3; }
      return;
    }
    const e = live.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const br = barrels.find(b => b.alive && b.x > camX && b.x < camX + VW);
    if (!e && br) {                                     // kick open the barrels between fights
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
    if (pressed.help) showHelp = !showHelp;
    if (hitstop > 0) { hitstop -= dt; for (const k in pressed) pressed[k] = false; return; }
    time += dt; phaseT += dt; comboT -= dt; lastHitT -= dt; shake = Math.max(0, shake - 30 * dt);
    if (helpAuto && time > 3.2 && time < 10) showHelp = true;
    if (helpAuto && time >= 10) { showHelp = false; helpAuto = false; }
    if (pressed.help) helpAuto = false;
    // the light goes: a step darker each wave (a CLUT fade on the F256)
    if (MS) dark += (DARK[Math.min(waveI, DARK.length - 1)] - dark) * Math.min(1, dt * 0.6);
    // ambience: a tumbleweed now and then, dust motes in the low sun
    if (!tumble && (tumbleT -= dt) <= 0) tumble = { x: camX - 20, z: Math.random() * ZMAX, h: 0, vh: 0, vx: 55 + Math.random() * 40 };
    if (tumble) {
      tumble.x += tumble.vx * dt; tumble.vh -= GRAV * 0.5 * dt; tumble.h += tumble.vh * dt;
      if (tumble.h <= 0) { tumble.h = 0; tumble.vh = 90 + Math.random() * 70; }
      if (tumble.x > camX + VW + 30) { tumble = null; tumbleT = 6 + Math.random() * 8; }
    }
    if (MS && Math.random() < dt * 2.5) parts.push({ k: 'mote', x: camX + Math.random() * VW, z: Math.random() * ZMAX, h: 20 + Math.random() * 90, vx: 8 + Math.random() * 10, vh: -3, life: 4, max: 4 });
    if (phase === 'play') updatePlayer(dt);
    else if (phaseT > 2 && pressed.jump) location.reload();
    updateEnemies(dt); updateBullets(dt); updateParts(dt); updateWaves(dt);
    const target = lock !== null ? lock : Math.max(camX, Math.min(W - VW, player.x - VW * 0.45));
    camX += (target - camX) * Math.min(1, dt * 5);
    if (lock !== null && Math.abs(camX - lock) < 0.5) camX = lock;
    for (const k in pressed) pressed[k] = false;
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
