import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Dashboard } from '../pages/Dashboard';
import { MasterKpiPage } from '../pages/MasterKpiPage';
import { MasterKaryawanPage } from '../pages/MasterKaryawanPage';
import { RealisasiPage } from '../pages/RealisasiPage';
import { AnalisisMasalahPage } from '../pages/AnalisisMasalahPage';
import { LaporanManajemenPage } from '../pages/LaporanManajemenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="master-kpi" element={<MasterKpiPage />} />
        <Route path="master-karyawan" element={<MasterKaryawanPage />} />
        <Route path="realisasi" element={<RealisasiPage />} />
        <Route path="analisis-masalah" element={<AnalisisMasalahPage />} />
        <Route path="laporan" element={<LaporanManajemenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
