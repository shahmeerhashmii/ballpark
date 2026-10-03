export interface ScoreResult {
  percentOff: number;
  points: number;
  bandLabel: string;
  color: string;
}

export function calculateScore(guess: number, answer: number): ScoreResult {
  if (answer === 0) {
    if (guess === 0) {
      return { percentOff: 0, points: 100, bandLabel: 'Exact', color: 'var(--color-result-green)' };
    }
    return { percentOff: 1, points: 0, bandLabel: 'More than 99% off', color: 'var(--color-result-red)' };
  }

  const diff = Math.abs(guess - answer);
  const percentOff = diff / answer;

  // Exact match within 0.0001
  if (percentOff <= 0.0001) {
    return {
      percentOff: 0,
      points: 100,
      bandLabel: 'Exact',
      color: 'var(--color-result-green)',
    };
  }

  // Within 10%
  if (percentOff <= 0.10 + 1e-9) {
    return {
      percentOff,
      points: 90,
      bandLabel: 'Within 10%',
      color: 'var(--color-result-green)',
    };
  }

  // Within 15%
  if (percentOff <= 0.15 + 1e-9) {
    return {
      percentOff,
      points: 75,
      bandLabel: 'Within 15%',
      color: 'var(--color-result-green)',
    };
  }

  // Within 30%
  if (percentOff <= 0.30 + 1e-9) {
    return {
      percentOff,
      points: 60,
      bandLabel: 'Within 30%',
      color: 'var(--color-result-yellow)',
    };
  }

  // Within 40%
  if (percentOff <= 0.40 + 1e-9) {
    return {
      percentOff,
      points: 50,
      bandLabel: 'Within 40%',
      color: 'var(--color-result-yellow)',
    };
  }

  // Within 50%
  if (percentOff <= 0.50 + 1e-9) {
    return {
      percentOff,
      points: 30,
      bandLabel: 'Within 50%',
      color: 'var(--color-result-yellow)',
    };
  }

  // Within 75%
  if (percentOff <= 0.75 + 1e-9) {
    return {
      percentOff,
      points: 15,
      bandLabel: 'Within 75%',
      color: 'var(--color-result-orange)',
    };
  }

  // Within 80%
  if (percentOff <= 0.80 + 1e-9) {
    return {
      percentOff,
      points: 10,
      bandLabel: 'Within 80%',
      color: 'var(--color-result-orange)',
    };
  }

  // Within 90%
  if (percentOff <= 0.90 + 1e-9) {
    return {
      percentOff,
      points: 5,
      bandLabel: 'Within 90%',
      color: 'var(--color-result-orange)',
    };
  }

  // Within 99%
  if (percentOff <= 0.99 + 1e-9) {
    return {
      percentOff,
      points: 1,
      bandLabel: 'Within 99%',
      color: 'var(--color-result-orange)',
    };
  }

  // More than 99% off
  return {
    percentOff,
    points: 0,
    bandLabel: 'More than 99% off',
    color: 'var(--color-result-red)',
  };
}

export function getRating(totalScore: number): { title: string; targetDistance: number } {
  if (totalScore >= 450) {
    return { title: 'Bullseye', targetDistance: 0 };
  }
  if (totalScore >= 350) {
    return { title: 'Right in the ballpark', targetDistance: 28 };
  }
  if (totalScore >= 250) {
    return { title: 'Somewhere in the parking lot', targetDistance: 55 };
  }
  if (totalScore >= 150) {
    return { title: 'Wrong stadium', targetDistance: 78 };
  }
  return { title: 'Different sport', targetDistance: 104 };
}

export function getTileColor(points: number): string {
  if (points >= 75) return 'var(--color-result-green)';
  if (points >= 30) return 'var(--color-result-yellow)';
  if (points >= 1) return 'var(--color-result-orange)';
  return 'var(--color-result-red)';
}

export function getTileEmoji(points: number): string {
  if (points >= 75) return '🟩';
  if (points >= 30) return '🟨';
  if (points >= 1) return '🟧';
  return '🟥';
}
