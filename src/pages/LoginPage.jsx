import React, { useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/constants';
import { Notice } from '../components/common/Notice';

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const { login, resetPassword } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const result = await login(email.trim(), password);
    // Jika sukses, LoginRoute otomatis mengarahkan ke dashboard
    if (!result.success) setError(result.error);
    setSubmitting(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Isi email terlebih dahulu, lalu klik "Lupa kata sandi?".');
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.success) setInfo(`Tautan reset kata sandi dikirim ke ${email.trim()}.`);
    else setError(result.error);
  };

  const handleSelectDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="lg:w-1/2 bg-astra-900 text-white p-8 sm:p-12 lg:p-20 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-astra-800/40 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-astra-600/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-astra-500/20 backdrop-blur-sm border border-astra-400/30 flex items-center justify-center text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">KPI Monitor</span>
        </div>

        <div className="relative z-10 my-16 lg:my-0 max-w-lg">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Pantau kinerja tim, laporkan dengan yakin.
          </h1>
          <p className="text-astra-100 text-base sm:text-lg mt-6 leading-relaxed">
            Monitoring KPI dan pelaporan ke manajemen dalam satu tempat: dari input capaian sampai review manajemen.
          </p>
        </div>

        <div className="relative z-10 text-xs text-astra-300">
          <p>© 2026 Politeknik Astra · Sistem Monitoring KPI</p>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="w-full max-w-md">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Masuk</h2>
          <p className="text-sm text-slate-500 mt-1 mb-8">Gunakan akun yang sudah didaftarkan.</p>

          {SHOW_DEMO && (
            <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <p className="font-semibold text-slate-700 mb-2">Akun demo (password: {DEMO_PASSWORD})</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemo(acc.email)}
                    className={`p-2 rounded-lg text-left transition-colors border cursor-pointer ${
                      email === acc.email
                        ? 'bg-astra-50 border-astra-500 text-astra-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <p className="truncate text-[11px]">{acc.label}</p>
                    <p className="truncate font-medium text-[10px] text-slate-400">{acc.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Notice type="error">{error}</Notice>
            <Notice type="success">{info}</Notice>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-astra-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata sandi</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-astra-600 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-end text-xs">
              <a href="#forgot" onClick={handleForgot} className="text-astra-800 hover:text-astra-900 font-semibold">
                Lupa kata sandi?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-astra-800 hover:bg-astra-900 disabled:opacity-60 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-astra-800/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Masuk
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Peran (Manajemen, Supervisor, Staf) mengikuti akun Anda.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
