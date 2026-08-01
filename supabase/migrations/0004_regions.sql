alter table public.activities
  add column if not exists region_code text,
  add column if not exists region_resolution_status text not null default 'unresolved';

alter table public.activities
  drop constraint if exists activities_region_resolution_status_check;

alter table public.activities
  add constraint activities_region_resolution_status_check
  check (region_resolution_status in ('resolved', 'unresolved', 'not_supported'));

create index if not exists activities_athlete_region_idx on public.activities (athlete_id, region_code);

create table if not exists public.passport_region_summaries (
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  region_code text not null,
  first_visited_at timestamptz not null,
  last_visited_at timestamptz not null,
  activity_count integer not null,
  total_distance_meters double precision not null default 0,
  total_moving_time_seconds integer not null default 0,
  total_elevation_gain_meters double precision not null default 0,
  sport_types text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (athlete_id, region_code)
);

alter table public.passport_region_summaries enable row level security;
revoke all on public.passport_region_summaries from anon, authenticated;
grant select, insert, update, delete on public.passport_region_summaries to service_role;
