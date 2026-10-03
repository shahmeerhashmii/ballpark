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
