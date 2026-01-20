-- Migration: Allow users to add movies to auctions
-- ================================================
-- This enables users to browse TMDB and add up to 2 movies per team to an active auction

-- Add column to track which team added the movie (NULL = commissioner added)
ALTER TABLE auction_movies
ADD COLUMN added_by_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Create index for querying movies added by a specific team
CREATE INDEX idx_auction_movies_added_by ON auction_movies(added_by_team_id);

-- Allow users to insert movies into active auctions (max 2 per team per auction)
CREATE POLICY "Users can add movies to open auctions"
  ON auction_movies FOR INSERT
  WITH CHECK (
    -- User must be on a team in the auction's league
    EXISTS (
      SELECT 1 FROM auctions a
      JOIN teams t ON t.league_id = a.league_id
      WHERE a.id = auction_id
        AND t.user_id = auth.uid()
        AND t.id = added_by_team_id
        AND a.status = 'open'
    )
    -- Team can only add max 2 movies per auction
    AND (
      SELECT COUNT(*) FROM auction_movies am
      WHERE am.auction_id = auction_id
        AND am.added_by_team_id = added_by_team_id
    ) < 2
  );
