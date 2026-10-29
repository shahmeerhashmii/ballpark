import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getQueuedGuesses, queueGuess, clearQueuedGuesses, setQueuedGuesses } from './storage';
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
  tiers: {
    park: number;
    deep: number;
    solid: number;
    play: number;
    caught: number;
    miss: number;
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
      mode: guess.mode ?? 'classic',
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
        mode: item.mode ?? 'classic',
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
    setQueuedGuesses(remaining);
  }
}

export async function fetchQuestionStats(
  day: number,
  qIndex: number
): Promise<QuestionStatsData | null> {
  if (!supabase || !navigator.onLine) return null;

  try {
    const { data, error } = await supabase.rpc('get_question_tiers', {
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
    // The database stores points (0 to 100 per question); players see feet.
    return Math.round(Number(data) * 4.5);
  } catch {
    return null;
  }
}

// ---------- Answer reports ----------

export interface AnswerReport {
  player_id: string;
  puzzle_day: number;
  q_index: number;
  question: string;
  shown_answer: string;
  reason: string;
  note: string;
}

const REPORT_QUEUE_KEY = 'ballpark_queued_reports';

function readReportQueue(): AnswerReport[] {
  try {
    return JSON.parse(window.localStorage.getItem(REPORT_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeReportQueue(list: AnswerReport[]): void {
  try {
    window.localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

/** Sends a report. If it can't be sent now, it's kept and sent next time the game opens online. */
export async function submitReport(report: AnswerReport): Promise<'sent' | 'saved'> {
  if (supabase && navigator.onLine) {
    try {
      const { error } = await supabase.from('answer_reports').insert(report);
      if (!error) return 'sent';
    } catch {
      // fall through to the queue
    }
  }
  writeReportQueue([...readReportQueue(), report]);
  return 'saved';
}

export async function syncQueuedReports(): Promise<void> {
  if (!supabase || !navigator.onLine) return;
  const queued = readReportQueue();
  if (queued.length === 0) return;
  try {
    const { error } = await supabase.from('answer_reports').insert(queued);
    if (!error) writeReportQueue([]);
  } catch {
    // try again next time
  }
}

// ---------- Daily reminder subscriptions ----------

export async function savePushSubscription(args: {
  playerId: string;
  subscription: PushSubscriptionJSON;
  hour: number;
  timeZone: string;
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('save_push_subscription', {
      p_player_id: args.playerId,
      p_endpoint: args.subscription.endpoint,
      p_subscription: args.subscription,
      p_hour: args.hour,
      p_time_zone: args.timeZone,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc('remove_push_subscription', { p_endpoint: endpoint });
  } catch {
    // ignore
  }
}
