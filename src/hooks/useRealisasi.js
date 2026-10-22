import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialRealisasi } from '../lib/mockData';

export const useRealisasi = (tahun = 2026, bulan = 10) => {
  const [realisasiList, setRealisasiList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRealisasi = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('realisasi_kpi')
          .select(`
            *,
            kpi (
              id,
              kode_kpi,
              nama_kpi,
              perspektif,
              satuan,
              target_tahunan,
              bobot_kpi,
              departemen (id, nama_departemen, kode_departemen),
              karyawan (id, nama_lengkap),
              kategori_sasaran (id, nama_kategori)
            )
          `)
          .eq('tahun', tahun)
          .eq('bulan', bulan);

        if (!error && data && data.length > 0) {
          setRealisasiList(data);
        } else {
          setRealisasiList(initialRealisasi.filter((r) => r.tahun === tahun && r.bulan === bulan));
        }
      } catch (err) {
        console.warn('Gagal load realisasi Supabase, gunakan mock:', err);
        setRealisasiList(initialRealisasi.filter((r) => r.tahun === tahun && r.bulan === bulan));
      }
    } else {
      setRealisasiList(initialRealisasi.filter((r) => r.tahun === tahun && r.bulan === bulan));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRealisasi();
  }, [tahun, bulan]);

  const saveRealisasi = async (realisasiData) => {
    const target = Number(realisasiData.target_periode);
    const aktual = Number(realisasiData.aktual);
    const persen_capaian = target > 0 ? Number(((aktual / target) * 100).toFixed(2)) : 0;

    const payload = {
      ...realisasiData,
      persen_capaian,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('realisasi_kpi')
          .upsert(payload, { onConflict: 'id_kpi, tahun, bulan' })
          .select();

        if (!error && data) {
          await fetchRealisasi();
          return { success: true, data: data[0] };
        }
      } catch (err) {
        console.error('Error saving realisasi:', err);
      }
    }

    setRealisasiList((prev) => {
      const idx = prev.findIndex(
        (r) => r.id_kpi === payload.id_kpi && r.tahun === payload.tahun && r.bulan === payload.bulan
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...payload };
        return copy;
      }
      return [...prev, { ...payload, id: 'real-' + Date.now() }];
    });

    return { success: true };
  };

  return {
    realisasiList,
    loading,
    refetch: fetchRealisasi,
    saveRealisasi,
  };
};
