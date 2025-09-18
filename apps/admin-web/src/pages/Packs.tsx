import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

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
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to load packs';
      setError(String(msg));
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
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to create pack';
      setError(String(msg));
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
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to update pack';
      setError(String(msg));
    }
  }

  const hasData = useMemo(() => packs.length > 0, [packs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Packs</h1>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-black text-white">
          New Pack
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading packs…</div>
      ) : !hasData ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No packs yet. Click <span className="font-semibold">New Pack</span> to create your first membership plan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Features</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.durationValue} {p.durationType}
                  </td>
                  <td className="px-4 py-3">₹{p.price}</td>
                  <td className="px-4 py-3">{(p.features || []).join(', ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex items-center px-2 py-1 rounded-full text-xs ' +
                        (p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700')
                      }
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)} className="text-blue-600 hover:underline">
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">New Pack</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>
            <form onSubmit={createPack} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Monthly Standard"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => onChange('price', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="1200"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Duration Type</label>
                <select
                  value={form.durationType}
                  onChange={(e) => onChange('durationType', e.target.value as any)}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="months">months</option>
                  <option value="days">days</option>
                  <option value="sessions">sessions</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Duration Value</label>
                <input
                  type="number"
                  value={form.durationValue}
                  onChange={(e) => onChange('durationValue', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  rows={3}
                  placeholder="Access to all equipment"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Features (comma-separated)</label>
                <input
                  value={form.featuresCsv}
                  onChange={(e) => onChange('featuresCsv', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="cardio, weights, sauna"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange('isActive', e.target.checked)}
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-black text-white">
                  {submitting ? 'Saving…' : 'Save Pack'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
