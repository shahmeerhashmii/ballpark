// Ballpark daily reminder: a Supabase Edge Function that runs every hour (see schema.sql, step 8).
// For every player who turned reminders on, it sends one notification a day at 1 pm in their own
// time zone (REMINDER_HOUR in src/config.ts), and skips anyone who has already played today's game.
//
// One-time setup:
//   1. npx web-push generate-vapid-keys
//   2. supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
//   3. supabase functions deploy daily-reminder
//   4. Put the same public key in the GitHub secret VITE_VAPID_PUBLIC_KEY so the app can subscribe.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const START_DATE = '2026-10-05'; // must match src/config.ts
const GAME_TIME_ZONE = 'America/Toronto';
const APP_URL = 'https://shahmeerhashmii.github.io/ballpark/';

function dateIn(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function hourIn(tz: string, d = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(d));
}

function puzzleDay(): number {
  const today = new Date(dateIn(GAME_TIME_ZONE) + 'T00:00:00Z').getTime();
  const start = new Date(START_DATE + 'T00:00:00Z').getTime();
  return Math.round((today - start) / 86400000) + 1;
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const day = puzzleDay();
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const sub of subs ?? []) {
    const tz = sub.time_zone || GAME_TIME_ZONE;
    const localDate = dateIn(tz);
    if (hourIn(tz) !== sub.hour_local) continue;
    if (sub.last_sent_on === localDate) continue;

    // Skip players who have already played today
    const { count } = await supabase
      .from('guesses')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', sub.player_id)
      .eq('puzzle_day', day);
    if ((count ?? 0) > 0) continue;

    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: `You haven't played Ballpark #${day} yet`,
          body: "Today's 5 questions are waiting. Step up to the plate and keep your streak going.",
          url: APP_URL,
        })
      );
      sent++;
      await supabase.from('push_subscriptions').update({ last_sent_on: localDate }).eq('endpoint', sub.endpoint);
    } catch (err) {
      // 404 or 410 means the player uninstalled or turned notifications off: stop sending to them
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }
  return new Response(JSON.stringify({ day, sent }), { headers: { 'Content-Type': 'application/json' } });
});
