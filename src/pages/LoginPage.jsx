import React, { useState } from 'react';
import { ChartColumn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/constants';
import { Notice } from '../components/common/Notice';

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

const FLOW = [
  { role: 'Staf', text: 'Mengisi realisasi KPI tiap periode dan melampirkan bukti.' },
  { role: 'Supervisor', text: 'Memvalidasi data, menganalisis KPI merah, lalu menyusun laporan.' },
  { role: 'Manajemen', text: 'Membaca laporan dan memberi keputusan atau arahan.' },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError('Isi email dulu, lalu pilih "Lupa kata sandi?" lagi.');
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.success) setInfo(`Tautan atur ulang kata sandi sudah dikirim ke ${email.trim()}.`);
    else setError(result.error);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <section className="relative flex flex-col bg-astra-navy px-6 py-8 text-white sm:px-10 lg:w-[46%] lg:justify-between lg:px-14 lg:py-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-astra-600">
            <ChartColumn className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold">KPI Monitor</span>
            <span className="block text-xs text-slate-400">Pelaporan ke manajemen</span>
          </span>
        </div>

        <div className="mt-8 max-w-md lg:mt-0">
          <h1 className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
            Capaian KPI tim, dari input staf sampai keputusan manajemen.
          </h1>
          <ol className="mt-10 hidden space-y-0 lg:block">
            {FLOW.map((step, i) => (
              <li key={step.role} className="relative flex gap-4 pb-7 last:pb-0">
                {i < FLOW.length - 1 && (
                  <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-white/15" aria-hidden="true" />
                )}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold tabular-nums text-slate-200">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-white">{step.role}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-slate-400 lg:block">Manajemen Informatika, Politeknik Astra</p>
      </section>

      <section className="flex flex-1 items-start justify-center px-6 py-10 sm:px-10 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
          <p className="mt-1 text-slate-500">Menu yang tampil mengikuti peran akun Anda.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {error && <Notice type="error">{error}</Notice>}
            {info && <Notice type="success">{info}</Notice>}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
                className="field h-11"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Kata sandi
                </label>
                <button type="button" onClick={handleForgot} className="link text-[13px]">
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary btn-lg w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Memeriksa akun…' : 'Masuk'}
            </button>
          </form>

          {SHOW_DEMO && (
            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm font-medium text-slate-700">Akun demo</p>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Pilih salah satu untuk mengisi form. Kata sandi semua akun: {DEMO_PASSWORD}
              </p>
              <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
                {DEMO_ACCOUNTS.map((acc) => {
                  const selected = email === acc.email;
                  return (
                    <li key={acc.email}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword(DEMO_PASSWORD);
                        }}
                        aria-pressed={selected}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors first:rounded-t-md last:rounded-b-md ${
                          selected ? 'bg-astra-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{acc.name}</span>
                          <span className="block truncate text-[13px] text-slate-500">{acc.email}</span>
                        </span>
                        <span className={`shrink-0 text-[13px] ${selected ? 'font-medium text-astra-700' : 'text-slate-500'}`}>
                          {acc.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
