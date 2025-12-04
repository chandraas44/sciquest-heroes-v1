-- Add missing columns to stories table for publishing functionality
ALTER TABLE stories 
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create index for faster queries on enabled stories
CREATE INDEX IF NOT EXISTS idx_stories_enabled ON stories(enabled) WHERE enabled = true;

-- Create index for AI-generated stories
CREATE INDEX IF NOT EXISTS idx_stories_ai_generated ON stories(is_ai_generated) WHERE is_ai_generated = true;



