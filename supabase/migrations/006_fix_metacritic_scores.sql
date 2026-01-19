-- Fix metacritic scores that came from wrong movies due to broken scraper
-- The scraper was unreliable because it didn't validate by year and picked up
-- scores from different movies with the same name.
--
-- Now using OMDB API which validates by IMDB ID for accurate scores.
-- Metacritic scores are stored as decimals (0.85 for 85%) and displayed as percentages.

-- Clear all metacritic scores - they need to be re-fetched from OMDB API
UPDATE movies
SET metacritic_score = NULL
WHERE metacritic_score IS NOT NULL;

-- Note: After running this migration, use the admin "Refresh Data" button
-- to re-fetch metacritic scores from the OMDB API (stored as decimals, e.g., 0.85 for 85%)
