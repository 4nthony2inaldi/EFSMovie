-- Fix metacritic_score column precision
-- The column was defined as numeric(4,1) which only allows 1 decimal place
-- This caused scores like 0.46 to be rounded to 0.5
-- Changing to numeric(4,2) to preserve 2 decimal places (e.g., 0.46 for 46%)

-- Drop the trigger that depends on metacritic_score
DROP TRIGGER IF EXISTS trg_update_movie_score ON movies;

-- Alter the column type
ALTER TABLE movies
ALTER COLUMN metacritic_score TYPE numeric(4,2);

-- Recreate the trigger
CREATE TRIGGER trg_update_movie_score
  BEFORE INSERT OR UPDATE OF
    domestic_box_office, theater_count, metacritic_score,
    oscar_nominations, oscar_wins, best_picture_nominated, best_picture_won
  ON movies
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_score();

-- Note: After running this migration, refresh movies that have placeholder scores
-- to get their actual Metacritic scores with correct precision
