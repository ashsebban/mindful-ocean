export const INTRO_STORAGE_KEY = 'fishtank-intro-hidden-v1';

export const MODE  = { RELAX: 'relax', DECLUTTER: 'declutter', BREATHING: 'breathing', CLEARED: 'cleared' };
export const PHASE = { INHALE: 'inhale', EXHALE: 'exhale' };

export const CONFIG = {
  fishCount: 40,
  streamDir: 1,
  streamSpeedMin: 0.068,
  streamSpeedMax: 0.128,
  pokeRadiusPad: 8,

  breathTotalMs: 120000,
  inhaleMs: 4000,
  exhaleMs: 4000,
  exhaleReleaseMin: 2,
  exhaleReleaseMax: 4,

  particleCount: 18,
  ambientBubbleCount: 6,
  popLifeMs: 520,

  tailCadenceMin: 0.0045,
  tailCadenceMax: 0.0068,
  tailCadenceRise: 0.11,
  tailCadenceFall: 0.028,
  thrustDecay: 0.965,
  accelScale: 0.0046,
  dragBase: 0.992,
  swishThreshold: 0.72,
  swishChainWindowMs: 340,
  swishStreakMax: 9,
  swishImpulseBase: 0.06,
  swishImpulseStep: 0.16,
  swishImpulseMaxMult: 2.4,

  speedMinFactor: 0.5,
  speedMaxFactor: 2.2,
  schoolCruiseScale: 0.8,
  schoolMaxFactor: 1.5,

  fleeCadenceBoost: 3.15,
  fleeBurstCadenceBoost: 6.2,
  fleeBurstMs: 280,
  fleeHeadingLerp: 0.24,
  fleeBurstHeadingLerp: 0.34,
  fleeMinSpeedFactor: 1.35,
  fleeBurstMinSpeedFactor: 2.5,
  fleeSpeedMaxFactor: 2.6,
  fleeBurstSpeedMaxFactor: 3.3,
  cadenceDriftMin: 0.82,
  cadenceDriftMax: 1.22,
  cadenceShiftMinMs: 1800,
  cadenceShiftMaxMs: 5200,

  tapPopCountMin: 4,
  tapPopCountMax: 8,
  tapPopLifeMinMs: 420,
  tapPopLifeMaxMs: 700,
  tapPopAlphaMax: 180,
  tapPopCap: 48,
  tapBurstImpulseMs: 150,

  fleeTrailLifeMinMs: 420,
  fleeTrailLifeMaxMs: 620,
  fleeTrailAlphaMax: 65,
  fleeTrailIntervalFastMs: 190,
  fleeTrailIntervalSlowMs: 280,
  fleeTrailCap: 64,

  exhaleBloomCountMin: 2,
  exhaleBloomCountMax: 5,
  exhaleBloomLifeMinMs: 450,
  exhaleBloomLifeMaxMs: 700,
  exhaleBloomAlphaMax: 55,
  exhaleBloomCap: 28,
};

export const WISDOM_LINES = [
  'Clarity is not empty. It is quiet.',
  'Let the noise pass. Keep the calm.',
  'You do not have to chase every thought.',
  'A steady breath clears a crowded mind.',
  'Soft attention is still strength.',
  'Small releases create wide space.',
];

export function rand(min, max) { return min + Math.random() * (max - min); }
export function nowMs()        { return performance.now(); }
