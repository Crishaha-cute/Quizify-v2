-- ============================================
-- Supabase Database Schema for Quiz Application
-- ============================================
-- 
-- This SQL script sets up the database tables for the quiz application.
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste and run this entire script
-- 4. The tables will be created with Row Level Security (RLS) enabled
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: profiles
-- Stores app-specific user info (display name, admin flag)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: admin_activity_log
-- Tracks user activities (logins, quiz attempts, completions, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'quiz_attempt', 'quiz_completion', 'logout')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries on user_id and created_at
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_user_id ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action_type ON admin_activity_log(action_type);

-- ============================================
-- Table: quiz_history
-- Stores quiz attempt history for each user
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  score INTEGER NOT NULL CHECK (score >= 0), -- number correct (legacy)
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_created_at ON quiz_history(created_at DESC);

-- ============================================
-- Table: quiz_attempts
-- Stores detailed information about each quiz attempt
-- This can be expanded to store individual question answers if needed
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_history_id UUID NOT NULL REFERENCES quiz_history(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  selected_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_history_id ON quiz_attempts(quiz_history_id);

-- ============================================
-- Table: uploaded_files
-- Stores metadata about files uploaded by users for quiz generation
-- ============================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);

-- ============================================
-- Quiz Management Tables (Admin-managed question bank)
-- ============================================

-- Table: quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: questions
-- Custom item number: `item_no` (unique per quiz)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  item_no TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('Multiple Choice', 'Identification', 'True or False')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}'::text[],
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_questions_quiz_item UNIQUE (quiz_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

-- ============================================
-- Seasonal Leaderboard Tables
-- ============================================

-- Table: seasons
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_season_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_closed, start_at, end_at);

-- Table: season_points
CREATE TABLE IF NOT EXISTS season_points (
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_season_points_points ON season_points(season_id, points DESC);

-- Table: season_snapshots
CREATE TABLE IF NOT EXISTS season_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS on all tables
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: is admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM profiles p WHERE p.user_id = auth.uid()), false);
$$;

-- ============================================
-- RLS Policies for admin_activity_log
-- ============================================
CREATE POLICY "Users can insert their own activity log"
  ON admin_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity log"
  ON admin_activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON admin_activity_log
  FOR SELECT
  USING (is_admin());

-- ============================================
-- RLS Policies for profiles
-- ============================================
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (is_admin());

-- ============================================
-- RLS Policies for quiz_history
-- ============================================
-- Users can only see their own quiz history
CREATE POLICY "Users can view their own quiz history"
  ON quiz_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own quiz history
CREATE POLICY "Users can insert their own quiz history"
  ON quiz_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz history
CREATE POLICY "Users can update their own quiz history"
  ON quiz_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own quiz history
CREATE POLICY "Users can delete their own quiz history"
  ON quiz_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all quiz history (for analytics / moderation)
CREATE POLICY "Admins can view all quiz history"
  ON quiz_history
  FOR SELECT
  USING (is_admin());

-- ============================================
-- RLS Policies for quiz_attempts
-- ============================================
-- Users can only see quiz attempts from their own quiz history
CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quiz_history
      WHERE quiz_history.id = quiz_attempts.quiz_history_id
      AND quiz_history.user_id = auth.uid()
    )
  );

-- Users can insert quiz attempts for their own quiz history
CREATE POLICY "Users can insert their own quiz attempts"
  ON quiz_attempts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_history
      WHERE quiz_history.id = quiz_attempts.quiz_history_id
      AND quiz_history.user_id = auth.uid()
    )
  );

-- Admins can view all quiz attempts (for analytics / moderation)
CREATE POLICY "Admins can view all quiz attempts"
  ON quiz_attempts
  FOR SELECT
  USING (is_admin());

-- ============================================
-- RLS Policies for uploaded_files
-- ============================================
-- Users can only see their own uploaded files
CREATE POLICY "Users can view their own uploaded files"
  ON uploaded_files
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own uploaded files
CREATE POLICY "Users can insert their own uploaded files"
  ON uploaded_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own uploaded files
CREATE POLICY "Users can delete their own uploaded files"
  ON uploaded_files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all uploaded files (optional analytics / moderation)
CREATE POLICY "Admins can view all uploaded files"
  ON uploaded_files
  FOR SELECT
  USING (is_admin());

-- ============================================
-- RLS Policies for quizzes/questions (admin-managed)
-- ============================================
CREATE POLICY "Authenticated users can read published quizzes"
  ON quizzes
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authenticated users can read questions of published quizzes"
  ON questions
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = questions.quiz_id AND q.is_published = true));

CREATE POLICY "Admins can manage quizzes"
  ON quizzes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage questions"
  ON questions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- RLS Policies for seasons/season_points/season_snapshots
-- ============================================
CREATE POLICY "Authenticated users can view seasons"
  ON seasons
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view season points"
  ON season_points
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own season points"
  ON season_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own season points"
  ON season_points
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage seasons"
  ON seasons
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage season snapshots"
  ON season_snapshots
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- Functions and Triggers
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on profiles/quizzes/questions/seasons
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on quiz_history
CREATE TRIGGER update_quiz_history_updated_at
  BEFORE UPDATE ON quiz_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Keep season_points.updated_at fresh
CREATE OR REPLACE FUNCTION touch_season_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_season_points_updated_at ON season_points;
CREATE TRIGGER update_season_points_updated_at
  BEFORE UPDATE ON season_points
  FOR EACH ROW
  EXECUTE FUNCTION touch_season_points_updated_at();

-- ============================================
-- Seasonal rotation RPC (idempotent)
-- ============================================
CREATE OR REPLACE FUNCTION rotate_season_if_needed()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_season seasons%ROWTYPE;
  new_season_id UUID;
BEGIN
  -- Find current active season (not closed, and now is within range)
  SELECT *
    INTO active_season
  FROM seasons
  WHERE is_closed = false
    AND NOW() >= start_at
    AND NOW() < end_at
  ORDER BY start_at DESC
  LIMIT 1;

  IF active_season.id IS NOT NULL THEN
    RETURN active_season.id;
  END IF;

  -- If there is a season that should be closed, close it and snapshot leaderboard
  SELECT *
    INTO active_season
  FROM seasons
  WHERE is_closed = false
    AND NOW() >= end_at
  ORDER BY end_at DESC
  LIMIT 1;

  IF active_season.id IS NOT NULL THEN
    INSERT INTO season_snapshots (season_id, snapshot)
    SELECT active_season.id,
           COALESCE(
             jsonb_agg(row_to_json(t) ORDER BY t.rank),
             '[]'::jsonb
           )
    FROM (
      SELECT sp.user_id,
             COALESCE(p.display_name, u.email) AS display_name,
             sp.points,
             DENSE_RANK() OVER (ORDER BY sp.points DESC, sp.updated_at ASC) AS rank
      FROM season_points sp
      LEFT JOIN profiles p ON p.user_id = sp.user_id
      LEFT JOIN auth.users u ON u.id = sp.user_id
      WHERE sp.season_id = active_season.id
      ORDER BY sp.points DESC, sp.updated_at ASC
      LIMIT 100
    ) t;

    UPDATE seasons SET is_closed = true WHERE id = active_season.id;
  END IF;

  -- Create a new season starting now lasting 30 days by default
  INSERT INTO seasons (name, start_at, end_at, is_closed)
  VALUES (
    to_char(NOW(), '"Season "YYYY-MM'),
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  )
  RETURNING id INTO new_season_id;

  RETURN new_season_id;
END;
$$;

REVOKE ALL ON FUNCTION rotate_season_if_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rotate_season_if_needed() TO authenticated;

-- ============================================
-- Helper Views (Optional)
-- ============================================
-- View to get quiz statistics per user
CREATE OR REPLACE VIEW user_quiz_stats AS
SELECT 
  user_id,
  COUNT(*) as total_quizzes,
  AVG(score::float / NULLIF(total_questions, 0) * 100) as average_score_percentage,
  MAX(score) as best_score,
  MAX(total_questions) as max_questions,
  MIN(created_at) as first_quiz_date,
  MAX(created_at) as last_quiz_date
FROM quiz_history
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_quiz_stats TO authenticated;

-- Leaderboard view for current season (top 10)
CREATE OR REPLACE VIEW leaderboard_top10_current_season AS
WITH current_season AS (
  SELECT rotate_season_if_needed() AS season_id
)
SELECT
  sp.user_id,
  COALESCE(p.display_name, u.email) AS display_name,
  sp.points,
  DENSE_RANK() OVER (ORDER BY sp.points DESC, sp.updated_at ASC) AS rank
FROM season_points sp
JOIN current_season cs ON cs.season_id = sp.season_id
LEFT JOIN profiles p ON p.user_id = sp.user_id
LEFT JOIN auth.users u ON u.id = sp.user_id
ORDER BY sp.points DESC, sp.updated_at ASC
LIMIT 10;

GRANT SELECT ON leaderboard_top10_current_season TO authenticated;

