// Ballpark scoring
//
// Every guess is a ball hit into the stadium. The closer the guess, the further it flies.
// Closeness is measured as a ratio (bigger / smaller), so guessing double the answer is
// treated exactly the same as guessing half of it. The old "% off" maths punished
// overshooting much harder than undershooting, which is a big reason scores felt low.
//
// Distance is worked out to the foot (0 to 450 ft per question), straight from how close the
// guess is, so even small improvements count: on an answer of 6,000, a guess of 5,800 goes
// 432 ft and 5,700 goes 423 ft, though both are within 10%. Anything 400 ft or more clears the
// wall. "points" is the same score on a 0 to 100 scale (feet / 4.5), kept unrounded.

export type HitTier = 'park' | 'deep' | 'solid' | 'play' | 'caught' | 'miss';

export interface TierInfo {
  key: HitTier;
  label: string;
  short: string;
  color: string;
  emoji: string;
  minFeet: number;
}

// Ordered best to worst. minFeet is the shortest distance that still earns the tier.
export const TIERS: TierInfo[] = [
  { key: 'park', label: 'Out of the park!', short: 'Out of the park', color: 'var(--color-result-green)', emoji: '🟢', minFeet: 400 },
  { key: 'deep', label: 'Deep to the wall', short: 'Deep', color: 'var(--color-result-yellow)', emoji: '🟡', minFeet: 300 },
  { key: 'solid', label: 'Solid hit', short: 'Solid hit', color: 'var(--color-result-orange)', emoji: '🟠', minFeet: 200 },
  { key: 'play', label: 'In play', short: 'In play', color: 'var(--color-result-white)', emoji: '⚪', minFeet: 100 },
  { key: 'caught', label: 'Caught', short: 'Caught', color: 'var(--color-result-red)', emoji: '🔴', minFeet: 1 },
  { key: 'miss', label: 'Swing and a miss', short: 'Miss', color: 'var(--color-result-miss)', emoji: '❌', minFeet: 0 },
];

// Ratio bands (bigger / smaller) and the distance each one covers. Within a band the distance
// slides smoothly (on a log scale), so the bands join up with no jumps and every bit closer
// adds distance.
const RATIO_BANDS: { maxRatio: number; hiFeet: number; loFeet: number }[] = [
  { maxRatio: 1.1, hiFeet: 450, loFeet: 400 }, // within 10%: out of the park
  { maxRatio: 1.25, hiFeet: 400, loFeet: 300 }, // within 25%: deep to the wall
  { maxRatio: 1.5, hiFeet: 300, loFeet: 200 }, // within 50%: solid hit
  { maxRatio: 2, hiFeet: 200, loFeet: 100 }, // within 2x: in play
  { maxRatio: 4, hiFeet: 100, loFeet: 0 }, // within 4x: caught
];

// All 3 swings are worth the same. Only the hint costs distance.
export const SWING_MULTIPLIERS = [1, 1, 1];
export const HINT_MULTIPLIER = 0.85;
export const MAX_SWINGS = SWING_MULTIPLIERS.length;
export const FEET_PER_POINT = 4.5;
export const MAX_FEET_PER_QUESTION = 450;
export const WALL_FEET = 400;

/**
 * Whether a question is over after this swing. Every question gets all 3 swings, even after a
 * great hit (players choose "Keep best" to stop early). The only exception is guessing the exact
 * answer, since there is nothing left to guess.
 */
export function atBatOver(swingNumber: number, direction: 'high' | 'low' | 'exact'): boolean {
  return direction === 'exact' || swingNumber >= MAX_SWINGS;
}

export function getTier(points: number): TierInfo {
  const feet = pointsToFeet(points);
  for (const tier of TIERS) {
    if (feet >= tier.minFeet) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export function getTierByKey(key: HitTier): TierInfo {
  return TIERS.find((t) => t.key === key) ?? TIERS[TIERS.length - 1];
}

export function pointsToFeet(points: number): number {
  return Math.round(points * FEET_PER_POINT);
}

/** How far off a guess is as a ratio, always 1 or more. Infinity for no guess. */
export function guessRatio(guess: number, answer: number): number {
  if (!(guess > 0) || !(answer > 0)) {
    if (guess === answer) return 1;
    return Infinity;
  }
  return Math.max(guess, answer) / Math.min(guess, answer);
}

/** Exact distance (0 to 450 ft, not rounded) before any hint adjustment. */
export function accuracyFeet(guess: number, answer: number): number {
  const ratio = guessRatio(guess, answer);
  if (ratio <= 1.0001) return MAX_FEET_PER_QUESTION;

  let prevMax = 1;
  for (const band of RATIO_BANDS) {
    if (ratio <= band.maxRatio + 1e-9) {
      const t = Math.log(ratio / prevMax) / Math.log(band.maxRatio / prevMax);
      return band.hiFeet - (band.hiFeet - band.loFeet) * t;
    }
    prevMax = band.maxRatio;
  }
  return 0;
}

/** The same score on a 0 to 100 scale (not rounded). */
export function accuracyPoints(guess: number, answer: number): number {
  return accuracyFeet(guess, answer) / FEET_PER_POINT;
}

export interface ScoreResult {
  percentOff: number;
  points: number;
  feet: number;
  tier: HitTier;
  bandLabel: string;
  color: string;
  direction: 'high' | 'low' | 'exact';
}

export function calculateScore(
  guess: number,
  answer: number,
  opts: { swingNumber?: number; hintUsed?: boolean } = {}
): ScoreResult {
  const swingIdx = Math.min(Math.max((opts.swingNumber ?? 1) - 1, 0), SWING_MULTIPLIERS.length - 1);
  let points = accuracyPoints(guess, answer) * SWING_MULTIPLIERS[swingIdx];
  if (opts.hintUsed) points *= HINT_MULTIPLIER;

  const tier = getTier(points);
  const percentOff = answer !== 0 ? Math.abs(guess - answer) / answer : guess === 0 ? 0 : 1;
  const ratio = guessRatio(guess, answer);
  const direction = ratio <= 1.0001 ? 'exact' : guess > answer ? 'high' : 'low';

  return {
    percentOff,
    points,
    feet: pointsToFeet(points),
    tier: tier.key,
    bandLabel: tier.label,
    color: tier.color,
    direction,
  };
}

// Daily rating, based on total feet out of 2,250.
export function getRating(totalFeet: number): { title: string; key: keyof RatingCounts } {
  if (totalFeet >= 2000) return { title: 'Out of the park', key: 'bullseye' };
  if (totalFeet >= 1550) return { title: 'Right in the ballpark', key: 'ballpark' };
  if (totalFeet >= 1100) return { title: 'Somewhere in the parking lot', key: 'parkingLot' };
  if (totalFeet >= 650) return { title: 'Wrong stadium', key: 'wrongStadium' };
  return { title: 'Different sport', key: 'differentSport' };
}

export interface RatingCounts {
  bullseye: number;
  ballpark: number;
  parkingLot: number;
  wrongStadium: number;
  differentSport: number;
}

export function getTileColor(points: number): string {
  return getTier(points).color;
}

export function getTileEmoji(points: number): string {
  return getTier(points).emoji;
}

// ---------- Easy mode: pick a range ----------

export interface RangeOption {
  low: number;
  high: number;
  inclusive?: boolean; // whole-number choices like "3 to 4" or just "5"
}

export interface RangeChoices {
  options: RangeOption[];
  correctIndex: number;
}

export const EASY_CORRECT_POINTS = 56; // 252 ft, a solid hit
export const EASY_CLOSE_POINTS = 22; // 99 ft, the neighbouring range is caught

// Small deterministic random so everyone sees the same choices for the same question.
export function seededRandom(seed: number): () => number {
  // mulberry32: well mixed even for neighbouring seeds like day 90 and day 91
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundNice(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

/** Four touching ranges, each about 2x wide, with the answer inside one of them. */
export function buildRangeChoices(answer: number, seed: number): RangeChoices {
  const rand = seededRandom(seed);
  let correctIndex = Math.floor(rand() * 4);

  // Small whole-number answers (moons, players, years) get whole-number choices
  if (Number.isInteger(answer) && answer < 50) {
    // Narrow the ranges if needed so the choices never have to start below zero,
    // which would give away where the answer is
    const width = Math.max(1, Math.min(Math.round(answer * 0.35), Math.floor(answer / (correctIndex + 0.5))));
    let start = answer - correctIndex * width - Math.floor(rand() * width);
    if (start < 0) {
      start = 0;
      correctIndex = Math.floor((answer - start) / width);
    }
    const options = [0, 1, 2, 3].map((i) => ({
      low: start + i * width,
      high: start + i * width + width - 1,
      inclusive: true,
    }));
    return { options, correctIndex };
  }

  const offset = 1.15 + rand() * 0.6; // where inside its range the answer sits
  const start = answer / Math.pow(2, correctIndex) / offset;

  let edges = [0, 1, 2, 3, 4].map((i) => start * Math.pow(2, i));
  const rounded = edges.map(roundNice);
  const okRounded =
    rounded.every((v, i) => i === 0 || v > rounded[i - 1]) &&
    answer >= rounded[correctIndex] &&
    answer < rounded[correctIndex + 1];
  if (okRounded) edges = rounded;

  const options = [0, 1, 2, 3].map((i) => ({ low: edges[i], high: edges[i + 1] }));
  return { options, correctIndex };
}

export function scoreRangePick(pickIndex: number, choices: RangeChoices, answer: number, guess: number): ScoreResult {
  const diff = Math.abs(pickIndex - choices.correctIndex);
  const points = diff === 0 ? EASY_CORRECT_POINTS : diff === 1 ? EASY_CLOSE_POINTS : 0;
  const tier = getTier(points);
  const percentOff = answer !== 0 ? Math.abs(guess - answer) / answer : 0;
  return {
    percentOff,
    points,
    feet: pointsToFeet(points),
    tier: tier.key,
    bandLabel: diff === 0 ? 'Right range!' : tier.label,
    color: tier.color,
    direction: diff === 0 ? 'exact' : pickIndex > choices.correctIndex ? 'high' : 'low',
  };
}

// Easy mode is shown on its own scale (right / close / wrong), never as feet,
// so a correct pick never looks like a weak classic hit.
export type EasyOutcome = 'right' | 'close' | 'wrong';

export interface EasyOutcomeInfo {
  key: EasyOutcome;
  label: string;
  short: string;
  color: string;
  emoji: string;
  visualFeet: number; // how far the ball flies in the animation only
  tier: HitTier; // tier used to draw the ball
}

export const EASY_OUTCOMES: Record<EasyOutcome, EasyOutcomeInfo> = {
  right: { key: 'right', label: 'Right range!', short: 'Right', color: 'var(--color-result-green)', emoji: '✅', visualFeet: 380, tier: 'deep' },
  close: { key: 'close', label: 'One range off', short: 'Close', color: 'var(--color-result-yellow)', emoji: '🟨', visualFeet: 210, tier: 'solid' },
  wrong: { key: 'wrong', label: 'Wrong range', short: 'Wrong', color: 'var(--color-result-red)', emoji: '❌', visualFeet: 0, tier: 'miss' },
};

export function getEasyOutcome(points: number): EasyOutcomeInfo {
  if (points >= EASY_CORRECT_POINTS) return EASY_OUTCOMES.right;
  if (points >= EASY_CLOSE_POINTS) return EASY_OUTCOMES.close;
  return EASY_OUTCOMES.wrong;
}

export function getEasyRating(rightCount: number): string {
  if (rightCount >= 5) return 'Perfect game';
  if (rightCount === 4) return 'Right in the ballpark';
  if (rightCount === 3) return 'Somewhere in the parking lot';
  if (rightCount === 2) return 'Wrong stadium';
  return 'Different sport';
}

// ---------- Hint ----------

/** A range about 10x wide (a power of ten bracket) that contains the answer. */
export function getHintRange(answer: number): RangeOption {
  if (answer <= 0) return { low: 0, high: 10 };
  const exp = Math.floor(Math.log10(answer));
  const low = Math.pow(10, exp);
  return { low, high: low * 10 };
}
