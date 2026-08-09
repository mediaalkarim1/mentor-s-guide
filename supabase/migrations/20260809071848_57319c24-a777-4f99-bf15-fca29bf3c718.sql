-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- MENTORS
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  email text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentors TO authenticated;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_mentor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.mentors WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "admin manage mentors" ON public.mentors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentor reads own row" ON public.mentors FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- BINAAN
CREATE TABLE public.binaan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_binaan_mentor ON public.binaan(mentor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binaan TO authenticated;
GRANT ALL ON public.binaan TO service_role;
ALTER TABLE public.binaan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage binaan" ON public.binaan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentor reads own binaan" ON public.binaan FOR SELECT TO authenticated
  USING (mentor_id = public.current_mentor_id());

-- PERIODS
CREATE TABLE public.mutabaah_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'closed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (start_date, end_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_periods TO authenticated;
GRANT ALL ON public.mutabaah_periods TO service_role;
ALTER TABLE public.mutabaah_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage periods" ON public.mutabaah_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated read periods" ON public.mutabaah_periods FOR SELECT TO authenticated USING (true);

-- INDICATORS
CREATE TABLE public.mutabaah_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  target numeric NOT NULL,
  unit text NOT NULL DEFAULT 'x',
  active boolean NOT NULL DEFAULT true,
  order_number int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_indicators TO authenticated;
GRANT ALL ON public.mutabaah_indicators TO service_role;
ALTER TABLE public.mutabaah_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage indicators" ON public.mutabaah_indicators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated read indicators" ON public.mutabaah_indicators FOR SELECT TO authenticated USING (true);

-- SUBMISSIONS
CREATE TABLE public.mutabaah_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  binaan_id uuid NOT NULL REFERENCES public.binaan(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  period_id uuid NOT NULL REFERENCES public.mutabaah_periods(id) ON DELETE CASCADE,
  total_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (binaan_id, period_id)
);
CREATE INDEX idx_sub_mentor_period ON public.mutabaah_submissions(mentor_id, period_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_submissions TO authenticated;
GRANT ALL ON public.mutabaah_submissions TO service_role;
ALTER TABLE public.mutabaah_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage submissions" ON public.mutabaah_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentor reads own submissions" ON public.mutabaah_submissions FOR SELECT TO authenticated
  USING (mentor_id = public.current_mentor_id());

-- ENTRIES
CREATE TABLE public.mutabaah_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.mutabaah_submissions(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES public.mutabaah_indicators(id) ON DELETE RESTRICT,
  target numeric NOT NULL,
  realization numeric NOT NULL,
  achievement_percentage numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, indicator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_entries TO authenticated;
GRANT ALL ON public.mutabaah_entries TO service_role;
ALTER TABLE public.mutabaah_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage entries" ON public.mutabaah_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentor reads own entries" ON public.mutabaah_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mutabaah_submissions s WHERE s.id = submission_id AND s.mentor_id = public.current_mentor_id()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_binaan_updated BEFORE UPDATE ON public.binaan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sub_updated BEFORE UPDATE ON public.mutabaah_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED
INSERT INTO public.mutabaah_indicators (code, name, target, unit, order_number) VALUES
  ('tahajud','Tahajud',3,'x',1),
  ('witir','Witir',3,'x',2),
  ('dhuha','Dhuha',5,'x',3),
  ('rawatib','Rawatib',21,'rakaat',4),
  ('almatsurat','Al-Matsurat',7,'x',5),
  ('tilawah','Tilawah Quran',1,'juz',6),
  ('olahraga','Olahraga',1,'x',7),
  ('bacabuku','Baca Buku',1,'x',8),
  ('infak','Infak',3,'x',9);

INSERT INTO public.mentors (id, name, email) VALUES
  ('11111111-1111-1111-1111-111111111111','Abi Azam','abi.azam@example.com'),
  ('22222222-2222-2222-2222-222222222222','Abi Fulan','abi.fulan@example.com');

INSERT INTO public.binaan (name, mentor_id) VALUES
  ('Abi Willy','11111111-1111-1111-1111-111111111111'),
  ('Abi Early','11111111-1111-1111-1111-111111111111'),
  ('Abi Marres','11111111-1111-1111-1111-111111111111'),
  ('Abi Helmi','11111111-1111-1111-1111-111111111111'),
  ('Abi Ahmad','22222222-2222-2222-2222-222222222222'),
  ('Abi Rizal','22222222-2222-2222-2222-222222222222'),
  ('Abi Umar','22222222-2222-2222-2222-222222222222');

INSERT INTO public.mutabaah_periods (start_date, end_date, status) VALUES
  ('2026-07-20','2026-07-26','closed'),
  ('2026-07-27','2026-08-02','closed'),
  ('2026-08-03','2026-08-09','active');