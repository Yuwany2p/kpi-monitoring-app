import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../lib/constants';

export const LoginPage = () => {
  const [email, setEmail] = useState('hendra@perusahaan.co.id');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    login(email, password);
    navigate('/');
  };

  const handleSelectDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('••••••••••••');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Column (50%): Astra Signature Blue */}
      <div className="lg:w-1/2 bg-astra-900 text-white p-8 sm:p-12 lg:p-20 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-astra-800/40 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-astra-600/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-astra-500/20 backdrop-blur-sm border border-astra-400/30 flex items-center justify-center text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">KPI Monitor</span>
        </div>

        {/* Hero Text matching mockup */}
        <div className="relative z-10 my-16 lg:my-0 max-w-lg">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Pantau kinerja tim, laporkan dengan yakin.
          </h1>
          <p className="text-astra-100 text-base sm:text-lg mt-6 leading-relaxed">
            Monitoring KPI dan pelaporan ke manajemen dalam satu tempat: dari input capaian sampai review manajemen.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-astra-300">
          <p>© 2026 Politeknik Astra · Sistem Monitoring KPI</p>
        </div>
      </div>

      {/* Right Column (50%): Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="w-full max-w-md">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Masuk
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-8">
            Gunakan akun yang sudah didaftarkan.
          </p>

          {/* Quick Account Fill for Demo Testing */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700 mb-2">Pilih Akun Demo Cepat:</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectDemo(user.email)}
                  className={`p-2 rounded-lg text-left transition-colors border ${
                    email === user.email
                      ? 'bg-astra-50 border-astra-500 text-astra-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="truncate capitalize text-[11px]">{user.role}</p>
                  <p className="truncate font-medium text-[10px] text-slate-400">{user.full_name}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-astra-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-astra-600 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-500 cursor-pointer"
                />
                <span>Ingat saya</span>
              </label>
              <a href="#forgot" className="text-astra-800 hover:text-astra-900 font-semibold">
                Lupa kata sandi?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-astra-800 hover:bg-astra-900 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-astra-800/20 transition-all cursor-pointer"
            >
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
