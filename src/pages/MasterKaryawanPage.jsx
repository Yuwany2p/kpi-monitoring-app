import React, { useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Users, Building2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useTabParam } from '../hooks/useTabParam';
import { getEmployees, updateEmployee, getTeams, createTeam, updateTeam } from '../services/supabaseService';
import { ROLES, ROLE_LABELS } from '../lib/constants';
import { getInitials } from '../lib/formatters';
import { Notice, EmptyState, TableSkeleton, StatusPill } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { Dialog } from '../components/common/Dialog';
import { Tabs, TabPanel } from '../components/common/Tabs';

const ROLE_ORDER = [ROLES.MANAJEMEN, ROLES.SUPERVISOR, ROLES.STAF];

const ActivePill = ({ active }) =>
  active ? (
    <StatusPill className="bg-slate-100 text-slate-700">Aktif</StatusPill>
  ) : (
    <StatusPill className="bg-white text-slate-500 ring-1 ring-inset ring-slate-200">Nonaktif</StatusPill>
  );

// ---------------------------------------------------------------------
// Tab karyawan
// ---------------------------------------------------------------------
const EmployeeTab = ({ employees, teams, loading, error, canEdit, onSaved, flash }) => {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (q && !`${e.full_name} ${e.email}`.toLowerCase().includes(q)) return false;
    if (teamFilter === 'none' && e.team_id) return false;
    if (teamFilter && teamFilter !== 'none' && e.team_id !== teamFilter) return false;
    if (roleFilter && e.role !== roleFilter) return false;
    return true;
  });

  const openEdit = (emp) => {
    setForm({ full_name: emp.full_name, role: emp.role, team_id: emp.team_id || '', is_active: emp.is_active });
    setFormError(null);
    setEditing(emp);
  };

  const isSelf = editing?.id === currentUser?.id;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const updates = { full_name: form.full_name.trim(), team_id: form.team_id || null };
      if (!isSelf) {
        updates.role = form.role;
        updates.is_active = form.is_active;
      }
      const saved = await updateEmployee(editing.id, updates);
      onSaved(saved);
      flash('success', `Data ${saved.full_name} diperbarui.`);
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasFilter = search || teamFilter || roleFilter;

  return (
    <>
      <Section
        flush
        title="Karyawan"
        description={canEdit ? 'Ubah peran, departemen, atau status aktif karyawan.' : 'Hanya manajemen yang bisa mengubah data karyawan.'}
        actions={
          canEdit && (
            <button onClick={() => setShowHowTo(true)} className="btn-secondary">
              <Plus className="h-4 w-4" aria-hidden="true" /> Cara menambah karyawan
            </button>
          )
        }
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label htmlFor="emp-search" className="sr-only">
              Cari karyawan
            </label>
            <input
              id="emp-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email"
              className="field h-9 pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <label className="sr-only" htmlFor="emp-team">
              Filter departemen
            </label>
            <select id="emp-team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="field h-9 sm:w-48">
              <option value="">Semua departemen</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="none">Tanpa departemen</option>
            </select>
            <label className="sr-only" htmlFor="emp-role">
              Filter peran
            </label>
            <select id="emp-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="field h-9 sm:w-40">
              <option value="">Semua peran</option>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <Notice type="error" className="m-4 sm:m-5">{error}</Notice>}
        {loading ? (
          <TableSkeleton cols={4} label="Memuat karyawan…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilter ? 'Tidak ada yang cocok' : 'Belum ada karyawan'}
            action={
              hasFilter && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch('');
                    setTeamFilter('');
                    setRoleFilter('');
                  }}
                >
                  Hapus filter
                </button>
              )
            }
          >
            {hasFilter ? 'Coba kata kunci atau filter lain.' : 'Karyawan muncul di sini setelah akunnya dibuat.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <caption className="sr-only">Daftar karyawan, {filtered.length} orang</caption>
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Departemen</th>
                  <th scope="col">Status</th>
                  {canEdit && (
                    <th scope="col" className="text-right">
                      <span className="sr-only">Aksi</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className={`row-hover ${emp.is_active ? '' : 'text-slate-500'}`}>
                    <td className="min-w-[14rem]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {getInitials(emp.full_name)}
                        </span>
                        <span className="min-w-0">
                          <span className={`block font-medium ${emp.is_active ? 'text-slate-900' : ''}`}>
                            {emp.full_name}
                            {emp.id === currentUser?.id && <span className="ml-1.5 text-xs font-normal text-slate-500">(Anda)</span>}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{emp.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{ROLE_LABELS[emp.role] || emp.role}</td>
                    <td className="whitespace-nowrap">{emp.teams?.name || <span className="text-slate-400">–</span>}</td>
                    <td>
                      <ActivePill active={emp.is_active} />
                    </td>
                    {canEdit && (
                      <td className="text-right">
                        <button onClick={() => openEdit(emp)} className="btn-ghost btn-sm" aria-label={`Ubah ${emp.full_name}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Ubah data ${editing?.full_name || ''}`}
        description={editing?.email}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" form="employee-form" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Simpan perubahan
            </button>
          </>
        }
      >
        {form && (
          <form id="employee-form" onSubmit={handleSave} className="space-y-4">
            {formError && <Notice type="error">{formError}</Notice>}
            <div>
              <label htmlFor="emp-name" className="label">Nama lengkap</label>
              <input
                id="emp-name"
                type="text"
                required
                maxLength={100}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="emp-role-edit" className="label">Peran</label>
                <select
                  id="emp-role-edit"
                  value={form.role}
                  disabled={isSelf}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="field"
                >
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="emp-team-edit" className="label">Departemen</label>
                <select
                  id="emp-team-edit"
                  value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                  className="field"
                >
                  <option value="">Tanpa departemen</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className={`flex items-start gap-3 rounded-md border border-slate-200 p-3 ${isSelf ? 'opacity-60' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={form.is_active}
                disabled={isSelf}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-control text-astra-600 focus:ring-astra-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Akun aktif</span>
                <span className="block text-[13px] text-slate-500">
                  Karyawan nonaktif tidak muncul di daftar target dan penanggung jawab.
                </span>
              </span>
            </label>
            {isSelf && <p className="hint">Peran dan status akun sendiri tidak bisa diubah dari sini.</p>}
          </form>
        )}
      </Dialog>

      <Dialog
        open={showHowTo}
        onClose={() => setShowHowTo(false)}
        title="Menambah karyawan baru"
        footer={
          <button type="button" onClick={() => setShowHowTo(false)} className="btn-primary">
            Mengerti
          </button>
        }
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Akun login dibuat lewat Supabase Auth supaya kata sandi tidak pernah melewati aplikasi ini. Profilnya otomatis
            muncul di daftar karyawan.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Buka Supabase Dashboard, menu Authentication, lalu pilih Add user.</li>
            <li>Isi email dan kata sandi awal, centang Auto confirm user.</li>
            <li>Kembali ke halaman ini, pilih Ubah pada karyawan baru, lalu atur peran dan departemennya.</li>
          </ol>
          <div className="inset-panel flex gap-2 text-[13px]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Tanpa pengaturan, akun baru otomatis berperan Staf dan belum punya departemen.</span>
          </div>
        </div>
      </Dialog>
    </>
  );
};

// ---------------------------------------------------------------------
// Tab departemen
// ---------------------------------------------------------------------
const TeamTab = ({ teams, employees, loading, error, canEdit, onSaved, flash }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', supervisor_id: '' });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const supervisors = employees.filter((e) => e.role === ROLES.SUPERVISOR && e.is_active);
  const nameOf = (id) => employees.find((e) => e.id === id)?.full_name;
  const memberCount = (teamId) => employees.filter((e) => e.team_id === teamId && e.role === ROLES.STAF && e.is_active).length;

  const openAdd = () => {
    setForm({ name: '', supervisor_id: '' });
    setFormError(null);
    setEditing({});
  };
  const openEdit = (t) => {
    setForm({ name: t.name, supervisor_id: t.supervisor_id || '' });
    setFormError(null);
    setEditing(t);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { name: form.name.trim(), supervisor_id: form.supervisor_id || null };
      const saved = editing?.id ? await updateTeam(editing.id, payload) : await createTeam(payload);
      onSaved(saved, !editing?.id);
      flash('success', editing?.id ? `Departemen ${saved.name} diperbarui.` : `Departemen ${saved.name} ditambahkan.`);
      setEditing(null);
    } catch (err) {
      setFormError(err.message.includes('duplicate') ? 'Nama departemen sudah dipakai.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section
        flush
        title="Departemen"
        description="Setiap departemen punya satu supervisor yang memvalidasi data stafnya."
        actions={
          canEdit && (
            <button onClick={openAdd} className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah departemen
            </button>
          )
        }
      >
        {error && <Notice type="error" className="m-4 sm:m-5">{error}</Notice>}
        {loading ? (
          <TableSkeleton cols={3} label="Memuat departemen…" />
        ) : teams.length === 0 ? (
          <EmptyState icon={Building2} title="Belum ada departemen">
            Departemen dipakai untuk mengelompokkan staf dan supervisornya.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Departemen</th>
                  <th scope="col">Supervisor</th>
                  <th scope="col" className="text-right">
                    Staf aktif
                  </th>
                  {canEdit && (
                    <th scope="col" className="text-right">
                      <span className="sr-only">Aksi</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="row-hover">
                    <td className="font-medium text-slate-900">{t.name}</td>
                    <td>{nameOf(t.supervisor_id) || <span className="text-slate-500">Belum ditentukan</span>}</td>
                    <td className="text-right tabular-nums">{memberCount(t.id)}</td>
                    {canEdit && (
                      <td className="text-right">
                        <button onClick={() => openEdit(t)} className="btn-ghost btn-sm" aria-label={`Ubah ${t.name}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Ubah departemen ${editing.name}` : 'Tambah departemen'}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" form="team-form" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing?.id ? 'Simpan perubahan' : 'Tambah departemen'}
            </button>
          </>
        }
      >
        <form id="team-form" onSubmit={handleSave} className="space-y-4">
          {formError && <Notice type="error">{formError}</Notice>}
          <div>
            <label htmlFor="team-name" className="label">Nama departemen</label>
            <input
              id="team-name"
              type="text"
              required
              maxLength={100}
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field"
              placeholder="Contoh: Tim Customer Service"
            />
          </div>
          <div>
            <label htmlFor="team-supervisor" className="label">Supervisor</label>
            <select
              id="team-supervisor"
              value={form.supervisor_id}
              onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
              className="field"
              aria-describedby="team-supervisor-hint"
            >
              <option value="">Belum ditentukan</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
            <p id="team-supervisor-hint" className="hint">
              Hanya karyawan berperan Supervisor yang bisa dipilih.
            </p>
          </div>
        </form>
      </Dialog>
    </>
  );
};

// ---------------------------------------------------------------------
export const MasterKaryawanPage = () => {
  const { role } = useAuth();
  const canEdit = role === ROLES.MANAJEMEN;
  const [message, setMessage] = useState(null);

  const { data, setData, loading, error } = useAsyncData(
    async () => {
      const [employees, teams] = await Promise.all([getEmployees(), getTeams()]);
      return { employees, teams };
    },
    [],
    { initialData: { employees: [], teams: [] } }
  );
  const employees = useMemo(() => data?.employees || [], [data]);
  const teams = useMemo(() => data?.teams || [], [data]);

  const tabs = [
    { key: 'karyawan', label: 'Karyawan', count: loading ? null : employees.length },
    { key: 'departemen', label: 'Departemen', count: loading ? null : teams.length },
  ];
  const [active, setActive] = useTabParam(tabs, 'karyawan');

  const flash = (type, text) => {
    setMessage({ type, text });
    if (type !== 'error') setTimeout(() => setMessage(null), 5000);
  };

  const onEmployeeSaved = (saved) =>
    setData((prev) => ({ ...prev, employees: prev.employees.map((e) => (e.id === saved.id ? saved : e)) }));

  const onTeamSaved = (saved, isNew) =>
    setData((prev) => ({
      ...prev,
      teams: isNew
        ? [...prev.teams, saved].sort((a, b) => a.name.localeCompare(b.name))
        : prev.teams.map((t) => (t.id === saved.id ? saved : t)),
    }));

  return (
    <div className="space-y-5">
      <Tabs tabs={tabs} active={active} onChange={setActive} label="Bagian karyawan dan departemen" idPrefix="emp" />
      {message && (
        <Notice type={message.type} onDismiss={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}
      <TabPanel tabKey="karyawan" active={active} idPrefix="emp">
        <EmployeeTab
          employees={employees}
          teams={teams}
          loading={loading}
          error={error}
          canEdit={canEdit}
          onSaved={onEmployeeSaved}
          flash={flash}
        />
      </TabPanel>
      <TabPanel tabKey="departemen" active={active} idPrefix="emp">
        <TeamTab
          teams={teams}
          employees={employees}
          loading={loading}
          error={error}
          canEdit={canEdit}
          onSaved={onTeamSaved}
          flash={flash}
        />
      </TabPanel>
    </div>
  );
};
