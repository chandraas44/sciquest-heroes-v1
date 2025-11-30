/*
  # Add User Stories Support

  - Adds user_id column to stories table so users can create their own stories
  - Adds index on user_id for performance
  - Adds RLS-style policies so:
      * Everyone can read predefined stories (user_id IS NULL)
      * Authenticated users can read their own stories
      * Authenticated users can insert stories for themselves
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'stories'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE stories
      ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Create partial index on user_id for faster lookups of user stories
CREATE INDEX IF NOT EXISTS idx_stories_user_id
  ON stories (user_id)
  WHERE user_id IS NOT NULL;

-- RLS-style policies for stories table
-- Note: This assumes RLS is enabled for the stories table in your project settings.

DO $$
BEGIN
  -- Policy for reading predefined + own stories
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'read_predefined_and_own_stories'
      AND tablename = 'stories'
  ) THEN
    CREATE POLICY read_predefined_and_own_stories
      ON stories
      FOR SELECT
      TO public
      USING (
        -- Predefined stories
        user_id IS NULL
        -- Or stories owned by the current user
        OR user_id = auth.uid()
      );
  END IF;

  -- Policy for inserting user stories
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'insert_own_stories'
      AND tablename = 'stories'
  ) THEN
    CREATE POLICY insert_own_stories
      ON stories
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
      );
  END IF;
END $$;


