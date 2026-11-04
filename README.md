<<<<<<< HEAD
# Sistem Monitoring KPI dan Pelaporan ke Manajemen

Website untuk supervisor memantau capaian KPI tim, memvalidasi data capaian staf,
menganalisis penyimpangan, menyusun action plan, dan melaporkan hasilnya ke manajemen.

**Stack:** React 19, Vite, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage, RLS)

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
=======
# Sistem Manajemen KPI Prodi / UPT

Aplikasi web modern berbasis **Spring Boot 3**, **Thymeleaf**, **Spring Security**, dan **Supabase PostgreSQL**, dilengkapi dengan antarmuka responsif **Spark Admin (Tema Biru Navy / Corporate Navy Blue)** dan **Bootstrap Table**.

---

## 1. Daftar Akun Pengguna Bawaan (Seed Data)

Semua akun pengujian di bawah ini menggunakan kata sandi: **`password123`**

| Role | Username / NPK | Nama Karyawan | Hak Akses Utama |
|---|---|---|---|
| **KAPROD** | `kaprod` / `K001` | Kaprod Contoh | Kelola Karyawan (CRUD), Buat Header KPI, Approval Final |
| **SEKPROD** | `sekprod` / `S001` | Sekprod Contoh | Buat Detail Activity (pada KPI penugasan), Approval Level 1 |
| **KAUPT** | `kaupt` / `U001` | Kaupt Contoh | Buat Detail Activity (pada KPI penugasan), Approval Level 1 |
| **PIC_ACTIVITY** | `pic` / `P001` | PIC Contoh | Ambil (Pick) Aktivitas, Unggah Progres & Bukti Dukung |

> **Catatan Login**: Anda dapat masuk menggunakan **Username** ATAU **NPK** pada halaman login.

---

## 2. Konfigurasi Proyek Supabase

Proyek Supabase resmi telah diintegrasikan ke dalam konfigurasi aplikasi:
- **Project URL**: `https://uwxwxvpunrefywjdialr.supabase.co`
- **Project Reference ID**: `uwxwxvpunrefywjdialr`
- **Publishable Key**: `sb_publishable_VEE8XvstXcJ8BT9MnDcZoQ_R87xDZIt`

### A. Penggunaan Supabase CLI
Proyek ini sudah dilengkapi dengan direktori `supabase/` (`config.toml`, migrasi schema `supabase/migrations/20261102000000_init_kpi_schema.sql`, dan `supabase/seed.sql`). Anda dapat menghubungkan dan mendorong (*push*) skema ke database Supabase melalui terminal:

```bash
# 1. Login ke akun Supabase Anda
supabase login

# 2. Hubungkan proyek lokal dengan proyek cloud
supabase link --project-ref uwxwxvpunrefywjdialr

# 3. Dorong skema tabel, trigger, dan constraint ke Supabase
supabase db push
```

*Atau alternatif via Supabase Web Dashboard:*
1. Buka [Dashboard Supabase SQL Editor](https://supabase.com/dashboard/project/uwxwxvpunrefywjdialr/sql).
2. Salin isi file `src/main/resources/supabase-schema.sql` dan klik **Run**.

---

### B. Konfigurasi Koneksi Database di `application.properties`
Koneksi ke Supabase telah diatur pada `src/main/resources/application.properties`:

```properties
# Supabase Project Credentials
supabase.project-ref=uwxwxvpunrefywjdialr
supabase.url=https://uwxwxvpunrefywjdialr.supabase.co
supabase.publishable-key=sb_publishable_VEE8XvstXcJ8BT9MnDcZoQ_R87xDZIt

# Direct Connection Supabase (Port 5432)
spring.datasource.url=${DB_URL:jdbc:postgresql://db.uwxwxvpunrefywjdialr.supabase.co:5432/postgres?sslmode=require}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASSWORD:YOUR_DATABASE_PASSWORD}
```

> **Tips:** Anda dapat memasukkan kata sandi database Anda langsung pada baris `spring.datasource.password` di `application.properties` atau mengatur Environment Variable:
> - `set DB_PASSWORD=kata_sandi_database_anda` (Windows CMD)
> - `$env:DB_PASSWORD="kata_sandi_database_anda"` (PowerShell)
> - Dan jika ingin mengarahkan ke database PostgreSQL lokal:
>   `$env:DB_URL="jdbc:postgresql://localhost:5432/postgres"`

---

## 3. Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan dengan Profil Supabase (Default)
Pastikan kredensial Supabase sudah diisi di `application.properties`, lalu jalankan:
```bash
mvn spring-boot:run
```

### Opsi 2: Menjalankan Offline / Demo Lokal (H2 In-Memory)
Jika Anda belum mengonfigurasi koneksi internet atau Supabase, aplikasi dapat dijalankan secara instan dengan profil `h2`:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```
Semua tabel, constraint, dan data seed otomatis diinisialisasi secara lokal di memori. H2 Console dapat diakses di `http://localhost:8080/h2-console`.

Setelah aplikasi berjalan, buka peramban web di:
```
http://localhost:8080
```

---

## 4. Alur Bisnis (Probis) & Panduan Penggunaan

1. **Kelola Karyawan (Role: KAPROD)**:
   - Akses menu **Data Karyawan**.
   - Tambah karyawan baru, atur NPK, username, password, peran hak akses, dan status aktif.
2. **Pembuatan Header KPI (Role: KAPROD)**:
   - Masuk sebagai `kaprod`. Akses menu **Header KPI** $\rightarrow$ **Buat Header KPI Baru**.
   - Masukkan sasaran, bobot total (misal 100%), level, kategori, periode, dan pilih penanggung jawab (**SEKPROD** dan/atau **KAUPT**).
   - Ubah status menjadi **PUBLISHED** agar dapat dilihat dan dikerjakan oleh tim prodi.
3. **Penyusunan Detail Aktivitas (Role: SEKPROD / KAUPT)**:
   - Masuk sebagai `sekprod` atau `kaupt`.
   - Buka menu **Header KPI** $\rightarrow$ pilih KPI yang ditugaskan kepada Anda.
   - Tambahkan **Detail Aktivitas** (Nama kegiatan, bobot %, deadline target).
   - Sistem memiliki **Validasi Otomatis**: Total bobot akumulatif aktivitas dalam 1 KPI tidak boleh melebihi 100%, dan status pemenuhan 100% dipantau langsung secara visual.
4. **Pengambilan Aktivitas / Pick Activity (Role: PIC_ACTIVITY)**:
   - Masuk sebagai `pic`. Akses menu **Ambil Aktivitas**.
   - Pilih aktivitas yang berstatus **OPEN**, lalu klik **Ambil Aktivitas**.
   - Status berubah menjadi **PICKED** dan aktivitas masuk ke daftar **Aktivitas Saya**.
5. **Unggah Progres & Bukti Dukung (Role: PIC_ACTIVITY)**:
   - Masuk ke menu **Aktivitas Saya**.
   - Klik **Unggah Progres** pada aktivitas yang diambil.
   - Masukkan persentase progres (0-100%), catatan penjelasan, dan unggah berkas bukti (PDF, DOCX, XLSX, PNG, JPG maksimal 5 MB).
   - Status otomatis berubah menjadi **SUBMITTED** dan menunggu verifikasi.
6. **Approval Level 1 (Role: SEKPROD / KAUPT)**:
   - Masuk sebagai `sekprod` atau `kaupt`. Buka menu **Approval Level 1**.
   - Unduh dan periksa berkas bukti PIC.
   - Pilih **APPROVE** (status menjadi **APPROVED_L1**) atau **REJECT** (status kembali ke **REVISION**, wajib menyertakan catatan perbaikan).
7. **Approval Final & Auto Kalkulasi (Role: KAPROD)**:
   - Masuk sebagai `kaprod`. Buka menu **Approval Final**.
   - Tinjau aktivitas yang lolos verifikasi L1.
   - Pilih **APPROVE** (status menjadi **DONE**) atau **REJECT** (status kembali ke **REVISION**).
   - **Perhitungan Otomatis**:
     $$\text{Progres Detail KPI} = \text{Progres dari upload terakhir}$$
     $$\text{Progres Header KPI} = \frac{\sum (\text{Bobot Activity}_i \times \text{Progres Activity}_i)}{100}$$
     Persentase KPI otomatis ter-update di database dan dashboard secara *real-time*.
8. **Dashboard Monitoring**:
   - Pemantauan capaian progres per KPI secara komprehensif.
   - Peringatan aktivitas mendekati/melewati batas waktu (*Overdue Alert*).
   - Distribusi beban kerja antar PIC pelaksana.
   - Filter dinamis berdasarkan periode tahun ajaran.

---

## 5. Fitur Teknis & Keamanan

- **Spring Security 6**: Proteksi akses URL berbasis peran (Role-based access control) dan password terenkripsi BCrypt.
- **Spark Admin Navy Blue Theme**: Palet warna Biru Navy korporat modern (`#0A192F`, `#1E3A8A`, `#38BDF8`, `#F1F5F9`).
- **Bootstrap Table**: Dilengkapi fitur pencarian langsung (*instant search*), pengurutan kolom (*sorting*), dan paginasi (*pagination*).
- **SweetAlert2 & Flash Messages**: Konfirmasi pop-up interaktif sebelum penghapusan data, penolakan revisi, dan pengambilan tugas.
- **Penyimpanan Berkas Server**: File bukti dukung disimpan secara aman di direktori `uploads/` pada server lokal, dengan path tersimpan di basis data.
>>>>>>> 4f61aa7072aae1622efec69d0053b4e2fbcc32bd
