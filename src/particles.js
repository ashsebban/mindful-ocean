import { CONFIG, rand, nowMs } from './config.js';

export class ParticleSystem {
  constructor(p) {
    this.p = p;
    this.particles = [];
    this.ambientBubbles = [];
    this.pops = [];
    this.tapPop = [];
    this.fleeTrail = [];
    this.exhaleBloom = [];
  }

  init(w, h) {
    this.particles = [];
    this.ambientBubbles = [];
    this.pops = [];
    this.tapPop = [];
    this.fleeTrail = [];
    this.exhaleBloom = [];

    for (let i = 0; i < CONFIG.particleCount; i++) this.particles.push(this._makeParticle(w, h));
    for (let i = 0; i < CONFIG.ambientBubbleCount; i++) this.ambientBubbles.push(this._makeBubble(w, h, true));
  }

  _makeParticle(w, h) {
    return {
      x: rand(0, w), y: rand(0, h),
      r: rand(0.8, 2),
      vx: rand(-0.015, 0.02), vy: rand(-0.06, -0.015),
      a: rand(10, 24)
    };
  }

  _makeBubble(w, h, spawnAnywhere) {
    return {
      x: rand(0, w),
      y: spawnAnywhere ? rand(0, h) : rand(h, h + 80),
      r: rand(2.4, 5.6),
      vy: rand(0.08, 0.18),
      wobble: rand(0, Math.PI * 2),
      amp: rand(0.08, 0.28),
      a: rand(15, 40)
    };
  }

  _pushCapped(channel, cap, entry) {
    channel.push(entry);
    if (channel.length > cap) channel.splice(0, channel.length - cap);
  }

  addPop(x, y) {
    this.pops.push({ x, y, bornAt: nowMs() });
    if (this.pops.length > 36) this.pops.shift();
  }

  emitTapPop(x, y, vxHint = 0) {
    const count = Math.floor(rand(CONFIG.tapPopCountMin, CONFIG.tapPopCountMax + 1));
    const t = nowMs();
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(0.045, 0.11);
      this._pushCapped(this.tapPop, CONFIG.tapPopCap, {
        x: x + rand(-5, 5), y: y + rand(-4, 4),
        burstVx: Math.cos(a) * sp + vxHint * 0.02,
        burstVy: Math.sin(a) * sp,
        floatVy: rand(0.06, 0.14),
        r: rand(2.0, 3.8),
        bornAt: t,
        lifeMs: rand(CONFIG.tapPopLifeMinMs, CONFIG.tapPopLifeMaxMs),
        wobble: rand(0, Math.PI * 2)
      });
    }
  }

  emitFleeTrail(x, y, vxHint = 0, vyHint = 0) {
    this._pushCapped(this.fleeTrail, CONFIG.fleeTrailCap, {
      x: x + rand(-1.8, 1.8), y: y + rand(-1.5, 1.5),
      vx: rand(-0.015, 0.015) + vxHint * 0.022,
      vy: rand(0.07, 0.13) + Math.max(0, -vyHint) * 0.02,
      r: rand(0.9, 1.7),
      bornAt: nowMs(),
      lifeMs: rand(CONFIG.fleeTrailLifeMinMs, CONFIG.fleeTrailLifeMaxMs),
      wobble: rand(0, Math.PI * 2)
    });
  }

  emitExhaleBloom(cx, cy) {
    const count = Math.floor(rand(CONFIG.exhaleBloomCountMin, CONFIG.exhaleBloomCountMax + 1));
    const t = nowMs();
    for (let i = 0; i < count; i++) {
      this._pushCapped(this.exhaleBloom, CONFIG.exhaleBloomCap, {
        x: cx + rand(-20, 20), y: cy + rand(-12, 12),
        vx: rand(-0.012, 0.012),
        vy: rand(0.07, 0.13),
        r: rand(1.0, 2.0),
        bornAt: t,
        lifeMs: rand(CONFIG.exhaleBloomLifeMinMs, CONFIG.exhaleBloomLifeMaxMs),
        wobble: rand(0, Math.PI * 2)
      });
    }
  }

  update(dt, ts) {
    const p = this.p;
    const w = p.width, h = p.height;

    // Dust particles
    p.noStroke();
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.y < -3) pt.y = h + 3;
      if (pt.x < -3) pt.x = w + 3;
      if (pt.x > w + 3) pt.x = -3;
      p.fill(210, 245, 255, pt.a);
      p.circle(pt.x, pt.y, pt.r);
    }

    // Ambient bubbles
    p.noFill();
    p.strokeWeight(1);
    for (let i = 0; i < this.ambientBubbles.length; i++) {
      const b = this.ambientBubbles[i];
      b.y -= b.vy * dt * 0.06;
      b.wobble += 0.01 * dt;
      b.x += Math.sin(b.wobble + ts * 0.00045) * b.amp * 0.08;
      if (b.y < -10) {
        this.ambientBubbles[i] = this._makeBubble(w, h, false);
        continue;
      }
      p.stroke(208, 242, 255, b.a);
      p.circle(b.x, b.y, b.r * 2);
    }
  }

  drawFx(dt) {
    const p = this.p;
    const t = nowMs();

    // Pop rings
    p.noFill();
    p.strokeWeight(1);
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pop = this.pops[i];
      const age = t - pop.bornAt;
      if (age > CONFIG.popLifeMs) { this.pops.splice(i, 1); continue; }
      const alpha = (1 - age / CONFIG.popLifeMs) * 72;
      p.stroke(218, 246, 255, alpha);
      p.circle(pop.x, pop.y, 4 + age * 0.05);
      p.stroke(218, 246, 255, alpha * 0.55);
      p.circle(pop.x, pop.y, 1.8 + age * 0.03);
    }

    // Flee trail bubbles
    for (let i = this.fleeTrail.length - 1; i >= 0; i--) {
      const b = this.fleeTrail[i];
      const age = t - b.bornAt;
      if (age >= b.lifeMs) { this.fleeTrail.splice(i, 1); continue; }
      b.wobble += 0.009 * dt;
      b.x += b.vx * dt + Math.sin(b.wobble) * 0.022 * dt;
      b.y -= b.vy * dt;
      p.stroke(220, 248, 255, (1 - age / b.lifeMs) * CONFIG.fleeTrailAlphaMax);
      p.circle(b.x, b.y, b.r * 2);
    }

    // Tap pop bubbles
    for (let i = this.tapPop.length - 1; i >= 0; i--) {
      const b = this.tapPop[i];
      const age = t - b.bornAt;
      if (age >= b.lifeMs) { this.tapPop.splice(i, 1); continue; }
      b.wobble += 0.014 * dt;
      if (age < CONFIG.tapBurstImpulseMs) {
        b.x += b.burstVx * dt;
        b.y += b.burstVy * dt;
        b.burstVx *= 0.9;
        b.burstVy *= 0.9;
      }
      b.x += Math.sin(b.wobble) * 0.03 * dt;
      b.y -= b.floatVy * dt;
      p.stroke(220, 248, 255, (1 - age / b.lifeMs) * CONFIG.tapPopAlphaMax);
      p.circle(b.x, b.y, b.r * 2);
    }

    // Exhale bloom bubbles
    for (let i = this.exhaleBloom.length - 1; i >= 0; i--) {
      const b = this.exhaleBloom[i];
      const age = t - b.bornAt;
      if (age >= b.lifeMs) { this.exhaleBloom.splice(i, 1); continue; }
      b.wobble += 0.008 * dt;
      b.x += b.vx * dt + Math.sin(b.wobble) * 0.02 * dt;
      b.y -= b.vy * dt;
      p.stroke(220, 248, 255, (1 - age / b.lifeMs) * CONFIG.exhaleBloomAlphaMax);
      p.circle(b.x, b.y, b.r * 2);
    }
  }
}
