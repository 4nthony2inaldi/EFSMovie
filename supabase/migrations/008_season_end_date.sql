-- Add season end month/year to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS season_end_month integer DEFAULT 12;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS season_end_year integer;

-- Set default season_end_year to match season_year for existing leagues
UPDATE leagues SET season_end_year = season_year WHERE season_end_year IS NULL;

-- Make season_end_year not null after setting defaults
ALTER TABLE leagues ALTER COLUMN season_end_year SET NOT NULL;

-- Add check constraint for valid month
ALTER TABLE leagues ADD CONSTRAINT check_season_end_month CHECK (season_end_month >= 1 AND season_end_month <= 12);
