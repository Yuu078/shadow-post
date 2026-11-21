// SHADOW POST — entities.js
// The courier and the sentries. The courier moves and hides; a sentry
// patrols a waypoint loop, grows suspicious when it glimpses or hears
// something, investigates, and chases when it is sure — then calms down
// again when the trail goes cold, so a near miss can be recovered from.

import {
  DETECT_BASE,
  DETECT_CREEP_MULT,
  DETECT_DECAY,
  DETECT_FAR,
  DETECT_LIGHT_MULT,
  GUARD_CHASE,
  GUARD_INVESTIGATE,
  GUARD_PATROL,
  GUARD_RANGE,
  NOISE_RUN_RADIUS,
  PLAYER_CREEP,
  PLAYER_WALK,
  SPOT_THRESHOLD,
  SUSPICIOUS_THRESHOLD,
} from './config.js';
import { playerInCone } from './vision.js';

const RADIUS = 13; // courier body radius, pixels

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Circle vs rect collision: push the circle out of any blocker it touches.
export function collideCircle(x, y, r, blockers) {
  for (const b of blockers) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * r;
      y = cy + (dy / d) * r;
    } else if (d2 <= 0.0001) {
      // Centre inside the rect: push out along the shallowest side.
      const left = x - b.x;
      const right = b.x + b.w - x;
      const top = y - b.y;
      const bottom = b.y + b.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - r;
      else if (m === right) x = b.x + b.w + r;
      else if (m === top) y = b.y - r;
      else y = b.y + b.h + r;
    }
  }
  return { x, y };
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = RADIUS;
    this.facing = 0; // radians, for the hood's direction tick
    this.moving = false;
    this.creeping = false;
    this.stepTimer = 0;
    this.inLight = false;
    this.everSpotted = false; // for the Ghost bonus
  }

  update(dt, input, blockers, audio) {
    const mv = input.moveVector();
    this.creeping = input.creeping && (mv.x !== 0 || mv.y !== 0);
    const speed = this.creeping ? PLAYER_CREEP : PLAYER_WALK;
    this.moving = mv.x !== 0 || mv.y !== 0;
    if (this.moving) {
      this.facing = Math.atan2(mv.y, mv.x);
      const nx = this.x + mv.x * speed * dt;
      const ny = this.y + mv.y * speed * dt;
      const solved = collideCircle(nx, ny, this.r, blockers);
      this.x = solved.x;
      this.y = solved.y;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        audio.step(this.creeping);
        this.stepTimer = this.creeping ? 0.55 : 0.34;
      }
    }
  }

  // Is the courier standing in a lantern pool? Light makes detection
  // fill about twice as fast — shadow is safety.
  updateLight(lanterns) {
    this.inLight = lanterns.some((l) => Math.hypot(l.x - this.x, l.y - this.y) < 62);
  }

  get noisy() {
    return this.moving && !this.creeping;
  }
}

export class Guard {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.r = 14;
    this.waypoints = def.waypoints;
    this.wpIndex = 0;
    this.angle = 0;
    this.state = 'patrol'; // patrol | suspicious | investigate | chase
    this.stateTimer = 0;
    this.detect = 0; // 0..1 detection meter for this guard
    this.lastSeen = null; // {x, y} where the courier was last spotted
    this.investigateAt = null;
    this.pauseTimer = 0;
    this.alertedOnce = false;
  }

  // Move toward (tx,ty) at `speed`, sliding along blockers; returns true
  // when the target is reached.
  stepToward(tx, ty, speed, dt, blockers) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const nx = this.x + (dx / dist) * speed * dt;
    const ny = this.y + (dy / dist) * speed * dt;
    const solved = collideCircle(nx, ny, this.r, blockers);
    const moved = Math.hypot(solved.x - this.x, solved.y - this.y);
    this.x = solved.x;
    this.y = solved.y;
    this.angle = Math.atan2(dy, dx);
    return moved < 0.5; // stuck against a wall counts as arrived
  }

  turnToward(targetAngle, dt, rate = 3.2) {
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = clamp(diff, -rate * dt, rate * dt);
    this.angle += step;
  }

  // A noise at (x,y) inside earshot: turn and go look.
  hearNoise(x, y, radius) {
    if (this.state === 'chase') return;
    if (Math.hypot(x - this.x, y - this.y) > radius) return;
    this.investigateAt = { x, y };
    if (this.state === 'patrol') this.state = 'suspicious';
    this.stateTimer = 0;
  }

  update(dt, player, blockers, audio, onSpotted) {
    const { seen, dist } = playerInCone(this, player, blockers);

    if (seen) {
      // Detection fills faster up close and in lantern light, slower
      // while the courier creeps; it drains when the courier hides.
      const closeness = 1 - dist / GUARD_RANGE;
      let rate = DETECT_FAR + (DETECT_BASE - DETECT_FAR) * closeness;
      if (player.inLight) rate *= DETECT_LIGHT_MULT;
      if (player.creeping) rate *= DETECT_CREEP_MULT;
      const before = this.detect;
      this.detect = clamp(this.detect + rate * dt, 0, 1);
      if (before < SUSPICIOUS_THRESHOLD && this.detect >= SUSPICIOUS_THRESHOLD) {
        this.state = 'suspicious';
        this.stateTimer = 0;
        audio.suspicious();
      }
      if (this.detect >= SPOT_THRESHOLD) {
        this.lastSeen = { x: player.x, y: player.y };
        if (this.state !== 'chase') {
          this.state = 'chase';
          this.stateTimer = 0;
          if (!this.alertedOnce) {
            this.alertedOnce = true;
            audio.alert();
            onSpotted();
          }
        }
      }
    } else {
      this.detect = clamp(this.detect - DETECT_DECAY * dt, 0, 1);
      if (this.detect < SUSPICIOUS_THRESHOLD && this.state === 'suspicious') {
        this.state = 'patrol';
      }
    }

    if (this.state === 'patrol') {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        return;
      }
      const wp = this.waypoints[this.wpIndex];
      if (this.stepToward(wp.x, wp.y, GUARD_PATROL, dt, blockers)) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        this.pauseTimer = 0.7; // look around at each waypoint
      }
    } else if (this.state === 'suspicious') {
      // Turn toward the glimpse, then go and check it.
      this.stateTimer += dt;
      if (this.lastSeen) this.turnToward(Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt);
      if (this.stateTimer > 0.9) {
        this.state = 'investigate';
        this.investigateAt = this.lastSeen || this.investigateAt;
        this.stateTimer = 0;
      }
    } else if (this.state === 'investigate') {
      this.stateTimer += dt;
      if (this.investigateAt) {
        const arrived = this.stepToward(
          this.investigateAt.x,
          this.investigateAt.y,
          GUARD_INVESTIGATE,
          dt,
          blockers,
        );
        if (arrived || this.stateTimer > 6) {
          this.state = 'patrol';
          this.stateTimer = 0;
          this.investigateAt = null;
        }
      }
    } else if (this.state === 'chase') {
      // Chase the last seen spot; give up after 4 s without a sighting.
      this.stateTimer += dt;
      const target = this.lastSeen || { x: player.x, y: player.y };
      this.stepToward(target.x, target.y, GUARD_CHASE, dt, blockers);
      if (seen) {
        this.lastSeen = { x: player.x, y: player.y };
        this.stateTimer = 0;
      }
      if (this.stateTimer > 4) {
        this.state = 'investigate';
        this.investigateAt = this.lastSeen;
        this.stateTimer = 0;
      }
    }
  }

  // How alarmed this guard looks: 0 calm, 1 fully alert.
  get alarm() {
    if (this.state === 'chase') return 1;
    if (this.state === 'investigate') return 0.75;
    if (this.state === 'suspicious') return 0.5;
    return Math.max(0, this.detect);
  }

  get noiseRadius() {
    return NOISE_RUN_RADIUS;
  }
}
