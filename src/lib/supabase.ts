import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getQueuedGuesses, queueGuess, clearQueuedGuesses } from './storage';
import { QueuedGuess } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface QuestionStatsData {
  total_count: number;
  median_guess: number | null;
  bands: {
    exact: number;
    within_10: number;
    within_15: number;
    within_30: number;
    within_40: number;
    within_50: number;
    within_75: number;
    within_80: number;
    within_90: number;
    within_99: number;
    more_than_99: number;
  };
}

export async function submitGuessToSupabase(guess: QueuedGuess): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('guesses').insert({
      player_id: guess.player_id,
      puzzle_day: guess.puzzle_day,
      q_index: guess.q_index,
      guess: guess.guess,
      points: guess.points,
    });

    if (error) {
      // If error (e.g. offline/network), queue it
      queueGuess(guess);
      return false;
    }
    return true;
  } catch {
    queueGuess(guess);
    return false;
  }
}

export async function syncQueuedGuesses(): Promise<void> {
  if (!supabase || !navigator.onLine) return;

  const queued = getQueuedGuesses();
  if (queued.length === 0) return;

  const remaining: QueuedGuess[] = [];
  for (const item of queued) {
    try {
      const { error } = await supabase.from('guesses').insert({
        player_id: item.player_id,
        puzzle_day: item.puzzle_day,
        q_index: item.q_index,
        guess: item.guess,
        points: item.points,
      });
      if (error && error.code !== '23505') { // 23505 is unique violation, which means it was already inserted
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  if (remaining.length === 0) {
    clearQueuedGuesses();
  } else {
    localStorage.setItem('ballpark_queued_guesses', JSON.stringify(remaining));
  }
}

export async function fetchQuestionStats(
  day: number,
  qIndex: number
): Promise<QuestionStatsData | null> {
  if (!supabase || !navigator.onLine) return null;

  try {
    const { data, error } = await supabase.rpc('get_question_stats', {
      p_day: day,
      p_q: qIndex,
    });

    if (error || !data) return null;
    return data as QuestionStatsData;
  } catch {
    return null;
  }
}

export async function fetchDayAverage(day: number): Promise<number | null> {
  if (!supabase || !navigator.onLine) return null;

  try {
    const { data, error } = await supabase.rpc('get_day_average', {
      p_day: day,
    });

    if (error || data === null || data === undefined) return null;
    return Number(data);
  } catch {
    return null;
  }
}
