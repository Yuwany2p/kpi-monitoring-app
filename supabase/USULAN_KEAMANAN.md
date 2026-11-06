# Usulan perbaikan keamanan (perlu persetujuan tim)

Dokumen ini hanya usulan. Belum ada perubahan apa pun di database Supabase
`uwxwxvpunrefywjdialr`. Semua langkah di bawah mengubah database bersama, jadi
jalankan setelah tim setuju dan setelah membuat backup.

## Masalah yang ditemukan

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | RLS dimatikan di semua tabel (`SETUP_SUPABASE.sql` baris 112–117) | Siapa pun yang memegang publishable key (key ini memang terkirim ke browser) bisa membaca, mengubah, dan menghapus semua data, termasuk mengganti `role` karyawan menjadi `KAPROD`. |
| 2 | `login.html` mengambil baris `karyawan` lengkap dengan kolom `password`, lalu membandingkan hash di browser | Hash password semua akun bisa diunduh siapa saja. Jika hash tidak berformat bcrypt, password dibandingkan sebagai teks biasa. |
| 3 | Sesi hanya disimpan di `localStorage` (`kpi_user`) | Role bisa dipalsukan dengan mengedit `localStorage`, karena server tidak pernah memeriksa siapa yang meminta data. |
| 4 | `.env` berisi key project lain ikut ter-commit | Tidak dipakai aplikasi native. Sudah dikeluarkan dari index git dan ditambahkan ke `.gitignore`. |

Yang **sudah** diperbaiki di sisi frontend (tanpa mengubah database):
- Semua data dari database di-escape sebelum masuk ke HTML (mencegah XSS lewat nama KPI, aktivitas, karyawan).
- Tautan unduh berkas hanya menerima `data:` atau `http(s):`, jadi `javascript:` URL tidak bisa dijalankan.
- Input login dibatasi ke karakter `A-Z a-z 0-9 . _ @ -` supaya tidak bisa menyisipkan filter tambahan ke query `.or(...)`.
- Pesan login salah disatukan ("Username/NPK atau kata sandi salah") supaya tidak membocorkan username yang terdaftar.

Masalah 1–3 **tidak bisa** diselesaikan dari frontend saja.

## Opsi A: perbaikan cepat (tetap pakai login sendiri)

Menghentikan kebocoran hash password. Masalah 1 dan 3 masih ada, karena semua
permintaan tetap anonim.

```sql
-- 1. Fungsi login di server: password dicek di database, hash tidak pernah dikirim
create or replace function public.login_karyawan(p_login text, p_password text)
returns table (npk varchar, nama_karyawan varchar, role varchar, bagian varchar, gender varchar, username varchar)
language sql security definer set search_path = public, extensions as $$
  select k.npk, k.nama_karyawan, k.role, k.bagian, k.gender, k.username
  from karyawan k
  where (k.username = p_login or k.npk = p_login)
    and k.status_aktif = true
    and k.password = crypt(p_password, k.password)
  limit 1;
$$;
grant execute on function public.login_karyawan(text, text) to anon;

-- 2. Kolom password tidak bisa dibaca lewat API
revoke select (password) on karyawan from anon, authenticated;
```

Perubahan di `login.html`: ganti query `.from('karyawan').select('*')` dan
pengecekan bcryptjs dengan:

```js
const { data, error } = await kpiDb.rpc('login_karyawan', { p_login: loginInput, p_password: pwdInput });
```

Catatan: `supabase-app.js` memakai `select('*')` pada tabel `karyawan` di beberapa
tempat. Setelah langkah 2, query itu harus menyebut kolom satu per satu (tanpa
`password`).

## Opsi B: perbaikan menyeluruh (disarankan untuk produksi)

1. Buat akun Supabase Auth untuk setiap karyawan (misalnya `username@kpi.astratech.local`),
   tambahkan kolom `karyawan.auth_id uuid references auth.users`.
2. Login memakai `supabase.auth.signInWithPassword(...)`. Sesi dikelola Supabase,
   bukan `localStorage` buatan sendiri.
3. Nyalakan RLS di semua tabel, dengan policy berdasarkan role pengguna yang login. Contoh:

```sql
alter table kpi enable row level security;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from karyawan where auth_id = auth.uid()
$$;

create policy kpi_baca on kpi for select to authenticated using (true);
create policy kpi_kelola on kpi for all to authenticated
  using (public.my_role() = 'KAPROD') with check (public.my_role() = 'KAPROD');
```

4. Hapus kolom `karyawan.password` setelah semua akun pindah ke Supabase Auth.

Opsi B mengubah alur login dan butuh pengujian ulang semua peran, jadi sebaiknya
dikerjakan terpisah dan disepakati tim.
