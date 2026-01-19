-- Fix metacritic scores that were incorrectly stored or came from wrong movies
-- The broken scraper had two issues:
-- 1. Divided scores by 100 (storing 0.90 instead of 90)
-- 2. Picked up scores from wrong movies (e.g., different films with same name)

-- First, fix any scores stored as decimals by multiplying by 100
UPDATE movies
SET metacritic_score = metacritic_score * 100
WHERE metacritic_score IS NOT NULL
  AND metacritic_score < 1;

-- Clear all metacritic scores - they need to be re-fetched from OMDB API
-- which is more reliable than the broken scraper
-- Run "Refresh Data" in admin to get correct scores from OMDB
UPDATE movies
SET metacritic_score = NULL
WHERE metacritic_score IS NOT NULL;

-- Note: After running this migration, use the admin "Refresh Data" button
-- to re-fetch metacritic scores from the OMDB API
