-- EFS Movie League - Commissioner and Invitations Schema
-- =====================================================

-- Add commissioner and password to leagues
ALTER TABLE leagues
ADD COLUMN commissioner_user_id uuid REFERENCES auth.users(id),
ADD COLUMN join_password text,
ADD COLUMN max_teams integer DEFAULT 12;

-- Create index for commissioner lookups
CREATE INDEX idx_leagues_commissioner ON leagues(commissioner_user_id);

-- ============================================
-- LEAGUE INVITATIONS
-- ============================================
CREATE TABLE league_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(league_id, email)
);

CREATE INDEX idx_invitations_league ON league_invitations(league_id);
CREATE INDEX idx_invitations_email ON league_invitations(email);
CREATE INDEX idx_invitations_code ON league_invitations(invite_code);

-- ============================================
-- UPDATED ROW LEVEL SECURITY
-- ============================================

-- Allow commissioners to view all leagues they manage
DROP POLICY IF EXISTS "Users can view leagues they belong to" ON leagues;
CREATE POLICY "Users can view leagues they belong to or commission"
  ON leagues FOR SELECT
  USING (
    id IN (SELECT league_id FROM teams WHERE user_id = auth.uid())
    OR commissioner_user_id = auth.uid()
  );

-- Allow users to create leagues (they become commissioner)
CREATE POLICY "Users can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (commissioner_user_id = auth.uid());

-- Allow commissioners to update their leagues
CREATE POLICY "Commissioners can update their leagues"
  ON leagues FOR UPDATE
  USING (commissioner_user_id = auth.uid());

-- Allow commissioners to delete their leagues
CREATE POLICY "Commissioners can delete their leagues"
  ON leagues FOR DELETE
  USING (commissioner_user_id = auth.uid());

-- Allow users to create teams in leagues they're joining
DROP POLICY IF EXISTS "Users can update their own team" ON teams;
CREATE POLICY "Users can create their own team"
  ON teams FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own team"
  ON teams FOR UPDATE
  USING (user_id = auth.uid());

-- Commissioners can manage teams in their leagues
CREATE POLICY "Commissioners can manage teams in their leagues"
  ON teams FOR ALL
  USING (
    league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid())
  );

-- League invitations policies
ALTER TABLE league_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations sent to their email"
  ON league_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Commissioners can view invitations for their leagues"
  ON league_invitations FOR SELECT
  USING (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

CREATE POLICY "Commissioners can create invitations for their leagues"
  ON league_invitations FOR INSERT
  WITH CHECK (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

CREATE POLICY "Commissioners can delete invitations for their leagues"
  ON league_invitations FOR DELETE
  USING (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

CREATE POLICY "Users can update invitations sent to them"
  ON league_invitations FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow commissioners to manage auctions
CREATE POLICY "Commissioners can create auctions"
  ON auctions FOR INSERT
  WITH CHECK (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

CREATE POLICY "Commissioners can update auctions"
  ON auctions FOR UPDATE
  USING (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

CREATE POLICY "Commissioners can delete auctions"
  ON auctions FOR DELETE
  USING (league_id IN (SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()));

-- Allow commissioners to manage auction_movies
CREATE POLICY "Commissioners can manage auction movies"
  ON auction_movies FOR ALL
  USING (
    auction_id IN (
      SELECT id FROM auctions WHERE league_id IN (
        SELECT id FROM leagues WHERE commissioner_user_id = auth.uid()
      )
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a user is a commissioner
CREATE OR REPLACE FUNCTION is_commissioner(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id AND commissioner_user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to validate league join password
CREATE OR REPLACE FUNCTION validate_league_password(p_league_id uuid, p_password text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id AND join_password = p_password
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get league by invite code
CREATE OR REPLACE FUNCTION get_league_by_invite(p_invite_code text)
RETURNS TABLE (
  league_id uuid,
  league_name text,
  invitation_id uuid
) AS $$
  SELECT l.id, l.name, i.id
  FROM league_invitations i
  JOIN leagues l ON l.id = i.league_id
  WHERE i.invite_code = p_invite_code
    AND i.status = 'pending'
    AND i.expires_at > now();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to count teams in a league
CREATE OR REPLACE FUNCTION get_league_team_count(p_league_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer FROM teams WHERE league_id = p_league_id;
$$ LANGUAGE sql STABLE;
