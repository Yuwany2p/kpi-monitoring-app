-- ====================================================================
-- SCHEMA SUPABASE: SISTEM MONITORING KPI & PELAPORAN MANAJEMEN
-- Tema: Dashboard capaian KPI tim dan pelaporan berkala ke manajemen
-- Kaitan Materi: Reporting to Management, 4 Perspektif AMS, Problem Analysis
-- ====================================================================

-- 1. DROP EXISTING OBJECTS (UNTUK RESET JIKA DIBUTUHKAN)
DROP VIEW IF EXISTS view_laporan_manajemen CASCADE;
DROP TABLE IF EXISTS analisis_tindakan CASCADE;
DROP TABLE IF EXISTS realisasi_kpi CASCADE;
DROP TABLE IF EXISTS kpi CASCADE;
DROP TABLE IF EXISTS kategori_sasaran CASCADE;
DROP TABLE IF EXISTS karyawan CASCADE;
DROP TABLE IF EXISTS departemen CASCADE;

DROP TYPE IF EXISTS status_tindakan_enum CASCADE;
DROP TYPE IF EXISTS prioritas_sasaran_enum CASCADE;
DROP TYPE IF EXISTS perspektif_ams_enum CASCADE;

-- 2. ENUM TYPES
CREATE TYPE perspektif_ams_enum AS ENUM (
    'Keuangan', 
    'Pelanggan', 
    'Proses Bisnis Internal', 
    'Pembelajaran & Pertumbuhan'
);

CREATE TYPE prioritas_sasaran_enum AS ENUM (
    'Prioritas Utama', 
    'Penting', 
    'Rutin'
);

CREATE TYPE status_tindakan_enum AS ENUM (
    'Open', 
    'In Progress', 
    'Resolved', 
    'Closed'
);

-- 3. MASTER: DEPARTEMEN / UNIT KERJA
CREATE TABLE departemen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_departemen VARCHAR(20) UNIQUE NOT NULL,
    nama_departemen VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MASTER: KARYAWAN / PIC
CREATE TABLE karyawan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(30) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff', -- 'Supervisor', 'Manager', 'Staff'
    id_departemen UUID REFERENCES departemen(id) ON DELETE SET NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MASTER: KATEGORI SASARAN (Prioritas & Bobot)
CREATE TABLE kategori_sasaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori prioritas_sasaran_enum NOT NULL UNIQUE,
    bobot_persen NUMERIC(5,2) NOT NULL DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MASTER: KPI (4 Perspektif AMS)
CREATE TABLE kpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_kpi VARCHAR(30) UNIQUE NOT NULL,
    nama_kpi VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    perspektif perspektif_ams_enum NOT NULL,
    id_kategori_sasaran UUID REFERENCES kategori_sasaran(id) ON DELETE RESTRICT,
    id_departemen UUID REFERENCES departemen(id) ON DELETE CASCADE,
    id_pic UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    target_tahunan NUMERIC(15,2) NOT NULL,
    satuan VARCHAR(50) NOT NULL, -- '%', 'Hari', 'Rupiah', 'Skor', 'Dokumen'
    bobot_kpi NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRANSAKSI: REALISASI KPI BULANAN
CREATE TABLE realisasi_kpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_kpi UUID REFERENCES kpi(id) ON DELETE CASCADE,
    tahun INT NOT NULL,
    bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    target_periode NUMERIC(15,2) NOT NULL,
    aktual NUMERIC(15,2) NOT NULL DEFAULT 0,
    persen_capaian NUMERIC(7,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_periode = 0 THEN 0 
            ELSE ROUND((aktual / target_periode) * 100, 2) 
        END
    ) STORED,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_kpi_periode UNIQUE (id_kpi, tahun, bulan)
);

-- 8. TRANSAKSI: ANALISIS & TINDAKAN PERBAIKAN (Corrective Action)
CREATE TABLE analisis_tindakan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_realisasi_kpi UUID REFERENCES realisasi_kpi(id) ON DELETE CASCADE,
    masalah TEXT NOT NULL,                -- Problem statement (Gap kinerja)
    akar_penyebab TEXT NOT NULL,          -- Root cause (5-Why / Diagram Tulang Ikan)
    tindakan_perbaikan TEXT NOT NULL,     -- Corrective action plan
    id_pic_tindakan UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    tenggat_waktu DATE NOT NULL,          -- Due date
    status status_tindakan_enum DEFAULT 'Open',
    hasil_evaluasi TEXT,                  -- Evaluasi hasil perbaikan
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. VIEW: LAPORAN MANAJEMEN & DASHBOARD
CREATE OR REPLACE VIEW view_laporan_manajemen AS
SELECT 
    r.id AS realisasi_id,
    r.tahun,
    r.bulan,
    k.id AS kpi_id,
    k.kode_kpi,
    k.nama_kpi,
    k.perspektif,
    d.nama_departemen,
    p.nama_lengkap AS pic_kpi,
    ks.nama_kategori AS prioritas,
    r.target_periode,
    r.aktual,
    k.satuan,
    r.persen_capaian,
    CASE 
        WHEN r.persen_capaian >= 100 THEN 'Tercapai (Hijau)'
        WHEN r.persen_capaian >= 80 THEN 'Perhatian (Kuning)'
        ELSE 'Kritis (Merah)'
    END AS status_indikator,
    a.id AS analisis_id,
    a.masalah,
    a.akar_penyebab,
    a.tindakan_perbaikan,
    a.tenggat_waktu,
    a.status AS status_perbaikan
FROM realisasi_kpi r
JOIN kpi k ON r.id_kpi = k.id
JOIN departemen d ON k.id_departemen = d.id
LEFT JOIN karyawan p ON k.id_pic = p.id
LEFT JOIN kategori_sasaran ks ON k.id_kategori_sasaran = ks.id
LEFT JOIN analisis_tindakan a ON a.id_realisasi_kpi = r.id;

-- 10. ROW LEVEL SECURITY (RLS) - PUBLIC ACCESS POLICY UNTUK KEMUDAHAN PROJEK UAS
ALTER TABLE departemen ENABLE ROW LEVEL SECURITY;
ALTER TABLE karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_sasaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE realisasi_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_tindakan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public for departemen" ON departemen FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for karyawan" ON karyawan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for kategori_sasaran" ON kategori_sasaran FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for kpi" ON kpi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for realisasi_kpi" ON realisasi_kpi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for analisis_tindakan" ON analisis_tindakan FOR ALL USING (true) WITH CHECK (true);

-- 11. DATA SEED (CONTOH DATA UNTUK DEMO UAS SUPERVISI)
INSERT INTO departemen (kode_departemen, nama_departemen, deskripsi) VALUES
('DEP-PROD', 'Departemen Produksi & Operasional', 'Bertanggung jawab atas efisiensi perakitan dan kualitas produk'),
('DEP-MKT', 'Departemen Pemasaran & Penjualan', 'Mengelola kepuasan pelanggan dan pertumbuhan pendapatan'),
('DEP-SDM', 'Departemen SDM & Pelatihan', 'Pengembangan kompetensi karyawan dan iklim kerja supervisi'),
('DEP-KEU', 'Departemen Keuangan & Akuntansi', 'Pengendalian biaya operasional dan arus kas');

INSERT INTO kategori_sasaran (nama_kategori, bobot_persen, keterangan) VALUES
('Prioritas Utama', 50.00, 'Sasaran strategis utama penentu kelangsungan unit kerja'),
('Penting', 30.00, 'Sasaran pendukung operasional yang esensial'),
('Rutin', 20.00, 'Kegiatan supervisi dan administrasi operasional harian');

INSERT INTO karyawan (nik, nama_lengkap, jabatan, role, id_departemen, email) VALUES
('EMP001', 'Budi Santoso, S.T.', 'Supervisor Produksi', 'Supervisor', (SELECT id FROM departemen WHERE kode_departemen = 'DEP-PROD'), 'budi@company.id'),
('EMP002', 'Siti Rahmawati, S.E.', 'Manager Keuangan', 'Manager', (SELECT id FROM departemen WHERE kode_departemen = 'DEP-KEU'), 'siti@company.id'),
('EMP003', 'Ahmad Fadillah', 'Supervisor HRD & Diklat', 'Supervisor', (SELECT id FROM departemen WHERE kode_departemen = 'DEP-SDM'), 'ahmad@company.id'),
('EMP004', 'Dewi Lestari', 'PIC Customer Relation', 'Staff', (SELECT id FROM departemen WHERE kode_departemen = 'DEP-MKT'), 'dewi@company.id');

INSERT INTO kpi (kode_kpi, nama_kpi, deskripsi, perspektif, id_kategori_sasaran, id_departemen, id_pic, target_tahunan, satuan, bobot_kpi) VALUES
('KPI-FIN-01', 'Efisiensi Biaya Operasional Produksi', 'Penekanan pemborosan material dan downtime mesin', 'Keuangan', 
 (SELECT id FROM kategori_sasaran WHERE nama_kategori = 'Prioritas Utama'),
 (SELECT id FROM departemen WHERE kode_departemen = 'DEP-PROD'),
 (SELECT id FROM karyawan WHERE nik = 'EMP001'), 95.00, '%', 30.00),

('KPI-CUS-01', 'Indeks Kepuasan Pelanggan (CSI)', 'Survei kepuasan layanan dan waktu respon keluhan', 'Pelanggan', 
 (SELECT id FROM kategori_sasaran WHERE nama_kategori = 'Prioritas Utama'),
 (SELECT id FROM departemen WHERE kode_departemen = 'DEP-MKT'),
 (SELECT id FROM karyawan WHERE nik = 'EMP004'), 90.00, 'Skor', 25.00),

('KPI-INT-01', 'Tingkat Cacat Produk (Defect Rate)', 'Persentase reject unit selama proses supervisi lini', 'Proses Bisnis Internal', 
 (SELECT id FROM kategori_sasaran WHERE nama_kategori = 'Penting'),
 (SELECT id FROM departemen WHERE kode_departemen = 'DEP-PROD'),
 (SELECT id FROM karyawan WHERE nik = 'EMP001'), 2.00, '%', 25.00),

('KPI-LRN-01', 'Jam Pelatihan Karyawan Lapangan', 'Rata-rata jam pelatihan skill teknis dan K3 per personil', 'Pembelajaran & Pertumbuhan', 
 (SELECT id FROM kategori_sasaran WHERE nama_kategori = 'Rutin'),
 (SELECT id FROM departemen WHERE kode_departemen = 'DEP-SDM'),
 (SELECT id FROM karyawan WHERE nik = 'EMP003'), 40.00, 'Jam', 20.00);

-- Masukkan Realisasi Periode Bulan Ini (Tahun 2026, Bulan 10)
INSERT INTO realisasi_kpi (id_kpi, tahun, bulan, target_periode, aktual, catatan) VALUES
((SELECT id FROM kpi WHERE kode_kpi = 'KPI-FIN-01'), 2026, 10, 95.00, 92.50, 'Terkendala kenaikan harga suku cadang darurat'),
((SELECT id FROM kpi WHERE kode_kpi = 'KPI-CUS-01'), 2026, 10, 90.00, 93.00, 'Respon tiket keluhan meningkat cepat'),
((SELECT id FROM kpi WHERE kode_kpi = 'KPI-INT-01'), 2026, 10, 2.00, 3.80, 'Mesin cetak 2 mengalami misalignment kalibrasi'),
((SELECT id FROM kpi WHERE kode_kpi = 'KPI-LRN-01'), 2026, 10, 40.00, 38.00, 'Jadwal shift lembur sempat menunda sesi diklat');

-- Masukkan Analisis & Tindakan Perbaikan (Problem Solving) untuk KPI yang Defect (Under-performing)
INSERT INTO analisis_tindakan (id_realisasi_kpi, masalah, akar_penyebab, tindakan_perbaikan, id_pic_tindakan, tenggat_waktu, status, hasil_evaluasi) VALUES
(
    (SELECT r.id FROM realisasi_kpi r JOIN kpi k ON r.id_kpi = k.id WHERE k.kode_kpi = 'KPI-INT-01' LIMIT 1),
    'Tingkat cacat produk meningkat menjadi 3.8% (Target maks 2.0%)',
    'Kalibrasi sensor nozzle mesin conveyor longgar dan operator shift malam belum tersertifikasi prosedur checklist.',
    '1. Kalibrasi ulang sensor nozzle bersama vendor teknis. 2. Briefing supervisi SOP checklist 5 menit setiap awal shift pergantian.',
    (SELECT id FROM karyawan WHERE nik = 'EMP001'),
    '2026-11-05',
    'In Progress',
    'Tahap 1 selesai, sedang memantau hasil produksi batch 4.'
);
