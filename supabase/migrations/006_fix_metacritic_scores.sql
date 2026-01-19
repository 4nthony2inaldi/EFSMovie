-- Fix metacritic scores that were incorrectly stored as decimals (0.90 instead of 90)
-- This was caused by a bug in the scraper that divided scores by 100

-- Update any metacritic scores that are less than 1 (i.e., stored as decimals)
-- by multiplying them by 100 to get the correct 0-100 scale
UPDATE movies
SET metacritic_score = metacritic_score * 100
WHERE metacritic_score IS NOT NULL
  AND metacritic_score < 1;

-- Recalculate scores for affected movies will happen automatically
-- via the next box office refresh or can be triggered manually
