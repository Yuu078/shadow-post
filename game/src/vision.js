// SHADOW POST — vision.js
// Raycasting: a guard's cone is clipped by walls, so cover really hides
// you. Rays are cast from the guard across its field of view and each ray
// stops at the nearest blocker edge; the cone polygon joins those points.

import { GUARD_FOV, GUARD_RANGE } from './config.js';

// Distance from (ox,oy) along direction (dx,dy) to the first hit on the
// edges of rect, or Infinity when the ray misses the rect entirely.
function rayHitRect(ox, oy, dx, dy, rect) {
  let tMin = 0;
  let tMax = Infinity;
  const axes = [
    [ox - rect.x, dx, rect.w],
    [oy - rect.y, dy, rect.h],
  ];
  for (const [origin, dir, size] of axes) {
    if (Math.abs(dir) < 1e-9) {
      if (origin < 0 || origin > size) return Infinity;
    } else {
      let t1 = -origin / dir;
      let t2 = (size - origin) / dir;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return Infinity;
    }
  }
  return tMin;
}

// Distance from (ox,oy) in direction `angle` to the nearest blocker.
export function castRay(ox, oy, angle, blockers, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const b of blockers) {
    const t = rayHitRect(ox, oy, dx, dy, b);
    if (t < best) best = t;
  }
  return best;
}

// True when nothing blocks the straight line from (x1,y1) to (x2,y2).
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const reach = castRay(x1, y1, Math.atan2(dy, dx), blockers, dist);
  return reach >= dist - 1;
}

// The guard's visible cone as a polygon: the guard's eye plus one point
// per ray, each ray stopped by the nearest wall. Returns an array of
// {x, y} points in order around the cone.
export function conePolygon(guard, blockers) {
  const steps = 26;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= steps; i++) {
    const a = guard.angle - GUARD_FOV / 2 + (GUARD_FOV * i) / steps;
    const d = castRay(guard.x, guard.y, a, blockers, GUARD_RANGE);
    pts.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return pts;
}

// Is the player inside the guard's cone (range + angle + line of sight)?
export function playerInCone(guard, player, blockers) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return { seen: false, dist };
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD_FOV / 2) return { seen: false, dist };
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y, blockers)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}
