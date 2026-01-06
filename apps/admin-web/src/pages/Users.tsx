import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Download, Filter, Trash2, Eye, User as UserIcon, X, Calendar, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { clsx } from 'clsx';

type User = {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt?: string;
};

type Pack = {
  _id: string;
  name: string;
  durationType: 'days' | 'months' | 'sessions';
  durationValue: number;
};

type Membership = {
  _id: string;
  packId?: Pack | string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  gender: 'other',
  dob: '',
  packId: '',
  startDate: new Date().toISOString().slice(0, 10),
  weight: '',
};





function computeEndDate(pack: Pack | undefined, start: string): string | null {
  if (!pack) return null;
  if (!start) return null;
  const d = new Date(start + 'T00:00:00');
  if (pack.durationType === 'months') {
    d.setMonth(d.getMonth() + (pack.durationValue || 1));
    return d.toISOString().slice(0, 10);
  }
  if (pack.durationType === 'days') {
    d.setDate(d.getDate() + (pack.durationValue || 30));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function getErr(e: any, fallback = 'Request failed') {
  return (
    e?.response?.data?.error ??
    (typeof e?.response?.data === 'string' ? e.response.data : '') ??
    e?.message ??
    fallback
  );
}

export default function Users() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const [memberships, setMemberships] = useState<Record<string, Membership | null>>({});

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (q) params.q = q;
      if (status) params.status = status;

      const [usersRes, packsRes] = await Promise.all([api.get('/users', { params }), api.get('/packs')]);

      const list: User[] = usersRes.data || [];
      setUsers(list);
      setPacks(packsRes.data || []);

      // fetch latest membership (cap to first 50)
      const entries: Record<string, Membership | null> = {};
      await Promise.all(
        list.slice(0, 50).map(async (u) => {
          try {
            const mres = await api.get('/memberships', { params: { userId: u._id } });
            const arr: Membership[] = mres.data || [];
            if (arr.length) {
              arr.sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              );
              entries[u._id] = arr[0];
            } else entries[u._id] = null;
          } catch {
            entries[u._id] = null;
          }
        })
      );
      setMemberships(entries);
    } catch (e: any) {
      setError(getErr(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (searchParams.get('new') === 'true') {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange<K extends keyof typeof form>(key: K, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const selectedPack = useMemo(() => packs.find((p) => p._id === form.packId), [packs, form.packId]);
  const computedEnd = useMemo(
    () => computeEndDate(selectedPack, form.startDate),
    [selectedPack, form.startDate]
  );

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        gender: form.gender,

        dob: form.dob || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
      };
      if (form.packId) {
        payload.packId = form.packId;
        if (form.startDate) payload.startDate = form.startDate;
      }
      if (!payload.firstName || !payload.lastName)
        throw new Error('First and Last name are required');

      await api.post('/users', payload);
      setOpen(false);
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      setError(getErr(e, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeUser(u: User) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId;
    if (!window.confirm(`Delete user ${name}? This permanently removes them.`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      await load();
    } catch (e: any) {
      alert(getErr(e, 'Failed to delete'));
    }
  }

  async function exportCSV() {
    try {
      const res = await api.get('/users/export/csv', {
        params: { q: q || undefined, status: status || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(getErr(e, 'Export failed'));
    }
  }

  async function importUsers(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        await api.post('/users/import', { csvData: text });
        alert('Import successful');
        load();
      } catch (e: any) {
        alert(getErr(e, 'Import failed'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Members</h1>
          <p className="text-slate-500 mt-1">Manage your gym members and their subscriptions.</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            <Upload size={16} />
            Import CSV
            <input type="file" accept=".csv" onChange={importUsers} className="hidden" />
          </label>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Add Member
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            placeholder="Search by name, ID, email or phone..."
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Apply Filter
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No members found</h3>
          <p className="text-slate-500 mt-1 mb-6">Get started by creating a new member.</p>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus size={16} />
            Add Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">User Details</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Contact</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Membership</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const m = memberships[u._id];
                  const packName =
                    m && typeof m.packId === 'object' && (m.packId as Pack).name
                      ? (m.packId as Pack).name
                      : typeof m?.packId === 'string'
                        ? (m.packId as string)
                        : null;
                  const end = m?.endDate
                    ? new Date(m.endDate).toLocaleDateString()
                    : m && (m.packId as any)?.durationType === 'sessions'
                      ? 'Sessions'
                      : null;

                  return (
                    <tr key={u._id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                            {(u.firstName?.[0] || u.userId?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId}
                            </div>
                            <div className="text-xs text-slate-500">ID: {u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">{u.email || '—'}</div>
                        <div className="text-slate-400 text-xs">{u.mobile || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            u.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              u.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'
                        )}>
                          {u.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {packName ? (
                          <div>
                            <div className="font-medium text-slate-900">{packName}</div>
                            {end && <div className="text-xs text-slate-500">Ends {end}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Active Plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/users/${u._id}`}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            onClick={() => removeUser(u)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add New Member</h2>
                <p className="text-sm text-slate-500">Enter the member's personal and membership details.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={createUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Personal Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input
                        value={form.firstName}
                        onChange={(e) => onChange('firstName', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                      <input
                        value={form.lastName}
                        onChange={(e) => onChange('lastName', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => onChange('email', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                      <input
                        value={form.mobile}
                        onChange={(e) => onChange('mobile', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        value={form.gender}
                        onChange={(e) => onChange('gender', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => onChange('dob', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={form.weight}
                      onChange={(e) => onChange('weight', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                      placeholder="e.g. 75"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Membership</h3>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Assign Pack</label>
                      <select
                        value={form.packId}
                        onChange={(e) => onChange('packId', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                      >
                        <option value="">-- No pack --</option>
                        {packs.map((p) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => onChange('startDate', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Auto-calculated)</label>
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 flex items-center gap-2">
                        <Calendar size={14} />
                        {computedEnd || (selectedPack?.durationType === 'sessions' ? 'Sessions-based' : 'Select a pack')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/25 disabled:opacity-70"
                >
                  {submitting ? 'Saving...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}












