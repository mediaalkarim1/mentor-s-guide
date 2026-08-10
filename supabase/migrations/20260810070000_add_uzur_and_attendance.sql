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
