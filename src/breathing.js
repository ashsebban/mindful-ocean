import { CONFIG, PHASE, rand } from './config.js';

export class BreathingEngine {
  constructor() {
    this.active = false;
    this.elapsedMs = 0;
    this.phase = PHASE.INHALE;
    this.phaseElapsedMs = 0;
  }

  reset() {
    this.active = false;
    this.elapsedMs = 0;
    this.phase = PHASE.INHALE;
    this.phaseElapsedMs = 0;
  }

  // Returns true if the session just finished (fish should all be released)
  // Calls onExhale() each time an exhale phase starts
  update(dt, onExhale) {
    this.elapsedMs = Math.min(CONFIG.breathTotalMs, this.elapsedMs + dt);
    this.phaseElapsedMs += dt;

    const currentPhaseMs = this.phase === PHASE.INHALE ? CONFIG.inhaleMs : CONFIG.exhaleMs;
    if (this.phaseElapsedMs >= currentPhaseMs) {
      this.phaseElapsedMs -= currentPhaseMs;
      if (this.phase === PHASE.INHALE) {
        this.phase = PHASE.EXHALE;
        onExhale();
      } else {
        this.phase = PHASE.INHALE;
      }
    }

    return this.elapsedMs >= CONFIG.breathTotalMs;
  }

  get remaining() {
    return Math.max(0, CONFIG.breathTotalMs - this.elapsedMs);
  }

  get phaseProgress() {
    const ms = this.phase === PHASE.INHALE ? CONFIG.inhaleMs : CONFIG.exhaleMs;
    return Math.min(1, this.phaseElapsedMs / ms);
  }
}
