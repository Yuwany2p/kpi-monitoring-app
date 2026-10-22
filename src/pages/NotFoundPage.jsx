import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" icon={Home}>
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
