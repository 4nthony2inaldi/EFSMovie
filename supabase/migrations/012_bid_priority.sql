-- Add priority column to bids table for user-defined bid ordering
-- Priority is used when a team has multiple potential winning bids
-- Lower numbers = higher priority (1 is highest priority)
-- NULL means use default sorting (by amount descending)

ALTER TABLE bids ADD COLUMN priority integer;

-- Add comment explaining the field
COMMENT ON COLUMN bids.priority IS 'User-defined priority order for bids. Lower numbers = higher priority. NULL = default (sort by amount).';
