import React, { useState } from 'react';
import { ChartColumn, Loader2 } from 'lucide-react';
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
    if (!result.success) setError(result.error);
    setSubmitting(false);
  };

  const handleForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Isi email Anda dulu, lalu klik "Lupa kata sandi?".');
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.success) setInfo(`Tautan untuk mengatur ulang kata sandi sudah dikirim ke ${email.trim()}.`);
    else setError(result.error);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <section className="flex flex-col justify-center bg-gradient-to-br from-astra-900 to-astra-600 px-8 py-12 text-white sm:px-12 lg:w-[57%] lg:px-20">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-astra-500">
              <ChartColumn className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold">KPI Monitor</span>
          </div>
          <h1 className="mt-10 text-4xl font-bold leading-tight sm:text-5xl">
            Pantau kinerja tim, laporkan dengan yakin.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-astra-100">
            Monitoring KPI dan pelaporan ke manajemen dalam satu tempat: dari input capaian sampai review manajemen.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-slate-900">Masuk</h2>
          <p className="mt-1 text-base text-slate-500">Gunakan akun yang sudah didaftarkan.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate={false}>
            {error && <Notice type="error">{error}</Notice>}
            {info && <Notice type="success">{info}</Notice>}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
                className="field py-3 text-base"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Kata sandi</label>
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-sm font-semibold text-astra-600 hover:text-astra-800 cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field py-3 text-base"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Masuk
            </button>

            <p className="text-center text-sm text-slate-500">
              Peran (Manajemen, Supervisor, Staf) mengikuti akun Anda.
            </p>
          </form>

          {SHOW_DEMO && (
            <div className="mt-10 border-t border-slate-200 pt-5">
              <p className="text-sm text-slate-500">
                Akun demo, kata sandi <span className="font-semibold text-slate-700">{DEMO_PASSWORD}</span>:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                      email === acc.email
                        ? 'border-astra-600 bg-astra-50 font-semibold text-astra-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
