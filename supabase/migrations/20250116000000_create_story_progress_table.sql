/*
  # Create story_progress Table
  
  This migration creates the story_progress table for tracking student story reading progress.
*/

-- Create story_progress table
CREATE TABLE IF NOT EXISTS story_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  last_panel_index integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, story_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_story_progress_user_id ON story_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_story_progress_story_id ON story_progress(story_id);

-- Add comments
COMMENT ON TABLE story_progress IS 'Tracks student progress through stories';

SELECT 'Migration completed: story_progress table created.' as notice;

