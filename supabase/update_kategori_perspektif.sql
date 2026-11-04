-- ====================================================================
-- UPDATE: kategori sasaran + perspektif KPI
-- Untuk database yang SUDAH menjalankan schema.sql versi sebelumnya.
-- (Instalasi baru cukup menjalankan schema.sql terbaru, isinya sama.)
--
-- Isi:
--   * enum kpi_perspective (empat perspektif) & goal_priority
--   * tabel goal_categories (kategori sasaran + bobot)
--   * kolom kpi_indicators.perspective & kpi_indicators.category_id
--   * view v_kpi_results ditambah kolom perspektif & kategori di AKHIR
--     (kolom lama tidak berubah, query yang ada tetap jalan)
--   * RLS goal_categories: semua bisa lihat, supervisor & manajemen kelola
-- Logika skor, trigger, dan policy lain TIDAK diubah.
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE public.kpi_perspective AS ENUM ('keuangan', 'pelanggan', 'proses_internal', 'pembelajaran');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.goal_priority AS ENUM ('utama', 'penting', 'rutin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.goal_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(80) NOT NULL UNIQUE,
  priority    public.goal_priority NOT NULL DEFAULT 'rutin',
  weight      numeric(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kpi_indicators
  ADD COLUMN IF NOT EXISTS perspective public.kpi_perspective,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.goal_categories(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.v_kpi_results WITH (security_invoker = true) AS
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
  s.status_color,
  i.perspective,
  i.category_id,
  gc.name            AS category_name,
  gc.priority        AS category_priority
FROM public.kpi_targets t
JOIN public.periods pr        ON pr.id = t.period_id
JOIN public.profiles p        ON p.id = t.staff_id
LEFT JOIN public.teams tm     ON tm.id = p.team_id
JOIN public.kpi_indicators i  ON i.id = t.indicator_id
LEFT JOIN public.goal_categories gc ON gc.id = i.category_id
LEFT JOIN public.kpi_actuals a ON a.target_id = t.id
LEFT JOIN public.kpi_scores s  ON s.actual_id = a.id;

ALTER TABLE public.goal_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select ON public.goal_categories;
DROP POLICY IF EXISTS categories_write ON public.goal_categories;
CREATE POLICY categories_select ON public.goal_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_write  ON public.goal_categories FOR ALL TO authenticated
  USING (public.auth_role() IN ('manajemen', 'supervisor'))
  WITH CHECK (public.auth_role() IN ('manajemen', 'supervisor'));

-- Data contoh untuk indikator seed (aman dijalankan ulang)
INSERT INTO public.goal_categories (id, name, priority, weight, description) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Kualitas layanan',        'utama',   50, 'Kecepatan dan kepuasan layanan ke pelanggan'),
  ('e1000000-0000-0000-0000-000000000002', 'Produktivitas tim',       'penting', 30, 'Volume pekerjaan yang diselesaikan tim'),
  ('e1000000-0000-0000-0000-000000000003', 'Pengembangan kompetensi', 'rutin',   20, 'Pelatihan dan peningkatan keterampilan staf')
ON CONFLICT (id) DO NOTHING;

UPDATE public.kpi_indicators SET perspective = 'proses_internal', category_id = 'e1000000-0000-0000-0000-000000000002'
  WHERE code = 'KPI-01' AND perspective IS NULL;
UPDATE public.kpi_indicators SET perspective = 'pelanggan', category_id = 'e1000000-0000-0000-0000-000000000001'
  WHERE code IN ('KPI-02', 'KPI-03') AND perspective IS NULL;

NOTIFY pgrst, 'reload schema';
