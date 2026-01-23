-- Fantasy Movie League - Initial Database Schema
-- ============================================

-- ============================================
-- LEAGUES
-- ============================================
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_year integer not null,
  status text not null default 'active',
  scores_frozen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TEAMS
-- ============================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  photo_url text,
  budget_remaining numeric(10,2) default 1000.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(league_id, user_id)
);

create index idx_teams_league on teams(league_id);
create index idx_teams_user on teams(user_id);

-- ============================================
-- MOVIES
-- ============================================
create table movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_date date,
  release_month integer not null,
  release_year integer not null,
  tmdb_id integer unique,
  imdb_id text unique,
  poster_url text,
  backdrop_url text,
  genre text,
  runtime_minutes integer,
  director text,
  cast_list text[],
  synopsis text,
  trailer_url text,
  domestic_box_office numeric(15,2) default 0,
  theater_count integer default 0,
  metacritic_score numeric(4,1),
  rotten_tomatoes_score integer,
  oscar_nominations integer default 0,
  oscar_wins integer default 0,
  best_picture_nominated boolean default false,
  best_picture_won boolean default false,
  calculated_score numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_movies_release on movies(release_year, release_month);
create index idx_movies_tmdb on movies(tmdb_id);

-- ============================================
-- AUCTIONS
-- ============================================
create table auctions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  for_month integer not null,
  for_year integer not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text default 'upcoming',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(league_id, for_month, for_year)
);

create index idx_auctions_league on auctions(league_id);
create index idx_auctions_status on auctions(status);

-- ============================================
-- AUCTION_MOVIES
-- ============================================
create table auction_movies (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references auctions(id) on delete cascade,
  movie_id uuid references movies(id) on delete cascade,
  created_at timestamptz default now(),
  unique(auction_id, movie_id)
);

create index idx_auction_movies_auction on auction_movies(auction_id);

-- ============================================
-- BIDS
-- ============================================
create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references auctions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  movie_id uuid references movies(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(auction_id, team_id, movie_id)
);

create index idx_bids_auction on bids(auction_id);
create index idx_bids_team on bids(team_id);

-- ============================================
-- TEAM_MOVIES
-- ============================================
create table team_movies (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  movie_id uuid references movies(id) on delete cascade,
  auction_id uuid references auctions(id),
  winning_bid numeric(10,2) not null,
  acquired_at timestamptz default now(),
  unique(team_id, movie_id)
);

create index idx_team_movies_team on team_movies(team_id);
create index idx_team_movies_movie on team_movies(movie_id);

-- ============================================
-- STANDINGS_SNAPSHOTS
-- ============================================
create table standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references auctions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  rank integer not null,
  total_points numeric(10,2) not null,
  random_tiebreaker numeric(10,8) not null default random(),
  created_at timestamptz default now(),
  unique(auction_id, team_id)
);

-- ============================================
-- NOTIFICATION_LOG
-- ============================================
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null,
  reference_id uuid,
  sent_at timestamptz default now()
);

create index idx_notifications_user on notification_log(user_id, notification_type);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate movie score
create or replace function calculate_movie_score(
  p_box_office numeric,
  p_theaters integer,
  p_metacritic numeric,
  p_oscar_noms integer,
  p_oscar_wins integer,
  p_bp_nom boolean,
  p_bp_win boolean
) returns numeric as $$
declare
  box_office_component numeric;
  base_score numeric;
  oscar_points numeric;
  final_score numeric;
begin
  p_metacritic := coalesce(p_metacritic, 0);

  if coalesce(p_theaters, 0) < 5 then
    box_office_component := 0;
  else
    box_office_component := least(
      (coalesce(p_box_office, 0) / p_theaters) / 1000,
      15
    );
  end if;

  base_score := box_office_component * p_metacritic;

  if base_score < p_metacritic then
    base_score := p_metacritic;
  end if;

  oscar_points := 0;
  oscar_points := oscar_points + (coalesce(p_oscar_noms, 0) * 0.5);
  oscar_points := oscar_points + (coalesce(p_oscar_wins, 0) * 1.0);

  if p_bp_nom then
    oscar_points := oscar_points + 0.5;
  end if;

  if p_bp_win then
    oscar_points := oscar_points + 1.0;
  end if;

  final_score := base_score + oscar_points;
  return round(final_score, 2);
end;
$$ language plpgsql immutable;

-- Update movie score trigger function
create or replace function update_movie_score() returns trigger as $$
begin
  new.calculated_score := calculate_movie_score(
    new.domestic_box_office,
    new.theater_count,
    new.metacritic_score,
    new.oscar_nominations,
    new.oscar_wins,
    new.best_picture_nominated,
    new.best_picture_won
  );
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_movie_score
  before insert or update of
    domestic_box_office, theater_count, metacritic_score,
    oscar_nominations, oscar_wins, best_picture_nominated, best_picture_won
  on movies
  for each row
  execute function update_movie_score();

-- Get team total points
create or replace function get_team_points(p_team_id uuid) returns numeric as $$
  select coalesce(sum(m.calculated_score), 0)
  from team_movies tm
  join movies m on m.id = tm.movie_id
  where tm.team_id = p_team_id;
$$ language sql stable;

-- Get league standings
create or replace function get_league_standings(p_league_id uuid)
returns table (
  team_id uuid,
  team_name text,
  photo_url text,
  total_points numeric,
  points_back numeric,
  budget_remaining numeric,
  movies_owned bigint,
  total_box_office numeric,
  avg_theaters numeric,
  avg_rating numeric,
  oscar_points numeric,
  rank bigint
) as $$
  with team_stats as (
    select
      t.id as team_id,
      t.name as team_name,
      t.photo_url,
      t.budget_remaining,
      coalesce(sum(m.calculated_score), 0) as total_points,
      count(tm.id) as movies_owned,
      coalesce(sum(m.domestic_box_office), 0) as total_box_office,
      coalesce(avg(m.theater_count), 0) as avg_theaters,
      coalesce(avg(m.metacritic_score), 0) as avg_rating,
      coalesce(sum(
        (m.oscar_nominations * 0.5) +
        (m.oscar_wins * 1.0) +
        (case when m.best_picture_nominated then 0.5 else 0 end) +
        (case when m.best_picture_won then 1.0 else 0 end)
      ), 0) as oscar_points
    from teams t
    left join team_movies tm on tm.team_id = t.id
    left join movies m on m.id = tm.movie_id
    where t.league_id = p_league_id
    group by t.id, t.name, t.photo_url, t.budget_remaining
  ),
  ranked as (
    select
      *,
      max(total_points) over () as leader_points,
      row_number() over (order by total_points desc) as rank
    from team_stats
  )
  select
    team_id,
    team_name,
    photo_url,
    total_points,
    leader_points - total_points as points_back,
    budget_remaining,
    movies_owned,
    total_box_office,
    round(avg_theaters, 0) as avg_theaters,
    round(avg_rating, 1) as avg_rating,
    oscar_points,
    rank
  from ranked
  order by rank;
$$ language sql stable;

-- Deduct budget helper
create or replace function deduct_budget(p_team_id uuid, p_amount numeric) returns void as $$
  update teams
  set budget_remaining = budget_remaining - p_amount,
      updated_at = now()
  where id = p_team_id;
$$ language sql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table leagues enable row level security;
alter table teams enable row level security;
alter table movies enable row level security;
alter table auctions enable row level security;
alter table auction_movies enable row level security;
alter table bids enable row level security;
alter table team_movies enable row level security;
alter table standings_snapshots enable row level security;
alter table notification_log enable row level security;

-- Leagues
create policy "Users can view leagues they belong to"
  on leagues for select
  using (id in (
    select league_id from teams where user_id = auth.uid()
  ));

-- Teams
create policy "Users can view teams in their league"
  on teams for select
  using (league_id in (
    select league_id from teams where user_id = auth.uid()
  ));

create policy "Users can update their own team"
  on teams for update
  using (user_id = auth.uid());

-- Movies
create policy "Anyone can view movies"
  on movies for select
  using (true);

-- Auctions
create policy "Users can view auctions in their league"
  on auctions for select
  using (league_id in (
    select league_id from teams where user_id = auth.uid()
  ));

-- Auction Movies
create policy "Users can view auction movies"
  on auction_movies for select
  using (auction_id in (
    select id from auctions where league_id in (
      select league_id from teams where user_id = auth.uid()
    )
  ));

-- Bids
create policy "Users can view their own bids"
  on bids for select
  using (team_id in (select id from teams where user_id = auth.uid()));

create policy "Users can view all bids after auction resolves"
  on bids for select
  using (
    auction_id in (select id from auctions where status = 'resolved')
    and auction_id in (
      select id from auctions where league_id in (
        select league_id from teams where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert their own bids"
  on bids for insert
  with check (
    team_id in (select id from teams where user_id = auth.uid())
    and auction_id in (select id from auctions where status = 'open')
  );

create policy "Users can update their own bids"
  on bids for update
  using (
    team_id in (select id from teams where user_id = auth.uid())
    and auction_id in (select id from auctions where status = 'open')
  );

-- Team Movies
create policy "Users can view team movies in their league"
  on team_movies for select
  using (team_id in (
    select id from teams where league_id in (
      select league_id from teams where user_id = auth.uid()
    )
  ));

-- Notification Log
create policy "Users can view their own notifications"
  on notification_log for select
  using (user_id = auth.uid());
