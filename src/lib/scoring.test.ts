import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  accuracyPoints,
  getRating,
  getTier,
  buildRangeChoices,
  scoreRangePick,
  getHintRange,
  pointsToFeet,
} from './scoring';

describe('Distance scoring', () => {
  const answer = 1000;

  it('gives a perfect 450 ft for an exact guess', () => {
    const r = calculateScore(1000, answer);
    expect(r.points).toBe(100);
    expect(r.feet).toBe(450);
    expect(r.tier).toBe('park');
  });

  it('treats double and half the same', () => {
    expect(accuracyPoints(2000, answer)).toBe(accuracyPoints(500, answer));
    expect(accuracyPoints(1250, answer)).toBe(accuracyPoints(800, answer));
  });

  it('clears the wall within 10%', () => {
    expect(calculateScore(1100, answer).tier).toBe('park');
    expect(calculateScore(910, answer).tier).toBe('park');
    expect(calculateScore(1100, answer).feet).toBeGreaterThanOrEqual(400);
  });

  it('maps the tier edges', () => {
    expect(calculateScore(1250, answer).tier).toBe('deep');
    expect(calculateScore(1500, answer).tier).toBe('solid');
    expect(calculateScore(2000, answer).tier).toBe('play');
    expect(calculateScore(3900, answer).tier).toBe('caught');
    expect(calculateScore(4000, answer).tier).toBe('miss');
    expect(calculateScore(4100, answer).tier).toBe('miss');
    expect(calculateScore(0, answer).tier).toBe('miss');
  });

  it('gets less generous as you get further away', () => {
    let last = 101;
    for (const g of [1000, 1050, 1150, 1300, 1700, 2500, 3500, 5000]) {
      const p = accuracyPoints(g, answer);
      expect(p).toBeLessThanOrEqual(last);
      last = p;
    }
  });

  it('makes all 3 swings worth the same, and only the hint costs distance', () => {
    for (const g of [1000, 1040, 1300, 2500]) {
      const s1 = calculateScore(g, answer, { swingNumber: 1 }).feet;
      expect(calculateScore(g, answer, { swingNumber: 2 }).feet).toBe(s1);
      expect(calculateScore(g, answer, { swingNumber: 3 }).feet).toBe(s1);
    }
    expect(calculateScore(1000, answer, { hintUsed: true }).feet).toBe(383); // 450 x 0.85
  });

  it('scores to the foot, so closer always goes further, even inside the same band', () => {
    // the example from the request: both within 10% of 6,000, but 5,800 must beat 5,700
    expect(calculateScore(5800, 6000).feet).toBeGreaterThan(calculateScore(5700, 6000).feet);
    expect(calculateScore(5810, 6000).feet).toBeGreaterThan(calculateScore(5800, 6000).feet);
    expect(calculateScore(5800, 6000).tier).toBe('park');
    expect(calculateScore(5700, 6000).tier).toBe('park');
    // every step closer adds distance, on both sides of the answer
    let lastHigh = -1;
    let lastLow = -1;
    for (let off = 3.0; off >= 0; off -= 0.01) {
      const high = calculateScore(1000 * (1 + off), 1000).points;
      const low = calculateScore(1000 / (1 + off), 1000).points;
      expect(high).toBeGreaterThanOrEqual(lastHigh);
      expect(low).toBeGreaterThanOrEqual(lastLow);
      lastHigh = high;
      lastLow = low;
    }
  });

  it('joins the bands up with no jumps', () => {
    for (const edge of [1.1, 1.25, 1.5, 2]) {
      const before = calculateScore(1000 * (edge - 1e-6), 1000).points;
      const after = calculateScore(1000 * (edge + 1e-6), 1000).points;
      expect(Math.abs(before - after)).toBeLessThan(0.01);
    }
  });

  it('reports direction', () => {
    expect(calculateScore(1500, answer).direction).toBe('high');
    expect(calculateScore(500, answer).direction).toBe('low');
    expect(calculateScore(1000, answer).direction).toBe('exact');
  });

  it('keeps tiers consistent with feet', () => {
    expect(pointsToFeet(89)).toBeGreaterThan(400);
    expect(pointsToFeet(88)).toBeLessThanOrEqual(400);
    expect(getTier(0).key).toBe('miss');
  });
});

describe('Ratings', () => {
  it('maps total feet to a rating', () => {
    expect(getRating(2250).title).toBe('Out of the park');
    expect(getRating(1600).title).toBe('Right in the ballpark');
    expect(getRating(1200).title).toBe('Somewhere in the parking lot');
    expect(getRating(700).title).toBe('Wrong stadium');
    expect(getRating(100).title).toBe('Different sport');
  });
});

describe('Easy mode ranges', () => {
  const answers = [1, 2, 3, 4, 7, 7.5, 11, 42, 49, 221, 1000, 6962, 2632, 48000, 3_500_000, 8_100_000_000];

  it('always puts the answer inside the correct range', () => {
    for (const a of answers) {
      for (let seed = 1; seed < 40; seed++) {
        const c = buildRangeChoices(a, seed);
        const opt = c.options[c.correctIndex];
        expect(a).toBeGreaterThanOrEqual(opt.low);
        if (opt.inclusive) {
          expect(a).toBeLessThanOrEqual(opt.high);
          for (let i = 1; i < 4; i++) expect(c.options[i].low).toBe(c.options[i - 1].high + 1);
          expect(c.options[0].low).toBeGreaterThanOrEqual(0);
        } else {
          expect(a).toBeLessThan(opt.high);
          for (let i = 1; i < 4; i++) expect(c.options[i].low).toBeCloseTo(c.options[i - 1].high);
        }
      }
    }
  });

  it('is the same for the same seed', () => {
    expect(buildRangeChoices(221, 77)).toEqual(buildRangeChoices(221, 77));
  });

  it('scores the right range as a solid hit', () => {
    const c = buildRangeChoices(221, 5);
    expect(scoreRangePick(c.correctIndex, c, 221, 221).tier).toBe('solid');
  });
});

describe('Hint', () => {
  it('gives a power of ten bracket', () => {
    expect(getHintRange(221)).toEqual({ low: 100, high: 1000 });
    expect(getHintRange(6962)).toEqual({ low: 1000, high: 10000 });
  });
});

describe('Easy mode outcomes', () => {
  it('shows a right pick as right, never as a weak hit', async () => {
    const { getEasyOutcome, getEasyRating, EASY_CORRECT_POINTS, EASY_CLOSE_POINTS } = await import('./scoring');
    expect(getEasyOutcome(EASY_CORRECT_POINTS).key).toBe('right');
    expect(getEasyOutcome(EASY_CLOSE_POINTS).key).toBe('close');
    expect(getEasyOutcome(0).key).toBe('wrong');
    expect(getEasyRating(5)).toBe('Perfect game');
    expect(getEasyRating(4)).toBe('Right in the ballpark');
  });
});

describe('Easy mode fairness', () => {
  it('spreads the right answer evenly across the four choices', () => {
    const pos = [0, 0, 0, 0];
    for (let day = 1; day <= 300; day++) {
      for (let q = 1; q <= 4; q++) {
        for (const a of [5, 12, 30, 221, 6961]) pos[buildRangeChoices(a, day * 1000 + q * 31 + 5).correctIndex]++;
      }
    }
    const total = pos.reduce((x, y) => x + y, 0);
    for (const p of pos) expect(p / total).toBeGreaterThan(0.15);
  });
});

describe('Three swings on every question', () => {
  it('never ends after swing 1 or 2, even on a great hit', async () => {
    const { atBatOver, calculateScore } = await import('./scoring');
    const answer = 1000;
    for (const guess of [1050, 1100, 1250, 900, 3000, 1]) {
      for (const swing of [1, 2]) {
        const r = calculateScore(guess, answer, { swingNumber: swing });
        expect(atBatOver(swing, r.direction)).toBe(false);
      }
    }
  });

  it('ends after swing 3', async () => {
    const { atBatOver } = await import('./scoring');
    expect(atBatOver(3, 'high')).toBe(true);
    expect(atBatOver(3, 'low')).toBe(true);
  });

  it('ends early only on an exact answer', async () => {
    const { atBatOver } = await import('./scoring');
    expect(atBatOver(1, 'exact')).toBe(true);
  });
});
