-- Add customizable slug field to leagues for easier sharing
-- Slug must be unique across all leagues and URL-safe

-- Add slug column (nullable initially for existing leagues)
ALTER TABLE leagues
ADD COLUMN slug text;

-- Create unique index for slug (case-insensitive)
CREATE UNIQUE INDEX idx_leagues_slug_unique ON leagues(LOWER(slug)) WHERE slug IS NOT NULL;

-- Add constraint to ensure slug is URL-safe (lowercase alphanumeric and hyphens only)
ALTER TABLE leagues
ADD CONSTRAINT leagues_slug_format CHECK (
  slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'
);

-- Add constraint for minimum and maximum length
ALTER TABLE leagues
ADD CONSTRAINT leagues_slug_length CHECK (
  slug IS NULL OR (LENGTH(slug) >= 3 AND LENGTH(slug) <= 32)
);

-- Comment explaining the field
COMMENT ON COLUMN leagues.slug IS 'Custom URL-safe identifier for easier league sharing. Must be unique, 3-32 chars, lowercase alphanumeric with hyphens.';

-- Function to validate league password supporting both UUID and slug
-- Returns the league_id if valid, NULL if not
CREATE OR REPLACE FUNCTION validate_league_password_v2(p_league_identifier text, p_password text)
RETURNS uuid AS $$
DECLARE
  v_league_id uuid;
BEGIN
  -- First try to match by slug (case-insensitive)
  SELECT id INTO v_league_id
  FROM leagues
  WHERE LOWER(slug) = LOWER(p_league_identifier)
    AND (join_password = p_password OR (join_password IS NULL AND p_password IS NULL) OR (join_password IS NULL AND p_password = ''));

  -- If not found by slug, try matching by UUID
  IF v_league_id IS NULL THEN
    BEGIN
      SELECT id INTO v_league_id
      FROM leagues
      WHERE id = p_league_identifier::uuid
        AND (join_password = p_password OR (join_password IS NULL AND p_password IS NULL) OR (join_password IS NULL AND p_password = ''));
    EXCEPTION WHEN invalid_text_representation THEN
      -- Not a valid UUID, that's okay
      NULL;
    END;
  END IF;

  RETURN v_league_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
