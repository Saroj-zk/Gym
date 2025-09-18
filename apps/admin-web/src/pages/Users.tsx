import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl border">
            Export CSV
          </button>
          <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-black text-white">
            Add User
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
          className="rounded-xl border px-3 py-2"
          placeholder="Search name, user ID, email, mobile"
          style={{ minWidth: '280px' }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={load} className="px-3 py-2 rounded-xl border">
          Apply
        </button>
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No users yet. Click <span className="font-semibold">Add User</span> to create a member.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Membership</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const m = memberships[u._id];
                const packName =
                  m && typeof m.packId === 'object' && (m.packId as Pack).name
                    ? (m.packId as Pack).name
                    : typeof m?.packId === 'string'
                    ? (m.packId as string)
                    : '-';
                const end = m?.endDate
                  ? new Date(m.endDate).toLocaleDateString()
                  : m && (m.packId as any)?.durationType === 'sessions'
                  ? 'sessions-based'
                  : '-';
                return (
                  <tr key={u._id} className="border-t">
                    <td className="px-4 py-3">{u.userId}</td>
                    <td className="px-4 py-3">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-3">{u.mobile || u.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center px-2 py-1 rounded-full text-xs ' +
                          (u.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : u.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : u.status === 'suspended'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-200 text-gray-700')
                        }
                      >
                        {u.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {packName} {end ? `· ends ${end}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <Link to={`/users/${u._id}`} className="text-blue-600 hover:underline">
                        View
                      </Link>
                      <button
                        onClick={() => removeUser(u)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add User</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">First Name</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Last Name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pack (optional)</label>
                    <select
                      value={form.packId}
                      onChange={(e) => setForm((f) => ({ ...f, packId: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">-- No pack --</option>
                      {packs.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date (auto)</label>
                    <input
                      value={
                        computedEnd ||
                        (selectedPack?.durationType === 'sessions' ? 'sessions-based' : '')
                      }
                      readOnly
                      className="w-full rounded-xl border px-3 py-2 bg-gray-50"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  End date is calculated from the selected pack and start date. It will be saved on
                  the membership automatically.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-black text-white"
                >
                  {submitting ? 'Saving…' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
