-- Drop table if it exists with wrong schema (UUID id) and recreate with text id
DROP TABLE IF EXISTS ai_stories CASCADE;

-- Create ai_stories table for AI-generated stories
CREATE TABLE ai_stories (
  id text PRIMARY KEY,
  title text NOT NULL,
  cover_url text,
  topic text NOT NULL,                    -- Original topic identifier (e.g., "photosynthesis")
  topic_tag text,                        -- Display name (e.g., "Photosynthesis")
  grade_level text NOT NULL,              -- Grade level (K-2, 3-4, 5-6)
  reading_level text,                    -- Formatted reading level (e.g., "Ages 7-9")
  estimated_time text,
  summary text,
  panels jsonb NOT NULL,                 -- Array of panel objects
  metadata jsonb,                        -- Generation metadata
  enabled boolean DEFAULT false,          -- Published status
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_stories_enabled ON ai_stories(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_stories_created_by ON ai_stories(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_stories_topic ON ai_stories(topic);
CREATE INDEX IF NOT EXISTS idx_ai_stories_created_at ON ai_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_stories_published_at ON ai_stories(published_at DESC NULLS LAST);

-- Add RLS (Row Level Security) policies
ALTER TABLE ai_stories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all published stories
CREATE POLICY "Anyone can view published ai_stories"
  ON ai_stories
  FOR SELECT
  USING (enabled = true);

-- Policy: Authenticated users can view their own stories
CREATE POLICY "Users can view their own ai_stories"
  ON ai_stories
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Authenticated users can insert their own stories
CREATE POLICY "Users can insert their own ai_stories"
  ON ai_stories
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own stories
CREATE POLICY "Users can update their own ai_stories"
  ON ai_stories
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_stories_updated_at
  BEFORE UPDATE ON ai_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_stories_updated_at();

