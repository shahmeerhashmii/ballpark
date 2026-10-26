-- Supabase Schema for Ballpark

-- 1. Create guesses table
create table if not exists public.guesses (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  puzzle_day int not null,
  q_index int not null check (q_index between 1 and 5),
  guess numeric not null check (guess > 0),
  points int not null check (points between 0 and 100),
  created_at timestamptz not null default now(),
  constraint uq_player_day_q unique (player_id, puzzle_day, q_index)
);

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

-- 3. SQL function get_question_stats(p_day int, p_q int)
create or replace function public.get_question_stats(p_day int, p_q int)
returns json
language plpgsql
security definer
as $$
declare
  total_count int;
  median_val numeric;
  band_exact int;
  band_10 int;
  band_15 int;
  band_30 int;
  band_40 int;
  band_50 int;
  band_75 int;
  band_80 int;
  band_90 int;
  band_99 int;
  band_miss int;
  result json;
begin
  select count(*) into total_count
  from public.guesses
  where puzzle_day = p_day and q_index = p_q;

  if total_count = 0 then
    return json_build_object(
      'total_count', 0,
      'median_guess', null,
      'bands', json_build_object(
        'exact', 0,
        'within_10', 0,
        'within_15', 0,
        'within_30', 0,
        'within_40', 0,
        'within_50', 0,
        'within_75', 0,
        'within_80', 0,
        'within_90', 0,
        'within_99', 0,
        'more_than_99', 0
      )
    );
  end if;

  select percentile_cont(0.5) within group (order by guess) into median_val
  from public.guesses
  where puzzle_day = p_day and q_index = p_q;

  select
    count(*) filter (where points = 100),
    count(*) filter (where points = 90),
    count(*) filter (where points = 75),
    count(*) filter (where points = 60),
    count(*) filter (where points = 50),
    count(*) filter (where points = 30),
    count(*) filter (where points = 15),
    count(*) filter (where points = 10),
    count(*) filter (where points = 5),
    count(*) filter (where points = 1),
    count(*) filter (where points = 0)
  into
    band_exact, band_10, band_15, band_30, band_40,
    band_50, band_75, band_80, band_90, band_99, band_miss
  from public.guesses
  where puzzle_day = p_day and q_index = p_q;

  result := json_build_object(
    'total_count', total_count,
    'median_guess', median_val,
    'bands', json_build_object(
      'exact', band_exact,
      'within_10', band_10,
      'within_15', band_15,
      'within_30', band_30,
      'within_40', band_40,
      'within_50', band_50,
      'within_75', band_75,
      'within_80', band_80,
      'within_90', band_90,
      'within_99', band_99,
      'more_than_99', band_miss
    )
  );

  return result;
end;
$$;

grant execute on function public.get_question_stats(int, int) to anon;
grant execute on function public.get_question_stats(int, int) to authenticated;

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
    select player_id, sum(points) as daily_total, count(q_index) as q_count
    from public.guesses
    where puzzle_day = p_day
    group by player_id
    having count(q_index) = 5
  ) player_totals;

  return avg_score;
end;
$$;

grant execute on function public.get_day_average(int) to anon;
grant execute on function public.get_day_average(int) to authenticated;

-- 5. Distance tiers (added with the "out of the park" scoring update)
-- Points are still 0 to 100 per question. Feet shown in the app = points x 4.5.
-- Tiers: park 89+, deep 67-88, solid 45-66, play 23-44, caught 1-22, miss 0.
-- Run this block once in the Supabase SQL editor. The old get_question_stats stays for older clients.
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
  where puzzle_day = p_day and q_index = p_q;

  select percentile_cont(0.5) within group (order by guess) into median_val
  from public.guesses
  where puzzle_day = p_day and q_index = p_q;

  return (
    select json_build_object(
      'total_count', total_count,
      'median_guess', median_val,
      'tiers', json_build_object(
        'park', count(*) filter (where points >= 89),
        'deep', count(*) filter (where points between 67 and 88),
        'solid', count(*) filter (where points between 45 and 66),
        'play', count(*) filter (where points between 23 and 44),
        'caught', count(*) filter (where points between 1 and 22),
        'miss', count(*) filter (where points = 0)
      )
    )
    from public.guesses
    where puzzle_day = p_day and q_index = p_q
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
