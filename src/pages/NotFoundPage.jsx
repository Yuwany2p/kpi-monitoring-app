import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <p className="text-sm font-medium tabular-nums text-slate-500">Kode 404</p>
    <h2 className="mt-2 text-xl font-semibold">Halaman tidak ditemukan</h2>
    <p className="mt-2 max-w-sm text-slate-500">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
    <Link to="/" className="btn-primary mt-6">
      Kembali ke dashboard
    </Link>
  </div>
);
