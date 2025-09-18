import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Pay = {
  _id: string;
  amount: number;
  method?: 'cash' | 'card' | 'upi' | 'bank';
  description?: string;
  createdAt?: string;
  status?: 'paid' | 'refunded' | 'cancelled' | string;
  userId?: { _id: string; userId: string; firstName?: string; lastName?: string };
  // line items stored in meta.items
  meta?: { items?: { name: string; qty: number; price: number }[] };
};

export default function Sales() {
  const [rows, setRows] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (q) params.q = q;
      if (method) params.method = method;
      if (from) params.from = from;
      if (to) params.to = to;

      const { data } = await api.get('/payments/sales', { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to load sales';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportCSV() {
    try {
      const params: any = {};
      if (q) params.q = q;
      if (method) params.method = method;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await api.get('/payments/sales/export/csv', {
        params,
        responseType: 'blob',
      });

      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplement_sales_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Export failed';
      alert(msg);
    }
  }

  async function markStatus(id: string, status: 'refunded' | 'cancelled') {
    if (!confirm(`Mark as ${status}?`)) return;
    try {
      await api.patch(`/payments/${id}/status`, { status });
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Update failed';
      alert(msg);
    }
  }

  function statusClass(s?: string) {
    if (s === 'refunded') return 'bg-red-100 text-red-700';
    if (s === 'cancelled') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-700'; // paid/default
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplement Orders</h1>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold">₹{total.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
          placeholder="Search description or member…"
          className="rounded-xl border px-3 py-2"
          style={{ minWidth: 280 }}
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-xl border px-3 py-2"
        >
          <option value="">All methods</option>
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank">Bank Transfer</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border px-3 py-2"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border px-3 py-2"
        />
        <button onClick={load} className="px-3 py-2 rounded-xl border">
          Apply
        </button>
        <button onClick={exportCSV} className="px-3 py-2 rounded-xl border">
          Export CSV
        </button>
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No orders found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Description & Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const u = p.userId;
                const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '—';
                const disableRefund = p.status === 'refunded' || p.status === 'cancelled';
                const disableCancel = p.status === 'cancelled' || p.status === 'refunded';
                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-4 py-3">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {u ? (
                        <Link className="text-blue-600 hover:underline" to={`/users/${u._id}`}>
                          {name || u.userId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{u?.userId || '—'}</td>
                    <td className="px-4 py-3">₹{(p.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{p.method || '—'}</td>
                    <td className="px-4 py-3">
                      <div>{p.description || '—'}</div>
                      {p.meta?.items?.length ? (
                        <ul className="mt-1 text-xs text-gray-600 list-disc pl-5">
                          {p.meta.items.map((it, i) => (
                            <li key={i}>
                              {it.name} × {it.qty} @ ₹{it.price}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusClass(p.status)}`}>
                        {p.status || 'paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => markStatus(p._id, 'refunded')}
                          disabled={disableRefund}
                          className={`text-xs rounded-lg border px-2 py-1 ${
                            disableRefund ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Refund
                        </button>
                        <button
                          onClick={() => markStatus(p._id, 'cancelled')}
                          disabled={disableCancel}
                          className={`text-xs rounded-lg border px-2 py-1 ${
                            disableCancel ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
