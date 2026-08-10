-- Migration: Ensure current active period 10-16 Agustus 2026 exists and is active
-- Close any previous active periods and insert/activate 2026-08-10 to 2026-08-16

UPDATE public.mutabaah_periods
SET status = 'closed'
WHERE status = 'active' AND start_date != '2026-08-10';

INSERT INTO public.mutabaah_periods (id, start_date, end_date, status)
VALUES (
  'p1000000-0000-0000-0000-000000000004',
  '2026-08-10',
  '2026-08-16',
  'active'
)
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- Fallback check by start_date/end_date
INSERT INTO public.mutabaah_periods (start_date, end_date, status)
SELECT '2026-08-10', '2026-08-16', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.mutabaah_periods WHERE start_date = '2026-08-10' AND end_date = '2026-08-16'
);
