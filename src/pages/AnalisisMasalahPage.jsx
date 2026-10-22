import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { TindakanTimeline } from '../components/tindakan/TindakanTimeline';
import { FormAnalisisMasalahModal } from '../components/tindakan/FormAnalisisMasalahModal';
import { useTindakan } from '../hooks/useTindakan';
import { useDepartemen } from '../hooks/useDepartemen';
import { Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const AnalisisMasalahPage = () => {
  const { tindakanList, saveTindakan, updateStatus } = useTindakan();
  const { karyawanList } = useDepartemen();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tindakanToEdit, setTindakanToEdit] = useState(null);

  const openCount = tindakanList.filter((t) => t.status === 'Open').length;
  const inProgressCount = tindakanList.filter((t) => t.status === 'In Progress').length;
  const closedCount = tindakanList.filter(
    (t) => t.status === 'Closed' || t.status === 'Resolved'
  ).length;

  const handleEdit = (item) => {
    setTindakanToEdit(item);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setTindakanToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analisis Masalah & Tindakan Korektif (CAPA)"
        subtitle="Siklus Problem Solving Supervisi: Identifikasi Masalah, Akar Penyebab (5-Why), dan Action Plan"
        badge="Problem Solving Cycle"
        action={
          <Button variant="danger" icon={Plus} onClick={handleNew}>
            + Catat Masalah Baru
          </Button>
        }
      />

      {/* Summary KPI Gap Solving */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Masalah Baru (Open)
            </p>
            <p className="text-2xl font-black text-rose-900 mt-1">{openCount}</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/60" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Sedang Dikerjakan (In Progress)
            </p>
            <p className="text-2xl font-black text-amber-900 mt-1">{inProgressCount}</p>
          </div>
          <Clock className="w-8 h-8 text-amber-500/60" />
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Terselesaikan (Closed)
            </p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{closedCount}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
        </div>
      </div>

      <Card
        title="Daftar Tindakan Perbaikan Masalah Lapangan"
        subtitle="Pantau progres penyelesaian gap target dan mitigasi risiko operasional tim"
      >
        <TindakanTimeline
          tindakanList={tindakanList}
          onEdit={handleEdit}
          onUpdateStatus={updateStatus}
          karyawanList={karyawanList}
        />
      </Card>

      <FormAnalisisMasalahModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveTindakan}
        tindakanToEdit={tindakanToEdit}
        karyawanList={karyawanList}
      />
    </div>
  );
};
