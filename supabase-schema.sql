-- =========================================================================
-- PlanList: Supabase Database Schema & Row-Level Security (RLS) Setup
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to SQL Editor in the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (or Ctrl+Enter)
--
-- This script:
-- - Enables Row Level Security (RLS) on all PlanList tables (tasks, lists, goals, plans, notes)
-- - Removes old, conflicting, or missing policies that cause error 42501 (RLS violation)
-- - Creates exact SELECT, INSERT, UPDATE, DELETE policies for authenticated users
-- - Ensures authenticated users have proper table permissions (GRANT ALL)
-- =========================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TASKS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT NOT NULL DEFAULT (CURRENT_DATE::TEXT),
  start_time TEXT,
  duration_minutes INTEGER,
  priority TEXT DEFAULT 'medium',
  energy_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  list_id UUID,
  goal_id UUID,
  plan_id UUID,
  parent_task_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure defaults and nullable foreign-keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'status') THEN
    ALTER TABLE public.tasks ADD COLUMN status TEXT DEFAULT 'todo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'due_date') THEN
    ALTER TABLE public.tasks ADD COLUMN due_date TEXT DEFAULT (CURRENT_DATE::TEXT);
  END IF;

  -- Ensure foreign-key columns are nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'list_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN list_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'goal_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN goal_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'plan_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN plan_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'parent_task_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN parent_task_id DROP NOT NULL;
  END IF;
END $$;

-- Enable RLS and configure policies for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.tasks TO authenticated;

-- =========================================================================
-- 2. LISTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Folder',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lists' AND column_name = 'user_id') THEN
    ALTER TABLE public.lists ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lists' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lists', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "lists_select_policy" ON public.lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lists_insert_policy" ON public.lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_update_policy" ON public.lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_delete_policy" ON public.lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.lists TO authenticated;

-- =========================================================================
-- 3. GOALS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'user_id') THEN
    ALTER TABLE public.goals ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.goals', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "goals_select_policy" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_policy" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_policy" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete_policy" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.goals TO authenticated;

-- =========================================================================
-- 4. PLANS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT 'Plan',
  description TEXT DEFAULT '',
  target_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'user_id') THEN
    ALTER TABLE public.plans ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.plans', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "plans_select_policy" ON public.plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_policy" ON public.plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_policy" ON public.plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_delete_policy" ON public.plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.plans TO authenticated;

-- =========================================================================
-- 5. NOTES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'user_id') THEN
    ALTER TABLE public.notes ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "notes_select_policy" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_policy" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_policy" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_delete_policy" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.notes TO authenticated;
