-- Add production_companies column to movies table
-- Stores array of production/distribution company names (e.g., A24, Neon, Netflix, Searchlight)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS production_companies text[];
