import { DayProgress, PlayerStats, QueuedGuess } from '../types';
import { getRating } from './scoring';

const PLAYER_ID_KEY = 'ballpark_player_id';
const HAS_SEEN_HOW_TO_PLAY_KEY = 'ballpark_has_seen_how_to_play_v2';
const MODE_KEY = 'ballpark_preferred_mode';
const STATS_KEY_V1 = 'ballpark_player_stats';
const STATS_KEY = 'ballpark_player_stats_v2';
const QUEUED_GUESSES_KEY = 'ballpark_queued_guesses';
// v2 because a saved day from the old scoring has a different shape
const DAY_PROGRESS_PREFIX = 'ballpark_day_progress_v2_';

// localStorage can be missing or throw (private windows, blocked storage, embedded previews).
// Every read and write goes through these so the game still runs, it just won't remember.
const memoryFallback = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    memoryFallback.delete(key);
  }
}

export function getOrCreatePlayerId(): string {
  let id = safeGet(PLAYER_ID_KEY);
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
    safeSet(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getHasSeenHowToPlay(): boolean {
  return safeGet(HAS_SEEN_HOW_TO_PLAY_KEY) === 'true';
}

export function setHasSeenHowToPlay(seen: boolean): void {
  safeSet(HAS_SEEN_HOW_TO_PLAY_KEY, seen ? 'true' : 'false');
}

export function getPreferredMode(): 'classic' | 'easy' {
  return safeGet(MODE_KEY) === 'easy' ? 'easy' : 'classic';
}

export function setPreferredMode(mode: 'classic' | 'easy'): void {
  safeSet(MODE_KEY, mode);
}

export function getDayProgress(day: number): DayProgress | null {
  try {
    const raw = safeGet(`${DAY_PROGRESS_PREFIX}${day}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDayProgress(progress: DayProgress): void {
  safeSet(`${DAY_PROGRESS_PREFIX}${progress.dayNumber}`, JSON.stringify(progress));
}

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

/** The streak as it stands today, counting freezes that would cover any missed days. */
export function liveStreak(stats: PlayerStats, today: number): { streak: number; atRisk: boolean } {
  if (stats.lastPlayedDay === null || stats.currentStreak === 0) return { streak: 0, atRisk: false };
  const missed = today - stats.lastPlayedDay - 1; // days skipped before today
  if (missed < 0) return { streak: stats.currentStreak, atRisk: false }; // already played today
  if (missed === 0) return { streak: stats.currentStreak, atRisk: true }; // play today to keep it
  if (missed <= stats.freezes) return { streak: stats.currentStreak, atRisk: true };
  return { streak: 0, atRisk: false };
}

const defaultStats: PlayerStats = {
  gamesPlayed: 0,
  classicGames: 0,
  easyGames: 0,
  easyRight: 0,
  easyPerfect: 0,
  totalFeet: 0,
  bestFeet: 0,
  homeRuns: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDay: null,
  freezes: 0,
  freezesUsed: 0,
  lastFreezeUsedOn: null,
  lastFreezeCount: 0,
  scoreDistribution: {
    bullseye: 0,
    ballpark: 0,
    parkingLot: 0,
    wrongStadium: 0,
    differentSport: 0,
  },
};

function freshDefaults(): PlayerStats {
  return { ...defaultStats, scoreDistribution: { ...defaultStats.scoreDistribution } };
}

export function getPlayerStats(): PlayerStats {
  try {
    const raw = safeGet(STATS_KEY);
    if (raw) return { ...freshDefaults(), ...JSON.parse(raw) };

    // First load after the update: carry over streaks and games played from the old stats.
    // Old scores were out of 500 and can't be compared to feet, so those start fresh.
    const old = safeGet(STATS_KEY_V1);
    if (old) {
      const parsed = JSON.parse(old);
      const migrated: PlayerStats = {
        ...freshDefaults(),
        gamesPlayed: parsed.gamesPlayed ?? 0,
        currentStreak: parsed.currentStreak ?? 0,
        longestStreak: parsed.longestStreak ?? 0,
        lastPlayedDay: parsed.lastPlayedDay ?? null,
      };
      safeSet(STATS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return freshDefaults();
  } catch {
    return freshDefaults();
  }
}

export function updateStatsOnGameComplete(
  dayNumber: number,
  result: { mode: 'classic' | 'easy'; totalFeet: number; homeRuns: number; easyRight: number }
): PlayerStats {
  const { mode, totalFeet, homeRuns, easyRight } = result;
  const stats = getPlayerStats();

  // Prevent duplicate stats recording for same day
  if (stats.lastPlayedDay === dayNumber) {
    return stats;
  }

  stats.gamesPlayed += 1;
  if (mode === 'easy') {
    // Easy games keep their own record so they never drag down classic averages
    stats.easyGames += 1;
    stats.easyRight += easyRight;
    if (easyRight >= 5) stats.easyPerfect += 1;
  } else {
    stats.classicGames += 1;
    stats.totalFeet += totalFeet;
    stats.homeRuns += homeRuns;
    if (totalFeet > stats.bestFeet) {
      stats.bestFeet = totalFeet;
    }
  }

  // Streak, with freezes covering missed days
  const missed = stats.lastPlayedDay === null ? null : dayNumber - stats.lastPlayedDay - 1;
  if (missed === 0) {
    stats.currentStreak += 1;
  } else if (missed !== null && missed > 0 && missed <= stats.freezes && stats.currentStreak > 0) {
    stats.freezes -= missed;
    stats.freezesUsed += missed;
    stats.lastFreezeUsedOn = dayNumber;
    stats.lastFreezeCount = missed;
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }
  // Every 7 days in a row earns a freeze, up to 2 banked
  if (stats.currentStreak > 0 && stats.currentStreak % FREEZE_EVERY === 0) {
    stats.freezes = Math.min(MAX_FREEZES, stats.freezes + 1);
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  stats.lastPlayedDay = dayNumber;
  if (mode === 'classic') stats.scoreDistribution[getRating(totalFeet).key] += 1;

  safeSet(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export function getQueuedGuesses(): QueuedGuess[] {
  try {
    const raw = safeGet(QUEUED_GUESSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function queueGuess(guess: QueuedGuess): void {
  const list = getQueuedGuesses();
  list.push(guess);
  safeSet(QUEUED_GUESSES_KEY, JSON.stringify(list));
}

export function setQueuedGuesses(list: QueuedGuess[]): void {
  safeSet(QUEUED_GUESSES_KEY, JSON.stringify(list));
}

export function clearQueuedGuesses(): void {
  safeRemove(QUEUED_GUESSES_KEY);
}

export function resetLocalData(): void {
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  memoryFallback.clear();
}
