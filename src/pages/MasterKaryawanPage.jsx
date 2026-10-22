import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { useDepartemen } from '../hooks/useDepartemen';
import { Building2, UserPlus, Users, Briefcase } from 'lucide-react';

export const MasterKaryawanPage = () => {
  const { departemenList, karyawanList, addDepartemen, addKaryawan } = useDepartemen();

  const [activeTab, setActiveTab] = useState('karyawan'); // 'karyawan' | 'departemen'
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);

  // Form states
  const [empForm, setEmpForm] = useState({
    nik: '',
    nama_lengkap: '',
    jabatan: '',
    role: 'Supervisor',
    id_departemen: '',
    email: '',
  });

  const [depForm, setDepForm] = useState({
    kode_departemen: '',
    nama_departemen: '',
    deskripsi: '',
  });

  const handleSaveEmp = (e) => {
    e.preventDefault();
    addKaryawan({
      ...empForm,
      id_departemen: empForm.id_departemen || departemenList[0]?.id,
    });
    setIsEmpModalOpen(false);
    setEmpForm({ nik: '', nama_lengkap: '', jabatan: '', role: 'Supervisor', id_departemen: '', email: '' });
  };

  const handleSaveDep = (e) => {
    e.preventDefault();
    addDepartemen(depForm);
    setIsDepModalOpen(false);
    setDepForm({ kode_departemen: '', nama_departemen: '', deskripsi: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Departemen & Karyawan (PIC)"
        subtitle="Manajemen unit kerja dan supervisor penanggung jawab indikator kinerja"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={Building2}
              onClick={() => setIsDepModalOpen(true)}
            >
              + Departemen
            </Button>
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => setIsEmpModalOpen(true)}
            >
              + Karyawan / PIC
            </Button>
          </div>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('karyawan')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'karyawan'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Karyawan & Supervisor ({karyawanList.length})
        </button>
        <button
          onClick={() => setActiveTab('departemen')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'departemen'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departemen / Unit Kerja ({departemenList.length})
        </button>
      </div>

      {activeTab === 'karyawan' ? (
        <Card title="Daftar Karyawan & Penanggung Jawab KPI">
          <Table headers={['NIK & Nama Lengkap', 'Jabatan', 'Departemen', 'Role Supervisi', 'Email']}>
            {karyawanList.map((emp) => {
              const dep = departemenList.find((d) => d.id === emp.id_departemen);
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <span className="text-xs font-mono text-indigo-600 block">{emp.nik}</span>
                      <span className="font-semibold text-slate-800 text-sm">{emp.nama_lengkap}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700">{emp.jabatan}</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                    {emp.departemen?.nama_departemen || dep?.nama_departemen || '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{emp.email || '-'}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      ) : (
        <Card title="Daftar Departemen / Unit Kerja">
          <Table headers={['Kode', 'Nama Departemen', 'Deskripsi Operasional']}>
            {departemenList.map((dep) => (
              <tr key={dep.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600">
                  {dep.kode_departemen}
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-800 text-sm">
                  {dep.nama_departemen}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{dep.deskripsi || '-'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Modal Tambah Karyawan */}
      <Modal
        isOpen={isEmpModalOpen}
        onClose={() => setIsEmpModalOpen(false)}
        title="Tambah Karyawan / PIC"
      >
        <form onSubmit={handleSaveEmp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIK</label>
              <input
                type="text"
                required
                value={empForm.nik}
                onChange={(e) => setEmpForm({ ...empForm, nik: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="EMP005"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Supervisor">Supervisor</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={empForm.nama_lengkap}
              onChange={(e) => setEmpForm({ ...empForm, nama_lengkap: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: Budi Santoso, S.T."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
            <input
              type="text"
              required
              value={empForm.jabatan}
              onChange={(e) => setEmpForm({ ...empForm, jabatan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Supervisor Produksi"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen</label>
            <select
              value={empForm.id_departemen}
              onChange={(e) => setEmpForm({ ...empForm, id_departemen: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {departemenList.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nama_departemen}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={empForm.email}
              onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="email@company.id"
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsEmpModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Karyawan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Departemen */}
      <Modal
        isOpen={isDepModalOpen}
        onClose={() => setIsDepModalOpen(false)}
        title="Tambah Departemen / Unit Kerja"
      >
        <form onSubmit={handleSaveDep} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Departemen
            </label>
            <input
              type="text"
              required
              value={depForm.kode_departemen}
              onChange={(e) => setDepForm({ ...depForm, kode_departemen: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="DEP-QC"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Departemen
            </label>
            <input
              type="text"
              required
              value={depForm.nama_departemen}
              onChange={(e) => setDepForm({ ...depForm, nama_departemen: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Quality Control & Jaminan Mutu"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={depForm.deskripsi}
              onChange={(e) => setDepForm({ ...depForm, deskripsi: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Uraian tanggung jawab operasional..."
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsDepModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Departemen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
