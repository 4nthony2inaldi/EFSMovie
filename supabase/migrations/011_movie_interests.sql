-- Migration: Personal movie watchlist/interests
-- ================================================
-- Allows users to track movies they're interested in (personal, only visible to them)

-- Create movie_interests table
CREATE TABLE movie_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only mark interest in a movie once
  UNIQUE(user_id, movie_id)
);

-- Create index for efficient lookups
CREATE INDEX idx_movie_interests_user ON movie_interests(user_id);
CREATE INDEX idx_movie_interests_movie ON movie_interests(movie_id);

-- Enable RLS
ALTER TABLE movie_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their own interests
CREATE POLICY "Users can view own movie interests"
  ON movie_interests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own interests
CREATE POLICY "Users can add movie interests"
  ON movie_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interests
CREATE POLICY "Users can remove movie interests"
  ON movie_interests FOR DELETE
  USING (auth.uid() = user_id);
