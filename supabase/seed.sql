-- =========================================
-- SEED DATA (password semua: password123)
-- =========================================
insert into karyawan (npk, nama_karyawan, gender, bagian, role, username, password) values
('K001','Kaprod Contoh','Laki-laki','Prodi','KAPROD','kaprod',     extensions.crypt('password123', extensions.gen_salt('bf'))),
('S001','Sekprod Contoh','Perempuan','Prodi','SEKPROD','sekprod',   extensions.crypt('password123', extensions.gen_salt('bf'))),
('U001','Kaupt Contoh','Laki-laki','UPT','KAUPT','kaupt',           extensions.crypt('password123', extensions.gen_salt('bf'))),
('P001','PIC Contoh','Perempuan','Prodi','PIC_ACTIVITY','pic',      extensions.crypt('password123', extensions.gen_salt('bf')))
on conflict (npk) do nothing;

insert into kpi (nama_kpi, persentase_bobot, level, kategori, periode, status, dibuat_oleh)
values ('Peningkatan Mutu Pembelajaran', 100, 'Prodi', 'Akademik', '2026', 'PUBLISHED', 'K001')
on conflict (id_kpi) do nothing;

insert into kpi_penanggung_jawab (id_kpi, npk)
select id_kpi, 'S001' from kpi where nama_kpi = 'Peningkatan Mutu Pembelajaran'
on conflict do nothing;

insert into detail_kpi (id_kpi, dibuat_oleh, nama_aktivitas_kpi, persentase_bobot, deadline)
select id_kpi, 'S001', a.nama, a.bobot, a.dl
from kpi,
  (values ('Revisi kurikulum', 60, date '2026-12-31'),
          ('Workshop dosen',   40, date '2026-11-30')) as a(nama, bobot, dl)
where kpi.nama_kpi = 'Peningkatan Mutu Pembelajaran'
on conflict (id_detail_kpi) do nothing;

