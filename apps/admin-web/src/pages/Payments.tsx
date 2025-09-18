import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Payment = {
  _id: string;
  userId: any;
  membershipId?: string;
  amount: number;
  currency?: string;
  method: 'cash' | 'card' | 'upi' | 'bank' | 'online';
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partial';
  description?: string;
  paidAt?: string;
  createdAt?: string;
};

type User = {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
};

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    amount: '',
    method: 'cash',
    description: '',
  });

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (method) params.method = method;
      if (status) params.status = status;
      if (selectedUser?._id) params.userId = selectedUser._id;

      const { data } = await api.get('/payments', { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to load payments';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lightweight user search for the filter and the record form
  async function searchUsers(q: string) {
    setUserQuery(q);
    if (q.trim().length < 2) {
      setUserOptions([]);
      return;
    }
    try {
      const { data } = await api.get('/users', { params: { q } });
      setUserOptions(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  function selectFilterUser(u: User | null) {
    setSelectedUser(u);
  }

  function onChange<K extends keyof typeof form>(key: K, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        userId: form.userId,
        amount: Number(form.amount),
        method: form.method as any,
        description: form.description || undefined,
      };
      if (!payload.userId) throw new Error('User is required');
      if (!payload.amount || payload.amount <= 0) throw new Error('Amount must be > 0');

      await api.post('/payments/record', payload);
      setOpen(false);
      setForm({ userId: '', amount: '', method: 'cash', description: '' });
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to record payment';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(() => items.reduce((a, b) => a + (b.amount || 0), 0), [items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-black text-white">
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">User</label>
          <div className="relative">
            <input
              value={
                selectedUser
                  ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.userId})`
                  : userQuery
              }
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search name, email, mobile..."
              className="w-full rounded-xl border px-3 py-2"
            />
            {userOptions.length > 0 && !selectedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow">
                {userOptions.slice(0, 8).map((u) => (
                  <div
                    key={u._id}
                    onClick={() => {
                      selectFilterUser(u);
                      setUserOptions([]);
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    {u.firstName} {u.lastName} — {u.userId} {u.mobile ? `· ${u.mobile}` : ''}
                  </div>
                ))}
              </div>
            )}
            {selectedUser && (
              <button
                type="button"
                onClick={() => {
                  selectFilterUser(null);
                  setUserQuery('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="md:col-span-6 flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-xl border">
            Apply
          </button>
          <div className="text-sm text-gray-500 self-center">
            Total: <span className="font-semibold">₹{total}</span>
          </div>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading payments…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No payments found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-3">
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleString()
                      : p.createdAt
                      ? new Date(p.createdAt).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {p?.userId?.userId
                      ? `${p.userId.userId} — ${(p.userId.firstName || '') + ' ' + (p.userId.lastName || '')}`
                      : String(p.userId)}
                  </td>
                  <td className="px-4 py-3">₹{p.amount}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex items-center px-2 py-1 rounded-full text-xs ' +
                        (p.status === 'succeeded'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : p.status === 'refunded'
                          ? 'bg-blue-100 text-blue-700'
                          : p.status === 'partial'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700')
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Record Payment</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={savePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">User</label>
                <UserSelect value={form.userId} onChange={(id) => onChange('userId', id)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => onChange('amount', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Method</label>
                <select
                  value={form.method}
                  onChange={(e) => onChange('method', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Monthly Fee"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white">
                  {saving ? 'Saving…' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<User[]>([]);
  const [picked, setPicked] = useState<User | null>(null);

  useEffect(() => {
    if (!value) setPicked(null);
  }, [value]);

  async function search(q: string) {
    setQ(q);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    try {
      const { data } = await api.get('/users', { params: { q } });
      setOptions(Array.isArray(data) ? data : []);
    } catch {}
  }

  function select(u: User) {
    setPicked(u);
    onChange(u._id);
    setOptions([]);
  }

  function clear() {
    setPicked(null);
    setQ('');
    onChange('');
  }

  return (
    <div className="relative">
      <input
        value={picked ? `${picked.firstName || ''} ${picked.lastName || ''} (${picked.userId})` : q}
        onChange={(e) => search(e.target.value)}
        placeholder="Type to search member…"
        className="w-full rounded-xl border px-3 py-2"
      />
      {options.length > 0 && !picked && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow max-h-64 overflow-auto">
          {options.slice(0, 8).map((u) => (
            <div
              key={u._id}
              onClick={() => select(u)}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              {u.firstName} {u.lastName} — {u.userId} {u.mobile ? `· ${u.mobile}` : ''}
            </div>
          ))}
        </div>
      )}
      {picked && (
        <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
          ✕
        </button>
      )}
    </div>
  );
}
