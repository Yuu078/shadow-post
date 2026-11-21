[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Yuu078/shadow-post/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Yuu078/shadow-post/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# SHADOW POST

A night courier stealth game. Cross three lantern-lit palace grounds with a
sealed letter, slip past patrolling sentries, and reach the green gate unseen.

## Play

Open `game/index.html` in a desktop browser — no build step, no network, no
libraries. Vanilla canvas + WebAudio.

- **WASD / arrows** — move
- **Shift** — creep (slow, silent, harder to spot)
- **Click or Space** — toss a coin to distract a guard (3 per level)
- **R** — restart level · **P** — pause · **M** — mute

## The game

- **Vision cones clipped by walls** — raycast occlusion, so hedges, crates and
  stone walls really hide you. Cones turn orange, then red, as alarm rises.
- **Detection that gives you a chance** — the meter fills by distance and by
  light (lantern pools betray you ~2x faster), drains in shadow, and guards
  go patrol → suspicious → investigate → chase, then calm down again.
- **Noise matters** — running is heard; creeping is not.
- **Three handcrafted levels** — Courtyard, Garden Maze, Lantern Hall — with
  intro cards, a win screen with total score and a Ghost / Shadow / Footpad
  grade, and a caught screen with retry.
- **Sound, synthesized** — footsteps, coin chime, alert sting, success
  arpeggio. No audio files.
- **Score** — par-time bonus, Ghost bonus for never being fully spotted, and
  coins left over.

## Screenshots

`01-cover` is the Garden Maze at its most dramatic: the courier mid-crossing
between two cones. `02-title` is the title screen, `03-alert` a guard in full
chase, `04-hall` the Lantern Hall's crossing patrols. All four are real renders
of this code in headless Chrome; `?shot=title|yard|garden|hall|alert` poses the
same deterministic frames.

## Layout

```
main.ts                  entry program: copies game/ + screenshots/ to /output
                         and writes dossier.json with vendor/makefun-game.ts
vendor/makefun-game.ts   kit library, unchanged
game/
  index.html             page shell
  style.css              page chrome
  src/config.js          board, speeds, vision, palette
  src/levels.js          three handcrafted levels (ASCII maps + patrols)
  src/vision.js          raycast line-of-sight and cone polygons
  src/entities.js        courier movement, guard AI states
  src/audio.js           WebAudio-synthesized sound
  src/input.js           keyboard + mouse
  src/render.js          canvas drawing: ground, cones, HUD, screens
  src/main.js            loop, state machine, screenshot scene hooks
screenshots/             four real renders (first by name is the cover)
```

## Entry

Built for the make.fun competition
[best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759).
MIT licensed.
