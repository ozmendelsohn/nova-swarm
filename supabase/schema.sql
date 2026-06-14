-- Nova Swarm — Supabase schema for global scoreboard + comments.
-- Run this once in the Supabase SQL editor for a fresh project.

create table scores (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  name         text not null check (char_length(name) <= 24),
  character    text,
  time_sec     real not null,
  level        int  not null,
  kills        int  not null,
  coins        int,
  won          boolean default false,
  weapons      int,
  deadliest    text,
  comment      text check (char_length(comment) <= 280),        -- public comment
  private_note text check (char_length(private_note) <= 1000)   -- dev-only feedback
);

alter table scores enable row level security;

-- Anyone may insert a run. There is deliberately NO select policy for anon,
-- so the private_note column is unreadable with the public anon key.
create policy "anon insert" on scores
  for insert to anon with check (true);

-- Public leaderboard view WITHOUT private_note. The anon key reads from here.
create view public_scores as
  select id, created_at, name, character, time_sec, level, kills,
         coins, won, weapons, deadliest, comment
  from scores
  order by time_sec desc;

grant select on public_scores to anon;
