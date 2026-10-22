import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { KpiTable } from '../components/kpi/KpiTable';
import { KpiFormModal } from '../components/kpi/KpiFormModal';
import { useKpi } from '../hooks/useKpi';
import { useDepartemen } from '../hooks/useDepartemen';
import { PERSPEKTIF_AMS } from '../lib/constants';
import { Plus, Filter } from 'lucide-react';

export const MasterKpiPage = () => {
  const { kpiList, addKpi, updateKpi, deleteKpi } = useKpi();
  const { departemenList, karyawanList, kategoriList } = useDepartemen();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kpiToEdit, setKpiToEdit] = useState(null);
  const [filterPerspektif, setFilterPerspektif] = useState('ALL');

  const filteredKpi = kpiList.filter((k) =>
    filterPerspektif === 'ALL' ? true : k.perspektif === filterPerspektif
  );

  const handleOpenAdd = () => {
    setKpiToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (kpi) => {
    setKpiToEdit(kpi);
    setIsModalOpen(true);
  };

  const handleSave = (formData) => {
    if (kpiToEdit) {
      updateKpi(kpiToEdit.id, formData);
    } else {
      addKpi(formData);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Key Performance Indicators (KPI)"
        subtitle="Kelola indikator kinerja, klasifikasi 4 Perspektif AMS, dan kategori sasaran"
        action={
          <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
            Tambah KPI Baru
          </Button>
        }
      />

      {/* Filter by Perspective Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterPerspektif('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filterPerspektif === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua Perspektif ({kpiList.length})
        </button>
        {PERSPEKTIF_AMS.map((p) => {
          const count = kpiList.filter((k) => k.perspektif === p).length;
          return (
            <button
              key={p}
              onClick={() => setFilterPerspektif(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filterPerspektif === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <KpiTable
          kpiList={filteredKpi}
          onEdit={handleEdit}
          onDelete={deleteKpi}
          departemenList={departemenList}
          karyawanList={karyawanList}
        />
      </Card>

      <KpiFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        kpiToEdit={kpiToEdit}
        departemenList={departemenList}
        karyawanList={karyawanList}
        kategoriList={kategoriList}
      />
    </div>
  );
};
