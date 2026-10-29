-- Supabase Schema for Ballpark

-- 1. Create guesses table
create table if not exists public.guesses (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  puzzle_day int not null,
  q_index int not null check (q_index between 1 and 5),
  guess numeric not null check (guess > 0),
  feet int not null check (feet between 0 and 450), -- distance of the counted swing, to the foot
  created_at timestamptz not null default now(),
  constraint uq_player_day_q unique (player_id, puzzle_day, q_index)
);

-- Which mode the guess came from. Easy picks are saved so the daily reminder knows the player
-- has played, but every community number below only counts classic guesses.
alter table public.guesses add column if not exists mode text not null default 'classic';
alter table public.guesses drop constraint if exists guesses_mode_check;
alter table public.guesses add constraint guesses_mode_check check (mode in ('classic', 'easy'));

-- Index for speedy aggregate lookups
create index if not exists idx_guesses_day_q on public.guesses(puzzle_day, q_index);
create index if not exists idx_guesses_day on public.guesses(puzzle_day);

-- 2. Enable Row Level Security
alter table public.guesses enable row level security;

-- Anonymous users can INSERT only (cannot read, update or delete raw rows)
drop policy if exists "Allow anonymous insert" on public.guesses;
create policy "Allow anonymous insert"
  on public.guesses
  for insert
  to anon
  with check (true);

-- Revoke select/update/delete on guesses table from anon and authenticated
revoke select, update, delete on table public.guesses from anon;
revoke select, update, delete on table public.guesses from authenticated;

-- 3. (Removed) get_question_stats was the old points-based breakdown. get_question_tiers below replaces it.
drop function if exists public.get_question_stats(int, int);

-- 4. SQL function get_day_average(p_day int)
create or replace function public.get_day_average(p_day int)
returns numeric
language plpgsql
security definer
as $$
declare
  avg_score numeric;
begin
  -- Average daily total score across players who completed all 5 questions
  select round(avg(daily_total), 1) into avg_score
  from (
    select player_id, sum(feet) as daily_total, count(q_index) as q_count
    from public.guesses
    where puzzle_day = p_day and mode = 'classic'
    group by player_id
    having count(q_index) = 5
  ) player_totals;

  return avg_score;
end;
$$;

grant execute on function public.get_day_average(int) to anon;
grant execute on function public.get_day_average(int) to authenticated;

-- 5. Distance tiers: how everyone hit each question.
-- Tiers by distance: park 400+ ft, deep 300-399, solid 200-299, play 100-199, caught 1-99, miss 0.
create or replace function public.get_question_tiers(p_day int, p_q int)
returns json
language plpgsql
security definer
as $$
declare
  total_count int;
  median_val numeric;
begin
  select count(*) into total_count
  from public.guesses
  where puzzle_day = p_day and q_index = p_q and mode = 'classic';

  select percentile_cont(0.5) within group (order by guess) into median_val
  from public.guesses
  where puzzle_day = p_day and q_index = p_q and mode = 'classic';

  return (
    select json_build_object(
      'total_count', total_count,
      'median_guess', median_val,
      'tiers', json_build_object(
        'park', count(*) filter (where feet >= 400),
        'deep', count(*) filter (where feet between 300 and 399),
        'solid', count(*) filter (where feet between 200 and 299),
        'play', count(*) filter (where feet between 100 and 199),
        'caught', count(*) filter (where feet between 1 and 99),
        'miss', count(*) filter (where feet = 0)
      )
    )
    from public.guesses
    where puzzle_day = p_day and q_index = p_q and mode = 'classic'
  );
end;
$$;

grant execute on function public.get_question_tiers(int, int) to anon;
grant execute on function public.get_question_tiers(int, int) to authenticated;

-- 6. Answer reports (the "Report this answer" button)
-- Players can send reports but cannot read anyone's reports. You read them in the Supabase dashboard
-- (Table editor > answer_reports), newest first.
create table if not exists public.answer_reports (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  puzzle_day int not null,
  q_index int not null,
  question text not null check (char_length(question) <= 400),
  shown_answer text not null check (char_length(shown_answer) <= 120),
  reason text not null check (char_length(reason) <= 60),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_reports_day on public.answer_reports(puzzle_day, q_index);
alter table public.answer_reports enable row level security;
drop policy if exists "Allow anonymous report insert" on public.answer_reports;
create policy "Allow anonymous report insert" on public.answer_reports for insert to anon with check (true);
revoke select, update, delete on table public.answer_reports from anon, authenticated;

-- 7. Daily reminder subscriptions (web push for the installed app)
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  player_id uuid not null,
  subscription jsonb not null,
  hour_local int not null check (hour_local between 0 and 23),
  time_zone text not null default 'America/Toronto',
  last_sent_on date,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;

create or replace function public.save_push_subscription(
  p_player_id uuid, p_endpoint text, p_subscription jsonb, p_hour int, p_time_zone text
) returns void language plpgsql security definer as $$
begin
  insert into public.push_subscriptions (endpoint, player_id, subscription, hour_local, time_zone)
  values (p_endpoint, p_player_id, p_subscription, p_hour, coalesce(nullif(p_time_zone, ''), 'America/Toronto'))
  on conflict (endpoint) do update
    set player_id = excluded.player_id, subscription = excluded.subscription,
        hour_local = excluded.hour_local, time_zone = excluded.time_zone;
end;
$$;
grant execute on function public.save_push_subscription(uuid, text, jsonb, int, text) to anon;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;
grant execute on function public.remove_push_subscription(text) to anon;

-- 8. Run the reminder sender every hour (needs the pg_cron and pg_net extensions,
--    turned on under Database > Extensions). Replace YOUR-PROJECT and YOUR-SERVICE-ROLE-KEY.
-- select cron.schedule('ballpark-daily-reminder', '0 * * * *', $$
--   select net.http_post(
--     url := 'https://YOUR-PROJECT.supabase.co/functions/v1/daily-reminder',
--     headers := '{"Authorization": "Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb
--   );
-- $$);
