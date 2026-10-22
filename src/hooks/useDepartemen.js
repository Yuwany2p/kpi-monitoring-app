import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialDepartemen, initialKaryawan, initialKategoriSasaran } from '../lib/mockData';

export const useDepartemen = () => {
  const [departemenList, setDepartemenList] = useState([]);
  const [karyawanList, setKaryawanList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const [depRes, empRes, katRes] = await Promise.all([
          supabase.from('departemen').select('*').order('kode_departemen'),
          supabase.from('karyawan').select('*, departemen(nama_departemen)').order('nama_lengkap'),
          supabase.from('kategori_sasaran').select('*').order('bobot_persen', { ascending: false }),
        ]);

        if (depRes.data && depRes.data.length > 0) setDepartemenList(depRes.data);
        else setDepartemenList(initialDepartemen);

        if (empRes.data && empRes.data.length > 0) setKaryawanList(empRes.data);
        else setKaryawanList(initialKaryawan);

        if (katRes.data && katRes.data.length > 0) setKategoriList(katRes.data);
        else setKategoriList(initialKategoriSasaran);
      } catch (err) {
        console.warn('Gagal koneksi ke Supabase, menggunakan data simulasi:', err);
        setDepartemenList(initialDepartemen);
        setKaryawanList(initialKaryawan);
        setKategoriList(initialKategoriSasaran);
      }
    } else {
      setDepartemenList(initialDepartemen);
      setKaryawanList(initialKaryawan);
      setKategoriList(initialKategoriSasaran);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addDepartemen = async (newDep) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('departemen').insert([newDep]).select();
      if (!error && data) {
        setDepartemenList((prev) => [...prev, data[0]]);
        return { success: true };
      }
    }
    const created = { ...newDep, id: 'dep-' + Date.now() };
    setDepartemenList((prev) => [...prev, created]);
    return { success: true };
  };

  const addKaryawan = async (newEmp) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('karyawan').insert([newEmp]).select();
      if (!error && data) {
        setKaryawanList((prev) => [...prev, data[0]]);
        return { success: true };
      }
    }
    const created = { ...newEmp, id: 'emp-' + Date.now() };
    setKaryawanList((prev) => [...prev, created]);
    return { success: true };
  };

  return {
    departemenList,
    karyawanList,
    kategoriList,
    loading,
    refetch: fetchData,
    addDepartemen,
    addKaryawan,
  };
};
