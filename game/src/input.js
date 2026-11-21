// SHADOW POST — input.js
// Keyboard + mouse, kept in one place so the game loop only ever asks
// "which way is the courier walking" and "did the player just click".

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.clicks = []; // queued {x, y} in canvas pixels
    this.pressed = new Set(); // keys hit since the last frame was read

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clicks.push({
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      });
    });
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once for a key hit since the last call to endFrame().
  hit(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  // Movement vector from WASD or arrows, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  get creeping() {
    return this.down('Shift');
  }

  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  endFrame() {
    this.pressed.clear();
  }
}
