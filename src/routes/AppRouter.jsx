import React, { lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SetupRequiredPage } from '../pages/SetupRequiredPage';

// Halaman dimuat saat dibuka (code splitting) agar pemuatan awal cepat
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const Dashboard = named(() => import('../pages/Dashboard'), 'Dashboard');
const MasterKpiPage = named(() => import('../pages/MasterKpiPage'), 'MasterKpiPage');
const ValidasiDataPage = named(() => import('../pages/ValidasiDataPage'), 'ValidasiDataPage');
const AnalisisTindakLanjutPage = named(() => import('../pages/AnalisisTindakLanjutPage'), 'AnalisisTindakLanjutPage');
const LaporanKpiPage = named(() => import('../pages/LaporanKpiPage'), 'LaporanKpiPage');
const ReviewLaporanPage = named(() => import('../pages/ReviewLaporanPage'), 'ReviewLaporanPage');
const InputCapaianStafPage = named(() => import('../pages/InputCapaianStafPage'), 'InputCapaianStafPage');
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { ROLES } from '../lib/constants';

const { SUPERVISOR, STAF, MANAJEMEN } = ROLES;

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm gap-2">
    <Loader2 className="w-5 h-5 animate-spin text-astra-700" /> Memuat sesi...
  </div>
);

/** Hanya untuk pengguna yang sudah login & profilnya valid. */
const RequireAuth = ({ children }) => {
  const { session, isAuthenticated, loading, profileError, logout } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 text-sm space-y-4">
          <p className="font-bold text-slate-900">Profil pengguna tidak dapat dimuat</p>
          <p className="text-slate-600">{profileError}</p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <FullScreenLoader />;
  return children;
};

/** Batasi halaman per role; role lain diarahkan ke dashboard. */
const RoleRoute = ({ roles, children }) => {
  const { role } = useAuth();
  if (!roles.includes(role)) return <Navigate to="/" replace />;
  return children;
};

const LoginRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <LoginPage />;
};

export const AppRouter = () => {
  if (!isSupabaseConfigured) return <SetupRequiredPage />;

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Supervisor & Manajemen */}
        <Route
          path="kelola-kpi"
          element={
            <RoleRoute roles={[SUPERVISOR, MANAJEMEN]}>
              <MasterKpiPage />
            </RoleRoute>
          }
        />

        {/* Supervisor */}
        <Route
          path="validasi"
          element={
            <RoleRoute roles={[SUPERVISOR]}>
              <ValidasiDataPage />
            </RoleRoute>
          }
        />
        <Route
          path="analisis-tindak-lanjut"
          element={
            <RoleRoute roles={[SUPERVISOR]}>
              <AnalisisTindakLanjutPage />
            </RoleRoute>
          }
        />
        <Route
          path="laporan-kpi"
          element={
            <RoleRoute roles={[SUPERVISOR]}>
              <LaporanKpiPage />
            </RoleRoute>
          }
        />

        {/* Staf */}
        <Route
          path="input-capaian"
          element={
            <RoleRoute roles={[STAF]}>
              <InputCapaianStafPage />
            </RoleRoute>
          }
        />
        <Route
          path="riwayat-pengajuan"
          element={
            <RoleRoute roles={[STAF]}>
              <InputCapaianStafPage historyOnly />
            </RoleRoute>
          }
        />
        <Route
          path="tindak-lanjut-staf"
          element={
            <RoleRoute roles={[STAF]}>
              <AnalisisTindakLanjutPage />
            </RoleRoute>
          }
        />

        {/* Manajemen */}
        <Route
          path="review-laporan"
          element={
            <RoleRoute roles={[MANAJEMEN]}>
              <ReviewLaporanPage />
            </RoleRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
