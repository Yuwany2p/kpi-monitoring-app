-- ====================================================================
-- SISTEM MONITORING KPI DAN PELAPORAN KE MANAJEMEN
-- Schema Supabase (PostgreSQL) — mengikuti Physical Data Model di
-- Product Documentation (Bab 4.1).
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> jalankan file ini,
-- lalu (opsional) jalankan seed.sql untuk data demo.
--
-- Tambahan di luar PDM (dicatat agar dokumen bisa disesuaikan):
--   * created_at / updated_at di beberapa tabel
--   * action_plans.pic_id  -> penanggung jawab action plan (URD: "beserta
--     penanggung jawab dan batas waktu"), staff_id tetap staf yang dituju
--   * reports.content (jsonb) -> snapshot isi laporan saat dikirim, agar
--     yang direview manajemen sama persis dengan yang dikirim supervisor
--   * view v_kpi_results untuk dashboard / laporan
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. RESET (aman dijalankan ulang)
-- --------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_kpi_results CASCADE;
DROP TABLE IF EXISTS public.report_reviews CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.action_plans CASCADE;
DROP TABLE IF EXISTS public.kpi_scores CASCADE;
DROP TABLE IF EXISTS public.kpi_actuals CASCADE;
DROP TABLE IF EXISTS public.kpi_targets CASCADE;
DROP TABLE IF EXISTS public.kpi_indicators CASCADE;
DROP TABLE IF EXISTS public.periods CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.auth_team() CASCADE;
DROP FUNCTION IF EXISTS public.is_my_staff(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.target_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.target_period_open(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calc_achievement(numeric, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.kpi_actuals_before_write() CASCADE;
DROP FUNCTION IF EXISTS public.kpi_actuals_sync_score() CASCADE;
DROP FUNCTION IF EXISTS public.report_reviews_after_insert() CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.kpi_direction CASCADE;
DROP TYPE IF EXISTS public.period_status CASCADE;
DROP TYPE IF EXISTS public.actual_status CASCADE;
DROP TYPE IF EXISTS public.score_color CASCADE;
DROP TYPE IF EXISTS public.plan_status CASCADE;
DROP TYPE IF EXISTS public.report_status CASCADE;
DROP TYPE IF EXISTS public.review_decision CASCADE;

-- --------------------------------------------------------------------
-- 1. ENUM
-- --------------------------------------------------------------------
CREATE TYPE public.user_role       AS ENUM ('manajemen', 'supervisor', 'staf');
CREATE TYPE public.kpi_direction   AS ENUM ('higher_better', 'lower_better');
CREATE TYPE public.period_status   AS ENUM ('open', 'closed');
CREATE TYPE public.actual_status   AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE public.score_color     AS ENUM ('green', 'yellow', 'red');
CREATE TYPE public.plan_status     AS ENUM ('open', 'in_progress', 'done');
CREATE TYPE public.report_status   AS ENUM ('draft', 'submitted', 'approved', 'revision', 'special_action');
CREATE TYPE public.review_decision AS ENUM ('approved', 'revision', 'special_action');

-- --------------------------------------------------------------------
-- 2. TABEL
-- --------------------------------------------------------------------
CREATE TABLE public.teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(100) NOT NULL UNIQUE,
  supervisor_id uuid,                       -- FK ditambahkan setelah profiles
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  varchar(100) NOT NULL,
  email      varchar(120) NOT NULL UNIQUE,
  role       public.user_role NOT NULL DEFAULT 'staf',
  team_id    uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams
  ADD CONSTRAINT teams_supervisor_id_fkey
  FOREIGN KEY (supervisor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE public.periods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(50) NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  status     public.period_status NOT NULL DEFAULT 'open',
  CONSTRAINT periods_date_check CHECK (end_date >= start_date)
);

CREATE TABLE public.kpi_indicators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(20) NOT NULL UNIQUE,
  name        varchar(120) NOT NULL,
  unit        varchar(20) NOT NULL,
  direction   public.kpi_direction NOT NULL DEFAULT 'higher_better',
  weight      numeric(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  frequency   varchar(10) NOT NULL DEFAULT 'Bulanan',
  data_source varchar(100),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kpi_targets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.kpi_indicators(id) ON DELETE CASCADE,
  staff_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_id    uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  target_value numeric(12,2) NOT NULL CHECK (target_value > 0),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kpi_targets_unique UNIQUE (indicator_id, staff_id, period_id)
);

-- Satu target = satu baris realisasi. Pengajuan ulang setelah ditolak
-- memperbarui baris yang sama (riwayat catatan tetap di validation_note).
CREATE TABLE public.kpi_actuals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id       uuid NOT NULL UNIQUE REFERENCES public.kpi_targets(id) ON DELETE CASCADE,
  actual_value    numeric(12,2) NOT NULL CHECK (actual_value >= 0),
  notes           text,
  evidence_url    text,                      -- path di bucket storage "evidence"
  status          public.actual_status NOT NULL DEFAULT 'draft',
  submitted_at    timestamptz,
  validated_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at    timestamptz,
  validation_note text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Diisi otomatis oleh trigger saat realisasi disetujui supervisor.
CREATE TABLE public.kpi_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id       uuid NOT NULL UNIQUE REFERENCES public.kpi_actuals(id) ON DELETE CASCADE,
  achievement_pct numeric(6,2) NOT NULL,
  weighted_score  numeric(6,2) NOT NULL,
  status_color    public.score_color NOT NULL,
  calculated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.action_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id      uuid NOT NULL REFERENCES public.kpi_scores(id) ON DELETE CASCADE,
  staff_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pic_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  analysis      text NOT NULL,
  action        text NOT NULL,
  due_date      date NOT NULL,
  status        public.plan_status NOT NULL DEFAULT 'open',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id    uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        varchar(150) NOT NULL,
  summary      text,
  content      jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url     text,                         -- path di bucket storage "reports"
  status       public.report_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_unique_per_period UNIQUE (period_id, created_by)
);

CREATE TABLE public.report_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision    public.review_decision NOT NULL,
  feedback    text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.profiles (team_id);
CREATE INDEX ON public.kpi_targets (staff_id);
CREATE INDEX ON public.kpi_targets (period_id);
CREATE INDEX ON public.kpi_actuals (status);
CREATE INDEX ON public.action_plans (staff_id);
CREATE INDEX ON public.action_plans (score_id);
CREATE INDEX ON public.reports (status);
CREATE INDEX ON public.report_reviews (report_id);

-- --------------------------------------------------------------------
-- 3. FUNGSI BANTU (dipakai di RLS) — SECURITY DEFINER agar tidak rekursif
-- --------------------------------------------------------------------
CREATE FUNCTION public.auth_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active
$$;

CREATE FUNCTION public.auth_team() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;

-- TRUE jika user login adalah supervisor dari tim si staf.
CREATE FUNCTION public.is_my_staff(p_staff uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = p_staff AND t.supervisor_id = auth.uid()
  )
$$;

CREATE FUNCTION public.target_owner(p_target uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT staff_id FROM public.kpi_targets WHERE id = p_target
$$;

CREATE FUNCTION public.target_period_open(p_target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT pr.status = 'open'
    FROM public.kpi_targets t JOIN public.periods pr ON pr.id = t.period_id
    WHERE t.id = p_target
  ), false)
$$;

-- Capaian (%) = Realisasi / Target x 100 ; arah "lower_better" = Target / Realisasi x 100
CREATE FUNCTION public.calc_achievement(p_actual numeric, p_target numeric, p_direction text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_target IS NULL OR p_target = 0 THEN 0
    WHEN p_direction = 'lower_better' THEN
      CASE WHEN p_actual IS NULL OR p_actual = 0 THEN 0
           ELSE LEAST(ROUND(p_target / p_actual * 100, 2), 9999) END
    ELSE LEAST(ROUND(COALESCE(p_actual, 0) / p_target * 100, 2), 9999)
  END
$$;

-- --------------------------------------------------------------------
-- 4. TRIGGER
-- --------------------------------------------------------------------

-- 4a. Profil otomatis dibuat saat user didaftarkan di Supabase Auth.
--     role & full_name & team_id diambil dari user metadata (opsional).
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, team_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'staf'),
    NULLIF(NEW.raw_user_meta_data->>'team_id', '')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4b. Jaga alur status realisasi & isi kolom audit otomatis.
CREATE FUNCTION public.kpi_actuals_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.user_role := public.auth_role();
BEGIN
  NEW.updated_at := now();

  -- Supervisor hanya boleh mengubah status & catatan validasi.
  IF TG_OP = 'UPDATE' AND v_role = 'supervisor' AND auth.uid() IS DISTINCT FROM public.target_owner(NEW.target_id) THEN
    NEW.actual_value := OLD.actual_value;
    NEW.notes        := OLD.notes;
    NEW.evidence_url := OLD.evidence_url;
    NEW.target_id    := OLD.target_id;
  END IF;

  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    NEW.submitted_at := now();
  END IF;

  IF NEW.status IN ('approved', 'rejected') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.validated_at := now();
    IF auth.uid() IS NOT NULL THEN
      NEW.validated_by := auth.uid();
    END IF;
  END IF;

  IF NEW.status = 'rejected' AND COALESCE(btrim(NEW.validation_note), '') = '' THEN
    RAISE EXCEPTION 'Catatan penolakan wajib diisi';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER kpi_actuals_before_write
  BEFORE INSERT OR UPDATE ON public.kpi_actuals
  FOR EACH ROW EXECUTE FUNCTION public.kpi_actuals_before_write();

-- 4c. Hitung capaian HANYA dari data yang sudah valid (approved).
CREATE FUNCTION public.kpi_actuals_sync_score() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target    numeric;
  v_direction text;
  v_weight    numeric;
  v_pct       numeric;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT t.target_value, i.direction::text, i.weight
      INTO v_target, v_direction, v_weight
    FROM public.kpi_targets t
    JOIN public.kpi_indicators i ON i.id = t.indicator_id
    WHERE t.id = NEW.target_id;

    v_pct := public.calc_achievement(NEW.actual_value, v_target, v_direction);

    INSERT INTO public.kpi_scores (actual_id, achievement_pct, weighted_score, status_color, calculated_at)
    VALUES (
      NEW.id,
      v_pct,
      LEAST(ROUND(v_pct * v_weight / 100, 2), 9999),
      CASE WHEN v_pct >= 100 THEN 'green'::public.score_color
           WHEN v_pct >= 80  THEN 'yellow'::public.score_color
           ELSE 'red'::public.score_color END,
      now()
    )
    ON CONFLICT (actual_id) DO UPDATE SET
      achievement_pct = EXCLUDED.achievement_pct,
      weighted_score  = EXCLUDED.weighted_score,
      status_color    = EXCLUDED.status_color,
      calculated_at   = EXCLUDED.calculated_at;
  ELSE
    DELETE FROM public.kpi_scores WHERE actual_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER kpi_actuals_sync_score
  AFTER INSERT OR UPDATE OF status, actual_value ON public.kpi_actuals
  FOR EACH ROW EXECUTE FUNCTION public.kpi_actuals_sync_score();

-- 4d. Keputusan manajemen mengubah status laporan.
CREATE FUNCTION public.report_reviews_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.reports
     SET status = NEW.decision::text::public.report_status
   WHERE id = NEW.report_id;
  RETURN NEW;
END $$;

CREATE TRIGGER report_reviews_after_insert
  AFTER INSERT ON public.report_reviews
  FOR EACH ROW EXECUTE FUNCTION public.report_reviews_after_insert();

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER action_plans_touch
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------------------
-- 5. VIEW: satu baris per target (indikator x staf x periode)
--    security_invoker = true -> RLS tabel asal tetap berlaku
-- --------------------------------------------------------------------
CREATE VIEW public.v_kpi_results WITH (security_invoker = true) AS
SELECT
  t.id               AS target_id,
  t.period_id,
  pr.name            AS period_name,
  pr.start_date      AS period_start,
  pr.status          AS period_status,
  t.staff_id,
  p.full_name        AS staff_name,
  p.team_id,
  tm.name            AS team_name,
  t.indicator_id,
  i.code             AS indicator_code,
  i.name             AS indicator_name,
  i.unit,
  i.direction,
  i.weight,
  i.is_active        AS indicator_active,
  t.target_value,
  a.id               AS actual_id,
  a.actual_value,
  a.notes,
  a.evidence_url,
  a.status           AS actual_status,
  a.submitted_at,
  a.validated_at,
  a.validation_note,
  s.id               AS score_id,
  s.achievement_pct,
  s.weighted_score,
  s.status_color
FROM public.kpi_targets t
JOIN public.periods pr        ON pr.id = t.period_id
JOIN public.profiles p        ON p.id = t.staff_id
LEFT JOIN public.teams tm     ON tm.id = p.team_id
JOIN public.kpi_indicators i  ON i.id = t.indicator_id
LEFT JOIN public.kpi_actuals a ON a.target_id = t.id
LEFT JOIN public.kpi_scores s  ON s.actual_id = a.id;

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- --------------------------------------------------------------------
ALTER TABLE public.teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_actuals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;

-- teams
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_write  ON public.teams FOR ALL TO authenticated
  USING (public.auth_role() = 'manajemen') WITH CHECK (public.auth_role() = 'manajemen');

-- profiles: diri sendiri, rekan satu tim, supervisor & manajemen
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid()
  OR public.auth_role() IN ('manajemen', 'supervisor')
  OR team_id = public.auth_team()
);
CREATE POLICY profiles_manage ON public.profiles FOR UPDATE TO authenticated
  USING (public.auth_role() = 'manajemen') WITH CHECK (public.auth_role() = 'manajemen');

-- periods
CREATE POLICY periods_select ON public.periods FOR SELECT TO authenticated USING (true);
CREATE POLICY periods_write  ON public.periods FOR ALL TO authenticated
  USING (public.auth_role() IN ('manajemen', 'supervisor'))
  WITH CHECK (public.auth_role() IN ('manajemen', 'supervisor'));

-- kpi_indicators: semua bisa lihat, supervisor & manajemen kelola
CREATE POLICY indicators_select ON public.kpi_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY indicators_write  ON public.kpi_indicators FOR ALL TO authenticated
  USING (public.auth_role() IN ('manajemen', 'supervisor'))
  WITH CHECK (public.auth_role() IN ('manajemen', 'supervisor'));

-- kpi_targets
CREATE POLICY targets_select ON public.kpi_targets FOR SELECT TO authenticated USING (
  staff_id = auth.uid() OR public.auth_role() = 'manajemen' OR public.is_my_staff(staff_id)
);
CREATE POLICY targets_write ON public.kpi_targets FOR ALL TO authenticated
  USING (public.auth_role() = 'manajemen' OR public.is_my_staff(staff_id))
  WITH CHECK (public.auth_role() = 'manajemen' OR public.is_my_staff(staff_id));

-- kpi_actuals
CREATE POLICY actuals_select ON public.kpi_actuals FOR SELECT TO authenticated USING (
  public.target_owner(target_id) = auth.uid()
  OR public.auth_role() = 'manajemen'
  OR public.is_my_staff(public.target_owner(target_id))
);
-- Staf: input / draft / ajukan, hanya untuk targetnya sendiri & periode masih open
CREATE POLICY actuals_staff_insert ON public.kpi_actuals FOR INSERT TO authenticated WITH CHECK (
  public.target_owner(target_id) = auth.uid()
  AND public.target_period_open(target_id)
  AND status IN ('draft', 'submitted')
);
CREATE POLICY actuals_staff_update ON public.kpi_actuals FOR UPDATE TO authenticated
  USING (
    public.target_owner(target_id) = auth.uid()
    AND status IN ('draft', 'rejected')
    AND public.target_period_open(target_id)
  )
  WITH CHECK (
    public.target_owner(target_id) = auth.uid()
    AND status IN ('draft', 'submitted')
  );
CREATE POLICY actuals_staff_delete ON public.kpi_actuals FOR DELETE TO authenticated
  USING (public.target_owner(target_id) = auth.uid() AND status = 'draft');
-- Supervisor: validasi data staf di timnya
CREATE POLICY actuals_supervisor_validate ON public.kpi_actuals FOR UPDATE TO authenticated
  USING (
    public.is_my_staff(public.target_owner(target_id))
    AND status IN ('submitted', 'approved', 'rejected')
  )
  WITH CHECK (
    public.is_my_staff(public.target_owner(target_id))
    AND status IN ('approved', 'rejected')
  );

-- kpi_scores: read-only dari client (ditulis trigger)
CREATE POLICY scores_select ON public.kpi_scores FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.kpi_actuals a
    WHERE a.id = actual_id
      AND (
        public.target_owner(a.target_id) = auth.uid()
        OR public.auth_role() = 'manajemen'
        OR public.is_my_staff(public.target_owner(a.target_id))
      )
  )
);

-- action_plans
CREATE POLICY plans_select ON public.action_plans FOR SELECT TO authenticated USING (
  staff_id = auth.uid()
  OR pic_id = auth.uid()
  OR supervisor_id = auth.uid()
  OR public.auth_role() = 'manajemen'
  OR public.is_my_staff(staff_id)
);
CREATE POLICY plans_write ON public.action_plans FOR ALL TO authenticated
  USING (public.auth_role() = 'supervisor' AND public.is_my_staff(staff_id))
  WITH CHECK (
    public.auth_role() = 'supervisor'
    AND public.is_my_staff(staff_id)
    AND supervisor_id = auth.uid()
  );

-- reports: supervisor kelola laporannya sendiri, manajemen lihat yang sudah dikirim
CREATE POLICY reports_select ON public.reports FOR SELECT TO authenticated USING (
  created_by = auth.uid()
  OR (public.auth_role() = 'manajemen' AND status <> 'draft')
);
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND public.auth_role() = 'supervisor' AND status IN ('draft', 'submitted')
);
CREATE POLICY reports_update ON public.reports FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('draft', 'revision', 'submitted'))
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'submitted'));

-- report_reviews
CREATE POLICY reviews_select ON public.report_reviews FOR SELECT TO authenticated USING (
  reviewer_id = auth.uid()
  OR public.auth_role() = 'manajemen'
  OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.created_by = auth.uid())
);
CREATE POLICY reviews_insert ON public.report_reviews FOR INSERT TO authenticated WITH CHECK (
  public.auth_role() = 'manajemen'
  AND reviewer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.status = 'submitted')
);

GRANT SELECT ON public.v_kpi_results TO authenticated;

-- --------------------------------------------------------------------
-- 7. STORAGE: bukti capaian & file laporan (private bucket)
--    Path file: <user_id>/<nama-file>
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false), ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS evidence_insert ON storage.objects;
DROP POLICY IF EXISTS evidence_select ON storage.objects;
DROP POLICY IF EXISTS evidence_delete ON storage.objects;
DROP POLICY IF EXISTS reports_file_insert ON storage.objects;
DROP POLICY IF EXISTS reports_file_update ON storage.objects;
DROP POLICY IF EXISTS reports_file_select ON storage.objects;

CREATE POLICY evidence_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY evidence_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.auth_role() = 'manajemen'
    OR public.is_my_staff(((storage.foldername(name))[1])::uuid)
  )
);
CREATE POLICY evidence_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY reports_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY reports_file_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY reports_file_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'reports' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.auth_role() = 'manajemen'
  )
);
