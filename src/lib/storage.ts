import { DayProgress, PlayerStats, QueuedGuess } from '../types';

const PLAYER_ID_KEY = 'ballpark_player_id';
const HAS_SEEN_HOW_TO_PLAY_KEY = 'ballpark_has_seen_how_to_play';
const STATS_KEY = 'ballpark_player_stats';
const QUEUED_GUESSES_KEY = 'ballpark_queued_guesses';
const DAY_PROGRESS_PREFIX = 'ballpark_day_progress_';

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getHasSeenHowToPlay(): boolean {
  return localStorage.getItem(HAS_SEEN_HOW_TO_PLAY_KEY) === 'true';
}

export function setHasSeenHowToPlay(seen: boolean): void {
  localStorage.setItem(HAS_SEEN_HOW_TO_PLAY_KEY, seen ? 'true' : 'false');
}

export function getDayProgress(day: number): DayProgress | null {
  try {
    const raw = localStorage.getItem(`${DAY_PROGRESS_PREFIX}${day}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDayProgress(progress: DayProgress): void {
  localStorage.setItem(`${DAY_PROGRESS_PREFIX}${progress.dayNumber}`, JSON.stringify(progress));
}

const defaultStats: PlayerStats = {
  gamesPlayed: 0,
  totalScore: 0,
  bestScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDay: null,
  scoreDistribution: {
    bullseye: 0,
    ballpark: 0,
    parkingLot: 0,
    wrongStadium: 0,
    differentSport: 0,
  },
};

export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaultStats };
    return { ...defaultStats, ...JSON.parse(raw) };
  } catch {
    return { ...defaultStats };
  }
}

export function updateStatsOnGameComplete(dayNumber: number, totalScore: number): PlayerStats {
  const stats = getPlayerStats();
  
  // Prevent duplicate stats recording for same day
  if (stats.lastPlayedDay === dayNumber) {
    return stats;
  }

  stats.gamesPlayed += 1;
  stats.totalScore += totalScore;
  if (totalScore > stats.bestScore) {
    stats.bestScore = totalScore;
  }

  if (stats.lastPlayedDay === dayNumber - 1) {
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  stats.lastPlayedDay = dayNumber;

  if (totalScore >= 450) {
    stats.scoreDistribution.bullseye += 1;
  } else if (totalScore >= 350) {
    stats.scoreDistribution.ballpark += 1;
  } else if (totalScore >= 250) {
    stats.scoreDistribution.parkingLot += 1;
  } else if (totalScore >= 150) {
    stats.scoreDistribution.wrongStadium += 1;
  } else {
    stats.scoreDistribution.differentSport += 1;
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export function getQueuedGuesses(): QueuedGuess[] {
  try {
    const raw = localStorage.getItem(QUEUED_GUESSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function queueGuess(guess: QueuedGuess): void {
  const list = getQueuedGuesses();
  list.push(guess);
  localStorage.setItem(QUEUED_GUESSES_KEY, JSON.stringify(list));
}

export function clearQueuedGuesses(): void {
  localStorage.removeItem(QUEUED_GUESSES_KEY);
}

export function resetLocalData(): void {
  localStorage.clear();
}
