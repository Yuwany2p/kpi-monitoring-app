import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Users,
  TrendingUp,
  AlertOctagon,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    {
      group: 'Utama',
      items: [
        {
          name: 'Dashboard AMS',
          to: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: 'Master Data',
      items: [
        {
          name: 'Master KPI',
          to: '/master-kpi',
          icon: Target,
        },
        {
          name: 'Departemen & PIC',
          to: '/master-karyawan',
          icon: Users,
        },
      ],
    },
    {
      group: 'Transaksi Supervisi',
      items: [
        {
          name: 'Realisasi KPI',
          to: '/realisasi',
          icon: TrendingUp,
          badge: 'Target vs Aktual',
        },
        {
          name: 'Analisis Masalah & CAPA',
          to: '/analisis-masalah',
          icon: AlertOctagon,
          badge: 'Corrective Action',
        },
      ],
    },
    {
      group: 'Pelaporan',
      items: [
        {
          name: 'Laporan Manajemen',
          to: '/laporan',
          icon: FileText,
          badge: 'Print/PDF',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col justify-between shrink-0 no-print">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-tight">
              Supervisi AMS
            </h1>
            <p className="text-xs text-indigo-400 font-medium">Monitoring KPI & CAPA</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-6">
          {navItems.map((section, idx) => (
            <div key={idx}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info UAS */}
      <div className="p-4 m-4 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Opsi 5 Teknik Supervisi
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          4 Perspektif AMS & Analisis Masalah Kinerja Tim
        </p>
      </div>
    </aside>
  );
};
