import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Calendar, Filter, CheckCircle, Download, User as UserIcon, X, Search, Clock, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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

function getErr(e: any, fallback = 'Request failed') {
  return (
    e?.response?.data?.error ??
    (typeof e?.response?.data === 'string' ? e.response.data : '') ??
    e?.message ??
    fallback
  );
}

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
      setError(getErr(e, 'Failed to load payments'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setUserQuery('');
    setUserOptions([]);
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
      setError(getErr(e, 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(() => items.reduce((a, b) => a + (b.amount || 0), 0), [items]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-slate-500 mt-1">Track payments, refunds, and financial records.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <CreditCard size={18} />
          Record Payment
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filter User</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={
                  selectedUser
                    ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''} (${selectedUser.userId})`
                    : userQuery
                }
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search user..."
                className="w-full pl-9 pr-8 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => selectFilterUser(null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {userOptions.length > 0 && !selectedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {userOptions.slice(0, 8).map((u) => (
                  <div
                    key={u._id}
                    onClick={() => selectFilterUser(u)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                  >
                    {u.firstName} {u.lastName} <span className='text-slate-400 text-xs'>({u.userId})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 pt-3">
          <div className="text-sm text-slate-500">
            Total Revenue: <span className="font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</span>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            <Filter size={14} />
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No payments found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters or record a new payment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Date & Time</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">User</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Method</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString()
                          : p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString()
                            : '-'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 pl-6">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : p.createdAt
                            ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {p?.userId?.userId ? (
                        <div>
                          <div>{[p.userId.firstName, p.userId.lastName].filter(Boolean).join(' ')}</div>
                          <div className="text-xs text-slate-500">ID: {p.userId.userId}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unknown User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200">
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                          p.status === 'succeeded'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : p.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : p.status === 'refunded'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : p.status === 'failed'
                                  ? 'bg-red-50 text-red-700 border-red-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        {p.status === 'succeeded' && <CheckCircle size={12} />}
                        {p.status === 'pending' && <Clock size={12} />}
                        {p.status === 'failed' && <AlertCircle size={12} />}
                        <span className="capitalize">{p.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{p.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={savePayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select User <span className="text-red-500">*</span></label>
                  <UserSelect value={form.userId} onChange={(id) => onChange('userId', id)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => onChange('amount', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="0.00"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={form.method}
                    onChange={(e) => onChange('method', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                  <input
                    value={form.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="e.g. Monthly Fee for Jan"
                  />
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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/25 disabled:opacity-70"
                >
                  {saving ? 'Saving...' : 'Record Payment'}
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
    } catch { }
  }

  function select(u: User) {
    setPicked(u);
    onChange(u._id);
    setOptions([]);
    setQ('');
  }

  function clear() {
    setPicked(null);
    setQ('');
    onChange('');
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={picked ? `${picked.firstName || ''} ${picked.lastName || ''} (${picked.userId})` : q}
          onChange={(e) => search(e.target.value)}
          placeholder="Search member by name, mobile, or ID..."
          className="w-full pl-9 pr-8 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
          disabled={!!picked}
        />
        {picked && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {options.length > 0 && !picked && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.slice(0, 8).map((u) => (
            <div
              key={u._id}
              onClick={() => select(u)}
              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
            >
              <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
              <div className="text-xs text-slate-500">ID: {u.userId} {u.mobile ? `• ${u.mobile}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
