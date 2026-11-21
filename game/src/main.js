// SHADOW POST — main.js
// Game loop and state machine: title -> level intro -> playing -> caught
// or level clear -> next level -> win screen. Also the debug scene hook
// (?shot=title|yard|garden|hall|alert) that poses deterministic frames
// for screenshots, and a tiny test hook (?test=move|catch|win) that the
// headless play-test drives.

import { AudioEngine } from './audio.js';
import {
  COINS_PER_LEVEL,
  NOISE_COIN_RADIUS,
  NOISE_RUN_RADIUS,
  TILE,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { Guard, Player, collideCircle } from './entities.js';
import { Input } from './input.js';
import { LEVELS, parseLevel } from './levels.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const audio = new AudioEngine();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const test = params.get('test');

class Game {
  constructor() {
    this.screen = 'title'; // title | intro | playing | caught | cleared | win | paused
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.guards = [];
    this.coins = COINS_PER_LEVEL;
    this.ripples = [];
    this.elapsed = 0;
    this.totalScore = 0;
    this.levelScore = 0;
    this.introTimer = 0;
    this.caughtTimer = 0;
    this.clearedTimer = 0;
    this.ghost = true; // never fully spotted on this level
    this.frozen = false; // screenshot poses do not animate
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.coins = COINS_PER_LEVEL;
    this.ripples = [];
    this.elapsed = 0;
    this.ghost = true;
    this.screen = 'intro';
    this.introTimer = 2.2;
    audio.levelStart();
  }

  start() {
    this.totalScore = 0;
    this.loadLevel(0);
  }

  // Score for a finished level: par bonus, ghost bonus, coins left.
  finishLevel() {
    const timeBonus = Math.max(0, Math.round((this.level.par - this.elapsed) * 10));
    const ghostBonus = this.ghost ? 300 : 0;
    const coinBonus = this.coins * 50;
    this.levelScore = 400 + timeBonus + ghostBonus + coinBonus;
    this.totalScore += this.levelScore;
    this.screen = 'cleared';
    this.clearedTimer = 2.6;
    audio.win();
  }

  finishGame() {
    this.screen = 'win';
    audio.win();
  }

  grade() {
    if (this.totalScore >= 2400) return 'GHOST';
    if (this.totalScore >= 1800) return 'SHADOW';
    return 'FOOTPAD';
  }

  throwCoin(x, y) {
    if (this.coins <= 0 || this.screen !== 'playing') return;
    this.coins -= 1;
    this.ripples.push({ x, y, age: 0, life: 1.1 });
    audio.coin();
    for (const g of this.guards) g.hearNoise(x, y, NOISE_COIN_RADIUS);
  }

  update(dt) {
    if (this.screen === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) this.screen = 'playing';
      return;
    }
    if (this.screen === 'cleared') {
      this.clearedTimer -= dt;
      if (this.clearedTimer <= 0) {
        if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
        else this.finishGame();
      }
      return;
    }
    if (this.screen === 'caught') {
      this.caughtTimer -= dt;
      return;
    }
    if (this.screen !== 'playing') return;

    this.elapsed += dt;
    const player = this.player;

    player.update(dt, input, this.level.blockers, audio);
    player.updateLight(this.level.lanterns);

    // Running is loud: guards nearby turn to look.
    if (player.noisy) {
      for (const g of this.guards) g.hearNoise(player.x, player.y, NOISE_RUN_RADIUS);
    }

    for (const g of this.guards) {
      g.update(dt, player, this.level.blockers, audio, () => {
        this.ghost = false;
        player.everSpotted = true;
      });
      // Caught: a guard touches the courier while alarmed.
      const touch = Math.hypot(g.x - player.x, g.y - player.y) < g.r + player.r - 2;
      if (touch && g.alarm >= 0.45) {
        this.screen = 'caught';
        this.caughtTimer = 2.4;
        audio.caught();
        return;
      }
      if (touch && g.state === 'patrol') {
        // Bumped into a calm guard: it gets suspicious and the courier
        // is shoved back instead of being caught outright.
        g.state = 'suspicious';
        g.stateTimer = 0;
        const push = collideCircle(player.x, player.y, player.r + 8, this.level.blockers);
        player.x = push.x;
        player.y = push.y;
      }
    }

    // Coin toss: click throws at the clicked point, Space throws ahead.
    for (const click of input.takeClicks()) {
      audio.ensure();
      this.throwCoin(click.x, click.y);
    }
    if (input.hit(' ')) {
      audio.ensure();
      const fx = player.x + Math.cos(player.facing) * 90;
      const fy = player.y + Math.sin(player.facing) * 90;
      this.throwCoin(fx, fy);
    }

    // Ripple animation.
    for (const rip of this.ripples) rip.age += dt;
    this.ripples = this.ripples.filter((rip) => rip.age < rip.life);

    // Reached the gate?
    if (Math.hypot(this.level.exit.x - player.x, this.level.exit.y - player.y) < 26) {
      this.finishLevel();
    }
  }

  handleKeys() {
    if (input.hit('Enter')) {
      audio.ensure();
      if (this.screen === 'title') this.start();
      else if (this.screen === 'win') this.start();
    }
    if (input.hit('r', 'R')) {
      if (['playing', 'caught', 'paused'].includes(this.screen)) this.loadLevel(this.levelIndex);
    }
    if (input.hit('p', 'P')) {
      if (this.screen === 'playing') this.screen = 'paused';
      else if (this.screen === 'paused') this.screen = 'playing';
    }
    if (input.hit('m', 'M')) audio.toggleMute();
    if (input.hit('Enter') && this.screen === 'caught' && this.caughtTimer <= 0) {
      this.loadLevel(this.levelIndex);
    }
  }

  draw() {
    const ctx = renderer.ctx;
    if (!this.frozen) renderer.time += 1 / 60;
    const pulse = renderer.time;

    if (this.screen === 'title') {
      renderer.drawTitle();
      return;
    }
    if (!this.level) return;

    renderer.drawGround(this.level);
    renderer.drawExit(this.level.exit, pulse);
    renderer.drawLanterns(this.level, pulse);
    renderer.drawCones(this.guards, this.level.blockers);
    renderer.drawBlockers(this.level);
    renderer.drawCoins(this.ripples);
    for (const g of this.guards) renderer.drawGuard(g);
    renderer.drawPlayer(this.player);
    renderer.drawVignette();
    renderer.drawHud(this);

    if (this.screen === 'intro') {
      ctx.fillStyle = 'rgba(7, 8, 26, 0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8c268';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.fillText(this.level.name, VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText(this.level.sub, VIEW_W / 2, VIEW_H / 2 + 24);
    } else if (this.screen === 'paused') {
      renderer.drawCenterCard('PAUSED', ['Press P to keep sneaking', 'R restarts the level']);
    } else if (this.screen === 'caught') {
      renderer.drawCenterCard(
        'CAUGHT',
        ['A sentry laid hands on the courier.', 'Press R to try the level again.'],
        '#ff5040',
      );
    } else if (this.screen === 'cleared') {
      renderer.drawCenterCard('DELIVERED', [
        `Level score ${this.levelScore}  ·  total ${this.totalScore}`,
        this.ghost ? 'Ghost bonus: never fully spotted.' : 'Spotted — the next gate waits.',
      ]);
    } else if (this.screen === 'win') {
      renderer.drawCenterCard(
        `LETTER DELIVERED — ${this.grade()}`,
        [
          `All three gates reached. Total score ${this.totalScore}.`,
          'Press ENTER to run the route again.',
        ],
      );
    }
  }
}

const game = new Game();

// Deterministic screenshot poses: fixed positions, no animation, so a
// screenshot always shows the same dramatic frame.
function applyShot(name) {
  game.frozen = true;
  renderer.time = 0.5236; // blink at full alpha, lanterns mid-pulse
  if (name === 'title') {
    game.screen = 'title';
    return;
  }
  if (name === 'yard') {
    game.loadLevel(0);
    game.screen = 'playing';
    game.player.x = 9.5 * TILE;
    game.player.y = 6.5 * TILE;
    game.player.facing = Math.PI / 2;
    game.guards[0].x = 9.5 * TILE;
    game.guards[0].y = 3.5 * TILE;
    game.guards[0].angle = Math.PI / 2;
    game.guards[1].x = 15.5 * TILE;
    game.guards[1].y = 10.5 * TILE;
    game.guards[1].angle = -Math.PI / 2;
    return;
  }
  if (name === 'garden' || name === 'alert') {
    game.loadLevel(1);
    game.screen = 'playing';
    game.elapsed = 34;
    if (name === 'garden') {
      // Courier mid-crossing between two cones, lantern pool, gate ahead.
      game.player.x = 12.5 * TILE;
      game.player.y = 8.5 * TILE;
      game.player.facing = 0;
      game.guards[0].x = 8.5 * TILE;
      game.guards[0].y = 7.5 * TILE;
      game.guards[0].angle = 0.35;
      game.guards[1].x = 17.5 * TILE;
      game.guards[1].y = 13.5 * TILE;
      game.guards[1].angle = Math.PI;
      game.guards[2].x = 12.5 * TILE;
      game.guards[2].y = 3.5 * TILE;
      game.guards[2].angle = Math.PI / 2;
    } else {
      // A guard has the courier: cone red, eye full, "!" overhead.
      game.player.x = 12.5 * TILE;
      game.player.y = 9.5 * TILE;
      game.player.facing = Math.PI;
      game.player.inLight = true;
      game.guards[0].x = 9.5 * TILE;
      game.guards[0].y = 7.5 * TILE;
      game.guards[0].angle = Math.PI / 2;
      game.guards[0].state = 'chase';
      game.guards[0].detect = 1;
      game.guards[0].lastSeen = { x: game.player.x, y: game.player.y };
      game.guards[1].x = 18.5 * TILE;
      game.guards[1].y = 13.5 * TILE;
      game.guards[1].angle = -Math.PI / 2;
      game.guards[1].state = 'suspicious';
      game.guards[1].detect = 0.7;
      game.guards[2].x = 12.5 * TILE;
      game.guards[2].y = 3.5 * TILE;
      game.guards[2].angle = Math.PI / 2;
    }
    return;
  }
  if (name === 'hall') {
    game.loadLevel(2);
    game.screen = 'playing';
    game.elapsed = 12;
    game.player.x = 5.5 * TILE;
    game.player.y = 8.5 * TILE;
    game.player.facing = 0;
    game.guards[0].x = 8.5 * TILE;
    game.guards[0].y = 4.5 * TILE;
    game.guards[0].angle = Math.PI / 2;
    game.guards[1].x = 15.5 * TILE;
    game.guards[1].y = 10.5 * TILE;
    game.guards[1].angle = -Math.PI / 2;
    game.guards[2].x = 10.5 * TILE;
    game.guards[2].y = 8.5 * TILE;
    game.guards[2].angle = 0;
    game.guards[3].x = 19.5 * TILE;
    game.guards[3].y = 6.5 * TILE;
    game.guards[3].angle = Math.PI / 2;
  }
}

// Headless play-test hooks: drive the real game logic, not the poses.
function applyTest(name) {
  if (name === 'move') {
    game.start();
    game.screen = 'playing';
    // Walk right for a while by faking the key state, then report.
    input.keys.add('d');
    setTimeout(() => {
      input.keys.delete('d');
      window.__test = { moved: game.player.x > game.level.playerStart.x + 20, x: game.player.x };
    }, 900);
  } else if (name === 'catch') {
    game.start();
    game.screen = 'playing';
    const g = game.guards[0];
    g.state = 'chase';
    g.detect = 1;
    g.x = game.player.x + 10;
    g.y = game.player.y;
    setTimeout(() => {
      window.__test = { screen: game.screen };
    }, 400);
  } else if (name === 'win') {
    game.start();
    game.screen = 'playing';
    game.player.x = game.level.exit.x;
    game.player.y = game.level.exit.y;
    setTimeout(() => {
      window.__test = { screen: game.screen, levelScore: game.levelScore };
    }, 400);
  }
}

if (shot) applyShot(shot);
else if (test) applyTest(test);

// Expose a little state for the headless play-test to read.
window.__game = game;
window.__shot = shot;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) {
    game.handleKeys();
    game.update(dt);
  }
  game.draw();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
