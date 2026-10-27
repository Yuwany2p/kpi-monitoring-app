-- ====================================================================
-- DATA DEMO — jalankan SETELAH schema.sql (SQL Editor Supabase)
-- Semua akun demo memakai password: password123
--
--   maya@perusahaan.co.id    Manajemen
--   hendra@perusahaan.co.id  Supervisor  (Tim Customer Service)
--   andi@ / sari@ / budi@ / dewi@ / rina@perusahaan.co.id   Staf
--
-- Kondisi data: Mei–Sep 2026 sudah divalidasi (periode closed),
-- Oktober 2026 masih open dengan 5 data menunggu validasi,
-- 1 data ditolak, dan 2 action plan untuk KPI merah.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bersihkan data demo lama (aman dijalankan ulang)
DELETE FROM auth.users WHERE email LIKE '%@perusahaan.co.id';
DELETE FROM public.periods;
DELETE FROM public.kpi_indicators;
DELETE FROM public.teams;

-- --------------------------------------------------------------------
-- 1. Tim
-- --------------------------------------------------------------------
INSERT INTO public.teams (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tim Customer Service');

-- --------------------------------------------------------------------
-- 2. Akun (auth.users) -> profil dibuat otomatis oleh trigger
-- --------------------------------------------------------------------
WITH demo(id, email, full_name, role, team_id) AS (
  VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'maya@perusahaan.co.id',   'Maya Anggraini', 'manajemen',  NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'hendra@perusahaan.co.id', 'Hendra Wijaya',  'supervisor', '11111111-1111-1111-1111-111111111111'),
    ('c5000000-0000-0000-0000-000000000001'::uuid, 'andi@perusahaan.co.id',   'Andi Pratama',   'staf',       '11111111-1111-1111-1111-111111111111'),
    ('c5000000-0000-0000-0000-000000000002'::uuid, 'sari@perusahaan.co.id',   'Sari Wulandari', 'staf',       '11111111-1111-1111-1111-111111111111'),
    ('c5000000-0000-0000-0000-000000000003'::uuid, 'budi@perusahaan.co.id',   'Budi Santoso',   'staf',       '11111111-1111-1111-1111-111111111111'),
    ('c5000000-0000-0000-0000-000000000004'::uuid, 'dewi@perusahaan.co.id',   'Dewi Lestari',   'staf',       '11111111-1111-1111-1111-111111111111'),
    ('c5000000-0000-0000-0000-000000000005'::uuid, 'rina@perusahaan.co.id',   'Rina Marlina',   'staf',       '11111111-1111-1111-1111-111111111111')
),
ins_users AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', d.full_name, 'role', d.role, 'team_id', COALESCE(d.team_id, '')),
    now(), now(), '', '', '', '', '', '', '', ''
  FROM demo d
  RETURNING id, email
)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
FROM ins_users u;

UPDATE public.teams SET supervisor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- --------------------------------------------------------------------
-- 3. Periode (Mei – Okt 2026)
-- --------------------------------------------------------------------
INSERT INTO public.periods (id, name, start_date, end_date, status) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'Mei 2026',       '2026-05-01', '2026-05-31', 'closed'),
  ('e0000000-0000-0000-0000-000000000006', 'Juni 2026',      '2026-06-01', '2026-06-30', 'closed'),
  ('e0000000-0000-0000-0000-000000000007', 'Juli 2026',      '2026-07-01', '2026-07-31', 'closed'),
  ('e0000000-0000-0000-0000-000000000008', 'Agustus 2026',   '2026-08-01', '2026-08-31', 'closed'),
  ('e0000000-0000-0000-0000-000000000009', 'September 2026', '2026-09-01', '2026-09-30', 'closed'),
  ('e0000000-0000-0000-0000-000000000010', 'Oktober 2026',   '2026-10-01', '2026-10-31', 'open');

-- --------------------------------------------------------------------
-- 4. Indikator KPI
-- --------------------------------------------------------------------
INSERT INTO public.kpi_indicators (id, code, name, unit, direction, weight, frequency, data_source, created_by) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'KPI-01', 'Tiket Terselesaikan',     'tiket', 'higher_better', 40, 'Bulanan', 'Sistem tiket',     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('d0000000-0000-0000-0000-000000000002', 'KPI-02', 'Waktu Respons Rata-rata', 'menit', 'lower_better',  30, 'Bulanan', 'Log sistem',       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('d0000000-0000-0000-0000-000000000003', 'KPI-03', 'Kepuasan Pelanggan',      '%',     'higher_better', 30, 'Bulanan', 'Survei pelanggan', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- --------------------------------------------------------------------
-- 5. Target: semua staf x 3 indikator x 6 periode
-- --------------------------------------------------------------------
INSERT INTO public.kpi_targets (indicator_id, staff_id, period_id, target_value, created_by)
SELECT i.id, p.id, pr.id,
       CASE i.code WHEN 'KPI-01' THEN 200 WHEN 'KPI-02' THEN 5 ELSE 90 END,
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
FROM public.kpi_indicators i
CROSS JOIN public.profiles p
CROSS JOIN public.periods pr
WHERE p.role = 'staf';

-- --------------------------------------------------------------------
-- 6. Realisasi
--    Nilai Oktober per staf + tren (delta per bulan ke belakang).
--    trend > 0 artinya kinerja membaik menuju Oktober.
-- --------------------------------------------------------------------
WITH base(staff_id, tiket, respons, kepuasan, trend) AS (
  VALUES
    ('c5000000-0000-0000-0000-000000000001'::uuid, 210.0, 5.0, 88.0,  1),  -- Andi
    ('c5000000-0000-0000-0000-000000000002'::uuid, 180.0, 4.5, 84.0,  1),  -- Sari
    ('c5000000-0000-0000-0000-000000000003'::uuid, 170.0, 5.4, 79.0,  0),  -- Budi
    ('c5000000-0000-0000-0000-000000000004'::uuid, 144.0, 5.3, 81.0, -1),  -- Dewi
    ('c5000000-0000-0000-0000-000000000005'::uuid, 136.0, 5.6, 70.0, -2)   -- Rina
),
rows AS (
  SELECT t.id AS target_id, i.code, b.*,
         (10 - EXTRACT(MONTH FROM pr.start_date))::int AS months_back,
         p.full_name
  FROM public.kpi_targets t
  JOIN public.kpi_indicators i ON i.id = t.indicator_id
  JOIN public.periods pr       ON pr.id = t.period_id
  JOIN public.profiles p       ON p.id = t.staff_id
  JOIN base b                  ON b.staff_id = t.staff_id
)
INSERT INTO public.kpi_actuals (target_id, actual_value, notes, status, validation_note)
SELECT
  r.target_id,
  ROUND(CASE r.code
    WHEN 'KPI-01' THEN r.tiket    - r.months_back * 4   * r.trend + (r.months_back % 2) * 3
    WHEN 'KPI-02' THEN r.respons  + r.months_back * 0.1 * r.trend
    ELSE               r.kepuasan - r.months_back * 1.5 * r.trend + (r.months_back % 2)
  END, 1),
  CASE WHEN r.months_back = 0 AND r.full_name = 'Dewi Lestari' AND r.code = 'KPI-01'
       THEN 'Tiket meningkat setelah promo akhir bulan.' END,
  (CASE
    WHEN r.months_back > 0 THEN 'approved'
    WHEN r.full_name IN ('Andi Pratama', 'Sari Wulandari') THEN 'approved'
    WHEN r.full_name = 'Budi Santoso' AND r.code = 'KPI-01' THEN 'approved'
    WHEN r.full_name = 'Rina Marlina' AND r.code = 'KPI-02' THEN 'rejected'
    WHEN r.full_name = 'Rina Marlina' THEN 'approved'
    ELSE 'submitted'
  END)::public.actual_status,
  CASE WHEN r.months_back = 0 AND r.full_name = 'Rina Marlina' AND r.code = 'KPI-02'
       THEN 'Mohon lampirkan rekap log sistem sebelum diajukan ulang.' END
FROM rows r;

-- Tanggal pengajuan & validasi yang realistis untuk data demo
UPDATE public.kpi_actuals a
SET submitted_at = CASE WHEN pr.status = 'open' THEN now() - interval '3 days'
                        ELSE pr.end_date + interval '2 days' END,
    validated_at = CASE WHEN a.status IN ('approved', 'rejected') THEN
                     CASE WHEN pr.status = 'open' THEN now() - interval '1 day'
                          ELSE pr.end_date + interval '4 days' END END,
    validated_by = CASE WHEN a.status IN ('approved', 'rejected')
                        THEN 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid END
FROM public.kpi_targets t
JOIN public.periods pr ON pr.id = t.period_id
WHERE t.id = a.target_id;

-- --------------------------------------------------------------------
-- 7. Action plan untuk KPI merah Rina (Oktober)
-- --------------------------------------------------------------------
INSERT INTO public.action_plans (score_id, staff_id, supervisor_id, pic_id, analysis, action, due_date, status)
SELECT v.score_id, v.staff_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       x.analysis, x.action, x.due_date::date, x.status::public.plan_status
FROM public.v_kpi_results v
JOIN (VALUES
  ('KPI-01', 'Volume tiket naik sejak promo akhir bulan dan 2 hari izin mengurangi jam layanan.',
             'Redistribusi tiket antrean dan sesi coaching manajemen waktu.', '2026-11-05', 'open'),
  ('KPI-03', 'Komplain terkait respons chat yang terlambat di jam sibuk.',
             'Coaching teknik komunikasi dan simulasi penanganan komplain.', '2026-11-12', 'in_progress')
) AS x(code, analysis, action, due_date, status) ON x.code = v.indicator_code
WHERE v.staff_name = 'Rina Marlina'
  AND v.period_name = 'Oktober 2026'
  AND v.score_id IS NOT NULL;

-- --------------------------------------------------------------------
-- 8. Laporan September (sudah direview manajemen)
-- --------------------------------------------------------------------
INSERT INTO public.reports (id, period_id, created_by, title, summary, status, submitted_at) VALUES
  ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Laporan KPI Tim Customer Service · September 2026',
   'Capaian tim stabil. Tiket terselesaikan Rina terus menurun, coaching dijadwalkan bulan depan.',
   'submitted', '2026-10-03 09:00+07');

INSERT INTO public.report_reviews (report_id, reviewer_id, decision, feedback, reviewed_at) VALUES
  ('f0000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'approved',
   'Laporan jelas. Mohon pantau progres Rina dan laporkan di periode berikutnya.', '2026-10-04 14:00+07');
