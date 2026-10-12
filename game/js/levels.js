// Texas Shitkickers — level data. All geometry is on the 16 px tile grid: ground at y = 208, tile rows 0-14.
//   ground  [x0, x1] runs of solid ground; the gaps between them are pits (open graves on Boot Hill)
//   blocks  solid 16x16 tiles by name: crates; headstones (stoneT over stoneB); coffins (coffinL + coffinR)
//   plats   one-way plank platforms [x, y, w]
//   enemies [{ type, x, y? }]; signs [x, text]; checkpoints [x]; boss { type, arenaX }
(function () {
'use strict';
const T = window.TSK;
const G = 208;

// a headstone two tiles tall standing on the ground at x
const stone = x => [[x, G - 32, 'stoneT'], [x, G - 16, 'stoneB']];
// a coffin lying at (x, y) is two tiles wide
const coffin = (x, y) => [[x, y, 'coffinL'], [x + 16, y, 'coffinR']];

T.LEVELS = {
  boothill: {
    name: 'BOOT HILL', sub: 'MIDNIGHT', theme: 'boothill', W: 2560, start: 96, respawn: false, lightning: true,
    // the opening: Ringo's headstone, and the grave he climbs out of
    intro: { stone: 64, grave: 96 },
    ground: [[0, 480], [512, 1120], [1168, 1600], [1632, 1760], [1824, 2560]],
    blocks: [
      ...stone(272), ...stone(656), ...stone(960), ...stone(1008), ...stone(1360), ...stone(1920), ...stone(2080),
      ...coffin(560, 192), ...coffin(592, 192), ...coffin(576, 176),
      ...coffin(1232, 192), ...coffin(1264, 192), ...coffin(1248, 176), ...coffin(1248, 160),
      ...coffin(2160, 192), ...coffin(2192, 192), ...coffin(2176, 176),
    ],
    plats: [[704, 144, 80], [1024, 128, 64], [1440, 144, 96], [1664, 160, 80], [1776, 128, 64], [1984, 128, 80]],
    barrels: [[752, 144], [1488, 144], [2000, 128], [1104, 208]],
    enemies: [
      { type: 'dillo', x: 380 }, { type: 'dillo', x: 800 }, { type: 'dillo', x: 880 },
      { type: 'buzzard', x: 968, y: 164 },
      { type: 'dillo', x: 1300 }, { type: 'dillo', x: 1420 },
      { type: 'buzzard', x: 1368, y: 164 }, { type: 'buzzard', x: 1500, y: 132 },
      { type: 'dillo', x: 1700 }, { type: 'dillo', x: 1880 },
      { type: 'buzzard', x: 1928, y: 164 },
      { type: 'dillo', x: 2030 }, { type: 'dillo', x: 2060 }, { type: 'dillo', x: 2120 },
    ],
    signs: [
      [168, 'Z: JUMP'], [232, 'X: KICK'], [440, 'JUMP THE GRAVES!'], [700, 'BACK+X: SIDE KICK'],
      [790, 'DOWN IN AIR: STOMP'], [900, 'X IN AIR: BICYCLE KICK'], [1420, 'DOWN+JUMP: DROP DOWN'],
      [2000, 'STOMP A DILLO, KICK THE BALL'],
    ],
    checkpoints: [1200, 1856, 2256],
    boss: { type: 'coyote', arenaX: 2240, name: 'TWO-BIT', line: 'I BURIED YOU MYSELF!' },
  },

  // the original desert test range: every move, endless outlaws
  desert: {
    name: 'TEST RANGE', sub: 'NOON', theme: 'desert', W: 3392, start: 80, respawn: true, lightning: false, intro: null,
    ground: [[0, 1376], [1440, 3392]],
    blocks: [[592, 192], [608, 192], [624, 192], [608, 176],
      [1648, 192], [1664, 192], [1648, 176], [1664, 176],
      [2240, 192], [2240, 176], [2240, 160], [2240, 144], [2256, 192], [2896, 192], [2912, 192]].map(([x, y]) => [x, y, 'crate']),
    plats: [[304, 160, 80], [416, 112, 64], [736, 144, 96], [1008, 160, 64], [1104, 112, 96],
      [1328, 160, 48], [1456, 160, 80], [1824, 144, 112], [1984, 96, 64], [2288, 128, 96],
      [2480, 160, 64], [2576, 112, 96], [3056, 144, 112]],
    barrels: [512, 896, 1248, 1568, 1984, 2416, 2784, 3152].map(x => [x, G]),
    enemies: [480, 860, 1180, 1580, 1780, 2060, 2460, 2720, 3000, 3200].map(x => ({ type: 'dillo', x })),
    signs: [[60, 'TEST RANGE >>'], [3250, 'STORY GOES HERE']],
    checkpoints: [],
    boss: null,
  },
};
})();
