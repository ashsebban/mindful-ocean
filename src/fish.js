import { CONFIG, MODE, PHASE, rand, nowMs } from './config.js';

export class Fish {
  constructor(p, w, h) {
    this.p = p;
    const lane      = rand(h * 0.3, h * 0.9);
    const size      = rand(25, 41);
    const baseSpeed = rand(CONFIG.streamSpeedMin, CONFIG.streamSpeedMax);
    const baseCadence = rand(CONFIG.tailCadenceMin, CONFIG.tailCadenceMax);
    const dir       = CONFIG.streamDir;

    this.x = rand(-w * 0.3, w * 1.2);
    this.y = lane;
    this.laneY = lane;
    this.size = size;
    this.shade = rand(112, 190);
    this.alpha = rand(165, 235);

    this.state = 'school';
    this.dir = dir;
    this.heading = dir > 0 ? 0 : Math.PI;
    this.headingTarget = dir > 0 ? 0 : Math.PI;

    this.speedBase = baseSpeed;
    this.speed = baseSpeed;
    this.vx = baseSpeed * dir;
    this.vy = 0;

    this.tailPhase = rand(0, Math.PI * 2);
    this.tailStrokePrev = rand(-0.5, 0.5);
    this.tailCadenceBase = baseCadence;
    this.tailCadence = baseCadence;
    this.tailCadenceTarget = baseCadence;
    this.swishStreak = 0;
    this.lastSwishAt = 0;
    this.cadenceBias = 1;
    this.cadenceBiasTarget = rand(CONFIG.cadenceDriftMin, CONFIG.cadenceDriftMax);
    this.nextCadenceShiftMs = 0;
    this.thrust = 0;

    this.fleeDirX = dir;
    this.fleeTargetY = lane;
    this.nextTrailEmitMs = 0;
    this.burstUntilMs = 0;
    this.wigglePhase = rand(0, Math.PI * 2);
  }

  // Returns true if the fish is fully off-screen and should be removed (flee state only)
  get isOut() {
    return this.state === 'flee' && (
      this.x < -this.size * 2.5 || this.x > this.p.width + this.size * 2.5 ||
      this.y < -this.size * 2.5 || this.y > this.p.height + this.size * 2.5
    );
  }

  flee(fromX, fromY, biasToEdge, particles) {
    const p = this.p;
    const w = p.width, h = p.height;
    const targetX = biasToEdge
      ? (this.x < w * 0.5 ? -80 : w + 80)
      : (this.x + (this.dir > 0 ? 120 : -120));

    this.state       = 'flee';
    this.fleeDirX    = targetX > this.x ? 1 : -1;
    this.fleeTargetY = Math.min(Math.max(this.y + rand(-24, 24), h * 0.2), h * 0.86);
    this.headingTarget = Math.atan2(this.fleeTargetY - this.y, targetX - this.x);
    this.heading       = this.headingTarget;
    this.burstUntilMs  = nowMs() + CONFIG.fleeBurstMs;
    this.tailCadence   = Math.max(this.tailCadence, this.tailCadenceBase * 3.5);
    this.tailCadenceTarget = this.tailCadenceBase * CONFIG.fleeBurstCadenceBoost;
    this.speed   = Math.max(this.speed, this.speedBase * CONFIG.fleeBurstMinSpeedFactor);
    this.thrust += 1.35;
    this.nextTrailEmitMs = nowMs() + rand(CONFIG.fleeTrailIntervalFastMs, CONFIG.fleeTrailIntervalSlowMs);

    particles.addPop(this.x, this.y);
    particles.emitTapPop(this.x - this.dir * this.size * 0.45, this.y, this.vx);
  }

  update(dt, ts, mode, breathPhase, particles) {
    const p = this.p;
    const w = p.width, h = p.height;
    const breathingPhaseScale =
      mode === MODE.BREATHING
        ? (breathPhase === PHASE.INHALE ? 0.9 : 1.12)
        : 1;

    if (this.state === 'school') {
      if (!(mode === MODE.DECLUTTER || mode === MODE.BREATHING)) {
        this.dir = CONFIG.streamDir;
      }
      if (ts >= this.nextCadenceShiftMs) {
        this.cadenceBiasTarget = rand(CONFIG.cadenceDriftMin, CONFIG.cadenceDriftMax);
        this.nextCadenceShiftMs = ts + rand(CONFIG.cadenceShiftMinMs, CONFIG.cadenceShiftMaxMs);
      }
      this.cadenceBias = p.lerp(this.cadenceBias, this.cadenceBiasTarget, 0.01);
      this.headingTarget = this.dir > 0 ? 0 : Math.PI;
      this.headingTarget += Math.sin(ts * 0.001 + this.wigglePhase) * 0.06;
      this.laneY = p.constrain(this.laneY, h * 0.22, h * 0.86);
      this.tailCadenceTarget = this.tailCadenceBase * breathingPhaseScale * this.cadenceBias;
    } else {
      const exitX = this.fleeDirX > 0 ? w + 120 : -120;
      this.headingTarget = Math.atan2(this.fleeTargetY - this.y, exitX - this.x);
      const inBurst = ts < this.burstUntilMs;
      this.tailCadenceTarget = this.tailCadenceBase * (inBurst ? CONFIG.fleeBurstCadenceBoost : CONFIG.fleeCadenceBoost);
    }

    const cadenceLerp = this.tailCadenceTarget > this.tailCadence ? CONFIG.tailCadenceRise : CONFIG.tailCadenceFall;
    this.tailCadence = p.lerp(this.tailCadence, this.tailCadenceTarget, cadenceLerp);

    const cadenceRatio = this.tailCadence / Math.max(0.0001, this.tailCadenceBase);
    const stroke = Math.sin(ts * this.tailCadence + this.tailPhase);
    const didSwish = stroke >= CONFIG.swishThreshold && this.tailStrokePrev < CONFIG.swishThreshold;
    this.tailStrokePrev = stroke;

    if (didSwish) {
      const chainContinues = ts - this.lastSwishAt <= CONFIG.swishChainWindowMs;
      this.swishStreak = chainContinues ? Math.min(CONFIG.swishStreakMax, this.swishStreak + 1) : 1;
      this.lastSwishAt = ts;
      const streakMult = Math.min(CONFIG.swishImpulseMaxMult, 1 + (this.swishStreak - 1) * CONFIG.swishImpulseStep);
      this.thrust += CONFIG.swishImpulseBase * streakMult * cadenceRatio;
    }

    this.thrust *= CONFIG.thrustDecay;
    this.speed  += this.thrust * CONFIG.accelScale * dt;
    this.speed  *= Math.pow(CONFIG.dragBase, dt / 16);

    const cruiseScale   = this.state === 'school' ? CONFIG.schoolCruiseScale : 1;
    const targetCruise  = this.speedBase * cadenceRatio * cruiseScale;
    const inBurst       = ts < this.burstUntilMs;
    const maxFactor     = this.state === 'school' ? CONFIG.schoolMaxFactor : (inBurst ? CONFIG.fleeBurstSpeedMaxFactor : CONFIG.fleeSpeedMaxFactor);
    const minFactor     = this.state === 'flee' ? (inBurst ? CONFIG.fleeBurstMinSpeedFactor : CONFIG.fleeMinSpeedFactor) : CONFIG.speedMinFactor;

    this.speed = p.lerp(this.speed, targetCruise, 0.026);
    this.speed = p.constrain(this.speed, this.speedBase * minFactor, this.speedBase * maxFactor);

    const headingLerp = this.state === 'flee'
      ? (inBurst ? CONFIG.fleeBurstHeadingLerp : CONFIG.fleeHeadingLerp)
      : 0.06;
    this.heading = p.lerp(this.heading, this.headingTarget, headingLerp);
    this.vx = Math.cos(this.heading) * this.speed;
    this.vy = Math.sin(this.heading) * this.speed * 0.72;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.y += (this.laneY - this.y) * 0.006 * dt;

    if (this.state === 'school') {
      this._handleSchoolBounds(w, h, mode);
    } else {
      this._handleFleeBounds(w, ts, particles);
    }

    this.y = p.constrain(this.y, h * 0.16, h * 0.9);
  }

  draw(ts) {
    const { p, x, y, size, shade, alpha, heading, tailCadence, tailPhase } = this;
    const tailSwish = Math.sin(ts * tailCadence + tailPhase) * 0.12;
    const facing = Math.cos(heading) >= 0 ? 1 : -1;

    p.push();
    p.translate(x, y);
    p.scale(facing, 1);
    p.noStroke();
    p.fill(30, shade, shade + 36, alpha);
    p.ellipse(0, 0, size * 1.15, size * 0.54);
    p.fill(22, shade - 10, shade + 18, alpha * 0.9);
    p.triangle(-size * 0.62, 0, -size * 0.94, -size * (0.22 + tailSwish), -size * 0.94, size * (0.22 - tailSwish));
    p.fill(232, 252, 255, alpha * 0.75);
    p.circle(size * 0.22, -size * 0.06, size * 0.09);
    p.fill(16, 28, 42, alpha);
    p.circle(size * 0.3, -size * 0.05, size * 0.05);
    p.pop();
  }

  _handleSchoolBounds(w, h, mode) {
    const p = this.p;
    if (mode === MODE.DECLUTTER || mode === MODE.BREATHING) {
      const edgePad = this.size * 0.9;
      const minTurnSpeed = this.speedBase * 1.12;
      if (this.x > w - edgePad) {
        this.x = w - edgePad - 1.6;
        this.dir = -1; this.heading = Math.PI; this.headingTarget = Math.PI;
        this.speed = Math.max(this.speed, minTurnSpeed); this.thrust += 0.2;
      } else if (this.x < edgePad) {
        this.x = edgePad + 1.6;
        this.dir = 1; this.heading = 0; this.headingTarget = 0;
        this.speed = Math.max(this.speed, minTurnSpeed); this.thrust += 0.2;
      } else {
        const nearRight = this.x > w - edgePad * 1.6;
        const nearLeft  = this.x < edgePad * 1.6;
        if ((nearRight || nearLeft) && this.speed < this.speedBase * 0.82) {
          this.dir = nearRight ? -1 : 1;
          this.headingTarget = this.dir > 0 ? 0 : Math.PI;
          this.speed = Math.max(this.speed, this.speedBase * 0.9);
          this.thrust += 0.12;
        }
      }
    } else {
      if (CONFIG.streamDir > 0 && this.x > w + this.size * 1.8) {
        this.x = -this.size * 1.8;
        this.y = rand(h * 0.22, h * 0.82);
        this.laneY = this.y;
      }
      if (CONFIG.streamDir < 0 && this.x < -this.size * 1.8) {
        this.x = w + this.size * 1.8;
        this.y = rand(h * 0.22, h * 0.82);
        this.laneY = this.y;
      }
    }
  }

  _handleFleeBounds(w, ts, particles) {
    if (this.fleeDirX > 0 && this.x > w - this.size * 0.6) {
      this.headingTarget = 0;
      this.speed = Math.max(this.speed, this.speedBase * 1.2);
      this.thrust += 0.18;
    } else if (this.fleeDirX < 0 && this.x < this.size * 0.6) {
      this.headingTarget = Math.PI;
      this.speed = Math.max(this.speed, this.speedBase * 1.2);
      this.thrust += 0.18;
    }

    const t = nowMs();
    if (t >= this.nextTrailEmitMs) {
      const tailX = this.x - Math.sign(Math.cos(this.heading) || 1) * this.size * 0.5;
      const tailY = this.y + rand(-2.2, 2.2);
      particles.emitFleeTrail(tailX, tailY, this.vx, this.vy);
      const fastness = Math.min(1, Math.max(0, (this.speed - this.speedBase) / (this.speedBase * 1.2)));
      const nextInterval = CONFIG.fleeTrailIntervalSlowMs - fastness * (CONFIG.fleeTrailIntervalSlowMs - CONFIG.fleeTrailIntervalFastMs);
      this.nextTrailEmitMs = t + nextInterval;
    }
  }
}
