import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { ExportPdfButton } from '../components/laporan/ExportPdfButton';
import { ManagementReportView } from '../components/laporan/ManagementReportView';
import { useFilter } from '../context/FilterContext';
import { useKpi } from '../hooks/useKpi';
import { useRealisasi } from '../hooks/useRealisasi';
import { useTindakan } from '../hooks/useTindakan';
import { useDepartemen } from '../hooks/useDepartemen';
import { getMonthName } from '../lib/formatters';

export const LaporanManajemenPage = () => {
  const { selectedTahun, selectedBulan, selectedDepartemen } = useFilter();
  const { kpiList } = useKpi();
  const { realisasiList } = useRealisasi(selectedTahun, selectedBulan);
  const { tindakanList } = useTindakan();
  const { departemenList } = useDepartemen();

  const depObj = departemenList.find((d) => d.id === selectedDepartemen);
  const depName = depObj ? depObj.nama_departemen : 'Semua Unit Kerja Operasional';

  const filteredKpi = kpiList.filter((k) =>
    selectedDepartemen === 'ALL' ? true : k.id_departemen === selectedDepartemen
  );

  const filteredRealisasi = realisasiList.filter((r) => {
    const kpi = r.kpi || kpiList.find((k) => k.id === r.id_kpi);
    if (!kpi) return true;
    return selectedDepartemen === 'ALL' ? true : kpi.id_departemen === selectedDepartemen;
  });

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Pelaporan Berkala ke Manajemen"
          subtitle={`Format pelaporan supervisi berbasis 4 Perspektif AMS & Tindakan Perbaikan untuk Rapat Manajemen`}
          badge="Reporting to Management"
          action={<ExportPdfButton />}
        />
      </div>

      <ManagementReportView
        tahun={selectedTahun}
        bulan={selectedBulan}
        departemenName={depName}
        kpiList={filteredKpi}
        realisasiList={filteredRealisasi}
        tindakanList={tindakanList}
      />
    </div>
  );
};
