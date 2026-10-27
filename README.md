# Sistem Monitoring KPI dan Pelaporan ke Manajemen

Website untuk supervisor memantau capaian KPI tim, memvalidasi data capaian staf,
menganalisis penyimpangan, menyusun action plan, dan melaporkan hasilnya ke manajemen.

**Stack:** React 19 + Vite + Tailwind CSS · Supabase (PostgreSQL, Auth, Storage, RLS)

## Menjalankan

1. Buat project di [Supabase](https://supabase.com).
2. Buka **SQL Editor**, jalankan `supabase/schema.sql`, lalu `supabase/seed.sql` (data demo).
3. Salin `.env.example` menjadi `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
4. ```bash
   npm install
   npm run dev
   ```

### Akun demo (dari `seed.sql`, password `password123`)

| Email | Role |
| --- | --- |
| maya@perusahaan.co.id | Manajemen |
| hendra@perusahaan.co.id | Supervisor (Tim Customer Service) |
| andi@, sari@, budi@, dewi@, rina@perusahaan.co.id | Staf |

Akun baru bisa dibuat di Supabase → Authentication → Add user. Profil dibuat otomatis
dengan role `staf`; ubah role/tim lewat tabel `profiles` dan isi `teams.supervisor_id`
untuk supervisor tim.

## Alur

1. **Supervisor/Manajemen** mengelola indikator KPI dan target per staf per periode.
2. **Staf** mengisi realisasi (bisa disimpan sebagai draft), melampirkan bukti, lalu mengajukan.
3. **Supervisor** memvalidasi: setujui atau tolak dengan catatan (staf memperbaiki & mengajukan ulang).
4. Saat disetujui, database menghitung capaian otomatis (trigger):
   - Capaian = Realisasi ÷ Target × 100% (arah *semakin rendah semakin baik*: Target ÷ Realisasi)
   - Hijau ≥ 100%, Kuning 80–99%, Merah < 80%
5. **Supervisor** memantau dashboard & tren, mencatat analisis penyebab, dan membuat action plan.
6. **Supervisor** menyusun laporan periodik, ekspor PDF/Excel, lalu mengirim ke manajemen.
7. **Manajemen** mereview: setujui, minta revisi, atau tetapkan tindak lanjut khusus.

## Struktur

```
supabase/
  schema.sql        tabel, enum, trigger, view v_kpi_results, RLS, storage bucket
  seed.sql          data demo
src/
  context/          AuthContext (Supabase Auth), FilterContext (periode & tim)
  services/         supabaseService.js — semua query ke Supabase
  lib/              rumus capaian, agregasi KPI, isi & ekspor laporan
  pages/            halaman per fitur (lihat routes/AppRouter.jsx untuk hak akses)
```

## Keamanan

- Semua halaman (kecuali login) butuh sesi Supabase Auth; halaman dibatasi per role di router.
- Hak akses data dijaga **Row Level Security**: staf hanya melihat datanya sendiri, supervisor
  hanya tim yang dipimpinnya, manajemen melihat seluruh tim. Supervisor tidak bisa mengubah
  nilai realisasi, staf tidak bisa memvalidasi datanya sendiri.
- File bukti & laporan disimpan di bucket privat dan dibuka lewat signed URL.
