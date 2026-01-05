import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Filter, Download, Search, X, FileText, AlertCircle, CheckCircle, Ban, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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
    if (s === 'refunded') return 'bg-red-50 text-red-700 border border-red-100';
    if (s === 'cancelled') return 'bg-orange-50 text-orange-800 border border-orange-100';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100'; // paid/default
  }

  function statusIcon(s?: string) {
    if (s === 'refunded') return <RefreshCw size={12} />;
    if (s === 'cancelled') return <Ban size={12} />;
    return <CheckCircle size={12} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Supplement Orders</h1>
          <p className="text-slate-500 mt-1">Track product sales and revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Revenue</div>
            <div className="text-xl font-bold text-slate-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <button
            onClick={exportCSV}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors h-[54px]"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') load();
                }}
                placeholder="Search member or description..."
                className="w-full pl-9 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full sm:w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">All</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank">Transfer</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>
            <div className="self-end mb-2 text-slate-400">-</div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors ml-auto sm:ml-0">
            <Filter size={14} />
            Apply
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShoppingCart size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
          <p className="text-slate-500 mt-1">Try changing filters or record a new sale.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Date/Time</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Member</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Method</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 w-1/3">Items</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => {
                  const u = p.userId;
                  const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '—';
                  const disableRefund = p.status === 'refunded' || p.status === 'cancelled';
                  const disableCancel = p.status === 'cancelled' || p.status === 'refunded';
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u ? (
                          <Link className="group flex flex-col" to={`/users/${u._id}`}>
                            <span className="font-medium text-slate-700 group-hover:text-brand-600 transition-colors">{name}</span>
                            <span className="text-xs text-slate-400 group-hover:text-brand-500 transition-colors">{u.userId}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in Customer</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">₹{(p.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 capitalize">
                          {p.method || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600 text-sm mb-1">{p.description || '—'}</div>
                        {p.meta?.items?.length ? (
                          <ul className="space-y-1">
                            {p.meta.items.map((it, i) => (
                              <li key={i} className="text-xs text-slate-500 flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                <span className="font-medium text-slate-700">{it.name}</span>
                                <span className="text-slate-400">x{it.qty}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass(p.status)} capitalize`}>
                          {statusIcon(p.status)}
                          {p.status || 'paid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!disableRefund && (
                            <button
                              onClick={() => markStatus(p._id, 'refunded')}
                              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                              title="Refund Order"
                            >
                              Refund
                            </button>
                          )}
                          {!disableCancel && (
                            <button
                              onClick={() => markStatus(p._id, 'cancelled')}
                              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          )}
                          {(disableRefund && disableCancel) && (
                            <span className="text-xs text-slate-400 italic">No actions</span>
                          )}
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
    </div>
  );
}
