-- Migration: Ensure public read SELECT RLS policies on all master tables
-- This ensures Cloudflare Workers and client functions can read periods, mentors, binaan, and indicators smoothly.

-- Grant table-level SELECT permissions
GRANT SELECT ON public.mentors TO anon, authenticated;
GRANT SELECT ON public.binaan TO anon, authenticated;
GRANT SELECT ON public.mutabaah_periods TO anon, authenticated;
GRANT SELECT ON public.mutabaah_indicators TO anon, authenticated;
GRANT SELECT ON public.mentor_recap_overrides TO anon, authenticated;

-- Ensure RLS SELECT policies allow reading active rows
DROP POLICY IF EXISTS "public read active mentors" ON public.mentors;
CREATE POLICY "public read active mentors" ON public.mentors
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read active binaan" ON public.binaan;
CREATE POLICY "public read active binaan" ON public.binaan
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read active periods" ON public.mutabaah_periods;
CREATE POLICY "public read active periods" ON public.mutabaah_periods
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read active indicators" ON public.mutabaah_indicators;
CREATE POLICY "public read active indicators" ON public.mutabaah_indicators
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read recap overrides" ON public.mentor_recap_overrides;
CREATE POLICY "public read recap overrides" ON public.mentor_recap_overrides
  FOR SELECT TO anon, authenticated USING (true);
