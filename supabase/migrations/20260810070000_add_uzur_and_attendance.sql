-- Migration: Add Uzur indicator status and Mentoring Attendance fields
-- Date: 2026-08-10

-- 1. Add is_uzur column to mutabaah_entries
ALTER TABLE public.mutabaah_entries 
  ADD COLUMN IF NOT EXISTS is_uzur boolean NOT NULL DEFAULT false;

-- 2. Add mentoring attendance columns to mutabaah_submissions
ALTER TABLE public.mutabaah_submissions
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'hadir',
  ADD COLUMN IF NOT EXISTS mentoring_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS attendance_note text;

-- 3. Add constraint for attendance_status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_attendance_status'
  ) THEN
    ALTER TABLE public.mutabaah_submissions
      ADD CONSTRAINT chk_attendance_status 
      CHECK (attendance_status IN ('hadir', 'tidak_hadir'));
  END IF;
END $$;

-- 4. Index for attendance query performance
CREATE INDEX IF NOT EXISTS idx_submissions_attendance ON public.mutabaah_submissions(mentor_id, attendance_status);

-- 5. Grant permissions to public/anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_submissions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_entries TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.mentors TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.binaan TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.mutabaah_periods TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.mutabaah_indicators TO anon, authenticated, service_role;

-- 6. Ensure RLS Policies for public read and form submission (upsert)
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutabaah_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutabaah_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutabaah_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutabaah_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read mentors" ON public.mentors;
CREATE POLICY "public read mentors" ON public.mentors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read binaan" ON public.binaan;
CREATE POLICY "public read binaan" ON public.binaan FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read periods" ON public.mutabaah_periods;
CREATE POLICY "public read periods" ON public.mutabaah_periods FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read indicators" ON public.mutabaah_indicators;
CREATE POLICY "public read indicators" ON public.mutabaah_indicators FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public select submissions" ON public.mutabaah_submissions;
CREATE POLICY "public select submissions" ON public.mutabaah_submissions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public insert submissions" ON public.mutabaah_submissions;
CREATE POLICY "public insert submissions" ON public.mutabaah_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public update submissions" ON public.mutabaah_submissions;
CREATE POLICY "public update submissions" ON public.mutabaah_submissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public delete submissions" ON public.mutabaah_submissions;
CREATE POLICY "public delete submissions" ON public.mutabaah_submissions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public select entries" ON public.mutabaah_entries;
CREATE POLICY "public select entries" ON public.mutabaah_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public insert entries" ON public.mutabaah_entries;
CREATE POLICY "public insert entries" ON public.mutabaah_entries FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public delete entries" ON public.mutabaah_entries;
CREATE POLICY "public delete entries" ON public.mutabaah_entries FOR DELETE TO anon, authenticated USING (true);


