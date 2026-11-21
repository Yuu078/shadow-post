// SHADOW POST — config.js
// One place for every number the game tunes by: board size, movement,
// vision and detection. Levels and entities read these, nothing else
// hard-codes a speed or a radius.

// Board: 24 x 16 tiles of 40 px, drawn on a 960 x 640 canvas.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Movement (pixels per second).
export const PLAYER_WALK = 132;
export const PLAYER_CREEP = 62;
export const GUARD_PATROL = 52;
export const GUARD_CHASE = 118;
export const GUARD_INVESTIGATE = 74;

// Vision: how far a guard sees, and how wide the cone opens (radians).
export const GUARD_RANGE = 235;
export const GUARD_FOV = 1.15; // ~66 degrees

// Detection meter: 0 = unseen, 1 = fully spotted. Rates are per second.
export const DETECT_BASE = 0.55; // at point blank, in shadow
export const DETECT_FAR = 0.16; // at the edge of the cone
export const DETECT_LIGHT_MULT = 2.0; // standing in a lantern pool
export const DETECT_CREEP_MULT = 0.45; // creeping is harder to spot
export const DETECT_DECAY = 0.35; // meter drains when hidden
export const SPOT_THRESHOLD = 1.0; // meter full -> guard knows where you are
export const SUSPICIOUS_THRESHOLD = 0.45; // meter past this -> guard turns to look

// Noise: running is heard inside this radius; a coin is heard further.
export const NOISE_RUN_RADIUS = 95;
export const NOISE_COIN_RADIUS = 175;

// Coins: how many the courier carries per level.
export const COINS_PER_LEVEL = 3;

// Night palette — deep indigo ground, warm lantern pools.
export const PALETTE = {
  ground: '#0d1026',
  groundAlt: '#11142e',
  path: '#1a1f3d',
  pathEdge: '#232a4d',
  wall: '#2c3358',
  wallTop: '#3a4270',
  hedge: '#16281c',
  hedgeTop: '#22402c',
  crate: '#3a2a1c',
  crateTop: '#54402a',
  lanternGlow: 'rgba(255, 176, 92, 0.20)',
  lanternCore: '#ffb05c',
  exitGlow: '#7fe0a8',
  player: '#e8e4d8',
  playerHood: '#4a3f6b',
  guard: '#c8b06a',
  guardDark: '#8a7440',
  coneCalm: 'rgba(255, 190, 90, 0.20)',
  coneWary: 'rgba(255, 140, 60, 0.32)',
  coneAlert: 'rgba(255, 70, 60, 0.38)',
  text: '#e8e4d8',
  textDim: '#9aa1c7',
  gold: '#e8c268',
};
