import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { LoginPage } from '../pages/LoginPage';
import { Dashboard } from '../pages/Dashboard';
import { MasterKpiPage } from '../pages/MasterKpiPage';
import { ValidasiDataPage } from '../pages/ValidasiDataPage';
import { AnalisisTindakLanjutPage } from '../pages/AnalisisTindakLanjutPage';
import { LaporanKpiPage } from '../pages/LaporanKpiPage';
import { ReviewLaporanPage } from '../pages/ReviewLaporanPage';
import { InputCapaianStafPage } from '../pages/InputCapaianStafPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<Layout />}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Supervisor Pages */}
        <Route path="kelola-kpi" element={<MasterKpiPage />} />
        <Route path="validasi" element={<ValidasiDataPage />} />
        <Route path="analisis-tindak-lanjut" element={<AnalisisTindakLanjutPage />} />
        <Route path="laporan-kpi" element={<LaporanKpiPage />} />

        {/* Staf Pages */}
        <Route path="input-capaian" element={<InputCapaianStafPage />} />
        <Route path="riwayat-pengajuan" element={<InputCapaianStafPage />} />
        <Route path="tindak-lanjut-staf" element={<AnalisisTindakLanjutPage />} />

        {/* Manajemen Pages */}
        <Route path="review-laporan" element={<ReviewLaporanPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
