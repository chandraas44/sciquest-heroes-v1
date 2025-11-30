/*
  # Create Generated Comics Table for SciQuest Heroes

  1. New Tables
    - generated_comics
      - id (uuid, primary key, default gen_random_uuid())
      - user_id (uuid, not null, FK -> auth.users.id)
      - story_id (text, not null) - references stories.id in application logic
      - pdf_path (text, not null) - storage path in comic-pdfs bucket
      - panel_count (int, not null, default 6) - number of panels in the comic
      - panels_json (jsonb, not null) - structured panel metadata (narration, speech bubbles, etc.)
      - status (text, not null, default 'ready') - 'pending' | 'ready' | 'failed'
      - created_at (timestamptz, not null, default now())

  2. Security
    - Enable RLS on generated_comics
    - Allow:
      - Owners (auth.uid() = user_id) to SELECT their own generated comics
    - Write access is intended to be via service-role key from Supabase Edge Functions only

  3. Indexes
    - Index on (user_id, story_id, created_at) for fast lookup of latest comic per user/story
*/

CREATE TABLE IF NOT EXISTS generated_comics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  pdf_path text NOT NULL,
  panel_count integer NOT NULL DEFAULT 6,
  panels_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generated_comics ENABLE ROW LEVEL SECURITY;

-- Policy: allow users to read only their own generated comics
CREATE POLICY IF NOT EXISTS "Users can view their own generated comics"
  ON generated_comics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: no INSERT/UPDATE/DELETE policies are defined on purpose.
-- Writes should be performed only via service-role contexts (e.g., Edge Functions).

CREATE INDEX IF NOT EXISTS idx_generated_comics_user_story_created_at
  ON generated_comics (user_id, story_id, created_at DESC);


