import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type Supplement = {
  _id: string;
  name: string;
  sku?: string;
  category?: string;
  supplier?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stockQty?: number;
  unit?: string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
};

const emptyForm: Partial<Supplement> = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  purchasePrice: 0,
  sellingPrice: 0,
  stockQty: 0,
  unit: 'pieces',
  imageUrl: '',
  description: '',
  isActive: true,
};

export default function Supplements() {
  const [items, setItems] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState<'all'|'true'|'false'>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [lowThreshold, setLowThreshold] = useState(5);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const [form, setForm] = useState<Partial<Supplement>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true); setError('');
      const params: any = {};
      if (q) params.q = q;
      if (category) params.category = category;
      if (active !== 'all') params.active = active;
      if (lowOnly) { params.lowStock = true; params.threshold = lowThreshold; }

      const res = await axios.get('/api/supplements', { params });
      setItems(res.data || []);
    } catch (e:any) {
      setError(e?.response?.data?.error || e.message || 'Failed to load supplements');
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load() }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => i.category && s.add(i.category));
    return Array.from(s).sort();
  }, [items]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }
  function openEdit(it: Supplement) {
    setEditing(it);
    setForm({ ...it });
    setOpen(true);
  }

  async function save() {
    try {
      setSaving(true);
      const payload = {
        name: String(form.name || '').trim(),
        sku: form.sku?.trim() || undefined,
        category: form.category?.trim() || undefined,
        supplier: form.supplier?.trim() || undefined,
        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        stockQty: Number(form.stockQty || 0),
        unit: form.unit || 'pieces',
        imageUrl: form.imageUrl?.trim() || undefined,
        description: form.description?.trim() || undefined,
        isActive: form.isActive !== false,
      };
      if (!payload.name) throw new Error('Name is required');

      if (editing) {
        await axios.put(`/api/supplements/${editing._id}`, payload);
      } else {
        await axios.post('/api/supplements', payload);
      }
      setOpen(false);
      await load();
    } catch (e:any) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(it: Supplement, delta: number) {
    try {
      await axios.patch(`/api/supplements/${it._id}/stock`, { delta });
      await load();
    } catch (e:any) {
      alert(e?.response?.data?.error || e.message || 'Stock update failed');
    }
  }

  async function setStockAbsolute(it: Supplement) {
    const v = prompt(`Set stock for "${it.name}" to:`, String(it.stockQty ?? 0));
    if (v == null) return;
    const absolute = Number(v);
    if (!Number.isFinite(absolute) || absolute < 0) return alert('Enter a non-negative number');
    try {
      await axios.patch(`/api/supplements/${it._id}/stock`, { absolute });
      await load();
    } catch (e:any) {
      alert(e?.response?.data?.error || e.message || 'Stock update failed');
    }
  }

  async function toggleActive(it: Supplement) {
    if (it.isActive) {
      if (!confirm(`Deactivate "${it.name}"?`)) return;
      await axios.delete(`/api/supplements/${it._id}`);
    } else {
      await axios.put(`/api/supplements/${it._id}`, { isActive: true });
    }
    await load();
  }

  async function exportCSV() {
    try {
      const params: any = {};
      if (q) params.q = q;
      if (category) params.category = category;
      if (active !== 'all') params.active = active;
      if (lowOnly) { params.lowStock = true; params.threshold = lowThreshold; }
      const res = await axios.get('/api/supplements/export/csv', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplements_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e:any) {
      alert(e?.response?.data?.error || e.message || 'Export failed');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplements</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl border">Export CSV</button>
          <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-black text-white">Add Supplement</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          onKeyDown={e=>{ if (e.key === 'Enter') load() }}
          placeholder="Search name, SKU, category, supplier"
          className="rounded-xl border px-3 py-2"
          style={{ minWidth: 280 }}
        />
        <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={active} onChange={e=>setActive(e.target.value as any)} className="rounded-xl border px-3 py-2">
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} />
          Low stock only
        </label>
        <input
          type="number"
          min={0}
          value={lowThreshold}
          onChange={e=>setLowThreshold(Math.max(0, Number(e.target.value)))}
          className="w-24 rounded-xl border px-3 py-2 text-sm"
          title="Low stock threshold"
        />
        <button onClick={load} className="px-3 py-2 rounded-xl border">Apply</button>
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No supplements found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(it => {
            const low = (it.stockQty ?? 0) <= lowThreshold;
            return (
              <div key={it._id} className="rounded-2xl bg-white shadow p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                  {it.imageUrl ? (
                    // eslint-disable-next-line
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-xs text-gray-500">No image</div>
                  )}
                  {low && <span className="absolute -top-2 -right-2 text-[10px] px-2 py-1 rounded-full bg-red-600 text-white">LOW</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium line-clamp-1">{it.name}</div>
                    <span className={`text-xs px-2 py-1 rounded-lg ${
                      it.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{it.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {it.category || '—'}{it.sku ? ` • SKU ${it.sku}` : ''}
                  </div>
                  <div className="mt-2 text-sm">
                    {typeof it.sellingPrice === 'number' ? `₹${it.sellingPrice}` : '—'} · Stock: {it.stockQty ?? 0} {it.unit || ''}
                  </div>
                  {it.supplier && <div className="text-xs text-gray-500 mt-1">Supplier: {it.supplier}</div>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={()=>openEdit(it)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button onClick={()=>adjustStock(it, +1)} className="text-sm rounded-lg border px-2 py-1">+1</button>
                    <button onClick={()=>adjustStock(it, -1)} className="text-sm rounded-lg border px-2 py-1">-1</button>
                    <button onClick={()=>setStockAbsolute(it)} className="text-sm rounded-lg border px-2 py-1">Set…</button>
                    <button onClick={()=>toggleActive(it)} className="text-sm text-gray-600 hover:underline">
                      {it.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{editing ? 'Edit Supplement' : 'Add Supplement'}</h2>
              <button onClick={()=>setOpen(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={form.name || ''} onChange={e=>setForm(f=>({...f, name:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">SKU</label>
                <input value={form.sku || ''} onChange={e=>setForm(f=>({...f, sku:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <input value={form.category || ''} onChange={e=>setForm(f=>({...f, category:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                <input value={form.supplier || ''} onChange={e=>setForm(f=>({...f, supplier:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Purchase Price</label>
                <input type="number" min={0} value={form.purchasePrice ?? 0} onChange={e=>setForm(f=>({...f, purchasePrice:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Selling Price</label>
                <input type="number" min={0} value={form.sellingPrice ?? 0} onChange={e=>setForm(f=>({...f, sellingPrice:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Stock Qty</label>
                <input type="number" min={0} value={form.stockQty ?? 0} onChange={e=>setForm(f=>({...f, stockQty:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit</label>
                <input value={form.unit || 'pieces'} onChange={e=>setForm(f=>({...f, unit:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Image URL</label>
                <input value={form.imageUrl || ''} onChange={e=>setForm(f=>({...f, imageUrl:e.target.value}))} className="w-full rounded-xl border px-3 py-2" placeholder="https://…" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e=>setForm(f=>({...f, description:e.target.value}))} rows={4} className="w-full rounded-xl border px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive !== false} onChange={e=>setForm(f=>({...f, isActive:e.target.checked}))} />
                  Active
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={()=>setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
