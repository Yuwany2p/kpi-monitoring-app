import React from 'react';
import { Database } from 'lucide-react';

/** Ditampilkan jika .env belum berisi kredensial Supabase. */
export const SetupRequiredPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-astra-800 text-white flex items-center justify-center">
          <Database className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Supabase belum dikonfigurasi</h1>
      </div>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
        <li>
          Salin <code className="px-1 bg-slate-100 rounded">.env.example</code> menjadi{' '}
          <code className="px-1 bg-slate-100 rounded">.env</code>.
        </li>
        <li>
          Isi <code className="px-1 bg-slate-100 rounded">VITE_SUPABASE_URL</code> dan{' '}
          <code className="px-1 bg-slate-100 rounded">VITE_SUPABASE_ANON_KEY</code> dari Supabase
          Dashboard → Project Settings → API.
        </li>
        <li>
          Jalankan <code className="px-1 bg-slate-100 rounded">supabase/schema.sql</code> lalu{' '}
          <code className="px-1 bg-slate-100 rounded">supabase/seed.sql</code> di SQL Editor.
        </li>
        <li>
          Restart <code className="px-1 bg-slate-100 rounded">npm run dev</code>.
        </li>
      </ol>
    </div>
  </div>
);
