import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialTindakan } from '../lib/mockData';

export const useTindakan = () => {
  const [tindakanList, setTindakanList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTindakan = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('analisis_tindakan')
          .select(`
            *,
            karyawan (id, nama_lengkap, jabatan),
            realisasi_kpi (
              id,
              tahun,
              bulan,
              target_periode,
              aktual,
              persen_capaian,
              kpi (
                id,
                kode_kpi,
                nama_kpi,
                perspektif,
                satuan,
                departemen (id, nama_departemen)
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setTindakanList(data);
        } else {
          setTindakanList(initialTindakan);
        }
      } catch (err) {
        console.warn('Gagal load analisis tindakan dari Supabase, gunakan mock:', err);
        setTindakanList(initialTindakan);
      }
    } else {
      setTindakanList(initialTindakan);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTindakan();
  }, []);

  const saveTindakan = async (tindakanData) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('analisis_tindakan')
          .upsert(tindakanData)
          .select();
        if (!error && data) {
          await fetchTindakan();
          return { success: true };
        }
      } catch (err) {
        console.error('Error saving tindakan:', err);
      }
    }

    setTindakanList((prev) => {
      if (tindakanData.id) {
        return prev.map((t) => (t.id === tindakanData.id ? { ...t, ...tindakanData } : t));
      }
      return [{ ...tindakanData, id: 'tindakan-' + Date.now() }, ...prev];
    });

    return { success: true };
  };

  const updateStatus = async (id, newStatus, hasilEvaluasi = '') => {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('analisis_tindakan')
          .update({ status: newStatus, hasil_evaluasi: hasilEvaluasi, updated_at: new Date().toISOString() })
          .eq('id', id);
        await fetchTindakan();
        return { success: true };
      } catch (err) {
        console.error(err);
      }
    }

    setTindakanList((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus, hasil_evaluasi: hasilEvaluasi || t.hasil_evaluasi } : t
      )
    );
    return { success: true };
  };

  return {
    tindakanList,
    loading,
    refetch: fetchTindakan,
    saveTindakan,
    updateStatus,
  };
};
