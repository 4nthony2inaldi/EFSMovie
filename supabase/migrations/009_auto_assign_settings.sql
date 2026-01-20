-- Add auto-assign settings for leagues
-- These control how much teams pay when they don't submit bids and get auto-assigned movies

ALTER TABLE leagues
ADD COLUMN auto_assign_max_price numeric(10,2) DEFAULT 20.00,
ADD COLUMN auto_assign_budget_percent numeric(5,2) DEFAULT 5.00;

-- Add comments for documentation
COMMENT ON COLUMN leagues.auto_assign_max_price IS 'Maximum price per auto-assigned movie (default $20)';
COMMENT ON COLUMN leagues.auto_assign_budget_percent IS 'Percentage of remaining budget used for auto-assign calculation (default 5%)';
