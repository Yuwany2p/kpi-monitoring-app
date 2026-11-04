-- Data Seed for H2
INSERT INTO karyawan (npk, nama_karyawan, gender, bagian, role, username, password, status_aktif) VALUES
('K001','Kaprod Contoh','Laki-laki','Prodi','KAPROD','kaprod','$2a$10$2gUwluuGmpxA95yDJoE6Te5TP4gUEg73CqIEYkJY77b4Zf.5cU.2y', true),
('S001','Sekprod Contoh','Perempuan','Prodi','SEKPROD','sekprod','$2a$10$2gUwluuGmpxA95yDJoE6Te5TP4gUEg73CqIEYkJY77b4Zf.5cU.2y', true),
('U001','Kaupt Contoh','Laki-laki','UPT','KAUPT','kaupt','$2a$10$2gUwluuGmpxA95yDJoE6Te5TP4gUEg73CqIEYkJY77b4Zf.5cU.2y', true),
('P001','PIC Contoh','Perempuan','Prodi','PIC_ACTIVITY','pic','$2a$10$2gUwluuGmpxA95yDJoE6Te5TP4gUEg73CqIEYkJY77b4Zf.5cU.2y', true);

INSERT INTO kpi (id_kpi, nama_kpi, persentase_bobot, persentase_progres, level, kategori, periode, status, dibuat_oleh)
VALUES ('KPI0000001', 'Peningkatan Mutu Pembelajaran', 100.00, 0.00, 'Prodi', 'Akademik', '2026', 'PUBLISHED', 'K001');

INSERT INTO kpi_penanggung_jawab (id_kpi, npk) VALUES
('KPI0000001', 'S001'),
('KPI0000001', 'U001');

INSERT INTO detail_kpi (id_detail_kpi, id_kpi, dibuat_oleh, nama_aktivitas_kpi, persentase_bobot, persentase_progres, deadline, status) VALUES
('DKP0000001', 'KPI0000001', 'S001', 'Revisi kurikulum', 60.00, 0.00, DATE '2026-12-31', 'OPEN'),
('DKP0000002', 'KPI0000001', 'S001', 'Workshop dosen', 40.00, 0.00, DATE '2026-11-30', 'OPEN');

