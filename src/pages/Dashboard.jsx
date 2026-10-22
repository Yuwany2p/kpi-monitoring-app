import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { PerspectiveRadarChart } from '../components/dashboard/PerspectiveRadarChart';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import { DepartmentComparison } from '../components/dashboard/DepartmentComparison';
import { CriticalKpiAlert } from '../components/dashboard/CriticalKpiAlert';
import { FormAnalisisMasalahModal } from '../components/tindakan/FormAnalisisMasalahModal';
import { useFilter } from '../context/FilterContext';
import { useKpi } from '../hooks/useKpi';
import { useRealisasi } from '../hooks/useRealisasi';
import { useTindakan } from '../hooks/useTindakan';
import { useDepartemen } from '../hooks/useDepartemen';
import { PERSPEKTIF_AMS } from '../lib/constants';
import { getMonthName } from '../lib/formatters';
import {
  Target,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

export const Dashboard = () => {
  const { selectedTahun, selectedBulan, selectedDepartemen } = useFilter();
  const { kpiList } = useKpi();
  const { realisasiList } = useRealisasi(selectedTahun, selectedBulan);
  const { tindakanList, saveTindakan } = useTindakan();
  const { karyawanList, departemenList } = useDepartemen();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpiForAction, setSelectedKpiForAction] = useState(null);

  // Filter list based on selected department
  const filteredKpi = kpiList.filter((k) =>
    selectedDepartemen === 'ALL' ? true : k.id_departemen === selectedDepartemen
  );

  const filteredRealisasi = realisasiList.filter((r) => {
    const kpi = r.kpi || kpiList.find((k) => k.id === r.id_kpi);
    if (!kpi) return true;
    return selectedDepartemen === 'ALL' ? true : kpi.id_departemen === selectedDepartemen;
  });

  // Calculate metrics
  const totalKpi = filteredKpi.length;
  const avgCapaian =
    filteredRealisasi.length > 0
      ? (
          filteredRealisasi.reduce((acc, r) => acc + Number(r.persen_capaian || 0), 0) /
          filteredRealisasi.length
        ).toFixed(1)
      : '0.0';

  const criticalItems = filteredRealisasi.filter((r) => Number(r.persen_capaian || 0) < 80);
  const achievedItems = filteredRealisasi.filter((r) => Number(r.persen_capaian || 0) >= 100);
  const openActions = tindakanList.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved');

  // Radar chart data for 4 AMS Perspectives
  const radarData = PERSPEKTIF_AMS.map((p) => {
    const kpisInP = filteredKpi.filter((k) => k.perspektif === p);
    const relatedRealisasi = filteredRealisasi.filter((r) => {
      const k = r.kpi || kpiList.find((item) => item.id === r.id_kpi);
      return k && k.perspektif === p;
    });

    const avg =
      relatedRealisasi.length > 0
        ? Math.round(
            relatedRealisasi.reduce((acc, r) => acc + Number(r.persen_capaian || 0), 0) /
              relatedRealisasi.length
          )
        : 85; // baseline

    return {
      perspektif: p,
      capaian: avg,
      fullMark: 120,
    };
  });

  // Trend data
  const trendData = [
    { bulan: 'Jul', capaian: 91.2 },
    { bulan: 'Ags', capaian: 88.5 },
    { bulan: 'Sep', capaian: 94.0 },
    { bulan: 'Okt', capaian: Number(avgCapaian) || 92.5 },
  ];

  // Department comparison
  const depData = departemenList.map((dep) => {
    const depKpis = kpiList.filter((k) => k.id_departemen === dep.id);
    const depRealisasi = realisasiList.filter((r) => {
      const k = r.kpi || kpiList.find((item) => item.id === r.id_kpi);
      return k && k.id_departemen === dep.id;
    });

    const avg =
      depRealisasi.length > 0
        ? Math.round(
            depRealisasi.reduce((acc, r) => acc + Number(r.persen_capaian || 0), 0) /
              depRealisasi.length
          )
        : 90;

    return {
      nama: dep.kode_departemen || dep.nama_departemen.slice(0, 10),
      capaian: avg,
    };
  });

  const handleInitiateAction = (realisasiItem) => {
    setSelectedKpiForAction(realisasiItem);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Capaian KPI & AMS"
        subtitle={`Monitoring kinerja tim dan supervisi periode ${getMonthName(
          selectedBulan
        )} ${selectedTahun}`}
        badge="4 Perspektif AMS"
      />

      {/* Alert KPI Kritis jika ada */}
      <CriticalKpiAlert
        criticalKpis={criticalItems}
        onInitiateAction={handleInitiateAction}
      />

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Indikator KPI"
          value={totalKpi}
          unit="Indikator"
          description="Terdaftar pada sistem"
          icon={Target}
          colorScheme="indigo"
        />

        <StatCard
          title="Rata-rata Capaian"
          value={`${avgCapaian}%`}
          description={Number(avgCapaian) >= 100 ? 'Memenuhi Standar' : 'Perlu Supervisi'}
          trend={Number(avgCapaian) >= 100 ? '+3.4%' : '-2.1%'}
          trendType={Number(avgCapaian) >= 100 ? 'up' : 'down'}
          icon={CheckCircle}
          colorScheme={Number(avgCapaian) >= 100 ? 'emerald' : 'amber'}
        />

        <StatCard
          title="KPI Kritis (<80%)"
          value={criticalItems.length}
          unit="KPI"
          description="Memerlukan tindakan CAPA"
          trend={criticalItems.length > 0 ? 'Perlu Perhatian' : 'Aman'}
          trendType={criticalItems.length > 0 ? 'down' : 'up'}
          icon={AlertTriangle}
          colorScheme={criticalItems.length > 0 ? 'rose' : 'emerald'}
        />

        <StatCard
          title="Tindakan Korektif Terbuka"
          value={openActions.length}
          unit="Tindakan"
          description="Status Open / In Progress"
          icon={ClipboardList}
          colorScheme="amber"
        />
      </div>

      {/* Visualisasi Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart: 4 Perspektif AMS */}
        <div className="lg:col-span-5">
          <Card
            title="Keseimbangan 4 Perspektif AMS"
            subtitle="Keuangan, Pelanggan, Proses Internal, Pembelajaran"
          >
            <PerspectiveRadarChart data={radarData} />
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              {radarData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600 font-medium truncate mr-2">
                    {item.perspektif}
                  </span>
                  <span className="font-bold text-indigo-600 shrink-0">{item.capaian}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tren Capaian Bulanan & Komparasi Departemen */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Tren Capaian Kinerja Tim"
            subtitle="Pergerakan realisasi capaian dalam beberapa bulan terakhir"
          >
            <MonthlyTrendChart data={trendData} />
          </Card>

          <Card
            title="Komparasi Capaian Antar Departemen"
            subtitle="Tinjauan efektivitas supervisi di setiap unit kerja"
          >
            <DepartmentComparison data={depData} />
          </Card>
        </div>
      </div>

      {/* Modal Input Analisis Masalah Cepat */}
      <FormAnalisisMasalahModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedKpiForAction(null);
        }}
        onSave={saveTindakan}
        realisasiItem={selectedKpiForAction}
        karyawanList={karyawanList}
      />
    </div>
  );
};
