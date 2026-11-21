// SHADOW POST — audio.js
// All sound is synthesized with WebAudio: no audio files, no network.
// Soft steps, a coin chime, an alert sting and a success arpeggio.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.stepFlip = false;
  }

  // Browsers only let audio start after a user gesture; call this from
  // the first key or click so later sounds are allowed to play.
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One short tone: frequency, seconds, shape, volume, optional slide.
  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A quiet footstep; pitch alternates so walking has a rhythm.
  step(creep) {
    this.stepFlip = !this.stepFlip;
    this.tone(this.stepFlip ? 170 : 150, 0.07, 'triangle', creep ? 0.02 : 0.045, 90);
  }

  coin() {
    this.tone(1180, 0.16, 'sine', 0.10);
    this.tone(1760, 0.22, 'sine', 0.08, null, 0.07);
  }

  alert() {
    this.tone(220, 0.28, 'sawtooth', 0.09, 440);
    this.tone(330, 0.22, 'sawtooth', 0.06, 495, 0.1);
  }

  suspicious() {
    this.tone(392, 0.14, 'triangle', 0.07, 330);
  }

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.11, 98);
    this.tone(147, 0.5, 'square', 0.05, 73, 0.08);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, null, i * 0.11));
  }

  levelStart() {
    this.tone(392, 0.18, 'sine', 0.07);
    this.tone(523, 0.24, 'sine', 0.07, null, 0.12);
  }
}
