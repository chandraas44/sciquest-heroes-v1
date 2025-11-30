/*
  # Create Quiz Results Table for SciQuest Heroes

  1. New Tables
    - `quiz_results`
      - `id` (uuid, primary key) - Auto-generated unique identifier
      - `user_id` (uuid, foreign key) - References user_profiles.id
      - `quiz_topic` (text) - Topic of the quiz (e.g., "photosynthesis")
      - `quiz_level` (text) - Level of the quiz ("beginner", "intermediate", "advanced")
      - `score` (integer) - Number of correct answers (0-10)
      - `total_questions` (integer) - Total number of questions (always 10)
      - `completed_at` (timestamptz) - Timestamp when quiz was completed
      - `created_at` (timestamptz) - Record creation timestamp

  2. Indexes
    - Index on `user_id` for fast lookups of user's quiz history
    - Index on `quiz_topic` for filtering by topic
    - Composite index on `user_id` and `quiz_topic` for efficient queries

  3. Security
    - RLS is disabled on quiz_results table (consistent with user_profiles)
    - Foreign key constraint ensures data integrity

  4. Notes
    - This table tracks quiz completion and scores for progress tracking
    - Multiple quiz attempts are allowed (no unique constraint)
    - Users can retake quizzes to improve their scores
*/

CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  quiz_topic text NOT NULL,
  quiz_level text NOT NULL CHECK (quiz_level IN ('beginner', 'intermediate', 'advanced')),
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  total_questions integer NOT NULL DEFAULT 10 CHECK (total_questions = 10),
  completed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_topic ON quiz_results(quiz_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_topic ON quiz_results(user_id, quiz_topic);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON quiz_results(completed_at DESC);

-- Add comment to table
COMMENT ON TABLE quiz_results IS 'Stores quiz completion results for tracking student progress and performance';

