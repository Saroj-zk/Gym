import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, UserCheck, Smartphone, Search, X, Clock, MapPin, Scan, Filter } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

type Att = {
  _id: string;
  userId: any;
  timestamp: string;
  method: 'qr' | 'manual' | 'kiosk' | 'face';
  deviceId?: string;
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

export default function Attendance() {
  const [items, setItems] = useState<Att[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [limit, setLimit] = useState(200);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ userId: '', method: 'manual', deviceId: '' });

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params: any = { limit };
      if (from) params.from = from;
      if (to) params.to = to;
      if (selectedUser?._id) params.userId = selectedUser._id;

      const { data } = await api.get('/attendance', { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(getErr(e, 'Failed to load attendance'));
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
      /* ignore */
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

  async function markAttendance(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!form.userId) throw new Error('User is required');
      await api.post('/attendance/mark', {
        userId: form.userId,
        method: form.method,
        deviceId: form.deviceId || undefined,
      });
      setOpen(false);
      setForm({ userId: '', method: 'manual', deviceId: '' });
      await load();
    } catch (e: any) {
      setError(getErr(e, 'Failed to mark attendance'));
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(() => items.length, [items]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-slate-500 mt-1">Monitor member visits and peak hours.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <UserCheck size={18} />
          Manual Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                        {u.firstName} {u.lastName} <span className="text-slate-400 text-xs">({u.userId})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-1">
                <button onClick={load} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                  <Filter size={14} />
                  Apply
                </button>
              </div>
            </div>
          </div>

          {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Clock size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No check-ins found</h3>
              <p className="text-slate-500 mt-1">Try adjusting the date range or user filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-left">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-700">Time</th>
                      <th className="px-6 py-4 font-semibold text-slate-700">User</th>
                      <th className="px-6 py-4 font-semibold text-slate-700">Method</th>
                      <th className="px-6 py-4 font-semibold text-slate-700">Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-xs text-slate-500">{new Date(a.timestamp).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {a?.userId?.userId ? (
                            <div>
                              <div>{[a.userId.firstName, a.userId.lastName].filter(Boolean).join(' ')}</div>
                              <div className="text-xs text-slate-500">ID: {a.userId.userId}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown User</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700 border border-slate-200">
                            {a.method === 'qr' && <Scan size={12} />}
                            {a.method === 'manual' && <UserCheck size={12} />}
                            {a.method === 'kiosk' && <Smartphone size={12} />}
                            {a.method === 'face' && <UserCheck size={12} />}
                            {a.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {a.deviceId ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {a.deviceId}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <PeakHours />

          <div className="bg-brand-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand-800 rounded-full opacity-50 blur-2xl"></div>
            <h3 className="text-lg font-bold relative z-10">Total Check-ins</h3>
            <p className="text-brand-200 text-sm mt-1 relative z-10">In selected period</p>
            <div className="text-4xl font-bold mt-4 relative z-10">{total}</div>
          </div>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Manual Check-in</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={markAttendance} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select User <span className="text-red-500">*</span></label>
                  <UserSelect value={form.userId} onChange={(id) => onChange('userId', id)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                  <select
                    value={form.method}
                    onChange={(e) => onChange('method', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="qr">QR Code</option>
                    <option value="kiosk">Kiosk</option>
                    <option value="face">Face Recognition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Device ID</label>
                  <input
                    value={form.deviceId}
                    onChange={(e) => onChange('deviceId', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="e.g. FrontDesk"
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
                  {saving ? 'Saving...' : 'Mark Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PeakHours() {
  const [data, setData] = useState<{ hour: number; count: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/reports/attendance/peaks');
        setData(data?.byHour || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (!data.length) return null;
  const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Clock size={64} className="text-brand-600" />
      </div>
      <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Peak Hour</div>
      <div className="text-4xl font-bold text-slate-900 mt-2">{peak.hour}:00</div>
      <div className="text-sm text-slate-500 mt-1">Busiest time of the day</div>
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

  async function search(text: string) {
    setQ(text);
    if (text.trim().length < 2) {
      setOptions([]);
      return;
    }
    try {
      const { data } = await api.get('/users', { params: { q: text } });
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
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
            <div key={u._id} onClick={() => select(u)} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0">
              <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
              <div className="text-xs text-slate-500">ID: {u.userId} {u.mobile ? `• ${u.mobile}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
