import { QuestionItem, QuestionGuessResult, SwingAttempt, GameMode } from '../types';
import { getTier, pointsToFeet, seededRandom, RangeOption, guessRatio } from './scoring';

/** A fixed spray angle per question so the ball flies the same way for everyone. */
export function sprayAngleFor(dayNumber: number, qIndex: number): number {
  const rand = seededRandom(dayNumber * 97 + qIndex * 13 + 7);
  rand();
  return Math.round((rand() * 2 - 1) * 32);
}

export function rangeSeedFor(dayNumber: number, qIndex: number): number {
  return dayNumber * 1000 + qIndex * 31 + 5;
}

/**
 * The swing that counts on a question.
 * - The guess that counts is always the CLOSEST one to the answer (by ratio, so 2x high and
 *   2x low are equally far). If two guesses are equally close, the earlier one counts.
 * - Its distance is the best distance from any swing. Later swings are worth a bit less, but a
 *   closer guess can never score lower than an earlier, further one.
 */
export function pickBestSwing(swings: SwingAttempt[], answer: number): SwingAttempt {
  const real = swings.filter((s) => s.guess > 0);
  if (real.length === 0) return swings[0] ?? { guess: 0, points: 0, direction: 'low' };
  let closest = real[0];
  for (const s of real) {
    if (guessRatio(s.guess, answer) < guessRatio(closest.guess, answer)) closest = s;
  }
  const points = Math.max(...real.map((s) => s.points));
  return { ...closest, points };
}

/** Turn the swings on one question into the result that counts (the best swing). */
export function buildResult(args: {
  qIndex: number;
  question: QuestionItem;
  answer: number;
  swings: SwingAttempt[];
  hintUsed: boolean;
  mode: GameMode;
  sprayAngle: number;
  pickedRange?: RangeOption;
  labelOverride?: string;
}): QuestionGuessResult {
  const { qIndex, question, answer, swings, hintUsed, mode, sprayAngle, pickedRange, labelOverride } = args;

  const best = pickBestSwing(swings, answer);

  const tier = getTier(best.points);
  const percentOff = answer !== 0 ? Math.abs(best.guess - answer) / answer : 0;

  return {
    qIndex,
    question: question.question,
    unit: question.unit,
    category: question.category,
    difficulty: question.difficulty,
    answer,
    guess: best.guess,
    percentOff,
    points: best.points,
    feet: pointsToFeet(best.points),
    tier: tier.key,
    bandLabel: labelOverride ?? tier.label,
    color: tier.color,
    swings,
    hintUsed,
    mode,
    sprayAngle,
    pickedRange,
  };
}

const WORDS: [number, string][] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
];

function trimNumber(n: number, maxDecimals: number): string {
  const fixed = n.toFixed(maxDecimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/** 1,250 / 3.5 million / 8.1 billion. Keeps big numbers readable on a phone. */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return '0';
  const abs = Math.abs(n);
  for (const [size, word] of WORDS) {
    if (abs >= size) return `${trimNumber(n / size, 2)} ${word}`;
  }
  const decimals = abs >= 100 ? 0 : abs >= 1 ? 2 : 3;
  const str = trimNumber(n, decimals);
  const [int, dec] = str.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withCommas}.${dec}` : withCommas;
}

export function formatRange(r: RangeOption): string {
  if (r.inclusive && r.low === r.high) return formatNumber(r.low);
  return `${formatNumber(r.low)} to ${formatNumber(r.high)}`;
}

export function formatFeet(feet: number): string {
  return `${feet.toLocaleString('en-US')} ft`;
}
