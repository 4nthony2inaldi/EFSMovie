-- Create a function to count teams that have submitted bids for an auction
-- This bypasses RLS to allow users to see the count of teams with bids
-- without exposing the actual bid amounts

CREATE OR REPLACE FUNCTION get_auction_submission_status(p_auction_id uuid)
RETURNS TABLE (
  team_id uuid,
  has_submitted boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    t.id as team_id,
    EXISTS (
      SELECT 1 FROM bids b
      WHERE b.team_id = t.id
      AND b.auction_id = p_auction_id
    ) as has_submitted
  FROM teams t
  WHERE t.league_id = (
    SELECT league_id FROM auctions WHERE id = p_auction_id
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auction_submission_status(uuid) TO authenticated;
