import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { RealisasiTable } from '../components/realisasi/RealisasiTable';
import { InputRealisasiModal } from '../components/realisasi/InputRealisasiModal';
import { FormAnalisisMasalahModal } from '../components/tindakan/FormAnalisisMasalahModal';
import { useFilter } from '../context/FilterContext';
import { useKpi } from '../hooks/useKpi';
import { useRealisasi } from '../hooks/useRealisasi';
import { useTindakan } from '../hooks/useTindakan';
import { useDepartemen } from '../hooks/useDepartemen';
import { getMonthName } from '../lib/formatters';
import { Plus } from 'lucide-react';

export const RealisasiPage = () => {
  const { selectedTahun, selectedBulan, selectedDepartemen } = useFilter();
  const { kpiList } = useKpi();
  const { realisasiList, saveRealisasi } = useRealisasi(selectedTahun, selectedBulan);
  const { saveTindakan } = useTindakan();
  const { karyawanList } = useDepartemen();

  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingRealisasi, setEditingRealisasi] = useState(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState(null);

  // Filter based on department
  const filteredRealisasi = realisasiList.filter((r) => {
    const kpi = r.kpi || kpiList.find((k) => k.id === r.id_kpi);
    if (!kpi) return true;
    return selectedDepartemen === 'ALL' ? true : kpi.id_departemen === selectedDepartemen;
  });

  const handleOpenAdd = () => {
    setEditingRealisasi(null);
    setIsInputModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingRealisasi(item);
    setIsInputModalOpen(true);
  };

  const handleAddAction = (item) => {
    setSelectedForAction(item);
    setIsActionModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Realisasi & Monitoring Capaian KPI"
        subtitle={`Pengawasan berkala target vs aktual periode ${getMonthName(
          selectedBulan
        )} ${selectedTahun}`}
        action={
          <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
            Input Capaian Aktual
          </Button>
        }
      />

      <Card>
        <RealisasiTable
          realisasiList={filteredRealisasi}
          onEdit={handleEdit}
          onAddAction={handleAddAction}
        />
      </Card>

      <InputRealisasiModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        onSave={saveRealisasi}
        kpiList={kpiList}
        initialData={editingRealisasi}
        tahun={selectedTahun}
        bulan={selectedBulan}
      />

      <FormAnalisisMasalahModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onSave={saveTindakan}
        realisasiItem={selectedForAction}
        karyawanList={karyawanList}
      />
    </div>
  );
};
