-- =========================================================
-- SISTEM MANAJEMEN KPI PRODI/UPT
-- Script Lengkap: Jalankan SEKALI di Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/uwxwxvpunrefywjdialr/sql
-- =========================================================

-- =========================================================
-- BAGIAN 1: BERSIHKAN DATA LAMA (Jika ada)
-- =========================================================
drop table if exists approval_log cascade;
drop table if exists upload_file cascade;
drop table if exists detail_kpi cascade;
drop table if exists kpi_penanggung_jawab cascade;
drop table if exists kpi cascade;
drop table if exists karyawan cascade;
drop sequence if exists seq_kpi cascade;
drop sequence if exists seq_detail_kpi cascade;
drop sequence if exists seq_upload cascade;

-- =========================================================
-- BAGIAN 2: BUAT SEQUENCE
-- =========================================================
create sequence seq_kpi start 1;
create sequence seq_detail_kpi start 1;
create sequence seq_upload start 1;

-- =========================================================
-- BAGIAN 3: BUAT TABEL
-- =========================================================
create table karyawan (
  npk            varchar(10) primary key,
  nama_karyawan  varchar(100) not null,
  gender         varchar(25),
  bagian         varchar(100),
  role           varchar(20) not null
                 check (role in ('KAPROD','SEKPROD','KAUPT','PIC_ACTIVITY')),
  username       varchar(50) not null unique,
  password       varchar(100) not null,
  status_aktif   boolean not null default true
);

create table kpi (
  id_kpi             varchar(10) primary key
                     default 'KPI' || lpad(nextval('seq_kpi')::text, 7, '0'),
  nama_kpi           varchar(100) not null,
  persentase_bobot   numeric(5,2) not null default 0,
  persentase_progres numeric(5,2) not null default 0,
  level              varchar(100),
  kategori           varchar(100),
  periode            varchar(20),
  status             varchar(20) not null default 'DRAFT'
                     check (status in ('DRAFT','PUBLISHED','CLOSED')),
  dibuat_oleh        varchar(10) not null references karyawan(npk)
);

create table kpi_penanggung_jawab (
  id_kpi  varchar(10) not null references kpi(id_kpi),
  npk     varchar(10) not null references karyawan(npk),
  primary key (id_kpi, npk)
);

create table detail_kpi (
  id_detail_kpi      varchar(10) primary key
                     default 'DKP' || lpad(nextval('seq_detail_kpi')::text, 7, '0'),
  id_kpi             varchar(10) not null references kpi(id_kpi),
  npk_pic            varchar(10) references karyawan(npk),
  dibuat_oleh        varchar(10) not null references karyawan(npk),
  nama_aktivitas_kpi varchar(250) not null,
  persentase_bobot   numeric(5,2) not null check (persentase_bobot between 0 and 100),
  persentase_progres numeric(5,2) not null default 0 check (persentase_progres between 0 and 100),
  deadline           date,
  status             varchar(20) not null default 'OPEN'
                     check (status in ('OPEN','PICKED','SUBMITTED','REVISION','APPROVED_L1','DONE'))
);

create table upload_file (
  id_upload          varchar(10) primary key
                     default 'UPL' || lpad(nextval('seq_upload')::text, 7, '0'),
  id_detail_kpi      varchar(10) not null references detail_kpi(id_detail_kpi),
  nama_file          varchar(100),
  path               text,
  persentase_progres numeric(5,2) not null check (persentase_progres between 0 and 100),
  catatan            text,
  tanggal_upload     timestamptz not null default now()
);

create table approval_log (
  id_log         bigint generated always as identity primary key,
  id_detail_kpi  varchar(10) not null references detail_kpi(id_detail_kpi),
  npk            varchar(10) not null references karyawan(npk),
  level          varchar(10) not null check (level in ('L1','FINAL')),
  aksi           varchar(10) not null check (aksi in ('APPROVE','REJECT')),
  catatan        text,
  tanggal        timestamptz not null default now()
);

-- Reject wajib ada catatan
alter table approval_log add constraint ck_reject_catatan
  check (aksi <> 'REJECT' or coalesce(trim(catatan),'') <> '');

-- Index untuk performa
create index idx_detail_kpi_kpi  on detail_kpi(id_kpi);
create index idx_detail_kpi_pic  on detail_kpi(npk_pic);
create index idx_detail_status   on detail_kpi(status);
create index idx_upload_detail   on upload_file(id_detail_kpi);
create index idx_log_detail      on approval_log(id_detail_kpi);

-- =========================================================
-- BAGIAN 4: DISABLE ROW LEVEL SECURITY (Penting!)
-- Agar anon/publishable key bisa baca & tulis data
-- =========================================================
alter table karyawan              disable row level security;
alter table kpi                   disable row level security;
alter table kpi_penanggung_jawab  disable row level security;
alter table detail_kpi            disable row level security;
alter table upload_file           disable row level security;
alter table approval_log          disable row level security;

-- =========================================================
-- BAGIAN 5: SEED DATA (Password semua: password123)
-- Kata sandi disimpan sebagai plain text karena bcrypt
-- diverifikasi di sisi frontend (bcryptjs)
-- =========================================================
insert into karyawan (npk, nama_karyawan, gender, bagian, role, username, password, status_aktif) values
('K001', 'Dr. Hendra Kusuma, M.T.',        'Laki-laki',  'Program Studi Teknik Informatika', 'KAPROD',       'kaprod',  'password123', true),
('S001', 'Siti Aminah, S.Kom., M.Cs.',     'Perempuan',  'Program Studi Teknik Informatika', 'SEKPROD',      'sekprod', 'password123', true),
('U001', 'Bambang Sudarsono, S.T.',         'Laki-laki',  'UPT Laboratorium Komputer',        'KAUPT',        'kaupt',   'password123', true),
('P001', 'Rian Pratama, S.Tr.Kom.',         'Laki-laki',  'Lab Rekayasa Perangkat Lunak',     'PIC_ACTIVITY', 'pic',     'password123', true),
('P002', 'Dewi Lestari, A.Md.Kom.',         'Perempuan',  'Lab Jaringan Komputer',            'PIC_ACTIVITY', 'pic2',    'password123', true)
on conflict (npk) do nothing;

-- =========================================================
-- BAGIAN 6: SAMPLE KPI DATA
-- =========================================================
insert into kpi (id_kpi, nama_kpi, persentase_bobot, persentase_progres, level, kategori, periode, status, dibuat_oleh)
values
  ('KPI0000001', 'Peningkatan Mutu Pembelajaran', 100.00, 0, 'Prodi',  'Akademik',       '2026', 'PUBLISHED', 'K001'),
  ('KPI0000002', 'Pengembangan Laboratorium',      100.00, 0, 'UPT',   'Infrastruktur',  '2026', 'PUBLISHED', 'K001'),
  ('KPI0000003', 'Riset & Publikasi Dosen',        100.00, 0, 'Prodi', 'Penelitian',     '2026', 'DRAFT',     'K001')
on conflict (id_kpi) do nothing;

-- Reset sequence agar tidak bentrok
select setval('seq_kpi', 3);

-- Penanggungjawab KPI
insert into kpi_penanggung_jawab (id_kpi, npk) values
  ('KPI0000001', 'S001'),
  ('KPI0000002', 'U001')
on conflict do nothing;

-- Detail aktivitas untuk KPI 1
insert into detail_kpi (id_detail_kpi, id_kpi, dibuat_oleh, nama_aktivitas_kpi, persentase_bobot, deadline, status) values
  ('DKP0000001', 'KPI0000001', 'S001', 'Revisi & Pembaruan Kurikulum Prodi',   60.00, '2026-12-31', 'OPEN'),
  ('DKP0000002', 'KPI0000001', 'S001', 'Workshop Peningkatan Kompetensi Dosen', 40.00, '2026-11-30', 'OPEN')
on conflict (id_detail_kpi) do nothing;

-- Detail aktivitas untuk KPI 2
insert into detail_kpi (id_detail_kpi, id_kpi, dibuat_oleh, nama_aktivitas_kpi, persentase_bobot, deadline, status) values
  ('DKP0000003', 'KPI0000002', 'U001', 'Pengadaan Peralatan Lab Jaringan',    50.00, '2026-10-31', 'OPEN'),
  ('DKP0000004', 'KPI0000002', 'U001', 'Pemeliharaan Server & Infrastruktur', 50.00, '2026-12-15', 'OPEN')
on conflict (id_detail_kpi) do nothing;

select setval('seq_detail_kpi', 4);

-- =========================================================
-- BAGIAN 7: VERIFIKASI
-- =========================================================
select 'karyawan' as tabel, count(*) as jumlah from karyawan
union all select 'kpi',        count(*) from kpi
union all select 'kpi_pj',     count(*) from kpi_penanggung_jawab
union all select 'detail_kpi', count(*) from detail_kpi;

