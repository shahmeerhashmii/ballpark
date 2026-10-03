export interface QuestionItem {
  qNum: number;
  category: string;
  question: string;
  answer: string; // obfuscated base64
  unit: string;
  difficulty: string;
}

export interface QuestionGuessResult {
  qIndex: number; // 1 to 5
  question: string;
  unit: string;
  category: string;
  difficulty: string;
  answer: number; // decoded number
  guess: number;
  percentOff: number;
  points: number;
  bandLabel: string;
  color: string;
}

export type GameScreen = 'home' | 'question' | 'reveal' | 'results' | 'countdown' | 'ended';

export interface DayProgress {
  dayNumber: number;
  currentQIndex: number; // 1 to 5
  screen: GameScreen;
  guesses: QuestionGuessResult[];
  questionStartTime: number | null; // epoch ms
  isFinished: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDay: number | null;
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
  points: number;
}
