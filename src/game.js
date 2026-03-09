import { CONFIG, WISDOM_LINES, MODE, PHASE, rand, nowMs } from './config.js';
import { Fish } from './fish.js';
import { ParticleSystem } from './particles.js';
import { BreathingEngine } from './breathing.js';
import { UI } from './ui.js';

export class Game {
  constructor(p) {
    this.p = p;
    this.mode = MODE.RELAX;
    this.fish = [];
    this.particles = new ParticleSystem(p);
    this.breathing = new BreathingEngine();
    this.ui = new UI(p);
    this.currentWisdom = '';
    this.lastNow = 0;
  }

  setup() {
    const p = this.p;
    const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('app');
    canvas.elt.style.touchAction = 'none';
    p.textFont('Avenir Next');
    this._reset(MODE.RELAX);
    this.lastNow = nowMs();

    const modal   = document.getElementById('intro-modal');
    const startBtn = document.getElementById('intro-start-btn');
    const skipBox  = document.getElementById('intro-skip');

    const close = () => {
      if (skipBox.checked) localStorage.setItem('fishtank-intro-hidden-v1', '1');
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    startBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    if (localStorage.getItem('fishtank-intro-hidden-v1') !== '1') {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  windowResized() {
    this.p.resizeCanvas(window.innerWidth, window.innerHeight);
    this._reset(this.mode);
  }

  draw() {
    const ts = nowMs();
    let dt = ts - this.lastNow;
    if (!Number.isFinite(dt) || dt <= 0) dt = 16;
    dt = Math.min(34, Math.max(9, dt));
    this.lastNow = ts;

    this._drawBackground(ts);
    this.particles.update(dt, ts);

    if (this.mode === MODE.BREATHING) {
      const done = this.breathing.update(dt, () => this._exhaleRelease());
      if (done) this._releaseAll();
    }

    this._updateFish(dt, ts);
    for (const f of this.fish) f.draw(ts);

    this.particles.drawFx(dt);

    if (this.fish.length === 0) this.mode = MODE.CLEARED;
    this.ui.draw(this.mode, this.fish.length, this.breathing, this.currentWisdom);
  }

  handlePress(x, y) {
    const action = this.ui.hitTest(x, y);
    if (action === 'restart')   { this._reset(MODE.RELAX); return; }
    if (action === 'declutter') { this.mode = MODE.DECLUTTER; return; }
    if (action === 'breathing') { this.mode = MODE.BREATHING; this.breathing.active = true; return; }
    if (action === 'relax')     { this.mode = MODE.RELAX; this.breathing.active = false; return; }
    this._tryPoke(x, y);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _reset(nextMode) {
    this.mode = nextMode;
    this.fish = [];
    for (let i = 0; i < CONFIG.fishCount; i++) {
      this.fish.push(new Fish(this.p, this.p.width, this.p.height));
    }
    this.particles.init(this.p.width, this.p.height);
    this.breathing.reset();
    this.currentWisdom = WISDOM_LINES[Math.floor(rand(0, WISDOM_LINES.length))];
  }

  _tryPoke(x, y) {
    if (this.mode !== MODE.DECLUTTER) return;
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      if (f.state !== 'school') continue;
      const dx = x - f.x, dy = y - f.y;
      const r = f.size * 0.55 + CONFIG.pokeRadiusPad;
      if (dx * dx + dy * dy <= r * r) {
        f.flee(x, y, true, this.particles);
        return;
      }
    }
  }

  _exhaleRelease() {
    const candidates = this.fish.filter(f => f.state === 'school');
    if (!candidates.length) return;
    const count = Math.min(
      candidates.length,
      Math.floor(rand(CONFIG.exhaleReleaseMin, CONFIG.exhaleReleaseMax + 1))
    );
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(rand(0, candidates.length));
      const f = candidates.splice(idx, 1)[0];
      f.flee(this.p.width * 0.5, this.p.height * 0.56, true, this.particles);
    }
    this.particles.emitExhaleBloom(this.p.width * 0.5, this.p.height * 0.56);
  }

  _releaseAll() {
    for (const f of this.fish) {
      if (f.state === 'school') f.flee(this.p.width * 0.5, -80, true, this.particles);
    }
  }

  _updateFish(dt, ts) {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      this.fish[i].update(dt, ts, this.mode, this.breathing.phase, this.particles);
      if (this.fish[i].isOut) this.fish.splice(i, 1);
    }
  }

  _drawBackground(ts) {
    const p = this.p;
    const w = p.width, h = p.height;
    p.background(7, 22, 44);

    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h);
      const c = p.lerpColor(p.color(8, 27, 56), p.color(4, 78, 103), Math.pow(t, 0.94));
      p.stroke(p.red(c), p.green(c), p.blue(c));
      p.line(0, y, w, y);
    }

    p.noStroke();
    const wave = ts * 0.0002;
    for (let i = 0; i < 3; i++) {
      const x = w * (0.12 + i * 0.33) + Math.sin(wave + i) * w * 0.04;
      p.fill(172, 234, 255, 8);
      p.quad(x, 0, x + w * 0.08, 0, x + w * 0.18, h, x - w * 0.13, h);
    }

    p.fill(4, 16, 36, 62);
    p.rect(0, h * 0.85, w, h * 0.15);
    this._drawKelp(ts);
  }

  _drawKelp(ts) {
    const p = this.p;
    const w = p.width, h = p.height;
    const baseY = h * 0.985;
    const bedY  = h * 0.86;
    const stalks = Math.max(6, Math.floor(w / 180));

    p.noFill();
    p.strokeWeight(2);
    for (let i = 0; i < stalks; i++) {
      const x    = ((i + 0.5) / stalks) * w + Math.sin(i * 4.9) * 8;
      const kh   = 55 + ((i * 37) % 55);
      const tipY = Math.max(bedY, baseY - kh);
      const sway = Math.sin(ts * 0.00055 + i * 0.9) * 11;
      const midY = (baseY + tipY) * 0.5;
      p.stroke(70, 130, 112, 30);
      p.bezier(x, baseY, x + sway * 0.2, midY + 12, x + sway * 0.8, midY - 10, x + sway, tipY);
    }
  }
}
