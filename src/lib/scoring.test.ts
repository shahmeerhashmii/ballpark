import { describe, it, expect } from 'vitest';
import { calculateScore, getRating } from './scoring';

describe('Scoring Logic', () => {
  const answer = 1000;

  it('awards 100 for exact match', () => {
    expect(calculateScore(1000, answer)).toMatchObject({ points: 100, bandLabel: 'Exact' });
    expect(calculateScore(1000.05, answer)).toMatchObject({ points: 100, bandLabel: 'Exact' });
  });

  it('awards 90 for within 10%', () => {
    expect(calculateScore(1050, answer).points).toBe(90);
    expect(calculateScore(950, answer).points).toBe(90);
    expect(calculateScore(1100, answer).points).toBe(90); // exact 10% edge
    expect(calculateScore(900, answer).points).toBe(90);  // exact 10% edge
  });

  it('awards 75 for within 15%', () => {
    expect(calculateScore(1120, answer).points).toBe(75);
    expect(calculateScore(880, answer).points).toBe(75);
    expect(calculateScore(1150, answer).points).toBe(75); // exact 15% edge
    expect(calculateScore(850, answer).points).toBe(75);  // exact 15% edge
  });

  it('awards 60 for within 30%', () => {
    expect(calculateScore(1200, answer).points).toBe(60);
    expect(calculateScore(800, answer).points).toBe(60);
    expect(calculateScore(1300, answer).points).toBe(60); // exact 30% edge
    expect(calculateScore(700, answer).points).toBe(60);  // exact 30% edge
  });

  it('awards 50 for within 40%', () => {
    expect(calculateScore(1350, answer).points).toBe(50);
    expect(calculateScore(650, answer).points).toBe(50);
    expect(calculateScore(1400, answer).points).toBe(50); // exact 40% edge
    expect(calculateScore(600, answer).points).toBe(50);  // exact 40% edge
  });

  it('awards 30 for within 50%', () => {
    expect(calculateScore(1450, answer).points).toBe(30);
    expect(calculateScore(550, answer).points).toBe(30);
    expect(calculateScore(1500, answer).points).toBe(30); // exact 50% edge
    expect(calculateScore(500, answer).points).toBe(30);  // exact 50% edge
  });

  it('awards 15 for within 75%', () => {
    expect(calculateScore(1600, answer).points).toBe(15);
    expect(calculateScore(400, answer).points).toBe(15);
    expect(calculateScore(1750, answer).points).toBe(15); // exact 75% edge
    expect(calculateScore(250, answer).points).toBe(15);  // exact 75% edge
  });

  it('awards 10 for within 80%', () => {
    expect(calculateScore(1780, answer).points).toBe(10);
    expect(calculateScore(220, answer).points).toBe(10);
    expect(calculateScore(1800, answer).points).toBe(10); // exact 80% edge
    expect(calculateScore(200, answer).points).toBe(10);  // exact 80% edge
  });

  it('awards 5 for within 90%', () => {
    expect(calculateScore(1850, answer).points).toBe(5);
    expect(calculateScore(150, answer).points).toBe(5);
    expect(calculateScore(1900, answer).points).toBe(5); // exact 90% edge
    expect(calculateScore(100, answer).points).toBe(5);  // exact 90% edge
  });

  it('awards 1 for within 99%', () => {
    expect(calculateScore(1950, answer).points).toBe(1);
    expect(calculateScore(50, answer).points).toBe(1);
    expect(calculateScore(1990, answer).points).toBe(1); // exact 99% edge
    expect(calculateScore(10, answer).points).toBe(1);   // exact 99% edge
  });

  it('awards 0 for more than 99% off', () => {
    expect(calculateScore(2000, answer).points).toBe(0);
    expect(calculateScore(2500, answer).points).toBe(0);
    expect(calculateScore(5, answer).points).toBe(0);
  });
});

describe('Ratings Logic', () => {
  it('correctly maps scores to ratings', () => {
    expect(getRating(500).title).toBe('Bullseye');
    expect(getRating(450).title).toBe('Bullseye');
    expect(getRating(449).title).toBe('Right in the ballpark');
    expect(getRating(350).title).toBe('Right in the ballpark');
    expect(getRating(349).title).toBe('Somewhere in the parking lot');
    expect(getRating(250).title).toBe('Somewhere in the parking lot');
    expect(getRating(249).title).toBe('Wrong stadium');
    expect(getRating(150).title).toBe('Wrong stadium');
    expect(getRating(149).title).toBe('Different sport');
    expect(getRating(0).title).toBe('Different sport');
  });
});
