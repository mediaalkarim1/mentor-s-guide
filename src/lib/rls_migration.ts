-- Auto-run script: Apply at application startup if RLS policies not yet in place
-- This runs as a server function on Supabase admin client

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MIGRATION_SQL = `
-- Add public RLS policies for mutabaah form submissions
DO $$
BEGIN
  -- submissions INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mutabaah_submissions' AND policyname='public insert submissions'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.mutabaah_submissions TO anon';
    EXECUTE 'CREATE POLICY "public insert submissions" ON public.mutabaah_submissions FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "public update submissions" ON public.mutabaah_submissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "public select submissions" ON public.mutabaah_submissions FOR SELECT TO anon, authenticated USING (true)';
  END IF;
  
  -- entries INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mutabaah_entries' AND policyname='public insert entries'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON public.mutabaah_entries TO anon';
    EXECUTE 'CREATE POLICY "public insert entries" ON public.mutabaah_entries FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "public delete entries" ON public.mutabaah_entries FOR DELETE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "public select entries" ON public.mutabaah_entries FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;
`;

export async function ensureRlsPolicies() {
  try {
    await (supabaseAdmin as any).rpc('exec_sql', { query: MIGRATION_SQL });
  } catch (e) {
    // exec_sql not available, try raw query
    try {
      const statements = [
        `GRANT SELECT, INSERT, UPDATE ON public.mutabaah_submissions TO anon`,
        `GRANT SELECT, INSERT, DELETE ON public.mutabaah_entries TO anon`,
      ];
      for (const stmt of statements) {
        await (supabaseAdmin as any).rpc('query', { sql: stmt });
      }
    } catch (_) {}
  }
}
