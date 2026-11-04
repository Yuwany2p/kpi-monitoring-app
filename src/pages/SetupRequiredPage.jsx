import React from 'react';

const Code = ({ children }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">{children}</code>;

/** Muncul jika .env belum berisi kredensial Supabase. */
export const SetupRequiredPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
    <div className="card w-full max-w-lg p-8">
      <h1 className="text-xl font-semibold">Supabase belum dikonfigurasi</h1>
      <p className="mt-2 text-slate-600">Aplikasi butuh koneksi ke database Supabase sebelum bisa dipakai.</p>
      <ol className="mt-5 list-decimal space-y-2.5 pl-5 text-slate-700">
        <li>
          Salin <Code>.env.example</Code> menjadi <Code>.env</Code>.
        </li>
        <li>
          Isi <Code>VITE_SUPABASE_URL</Code> dan <Code>VITE_SUPABASE_ANON_KEY</Code> dari Supabase Dashboard, menu
          Project Settings, API.
        </li>
        <li>
          Jalankan <Code>supabase/schema.sql</Code> lalu <Code>supabase/seed.sql</Code> di SQL Editor.
        </li>
        <li>
          Hentikan lalu jalankan ulang <Code>npm run dev</Code>.
        </li>
      </ol>
    </div>
  </div>
);
