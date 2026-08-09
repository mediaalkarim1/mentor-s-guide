-- Migration: Add public RLS insert/select policies for mutabaah_submissions and mutabaah_entries
-- This allows binaan (unauthenticated users) to submit mutabaah from the public /mutabaah form
-- and allows the server to read all submissions for dashboard/recap computation.

-- Grant table-level permissions to anon and authenticated roles
GRANT SELECT, INSERT ON public.mutabaah_submissions TO anon;
GRANT SELECT, INSERT, DELETE ON public.mutabaah_entries TO anon;

-- Drop any existing conflicting public policies first
DROP POLICY IF EXISTS "public insert submissions" ON public.mutabaah_submissions;
DROP POLICY IF EXISTS "public select submissions" ON public.mutabaah_submissions;
DROP POLICY IF EXISTS "public insert entries" ON public.mutabaah_entries;
DROP POLICY IF EXISTS "public select entries" ON public.mutabaah_entries;
DROP POLICY IF EXISTS "binaan insert own submission" ON public.mutabaah_submissions;
DROP POLICY IF EXISTS "binaan insert entry" ON public.mutabaah_entries;

-- Allow any user (anon / authenticated) to INSERT submissions (form submission by binaan)
CREATE POLICY "public insert submissions" ON public.mutabaah_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow any user (anon / authenticated) to SELECT submissions (needed for recap queries)
CREATE POLICY "public select submissions" ON public.mutabaah_submissions
  FOR SELECT TO anon, authenticated USING (true);

-- Allow any user (anon / authenticated) to INSERT entries
CREATE POLICY "public insert entries" ON public.mutabaah_entries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow any user (anon / authenticated) to SELECT entries (needed for detailed recap)
CREATE POLICY "public select entries" ON public.mutabaah_entries
  FOR SELECT TO anon, authenticated USING (true);

-- Allow any user (anon / authenticated) to DELETE entries (needed to replace submission entries on upsert)
CREATE POLICY "public delete entries" ON public.mutabaah_entries
  FOR DELETE TO anon, authenticated USING (true);

-- Allow any user (anon / authenticated) to UPDATE submissions (upsert on conflict)
GRANT UPDATE ON public.mutabaah_submissions TO anon;
CREATE POLICY "public update submissions" ON public.mutabaah_submissions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
