import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialKpi } from '../lib/mockData';

export const useKpi = () => {
  const [kpiList, setKpiList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchKpis = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('kpi')
          .select(`
            *,
            departemen (id, nama_departemen, kode_departemen),
            karyawan (id, nama_lengkap, jabatan),
            kategori_sasaran (id, nama_kategori, bobot_persen)
          `)
          .order('kode_kpi');

        if (!error && data && data.length > 0) {
          setKpiList(data);
        } else {
          setKpiList(initialKpi);
        }
      } catch (err) {
        console.warn('Gagal load KPI dari Supabase, gunakan mock:', err);
        setKpiList(initialKpi);
      }
    } else {
      setKpiList(initialKpi);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const addKpi = async (newKpi) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('kpi').insert([newKpi]).select(`
          *,
          departemen (id, nama_departemen, kode_departemen),
          karyawan (id, nama_lengkap, jabatan),
          kategori_sasaran (id, nama_kategori, bobot_persen)
        `);
        if (!error && data) {
          setKpiList((prev) => [...prev, data[0]]);
          return { success: true };
        }
      } catch (err) {
        console.error(err);
      }
    }
    const created = {
      ...newKpi,
      id: 'kpi-' + Date.now(),
    };
    setKpiList((prev) => [...prev, created]);
    return { success: true };
  };

  const updateKpi = async (id, updatedFields) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('kpi')
          .update(updatedFields)
          .eq('id', id)
          .select();
        if (!error && data) {
          setKpiList((prev) => prev.map((k) => (k.id === id ? { ...k, ...data[0] } : k)));
          return { success: true };
        }
      } catch (err) {
        console.error(err);
      }
    }
    setKpiList((prev) => prev.map((k) => (k.id === id ? { ...k, ...updatedFields } : k)));
    return { success: true };
  };

  const deleteKpi = async (id) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('kpi').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    setKpiList((prev) => prev.filter((k) => k.id !== id));
    return { success: true };
  };

  return {
    kpiList,
    loading,
    refetch: fetchKpis,
    addKpi,
    updateKpi,
    deleteKpi,
  };
};
