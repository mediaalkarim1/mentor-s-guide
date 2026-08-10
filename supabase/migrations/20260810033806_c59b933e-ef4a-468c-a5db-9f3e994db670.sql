ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS username text;

UPDATE public.mentors
SET username = lower(split_part(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

UPDATE public.mentors
SET username = lower(regexp_replace(name, '\s+', '_', 'g'))
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mentors_username_unique_idx ON public.mentors (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS binaan_unique_name_per_mentor_idx ON public.binaan (mentor_id, lower(name));

CREATE TABLE IF NOT EXISTS public.mentor_recap_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.mutabaah_periods(id) ON DELETE CASCADE,
  is_override boolean NOT NULL DEFAULT true,
  manual_weekly_score numeric,
  manual_monthly_score numeric,
  manual_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, period_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_recap_overrides TO authenticated;
GRANT ALL ON public.mentor_recap_overrides TO service_role;

ALTER TABLE public.mentor_recap_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage recap overrides"
  ON public.mentor_recap_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "mentor reads own recap overrides"
  ON public.mentor_recap_overrides FOR SELECT TO authenticated
  USING (mentor_id = public.current_mentor_id());

CREATE TRIGGER trg_recap_overrides_updated
  BEFORE UPDATE ON public.mentor_recap_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();