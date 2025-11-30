/*
  # Create badge_awards Table
  
  This migration creates the badge_awards table for tracking badge achievements.
  Badges are awarded to children when they meet certain criteria (story completions, quiz scores, etc.)
*/

-- Create badge_awards table
CREATE TABLE IF NOT EXISTS badge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  awarded_at timestamptz DEFAULT now() NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_badge_awards_user_id ON badge_awards(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_badge_id ON badge_awards(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_awarded_at ON badge_awards(awarded_at DESC);

-- Add comments
COMMENT ON TABLE badge_awards IS 'Tracks badge awards/achievements for students';

SELECT 'Migration completed: badge_awards table created.' as notice;

