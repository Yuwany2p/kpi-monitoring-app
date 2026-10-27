import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Check, RefreshCw, Loader2 } from 'lucide-react';
import { getStatusByScore } from '../lib/formatters';
import { getActualsForValidation, updateActualValidation } from '../services/supabaseService';

export const ValidasiDataPage = () => {
  const [activeTab, setActiveTab] = useState('menunggu'); // 'menunggu' | 'valid' | 'ditolak'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  const [rejectNote, setRejectNote] = useState('');
  const [notification, setNotification] = useState(null);

  const loadValidationData = async () => {
    setLoading(true);
    const data = await getActualsForValidation();
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadValidationData();
  }, []);

  const selectedCount = items.filter((i) => i.selected).length;

  const handleToggleSelect = (id) => {
    setItems(items.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const handleApproveSelected = async () => {
    const selectedItems = items.filter((i) => i.selected);
    for (const item of selectedItems) {
      await updateActualValidation(item.id, 'approved', 'Disetujui batch');
    }
    setItems(items.filter((i) => !i.selected));
    setNotification('Data capaian terpilih berhasil disetujui!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleApproveOne = async (id) => {
    await updateActualValidation(id, 'approved', 'Disetujui');
    setItems(items.filter((i) => i.id !== id));
    setNotification('Data capaian berhasil disetujui!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRejectOne = async (id) => {
    if (!rejectNote.trim()) {
      alert('Mohon isi catatan penolakan terlebih dahulu pada kotak di bawah tabel!');
      return;
    }
    await updateActualValidation(id, 'rejected', rejectNote);
    setItems(items.filter((i) => i.id !== id));
    setNotification(`Data ditolak dengan catatan: "${rejectNote}"`);
    setRejectNote('');
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredItems = items.filter((item) => {
    if (filterStaff !== 'ALL' && item.staff_name !== filterStaff) return false;
    if (filterIndicator !== 'ALL' && item.indicator_name !== filterIndicator) return false;
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Tabs matching mockup */}
      <div className="flex gap-8 border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('menunggu')}
          className={`pb-3.5 transition-colors relative cursor-pointer ${
            activeTab === 'menunggu'
              ? 'text-astra-800 font-bold border-b-2 border-astra-800'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Menunggu ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('valid')}
          className={`pb-3.5 transition-colors relative cursor-pointer ${
            activeTab === 'valid'
              ? 'text-astra-800 font-bold border-b-2 border-astra-800'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Valid (10)
        </button>
        <button
          onClick={() => setActiveTab('ditolak')}
          className={`pb-3.5 transition-colors relative cursor-pointer ${
            activeTab === 'ditolak'
              ? 'text-astra-800 font-bold border-b-2 border-astra-800'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ditolak (0)
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {notification}
        </div>
      )}

      {/* Filter Row & Batch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Staff Filter */}
          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer"
          >
            <option value="ALL">Semua staf</option>
            <option value="Dewi Lestari">Dewi Lestari</option>
            <option value="Rina Marlina">Rina Marlina</option>
          </select>

          {/* Indicator Filter */}
          <select
            value={filterIndicator}
            onChange={(e) => setFilterIndicator(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer"
          >
            <option value="ALL">Semua indikator</option>
            <option value="Tiket Terselesaikan">Tiket Terselesaikan</option>
            <option value="Waktu Respons">Waktu Respons</option>
            <option value="Kepuasan Pelanggan">Kepuasan Pelanggan</option>
          </select>
        </div>

        {/* Batch Approve Button */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {selectedCount} baris dipilih
          </span>
          <button
            onClick={handleApproveSelected}
            disabled={selectedCount === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Setujui terpilih
          </button>
        </div>
      </div>

      {/* Validation Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
              <th className="pb-3.5 w-8">
                <input
                  type="checkbox"
                  checked={items.length > 0 && items.every((i) => i.selected)}
                  onChange={(e) =>
                    setItems(items.map((i) => ({ ...i, selected: e.target.checked })))
                  }
                  className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-500 cursor-pointer"
                />
              </th>
              <th className="pb-3.5 font-medium">Staf</th>
              <th className="pb-3.5 font-medium">Indikator</th>
              <th className="pb-3.5 font-medium">Target</th>
              <th className="pb-3.5 font-medium">Realisasi</th>
              <th className="pb-3.5 font-medium">Capaian</th>
              <th className="pb-3.5 font-medium">Bukti</th>
              <th className="pb-3.5 font-medium">Pengecekan</th>
              <th className="pb-3.5 text-center font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
                  Memuat data pengajuan dari database...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Tidak ada data yang menunggu validasi di database.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const statusConfig = getStatusByScore(item.achievement);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-4">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 font-bold text-slate-900">{item.staff_name}</td>
                    <td className="py-4 text-slate-700 font-medium">{item.indicator_name}</td>
                    <td className="py-4 text-slate-600">{item.target}</td>
                    <td className="py-4 font-bold text-slate-900">{item.actual}</td>
                    <td className="py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.badge}`}
                      >
                        {item.achievement}%
                      </span>
                    </td>
                    <td className="py-4">
                      <a
                        href={item.evidence_url}
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Membuka file lampiran bukti: ' + item.evidence);
                        }}
                        className="text-astra-800 hover:text-astra-900 font-semibold underline inline-flex items-center gap-1"
                      >
                        {item.evidence}
                      </a>
                    </td>
                    <td className="py-4">
                      {item.has_large_deviation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Selisih besar
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleApproveOne(item.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleRejectOne(item.id)}
                          className="px-3 py-1 border border-rose-300 hover:bg-rose-50 text-rose-600 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Catatan Penolakan textarea matching mockup */}
      <div className="pt-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Catatan penolakan (wajib jika menolak)
        </label>
        <textarea
          rows={3}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="Contoh: Mohon lampirkan rekap tiket dari sistem sebelum diajukan ulang."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-astra-600 focus:outline-none"
        />
      </div>
    </div>
  );
};
