// SHADOW POST — levels.js
// Three handcrafted night levels, drawn as ASCII maps so a level is easy
// to read at a glance. Tiles:
//   '#' stone wall   'H' hedge   'C' crate   (all block movement and sight)
//   '.' ground       ',' pale path (ground, drawn lighter)
//   'L' lantern      'P' courier start       'E' exit gate
// Guards patrol waypoint loops given in tile coordinates.

import { TILE } from './config.js';

const L1 = {
  name: 'COURTYARD',
  sub: 'Level 1 — slip past the first watch',
  par: 45,
  map: [
    '########################',
    '#P......,......,......E#',
    '#.......,......,.......#',
    '#..HH...,......,..HH...#',
    '#..HH...,......,..HH...#',
    '#.......,......,.......#',
    '#..L....,..CC..,....L..#',
    '#.......,......,.......#',
    '#.......,......,.......#',
    '#..CC...,......,..CC...#',
    '#.......,......,.......#',
    '#..HH...,......,..HH...#',
    '#..HH...,......,..HH...#',
    '#.......,......,.......#',
    '#..L....,......,....L..#',
    '########################',
  ],
  guards: [
    { x: 3, y: 5, waypoints: [[3, 5], [20, 5]] },
    { x: 12, y: 2, waypoints: [[12, 2], [12, 13]] },
  ],
};

const L2 = {
  name: 'GARDEN MAZE',
  sub: 'Level 2 — hedges hide you, and them',
  par: 75,
  map: [
    '########################',
    '#P......,......,......E#',
    '#.HHHHHH,HHHHHH,HHHHHH.#',
    '#.H.....,......,.....H.#',
    '#.H.HHHH,HHH.HH,HHH.H..#',
    '#.H.H..L,......,L..H...#',
    '#.H.HH.H,HHHHHH,HH.H...#',
    '#.H.....,......,.......#',
    '#.HHHHH.,.HHHH.,.HHHH..#',
    '#.......,......,.......#',
    '#.HHHHH.,.HHHH.,.HHHH..#',
    '#.H.....,......,.....H.#',
    '#.H.HHHH,HHHHHH,HHH.H..#',
    '#.H....L,......,L....H.#',
    '#.......,......,.......#',
    '########################',
  ],
  guards: [
    { x: 3, y: 7, waypoints: [[3, 7], [20, 7]] },
    { x: 3, y: 13, waypoints: [[3, 13], [20, 13]] },
    { x: 12, y: 3, waypoints: [[12, 3], [12, 5]] },
  ],
};

const L3 = {
  name: 'LANTERN HALL',
  sub: 'Level 3 — bright floor, crossing patrols',
  par: 90,
  map: [
    '########################',
    '#P......,......,......E#',
    '#.......,......,.......#',
    '#..C....,......,....C..#',
    '#.......,......,.......#',
    '#....L..,......,..L....#',
    '#.......,......,.......#',
    '#..HHH..,......,..HHH..#',
    '#.......,......,.......#',
    '#....L..,......,..L....#',
    '#.......,......,.......#',
    '#..C....,......,....C..#',
    '#.......,......,.......#',
    '#....L..,......,..L....#',
    '#.......,......,.......#',
    '########################',
  ],
  guards: [
    { x: 2, y: 4, waypoints: [[2, 4], [21, 4]] },
    { x: 21, y: 10, waypoints: [[21, 10], [2, 10]] },
    { x: 10, y: 2, waypoints: [[10, 2], [10, 13]] },
    { x: 19, y: 2, waypoints: [[19, 2], [19, 13]] },
  ],
};

export const LEVELS = [L1, L2, L3];

// Parse a level map into the pieces the game needs: blockers (walls,
// hedges, crates) as pixel rects, lantern positions, courier start and
// the exit gate, all in pixels. A lantern tile is walkable ground.
export function parseLevel(def) {
  const blockers = [];
  const lanterns = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 22.5, y: TILE * 1.5 };

  def.map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      const ch = row[tx];
      const px = tx * TILE;
      const py = ty * TILE;
      if (ch === '#') blockers.push({ x: px, y: py, w: TILE, h: TILE, kind: 'wall' });
      else if (ch === 'H') blockers.push({ x: px, y: py, w: TILE, h: TILE, kind: 'hedge' });
      else if (ch === 'C') blockers.push({ x: px, y: py, w: TILE, h: TILE, kind: 'crate' });
      else if (ch === 'L') lanterns.push({ x: px + TILE / 2, y: py + TILE / 2 });
      else if (ch === 'P') playerStart = { x: px + TILE / 2, y: py + TILE / 2 };
      else if (ch === 'E') exit = { x: px + TILE / 2, y: py + TILE / 2 };
    }
  });

  // The outer wall ring is a single frame the player can never leave.
  const guards = def.guards.map((g) => ({
    x: g.x * TILE + TILE / 2,
    y: g.y * TILE + TILE / 2,
    waypoints: g.waypoints.map(([wx, wy]) => ({
      x: wx * TILE + TILE / 2,
      y: wy * TILE + TILE / 2,
    })),
  }));

  return {
    name: def.name,
    sub: def.sub,
    par: def.par,
    map: def.map,
    blockers,
    lanterns,
    playerStart,
    exit,
    guards,
  };
}
