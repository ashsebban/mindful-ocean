import { CONFIG, MODE, PHASE } from './config.js';

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class UI {
  constructor(p) {
    this.p = p;
    this.relaxBtn = null;
    this.declutterBtn = null;
    this.breathingBtn = null;
    this.restartBtn = null;
  }

  _layout() {
    const p = this.p;
    const w = p.width, h = p.height;
    const pad = 12;
    const barW = Math.max(220, w - pad * 2);
    const bh = 34;
    const gap = 8;
    const bw = (barW - gap * 2) / 3;
    const bx = pad;
    const statW = Math.min(260, w * 0.5);
    const statH = 64;
    const statX = w - statW - pad;
    const statY = h - statH - pad;
    return { pad, bar: { x: bx, y: pad, w: bw, h: bh, gap }, status: { x: statX, y: statY, w: statW, h: statH } };
  }

  _drawButton(btn, label, active) {
    const p = this.p;
    p.noStroke();
    p.fill(active ? p.color(16, 88, 112, 185) : p.color(5, 20, 40, 150));
    p.rect(btn.x, btn.y, btn.w, btn.h, 8);
    p.fill(224, 248, 255, 230);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(Math.max(12, Math.min(14, p.width * 0.014)));
    p.text(label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 0.5);
  }

  draw(mode, fishCount, breathing, wisdom) {
    const layout = this._layout();
    this._drawModeButtons(layout, mode);
    this._drawStatusPanel(layout, mode, fishCount, breathing);
    this._drawBreathingGuide(mode, breathing);
    this._drawClearedCard(mode, fishCount, wisdom);
  }

  _drawModeButtons(layout, mode) {
    const { x, y, w, h, gap } = layout.bar;
    this.relaxBtn     = { x,               y, w, h };
    this.declutterBtn = { x: x + w + gap,   y, w, h };
    this.breathingBtn = { x: x + (w+gap)*2, y, w, h };
    this.restartBtn   = null;

    this._drawButton(this.relaxBtn,     'Relax Mode',          mode === MODE.RELAX);
    this._drawButton(this.declutterBtn, 'Declutter Your Mind', mode === MODE.DECLUTTER);
    this._drawButton(this.breathingBtn, 'Breathing Exercise',  mode === MODE.BREATHING);
  }

  _drawStatusPanel(layout, mode, fishCount, breathing) {
    const p = this.p;
    const { x, y, w, h } = layout.status;
    p.noStroke();
    p.fill(5, 20, 40, 145);
    p.rect(x, y, w, h, 10);
    p.fill(224, 248, 255, 220);
    p.textAlign(p.LEFT, p.TOP);

    if (mode === MODE.DECLUTTER) {
      p.textSize(Math.max(12, Math.min(16, p.width * 0.016)));
      p.text(`Fish: ${fishCount}`, x + 10, y + 10);
      p.textSize(Math.max(11, Math.min(14, p.width * 0.014)));
      p.text('Tap the fish and watch them swim away.', x + 10, y + 34);
    } else if (mode === MODE.BREATHING || mode === MODE.CLEARED) {
      p.textSize(Math.max(12, Math.min(16, p.width * 0.016)));
      p.text(`Fish: ${fishCount}`, x + 10, y + 10);
      p.textSize(Math.max(11, Math.min(14, p.width * 0.014)));
      p.text(`Breath: ${formatTime(breathing.remaining)}`, x + 10, y + 34);
    } else {
      p.textSize(Math.max(11, Math.min(14, p.width * 0.014)));
      p.text('Relax mode: enjoy the calm fish flow.', x + 10, y + 22);
    }
  }

  _drawBreathingGuide(mode, breathing) {
    if (mode !== MODE.BREATHING) return;
    const p = this.p;
    const cx = p.width * 0.5;
    const cy = p.height * 0.56;
    const ringT = breathing.phase === PHASE.INHALE ? breathing.phaseProgress : 1 - breathing.phaseProgress;
    const r = Math.min(p.width, p.height) * (0.1 + ringT * 0.12);

    p.noFill();
    p.stroke(204, 244, 255, 130);
    p.strokeWeight(2);
    p.circle(cx, cy, r * 2);
    p.stroke(204, 244, 255, 50);
    p.strokeWeight(1);
    p.circle(cx, cy, (r + 16) * 2);

    p.noStroke();
    p.fill(232, 251, 255, 215);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(Math.max(20, Math.min(32, p.width * 0.04)));
    p.text(breathing.phase === PHASE.INHALE ? 'Breathe: Inhale' : 'Breathe: Exhale', cx, cy - 8);
    p.textSize(Math.max(12, Math.min(16, p.width * 0.016)));
    p.fill(210, 240, 250, 200);
    p.text(`Time left ${formatTime(breathing.remaining)}`, cx, cy + 22);
  }

  _drawClearedCard(mode, fishCount, wisdom) {
    if (fishCount !== 0) return;
    const p = this.p;
    const cardW = Math.min(360, p.width * 0.72);
    const cardH = 130;
    const cardX = (p.width - cardW) / 2;
    const cardY = (p.height - cardH) / 2;

    p.noStroke();
    p.fill(5, 20, 40, 150);
    p.rect(cardX, cardY, cardW, cardH, 12);

    p.fill(232, 251, 255, 225);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(18, Math.min(28, p.width * 0.03)));
    p.text('Mind Cleared', cardX + cardW / 2, cardY + 16);

    p.textSize(Math.max(12, Math.min(16, p.width * 0.016)));
    p.fill(210, 240, 250, 190);
    p.text(wisdom, cardX + cardW / 2, cardY + 52);

    const rw = 132, rh = 34;
    this.restartBtn = {
      x: cardX + (cardW - rw) / 2,
      y: cardY + cardH - rh - 14,
      w: rw, h: rh
    };
    this._drawButton(this.restartBtn, 'Restart', true);
  }

  hitTest(px, py) {
    const hit = (btn) => !!btn && px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h;
    if (hit(this.restartBtn))   return 'restart';
    if (hit(this.declutterBtn)) return 'declutter';
    if (hit(this.breathingBtn)) return 'breathing';
    if (hit(this.relaxBtn))     return 'relax';
    return null;
  }
}
