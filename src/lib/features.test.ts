import { describe, it, expect, beforeEach } from 'vitest';
import { localizeAnswer } from './units';
import { updateStatsOnGameComplete, getPlayerStats, liveStreak, resetLocalData } from './storage';
import { accuracyPoints } from './scoring';

describe('Units', () => {
  it('leaves metric alone', () => {
    expect(localizeAnswer('How tall is Mount Everest?', 8849, 'metres', 'metric')).toEqual({ answer: 8849, unit: 'metres', factor: 1 });
  });

  it('converts to imperial', () => {
    const r = localizeAnswer('How tall is Mount Everest?', 8849, 'metres', 'imperial');
    expect(r.unit).toBe('feet');
    expect(r.answer).toBe(29032);
    expect(localizeAnswer('How far is it in a straight line from Toronto to Montreal?', 500, 'km', 'imperial').unit).toBe('miles');
  });

  it("doesn't convert questions that are about units", () => {
    expect(localizeAnswer('How many metres are in a mile?', 1609, 'metres', 'imperial').unit).toBe('metres');
    expect(localizeAnswer('How heavy is one litre of water?', 1, 'kg', 'imperial').unit).toBe('kg');
  });

  it("doesn't touch temperatures or counts", () => {
    expect(localizeAnswer('How hot is the surface of Venus?', 465, '°C', 'imperial').unit).toBe('°C');
    expect(localizeAnswer('How many bones are in the human foot?', 26, 'bones', 'imperial').unit).toBe('bones');
  });

  it('scores the same in either unit', () => {
    const m = localizeAnswer('How tall is Mount Everest?', 8849, 'metres', 'imperial');
    // same distance to the foot (the converted answer is rounded to a sensible number of digits)
    expect(Math.round(accuracyPoints(9000 * m.factor, m.answer) * 4.5)).toBe(Math.round(accuracyPoints(9000, 8849) * 4.5));
  });
});

describe('Streak freezes', () => {
  beforeEach(() => resetLocalData());

  const play = (day: number) => updateStatsOnGameComplete(day, { mode: 'classic', totalFeet: 1500, homeRuns: 1, easyRight: 0 });

  it('earns a freeze after 7 days in a row', () => {
    for (let d = 1; d <= 7; d++) play(d);
    expect(getPlayerStats().freezes).toBe(1);
    expect(getPlayerStats().currentStreak).toBe(7);
  });

  it('uses a freeze to cover a missed day', () => {
    for (let d = 1; d <= 7; d++) play(d);
    const s = play(9); // missed day 8
    expect(s.currentStreak).toBe(8);
    expect(s.freezes).toBe(0);
    expect(s.lastFreezeUsedOn).toBe(9);
  });

  it('resets when missed days are more than the freezes', () => {
    for (let d = 1; d <= 7; d++) play(d);
    const s = play(10); // missed 8 and 9, only 1 freeze
    expect(s.currentStreak).toBe(1);
    expect(s.freezes).toBe(1);
  });

  it('holds at most 2 freezes', () => {
    for (let d = 1; d <= 21; d++) play(d);
    expect(getPlayerStats().freezes).toBe(2);
  });

  it('shows the streak as alive on home when a freeze can cover it', () => {
    for (let d = 1; d <= 7; d++) play(d);
    expect(liveStreak(getPlayerStats(), 9)).toEqual({ streak: 7, atRisk: true });
    expect(liveStreak(getPlayerStats(), 10).streak).toBe(0);
  });
});
