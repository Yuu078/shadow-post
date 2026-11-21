// SHADOW POST — render.js
// Everything the eye sees: indigo ground, pale paths, warm lantern pools,
// hedges and crates, vision cones clipped by walls, the hooded courier,
// the sentries, the exit gate, and the HUD — title cards, alert eye,
// coin count and ghost timer. All canvas, no images.

import { PALETTE, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './vision.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
  }

  drawGround(level) {
    const { ctx } = this;
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Checker of two indigos so the floor is never flat.
    for (let ty = 0; ty < level.map.length; ty++) {
      for (let tx = 0; tx < level.map[ty].length; tx++) {
        const ch = level.map[ty][tx];
        if (ch === ',') {
          ctx.fillStyle = PALETTE.path;
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        } else if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = PALETTE.groundAlt;
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }
    // Faint paving seams on the paths.
    ctx.strokeStyle = 'rgba(120, 135, 200, 0.10)';
    ctx.lineWidth = 1;
    for (let ty = 0; ty < level.map.length; ty++) {
      for (let tx = 0; tx < level.map[ty].length; tx++) {
        if (level.map[ty][tx] === ',') {
          ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
        }
      }
    }
  }

  drawBlockers(level) {
    const { ctx } = this;
    for (const b of level.blockers) {
      if (b.kind === 'wall') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(b.x, b.y, b.w, 7);
        ctx.strokeStyle = 'rgba(10, 12, 30, 0.6)';
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      } else if (b.kind === 'hedge') {
        ctx.fillStyle = PALETTE.hedge;
        roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 9);
        ctx.fill();
        ctx.fillStyle = PALETTE.hedgeTop;
        // Leafy dots so a hedge reads as a hedge, not a wall.
        for (let i = 0; i < 5; i++) {
          const lx = b.x + 7 + ((i * 7) % 26);
          const ly = b.y + 8 + ((i * 11) % 24);
          ctx.beginPath();
          ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (b.kind === 'crate') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
        ctx.strokeStyle = PALETTE.crateTop;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 6.5, b.y + 6.5, b.w - 13, b.h - 13);
        ctx.beginPath();
        ctx.moveTo(b.x + 3, b.y + 3);
        ctx.lineTo(b.x + b.w - 3, b.y + b.h - 3);
        ctx.moveTo(b.x + b.w - 3, b.y + 3);
        ctx.lineTo(b.x + 3, b.y + b.h - 3);
        ctx.stroke();
      }
    }
  }

  drawLanterns(level, pulse) {
    const { ctx } = this;
    for (const l of level.lanterns) {
      const r = 66 + Math.sin(pulse * 2 + l.x) * 4;
      const g = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, r);
      g.addColorStop(0, 'rgba(255, 190, 110, 0.34)');
      g.addColorStop(0.55, 'rgba(255, 176, 92, 0.16)');
      g.addColorStop(1, 'rgba(255, 176, 92, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
      // The lantern itself: a small post with a warm lamp.
      ctx.fillStyle = '#241a12';
      ctx.fillRect(l.x - 2, l.y - 2, 4, 12);
      ctx.fillStyle = PALETTE.lanternCore;
      ctx.beginPath();
      ctx.arc(l.x, l.y - 4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawExit(exit, pulse) {
    const { ctx } = this;
    const glow = 46 + Math.sin(pulse * 2.4) * 6;
    const g = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, glow + 30);
    g.addColorStop(0, 'rgba(127, 224, 168, 0.40)');
    g.addColorStop(1, 'rgba(127, 224, 168, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(exit.x - glow - 30, exit.y - glow - 30, (glow + 30) * 2, (glow + 30) * 2);
    // A green gate arch with a lit doorway.
    ctx.fillStyle = '#1d3a28';
    ctx.fillRect(exit.x - 15, exit.y - 18, 30, 36);
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.fillRect(exit.x - 9, exit.y - 12, 18, 30);
    ctx.fillStyle = '#0d1026';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('GATE', exit.x, exit.y + 30);
  }

  drawCones(guards, blockers) {
    const { ctx } = this;
    for (const guard of guards) {
      const poly = conePolygon(guard, blockers);
      const alarm = guard.alarm;
      const fill =
        alarm >= 0.9 ? PALETTE.coneAlert : alarm >= 0.45 ? PALETTE.coneWary : PALETTE.coneCalm;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = alarm >= 0.9 ? 'rgba(255, 90, 70, 0.55)' : 'rgba(255, 200, 110, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  drawCoins(ripples) {
    const { ctx } = this;
    for (const rip of ripples) {
      const p = rip.age / rip.life;
      if (p >= 1) continue;
      ctx.strokeStyle = `rgba(232, 194, 104, ${0.85 * (1 - p)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, 6 + p * 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(player) {
    const { ctx } = this;
    // Soft shadow under the courier.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded cloak: a circle with a darker hood and a facing tick.
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r - 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.playerHood;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
      player.x + Math.cos(player.facing) * (player.r + 3),
      player.y + Math.sin(player.facing) * (player.r + 3),
    );
    ctx.stroke();
    // The sealed letter: a tiny cream square at the courier's side.
    ctx.fillStyle = '#f4ead2';
    ctx.fillRect(player.x + 7, player.y + 5, 6, 8);
    ctx.strokeStyle = '#a33';
    ctx.lineWidth = 1;
    ctx.strokeRect(player.x + 7.5, player.y + 5.5, 5, 7);
  }

  drawGuard(guard) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 11, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Uniformed sentry: gold body, dark belt, helmet brim, direction tick.
    ctx.fillStyle = guard.state === 'chase' ? '#d84a3a' : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c2410';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.angle) * (guard.r + 6),
      guard.y + Math.sin(guard.angle) * (guard.r + 6),
    );
    ctx.stroke();
    // Helmet brim.
    ctx.fillStyle = '#5a4a22';
    ctx.beginPath();
    ctx.arc(
      guard.x + Math.cos(guard.angle) * 5,
      guard.y + Math.sin(guard.angle) * 5,
      5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // Detection meter ring above the guard's head.
    if (guard.detect > 0.03) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 22, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = guard.detect >= 1 ? '#ff5040' : '#ffb03c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 22, 8, -Math.PI / 2, -Math.PI / 2 + guard.detect * Math.PI * 2);
      ctx.stroke();
    }
    // "?" while suspicious, "!" while chasing.
    if (guard.state === 'suspicious' || guard.state === 'investigate') {
      this.drawMark(guard.x, guard.y - 38, '?', '#ffd27a');
    } else if (guard.state === 'chase') {
      this.drawMark(guard.x, guard.y - 38, '!', '#ff5040');
    }
  }

  drawMark(x, y, ch, color) {
    const { ctx } = this;
    ctx.font = 'bold 17px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(ch, x, y);
    ctx.fillStyle = color;
    ctx.fillText(ch, x, y);
  }

  // HUD: level name, objective, coins, alert eye, timer.
  drawHud(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(7, 8, 26, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${game.level.name}  ·  ${game.levelIndex + 1}/3`, 12, 22);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '13px Georgia, serif';
    ctx.fillText('Reach the green gate unseen', 220, 22);

    // Coins left.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(`◉ ${game.coins} coins`, VIEW_W - 150, 22);

    // Ghost timer.
    const t = game.elapsed;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`${mm}:${ss}`, VIEW_W - 84, 22);

    // Alert eye: opens and fills as the worst guard's alarm rises.
    const worst = game.guards.reduce((m, g) => Math.max(m, g.alarm), 0);
    const ex = VIEW_W - 28;
    const ey = 17;
    ctx.strokeStyle = worst >= 0.9 ? '#ff5040' : PALETTE.textDim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 11, 4 + worst * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = worst >= 0.9 ? '#ff5040' : '#e8c268';
    ctx.beginPath();
    ctx.arc(ex, ey, 2 + worst * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCenterCard(title, lines, accent = PALETTE.gold) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(7, 8, 26, 0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 46px Georgia, serif';
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '18px Georgia, serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 6 + i * 28);
    });
  }

  drawTitle() {
    const { ctx } = this;
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Faint moon and lantern glows behind the title.
    const g = ctx.createRadialGradient(760, 110, 10, 760, 110, 220);
    g.addColorStop(0, 'rgba(200, 210, 255, 0.20)');
    g.addColorStop(1, 'rgba(200, 210, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(520, -110, 480, 440);
    ctx.fillStyle = '#dfe4ff';
    ctx.beginPath();
    ctx.arc(760, 110, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ground;
    ctx.beginPath();
    ctx.arc(748, 102, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('SHADOW POST', VIEW_W / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillText('A night courier. Three palace grounds. One sealed letter.', VIEW_W / 2, 292);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px Georgia, serif';
    ctx.fillText('WASD / arrows to move · Shift to creep · click or Space to toss a coin', VIEW_W / 2, 340);
    ctx.fillText('Hide in shadow — lantern light betrays you. Reach the green gate.', VIEW_W / 2, 366);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px Georgia, serif';
    const blink = 0.6 + 0.4 * Math.sin(this.time * 3);
    ctx.globalAlpha = blink;
    ctx.fillText('Press ENTER to begin', VIEW_W / 2, 440);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '13px Georgia, serif';
    ctx.fillText('Best played with sound on · M mutes · R restarts a level', VIEW_W / 2, 480);
  }

  // A vignette darkens the corners so the night feels like night.
  drawVignette() {
    const { ctx } = this;
    const g = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
