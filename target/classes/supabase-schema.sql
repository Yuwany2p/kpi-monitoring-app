-- =========================================
-- 1. TABEL & SEQUENCE
-- =========================================
create sequence if not exists seq_kpi start 1;
create sequence if not exists seq_detail_kpi start 1;
create sequence if not exists seq_upload start 1;

create table if not exists karyawan (
  npk            varchar(10) primary key,
  nama_karyawan  varchar(100) not null,
  gender         varchar(25),
  bagian         varchar(100),
  role           varchar(20) not null
                 check (role in ('KAPROD','SEKPROD','KAUPT','PIC_ACTIVITY')),
  username       varchar(50) not null unique,
  password       varchar(100) not null,           -- BCrypt
  status_aktif   boolean not null default true
);

create table if not exists kpi (
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

create table if not exists kpi_penanggung_jawab (
  id_kpi  varchar(10) not null references kpi(id_kpi),
  npk     varchar(10) not null references karyawan(npk),
  primary key (id_kpi, npk)
);

create table if not exists detail_kpi (
  id_detail_kpi      varchar(10) primary key
                     default 'DKP' || lpad(nextval('seq_detail_kpi')::text, 7, '0'),
  id_kpi             varchar(10) not null references kpi(id_kpi),
  npk_pic            varchar(10) references karyawan(npk),      -- nullable, terisi saat di-pick
  dibuat_oleh        varchar(10) not null references karyawan(npk),
  nama_aktivitas_kpi varchar(250) not null,
  persentase_bobot   numeric(5,2) not null check (persentase_bobot between 0 and 100),
  persentase_progres numeric(5,2) not null default 0 check (persentase_progres between 0 and 100),
  deadline           date,
  status             varchar(20) not null default 'OPEN'
                     check (status in ('OPEN','PICKED','SUBMITTED','REVISION','APPROVED_L1','DONE'))
);

create table if not exists upload_file (
  id_upload          varchar(10) primary key
                     default 'UPL' || lpad(nextval('seq_upload')::text, 7, '0'),
  id_detail_kpi      varchar(10) not null references detail_kpi(id_detail_kpi),
  nama_file          varchar(100),
  path               varchar(100),
  persentase_progres numeric(5,2) not null check (persentase_progres between 0 and 100),
  catatan            text,
  tanggal_upload     timestamptz not null default now()
);

create table if not exists approval_log (
  id_log         bigint generated always as identity primary key,
  id_detail_kpi  varchar(10) not null references detail_kpi(id_detail_kpi),
  npk            varchar(10) not null references karyawan(npk),
  level          varchar(10) not null check (level in ('L1','FINAL')),
  aksi           varchar(10) not null check (aksi in ('APPROVE','REJECT')),
  catatan        text,
  tanggal        timestamptz not null default now()
);

-- Reject wajib catatan
alter table approval_log drop constraint if exists ck_reject_catatan;
alter table approval_log add constraint ck_reject_catatan
  check (aksi <> 'REJECT' or coalesce(trim(catatan),'') <> '');

-- Index FK
create index if not exists idx_detail_kpi_kpi  on detail_kpi(id_kpi);
create index if not exists idx_detail_kpi_pic  on detail_kpi(npk_pic);
create index if not exists idx_detail_status   on detail_kpi(status);
create index if not exists idx_upload_detail   on upload_file(id_detail_kpi);
create index if not exists idx_log_detail      on approval_log(id_detail_kpi);

-- =========================================
-- 2. PERHITUNGAN OTOMATIS PROGRES
-- =========================================
create or replace function fn_set_progres_done() returns trigger as $$
begin
  if new.status = 'DONE' and old.status is distinct from 'DONE' then
    select persentase_progres into new.persentase_progres
    from upload_file
    where id_detail_kpi = new.id_detail_kpi
    order by tanggal_upload desc
    limit 1;
    new.persentase_progres := coalesce(new.persentase_progres, 0);
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_set_progres_done on detail_kpi;
create trigger trg_set_progres_done
before update of status on detail_kpi
for each row execute function fn_set_progres_done();

create or replace function fn_recalc_kpi() returns trigger as $$
declare v_kpi varchar(10);
begin
  v_kpi := coalesce(new.id_kpi, old.id_kpi);
  update kpi set persentase_progres = coalesce((
    select round(sum(persentase_bobot * persentase_progres) / 100, 2)
    from detail_kpi
    where id_kpi = v_kpi and status = 'DONE'
  ), 0)
  where id_kpi = v_kpi;
  return null;
end $$ language plpgsql;

drop trigger if exists trg_recalc_kpi on detail_kpi;
create trigger trg_recalc_kpi
after insert or update or delete on detail_kpi
for each row execute function fn_recalc_kpi();

create or replace function fn_total_bobot(p_id_kpi varchar)
returns numeric as $$
  select coalesce(sum(persentase_bobot), 0) from detail_kpi where id_kpi = p_id_kpi;
$$ language sql stable;

-- =========================================
-- 3. KEAMANAN RLS
-- =========================================
alter table karyawan              enable row level security;
alter table kpi                   enable row level security;
alter table kpi_penanggung_jawab  enable row level security;
alter table detail_kpi            enable row level security;
alter table upload_file           enable row level security;
alter table approval_log          enable row level security;

