-- Fix metacritic_score column precision
-- The column was defined as numeric(4,1) which only allows 1 decimal place
-- This caused scores like 0.46 to be rounded to 0.5
-- Changing to numeric(4,2) to preserve 2 decimal places (e.g., 0.46 for 46%)

ALTER TABLE movies
ALTER COLUMN metacritic_score TYPE numeric(4,2);

-- Note: After running this migration, refresh movies that have placeholder scores
-- to get their actual Metacritic scores with correct precision
