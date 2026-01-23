-- Add league-specific scoring settings
-- These allow commissioners to customize how movies are scored in their league

-- Movies per auction: How many movies each team can win per auction (default 2)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS movies_per_auction integer NOT NULL DEFAULT 2;

-- Minimum theaters: Movies must be in this many theaters to earn box office points (default 5)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS min_theaters_for_scoring integer NOT NULL DEFAULT 5;

-- Max box office per theater: Cap on $/theater in thousands (default 15 = $15k)
-- NULL means no cap (favors blockbusters)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS max_box_office_per_theater numeric DEFAULT 15;

-- Add constraints
ALTER TABLE leagues ADD CONSTRAINT chk_movies_per_auction
  CHECK (movies_per_auction >= 1 AND movies_per_auction <= 10);

ALTER TABLE leagues ADD CONSTRAINT chk_min_theaters_for_scoring
  CHECK (min_theaters_for_scoring >= 0 AND min_theaters_for_scoring <= 1000);

ALTER TABLE leagues ADD CONSTRAINT chk_max_box_office_per_theater
  CHECK (max_box_office_per_theater IS NULL OR max_box_office_per_theater > 0);

-- Add comments for documentation
COMMENT ON COLUMN leagues.movies_per_auction IS 'Maximum movies each team can win per auction (1-10, default 2)';
COMMENT ON COLUMN leagues.min_theaters_for_scoring IS 'Minimum theaters required for box office points (0-1000, default 5)';
COMMENT ON COLUMN leagues.max_box_office_per_theater IS 'Cap on $/theater in thousands (NULL = no cap, default 15). Lower values favor smaller films.';

-- Create a league-aware score calculation function
-- This calculates a movie score using league-specific settings
CREATE OR REPLACE FUNCTION calculate_movie_score_for_league(
  p_box_office numeric,
  p_theaters integer,
  p_metacritic numeric,
  p_oscar_noms integer,
  p_oscar_wins integer,
  p_bp_nom boolean,
  p_bp_win boolean,
  p_min_theaters integer DEFAULT 5,
  p_max_bo_per_theater numeric DEFAULT 15
) RETURNS numeric AS $$
DECLARE
  box_office_component numeric;
  base_score numeric;
  oscar_points numeric;
  final_score numeric;
BEGIN
  p_metacritic := COALESCE(p_metacritic, 0);

  -- Check minimum theaters requirement
  IF COALESCE(p_theaters, 0) < COALESCE(p_min_theaters, 5) THEN
    box_office_component := 0;
  ELSE
    -- Calculate box office per theater (in thousands)
    box_office_component := (COALESCE(p_box_office, 0) / p_theaters) / 1000;

    -- Apply cap if set
    IF p_max_bo_per_theater IS NOT NULL THEN
      box_office_component := LEAST(box_office_component, p_max_bo_per_theater);
    END IF;
  END IF;

  -- Base score = BO component × Metacritic (as decimal)
  base_score := box_office_component * p_metacritic;

  -- Floor rule: minimum score is metacritic value
  IF base_score < p_metacritic THEN
    base_score := p_metacritic;
  END IF;

  -- Oscar points
  oscar_points := 0;
  oscar_points := oscar_points + (COALESCE(p_oscar_noms, 0) * 0.5);
  oscar_points := oscar_points + (COALESCE(p_oscar_wins, 0) * 1.0);

  IF p_bp_nom THEN
    oscar_points := oscar_points + 0.5;
  END IF;

  IF p_bp_win THEN
    oscar_points := oscar_points + 1.0;
  END IF;

  final_score := base_score + oscar_points;
  RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update get_league_standings to use league-specific scoring settings
CREATE OR REPLACE FUNCTION get_league_standings(p_league_id uuid)
RETURNS TABLE (
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
) AS $$
  WITH league_settings AS (
    SELECT
      COALESCE(min_theaters_for_scoring, 5) as min_theaters,
      max_box_office_per_theater as max_bo
    FROM leagues
    WHERE id = p_league_id
  ),
  team_stats AS (
    SELECT
      t.id,
      t.name,
      t.photo_url,
      t.budget_remaining,
      COUNT(tm.movie_id) as movies_owned,
      COALESCE(SUM(m.domestic_box_office), 0) as total_box_office,
      COALESCE(AVG(m.theater_count), 0) as avg_theaters,
      COALESCE(AVG(m.metacritic_score), 0) as avg_rating,
      COALESCE(SUM(
        (m.oscar_nominations * 0.5) +
        (m.oscar_wins * 1.0) +
        (CASE WHEN m.best_picture_nominated THEN 0.5 ELSE 0 END) +
        (CASE WHEN m.best_picture_won THEN 1.0 ELSE 0 END)
      ), 0) as oscar_points,
      COALESCE(SUM(
        calculate_movie_score_for_league(
          m.domestic_box_office,
          m.theater_count,
          m.metacritic_score,
          m.oscar_nominations,
          m.oscar_wins,
          m.best_picture_nominated,
          m.best_picture_won,
          ls.min_theaters,
          ls.max_bo
        )
      ), 0) as total_points
    FROM teams t
    CROSS JOIN league_settings ls
    LEFT JOIN team_movies tm ON tm.team_id = t.id
    LEFT JOIN movies m ON m.id = tm.movie_id
    WHERE t.league_id = p_league_id
    GROUP BY t.id, t.name, t.photo_url, t.budget_remaining
  ),
  ranked AS (
    SELECT
      *,
      MAX(total_points) OVER () as max_points,
      RANK() OVER (ORDER BY total_points DESC) as team_rank
    FROM team_stats
  )
  SELECT
    id as team_id,
    name as team_name,
    photo_url,
    total_points,
    max_points - total_points as points_back,
    budget_remaining,
    movies_owned,
    total_box_office,
    avg_theaters,
    avg_rating,
    oscar_points,
    team_rank as rank
  FROM ranked
  ORDER BY team_rank;
$$ LANGUAGE sql STABLE;
