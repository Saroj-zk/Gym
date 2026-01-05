import React, { useEffect, useState } from 'react';
import { Package, Plus, Edit, CheckCircle, XCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

type Pack = {
  _id: string;
  name: string;
  durationType: 'days' | 'months' | 'sessions';
  durationValue: number;
  price: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
  createdAt?: string;
};

const emptyForm = {
  name: '',
  durationType: 'months' as const,
  durationValue: 1,
  price: 0,
  description: '',
  featuresCsv: '',
  isActive: true,
};

function getErr(e: any, fallback = 'Request failed') {
  return (
    e?.response?.data?.error ??
    (typeof e?.response?.data === 'string' ? e.response.data : '') ??
    e?.message ??
    fallback
  );
}

export default function Packs() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  async function load() {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/packs');
      setPacks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(getErr(e, 'Failed to load packs'));
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

  async function createPack(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        durationType: form.durationType,
        durationValue: Number(form.durationValue),
        price: Number(form.price),
        description: form.description?.trim() || undefined,
        features: form.featuresCsv
          ? form.featuresCsv.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        isActive: form.isActive,
      };
      if (!payload.name) throw new Error('Name is required');
      if (!payload.durationValue || payload.durationValue <= 0)
        throw new Error('Duration value must be > 0');

      await api.post('/packs', payload);
      setOpen(false);
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      setError(getErr(e, 'Failed to create pack'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(pack: Pack) {
    try {
      setError('');
      await api.patch(`/packs/${pack._id}`, { isActive: !pack.isActive });
      await load();
    } catch (e: any) {
      setError(getErr(e, 'Failed to update pack'));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Membership Packs</h1>
          <p className="text-slate-500 mt-1">Configure subscription plans and pricing.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={18} />
          Create Pack
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : packs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No packs found</h3>
          <p className="text-slate-500 mt-1 mb-6">Create a new membership pack to get started.</p>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus size={16} />
            Create Pack
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Duration</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Price</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Features</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packs.map((p) => (
                  <tr key={p._id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.durationValue} <span className="capitalize">{p.durationType}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₹{p.price.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.features?.slice(0, 2).map((f, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{f}</span>
                        ))}
                        {(p.features?.length || 0) > 2 && (
                          <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-md border border-slate-100">+{p.features!.length - 2} more</span>
                        )}
                        {!p.features?.length && <span className="text-slate-400 italic text-xs">No features</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        p.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                      )}>
                        {p.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(p)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                          p.isActive
                            ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-brand-50 border-brand-100 text-brand-700 hover:bg-brand-100"
                        )}
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {/* Edit button could go here */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Create New Pack</h2>
                <p className="text-sm text-slate-500">Add a new membership plan to the system.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={createPack} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pack Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="e.g. Gold Monthly"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => onChange('price', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={form.durationValue}
                      onChange={(e) => onChange('durationValue', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <select
                      value={form.durationType}
                      onChange={(e) => onChange('durationType', e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                    >
                      <option value="months">Months</option>
                      <option value="days">Days</option>
                      <option value="sessions">Sessions</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                    rows={3}
                    placeholder="Brief details about this pack..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Features</label>
                  <input
                    value={form.featuresCsv}
                    onChange={(e) => onChange('featuresCsv', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="e.g. Cardio, Sauna, Personal Trainer (comma separated)"
                  />
                  <p className="text-xs text-slate-500 mt-1">Separate multiple features with commas.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-900 cursor-pointer select-none">
                  Active for new sales
                </label>
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
                  {submitting ? 'Creating...' : 'Create Pack'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
