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
    // Hedge tiles connect into continuous strips: remember which tiles
    // are hedges so only exposed edges get a border.
    const hedgeAt = new Set(
      level.blockers.filter((b) => b.kind === 'hedge').map((b) => `${b.x / TILE},${b.y / TILE}`),
    );
    for (const b of level.blockers) {
      if (b.kind === 'wall') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(b.x, b.y, b.w, 7);
        ctx.strokeStyle = 'rgba(10, 12, 30, 0.6)';
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      } else if (b.kind === 'hedge') {
        // One continuous bush: full tile, no gaps between neighbours,
        // leaf clusters seeded by the tile so the pattern never repeats
        // identically from tile to tile.
        ctx.fillStyle = PALETTE.hedge;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        const tx = b.x / TILE;
        const ty = b.y / TILE;
        const seed = (tx * 31 + ty * 17) % 7;
        ctx.fillStyle = PALETTE.hedgeTop;
        for (let i = 0; i < 6; i++) {
          const lx = b.x + 6 + ((i * 11 + seed * 5) % 28);
          const ly = b.y + 6 + ((i * 7 + seed * 3) % 28);
          ctx.beginPath();
          ctx.arc(lx, ly, 3.4 + ((i + seed) % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(b.x + 10 + seed * 3, b.y + 26, 4, 0, Math.PI * 2);
        ctx.fill();
        // Border only where a neighbour is not a hedge.
        ctx.strokeStyle = 'rgba(8, 20, 12, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (!hedgeAt.has(`${tx},${ty - 1}`)) { ctx.moveTo(b.x, b.y + 0.75); ctx.lineTo(b.x + b.w, b.y + 0.75); }
        if (!hedgeAt.has(`${tx},${ty + 1}`)) { ctx.moveTo(b.x, b.y + b.h - 0.75); ctx.lineTo(b.x + b.w, b.y + b.h - 0.75); }
        if (!hedgeAt.has(`${tx - 1},${ty}`)) { ctx.moveTo(b.x + 0.75, b.y); ctx.lineTo(b.x + 0.75, b.y + b.h); }
        if (!hedgeAt.has(`${tx + 1},${ty}`)) { ctx.moveTo(b.x + b.w - 0.75, b.y); ctx.lineTo(b.x + b.w - 0.75, b.y + b.h); }
        ctx.stroke();
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
    const glow = 52 + Math.sin(pulse * 2.4) * 6;
    // Emerald light spill onto the tiles in front of the gate, so the
    // goal reads as a beacon from across the level.
    const g = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, glow + 46);
    g.addColorStop(0, 'rgba(127, 224, 168, 0.42)');
    g.addColorStop(0.5, 'rgba(127, 224, 168, 0.14)');
    g.addColorStop(1, 'rgba(127, 224, 168, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(exit.x - glow - 46, exit.y - glow - 46, (glow + 46) * 2, (glow + 46) * 2);
    // A palace archway: stone posts, a rounded top, a bright lit doorway.
    ctx.fillStyle = '#31406b';
    ctx.fillRect(exit.x - 18, exit.y - 20, 7, 40);
    ctx.fillRect(exit.x + 11, exit.y - 20, 7, 40);
    ctx.fillStyle = '#3a4d80';
    ctx.beginPath();
    ctx.arc(exit.x, exit.y - 19, 18, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#9ff0c0';
    ctx.fillRect(exit.x - 11, exit.y - 16, 22, 36);
    ctx.fillStyle = '#d8ffe6';
    ctx.fillRect(exit.x - 7, exit.y - 12, 14, 32);
    ctx.fillStyle = '#12351f';
    ctx.beginPath();
    ctx.moveTo(exit.x - 11, exit.y + 4);
    ctx.lineTo(exit.x, exit.y - 12);
    ctx.lineTo(exit.x + 11, exit.y + 4);
    ctx.lineTo(exit.x, exit.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 20, 8, 0.9)';
    ctx.strokeText('GATE', exit.x, exit.y + 36);
    ctx.fillStyle = '#eafff0';
    ctx.fillText('GATE', exit.x, exit.y + 36);
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
    const fx = Math.cos(player.facing);
    const fy = Math.sin(player.facing);
    // Soft shadow under the courier.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trailing scarf: two fluttering ribbons behind the movement direction.
    ctx.strokeStyle = '#7a5a8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x - fx * 8, player.y - fy * 8);
    ctx.quadraticCurveTo(
      player.x - fx * 20, player.y - fy * 20 + 4,
      player.x - fx * 24, player.y - fy * 24 - 3,
    );
    ctx.moveTo(player.x - fx * 8, player.y - fy * 8);
    ctx.quadraticCurveTo(
      player.x - fx * 18, player.y - fy * 18 - 5,
      player.x - fx * 22, player.y - fy * 22 + 4,
    );
    ctx.stroke();
    // Hooded cloak: a dark hood ring around a pale face, with shoulders
    // so the courier reads as a person, not an orb.
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    // Shoulder pads left and right of the facing direction.
    ctx.fillStyle = '#3a3157';
    ctx.beginPath();
    ctx.arc(player.x - fy * 9, player.y + fx * 9, 5, 0, Math.PI * 2);
    ctx.arc(player.x + fy * 9, player.y - fx * 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r - 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Hood point and a facing tick so the direction is readable.
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath();
    ctx.moveTo(player.x + fx * 6, player.y + fy * 6);
    ctx.lineTo(player.x + fx * (player.r + 4), player.y + fy * (player.r + 4));
    ctx.lineTo(player.x + fx * 2 - fy * 3, player.y + fy * 2 + fx * 3);
    ctx.closePath();
    ctx.fill();
    // The sealed letter: a tiny cream square with a red seal, carried
    // at the courier's side.
    ctx.fillStyle = '#f4ead2';
    ctx.fillRect(player.x + 7, player.y + 5, 6, 8);
    ctx.strokeStyle = '#a33';
    ctx.lineWidth = 1;
    ctx.strokeRect(player.x + 7.5, player.y + 5.5, 5, 7);
  }

  drawGuard(guard) {
    const { ctx } = this;
    const fx = Math.cos(guard.angle);
    const fy = Math.sin(guard.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 11, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // A handheld spear, held forward: the guard's orientation is readable
    // even where the cone is clipped away by a wall.
    ctx.strokeStyle = '#6a5636';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x - fx * 6, guard.y - fy * 6);
    ctx.lineTo(guard.x + fx * (guard.r + 12), guard.y + fy * (guard.r + 12));
    ctx.stroke();
    ctx.fillStyle = '#c8b06a';
    ctx.beginPath();
    ctx.moveTo(guard.x + fx * (guard.r + 18), guard.y + fy * (guard.r + 18));
    ctx.lineTo(guard.x + fx * (guard.r + 8) - fy * 3.5, guard.y + fy * (guard.r + 8) + fx * 3.5);
    ctx.lineTo(guard.x + fx * (guard.r + 8) + fy * 3.5, guard.y + fy * (guard.r + 8) - fx * 3.5);
    ctx.closePath();
    ctx.fill();
    // Uniformed sentry: gold body, dark belt, shoulder bars, helmet brim.
    ctx.fillStyle = guard.state === 'chase' ? '#d84a3a' : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r - 5, 0, Math.PI * 2);
    ctx.fill();
    // Shoulder bars across the facing direction.
    ctx.strokeStyle = '#2c2410';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x - fy * 11, guard.y + fx * 11);
    ctx.lineTo(guard.x + fy * 11, guard.y - fx * 11);
    ctx.stroke();
    // Helmet brim.
    ctx.fillStyle = '#5a4a22';
    ctx.beginPath();
    ctx.arc(guard.x + fx * 5, guard.y + fy * 5, 5, 0, Math.PI * 2);
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
