import type { HitTier } from './lib/scoring';

export interface QuestionItem {
  qNum: number;
  category: string;
  question: string;
  answer: string; // obfuscated base64
  unit: string;
  difficulty: string;
}

export type GameMode = 'classic' | 'easy';

export interface SwingAttempt {
  guess: number;
  points: number;
  direction: 'high' | 'low' | 'exact';
}

export interface QuestionGuessResult {
  qIndex: number; // 1 to 5
  question: string;
  unit: string;
  category: string;
  difficulty: string;
  answer: number; // decoded number
  guess: number; // the guess that counted
  percentOff: number;
  points: number; // 0 to 100
  feet: number; // points x 4.5
  tier: HitTier;
  bandLabel: string;
  color: string;
  swings: SwingAttempt[];
  hintUsed: boolean;
  mode: GameMode;
  sprayAngle: number; // degrees from straight away centre field, for the ball flight
  pickedRange?: { low: number; high: number }; // easy mode only
  unitFactor?: number; // shown value = stored value x this (1 for metric or unconverted)
}

export type GameScreen = 'home' | 'question' | 'reveal' | 'results' | 'countdown' | 'ended';

export interface DayProgress {
  dayNumber: number;
  mode: GameMode;
  currentQIndex: number; // 1 to 5
  screen: GameScreen;
  guesses: QuestionGuessResult[];
  questionStartTime: number | null; // epoch ms
  currentSwings: SwingAttempt[]; // swings taken so far on the current question
  currentHintUsed: boolean;
  isFinished: boolean;
}

export interface PlayerStats {
  gamesPlayed: number; // every daily game, any mode (streaks count both)
  classicGames: number; // feet averages only use classic games
  easyGames: number;
  easyRight: number; // total right picks across easy games
  easyPerfect: number; // 5 of 5 easy games
  totalFeet: number;
  bestFeet: number;
  homeRuns: number; // individual out of the park hits
  currentStreak: number;
  longestStreak: number;
  lastPlayedDay: number | null;
  freezes: number; // streak freezes banked (earn 1 every 7-day streak, hold up to 2)
  freezesUsed: number; // lifetime total
  lastFreezeUsedOn: number | null; // day a freeze last saved the streak, for the results message
  lastFreezeCount: number; // how many were used that day
  scoreDistribution: {
    bullseye: number;
    ballpark: number;
    parkingLot: number;
    wrongStadium: number;
    differentSport: number;
  };
}

export interface QueuedGuess {
  player_id: string;
  puzzle_day: number;
  q_index: number;
  guess: number;
  feet: number; // distance of the counted swing, 0 to 450
  mode: GameMode; // easy picks are saved so the reminder knows you played, but left out of community stats
}
