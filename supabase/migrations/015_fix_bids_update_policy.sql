-- Fix bids update policy to include WITH CHECK clause
-- Without this, upserts can silently fail because the update portion
-- doesn't validate the new values against RLS

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own bids" ON bids;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Users can update their own bids"
  ON bids FOR UPDATE
  USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    AND auction_id IN (SELECT id FROM auctions WHERE status = 'open')
  )
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    AND auction_id IN (SELECT id FROM auctions WHERE status = 'open')
  );
