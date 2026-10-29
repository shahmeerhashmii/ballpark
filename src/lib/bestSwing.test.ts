import { describe, it, expect } from 'vitest';
import questions from '../data/questions.json';
import { decodeAnswer } from './daily';
import { calculateScore, guessRatio, seededRandom } from './scoring';
import { localizeAnswer } from './units';
import { pickBestSwing, buildResult } from './game';
import type { SwingAttempt, QuestionItem } from '../types';

const all = questions as Record<string, QuestionItem[]>;

function swingsFor(guesses: number[], answer: number, hintUsed: boolean): SwingAttempt[] {
  return guesses.map((g, i) => {
    const r = calculateScore(g, answer, { swingNumber: i + 1, hintUsed });
    return { guess: g, points: r.points, direction: r.direction };
  });
}

describe('Best swing: the reported case', () => {
  it('Halifax to Paris (4,890 km): 5,800 then 4,900 counts 4,900', () => {
    for (const third of [false, true]) {
      const guesses = third ? [5800, 3000, 4900] : [5800, 4900];
      const best = pickBestSwing(swingsFor(guesses, 4890, false), 4890);
      expect(best.guess).toBe(4900);
      expect(best.points).toBeGreaterThanOrEqual(76); // never below what 5,800 earned
    }
  });
});

describe('Best swing: every question in the game', () => {
  const factors = [0.05, 0.3, 0.5, 0.8, 0.92, 0.999, 1, 1.002, 1.04, 1.15, 1.3, 1.6, 2.2, 3.5, 9];

  it('always counts the closest guess and never scores a closer guess lower', () => {
    let checked = 0;
    for (const [day, items] of Object.entries(all)) {
      items.forEach((item, qi) => {
        const stored = decodeAnswer(item.answer);
        expect(stored, `day ${day} q${qi + 1} has a usable answer`).toBeGreaterThan(0);
        for (const units of ['metric', 'imperial'] as const) {
          const { answer } = localizeAnswer(item.question, stored, item.unit, units);
          const rand = seededRandom(Number(day) * 100 + qi * 7 + (units === 'metric' ? 1 : 2));
          const seqs: number[][] = [];
          // far then close, close then far, and random mixes of 1 to 3 swings
          seqs.push([answer * 1.19, answer * 1.002]);
          seqs.push([answer * 1.002, answer * 1.19]);
          seqs.push([answer * 0.5, answer * 3, answer * 1.04]);
          for (let n = 0; n < 12; n++) {
            const len = 1 + Math.floor(rand() * 3);
            seqs.push(Array.from({ length: len }, () => answer * factors[Math.floor(rand() * factors.length)]));
          }
          for (const guesses of seqs) {
            for (const hintUsed of [false, true]) {
              const swings = swingsFor(guesses, answer, hintUsed);
              const best = pickBestSwing(swings, answer);
              const closestRatio = Math.min(...guesses.map((g) => guessRatio(g, answer)));
              // 1. the guess that counts is the closest one
              expect(guessRatio(best.guess, answer)).toBe(closestRatio);
              // 2. it is never worth less than any swing taken
              for (const s of swings) expect(best.points).toBeGreaterThanOrEqual(s.points);
              // 3. the full result reports the same guess and distance
              const result = buildResult({
                qIndex: qi + 1, question: item, answer, swings, hintUsed,
                mode: 'classic', sprayAngle: 0,
              });
              expect(result.guess).toBe(best.guess);
              expect(result.points).toBe(best.points);
              expect(result.feet).toBe(Math.round(best.points * 4.5));
              checked++;
            }
          }
        }
      });
    }
    expect(Object.keys(all).length).toBe(300);
    expect(checked).toBeGreaterThan(80000);
  }, 120000);

  it('ignores timed-out empty swings', () => {
    const swings: SwingAttempt[] = [
      { guess: 0, points: 0, direction: 'low' },
      ...swingsFor([1100], 1000, false),
    ];
    expect(pickBestSwing(swings, 1000).guess).toBe(1100);
    expect(pickBestSwing([{ guess: 0, points: 0, direction: 'low' }], 1000).points).toBe(0);
  });
});
