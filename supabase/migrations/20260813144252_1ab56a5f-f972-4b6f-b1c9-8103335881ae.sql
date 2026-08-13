ALTER TABLE public.mutabaah_submissions
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'hadir',
  ADD COLUMN IF NOT EXISTS mentoring_date date,
  ADD COLUMN IF NOT EXISTS attendance_note text;

ALTER TABLE public.mutabaah_submissions
  DROP CONSTRAINT IF EXISTS mutabaah_submissions_attendance_status_check;

ALTER TABLE public.mutabaah_submissions
  ADD CONSTRAINT mutabaah_submissions_attendance_status_check
  CHECK (attendance_status IN ('hadir','tidak_hadir'));

ALTER TABLE public.mutabaah_entries
  ADD COLUMN IF NOT EXISTS is_uzur boolean NOT NULL DEFAULT false;