import React, { useEffect, useMemo, useState } from 'react';
import { Package, Search, Filter, Plus, Download, Edit, Trash2, Image, Minus, CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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

function getErr(e: any, fallback = 'Request failed') {
  return (
    e?.response?.data?.error ??
    (typeof e?.response?.data === 'string' ? e.response.data : '') ??
    e?.message ??
    fallback
  );
}

export default function Supplements() {
  const [items, setItems] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [lowThreshold, setLowThreshold] = useState(5);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const [form, setForm] = useState<Partial<Supplement>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (q) params.q = q;
      if (category) params.category = category;
      if (active !== 'all') params.active = active;
      if (lowOnly) {
        params.lowStock = true;
        params.threshold = lowThreshold;
      }
      const { data } = await api.get('/supplements', { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(getErr(e, 'Failed to load supplements'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.category && s.add(i.category));
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
        await api.put(`/supplements/${editing._id}`, payload);
      } else {
        await api.post('/supplements', payload);
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      alert(getErr(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(it: Supplement, delta: number) {
    try {
      await api.patch(`/supplements/${it._id}/stock`, { delta });
      await load();
    } catch (e: any) {
      alert(getErr(e, 'Stock update failed'));
    }
  }

  async function setStockAbsolute(it: Supplement) {
    const v = prompt(`Set stock for "${it.name}" to:`, String(it.stockQty ?? 0));
    if (v == null) return;
    const absolute = Number(v);
    if (!Number.isFinite(absolute) || absolute < 0) return alert('Enter a non-negative number');
    try {
      await api.patch(`/supplements/${it._id}/stock`, { absolute });
      await load();
    } catch (e: any) {
      alert(getErr(e, 'Stock update failed'));
    }
  }

  async function toggleActive(it: Supplement) {
    try {
      if (it.isActive) {
        if (!confirm(`Deactivate "${it.name}"?`)) return;
        await api.delete(`/supplements/${it._id}`);
      } else {
        await api.put(`/supplements/${it._id}`, { isActive: true });
      }
      await load();
    } catch (e: any) {
      alert(getErr(e, 'Update failed'));
    }
  }

  async function exportCSV() {
    try {
      const params: any = {};
      if (q) params.q = q;
      if (category) params.category = category;
      if (active !== 'all') params.active = active;
      if (lowOnly) {
        params.lowStock = true;
        params.threshold = lowThreshold;
      }
      const res = await api.get('/supplements/export/csv', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplements_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(getErr(e, 'Export failed'));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Supplements</h1>
          <p className="text-slate-500 mt-1">Manage inventory, stock, and product details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Add Product
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
                placeholder="Search name, SKU, supplier..."
                className="w-full pl-9 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full sm:w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={active}
              onChange={(e) => setActive(e.target.value as any)}
              className="w-full sm:w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2">
              <input
                id="lowStock"
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <label htmlFor="lowStock" className="text-sm font-medium text-slate-700 cursor-pointer select-none">Low Stock Only</label>
            </div>
            {lowOnly && (
              <input
                type="number"
                min={0}
                value={lowThreshold}
                onChange={(e) => setLowThreshold(Math.max(0, Number(e.target.value)))}
                className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs text-center focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                title="Low stock threshold"
              />
            )}
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
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No supplements found</h3>
          <p className="text-slate-500 mt-1">Try adjusting the filters or add a new product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((it) => {
            const low = (it.stockQty ?? 0) <= lowThreshold;
            return (
              <div key={it._id} className="group flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-brand-100 transition-all duration-300">
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {it.imageUrl ? (
                    // eslint-disable-next-line
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Image size={40} className="mb-2 opacity-50" />
                      <span className="text-xs font-medium">No Image</span>
                    </div>
                  )}

                  {low && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <AlertTriangle size={10} /> LOW STOCK
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border",
                      it.isActive ? "bg-white text-emerald-600 border-emerald-100" : "bg-white text-slate-400 border-slate-200"
                    )}>
                      {it.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">{it.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{it.category || 'Uncategorized'}</span>
                      {it.sku && <span>SKU: {it.sku}</span>}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Price</div>
                        <div className="text-lg font-bold text-slate-900">₹{it.sellingPrice?.toLocaleString('en-IN') ?? 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Stock</div>
                        <div className={clsx("text-lg font-bold", low ? "text-red-600" : "text-slate-900")}>
                          {it.stockQty ?? 0} <span className="text-xs font-normal text-slate-500">{it.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                    <button onClick={() => adjustStock(it, -1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Decrease Stock">
                      <Minus size={16} />
                    </button>
                    <button onClick={() => setStockAbsolute(it)} className="flex-1 text-center text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg transition-colors border border-slate-100">
                      Set Stock
                    </button>
                    <button onClick={() => adjustStock(it, 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Increase Stock">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                    <button onClick={() => openEdit(it)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => toggleActive(it)}
                      className={clsx(
                        "p-2 rounded-lg transition-colors",
                        it.isActive ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50"
                      )}
                      title={it.isActive ? "Deactivate" : "Activate"}
                    >
                      {it.isActive ? <Trash2 size={16} /> : <CheckCircle size={16} />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editing ? 'Edit Supplement' : 'Add Supplement'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. Whey Protein Isolate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input
                  value={form.sku || ''}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. SUP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input
                  value={form.category || ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. Protein"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <input
                  value={form.supplier || ''}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. MuscleBlaze"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.purchasePrice ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchasePrice: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.sellingPrice ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sellingPrice: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={form.stockQty ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <input
                  value={form.unit || 'pieces'}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="e.g. tub, packet"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input
                  value={form.imageUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  placeholder="https://..."
                />
                {form.imageUrl && (
                  <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line */}
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                  placeholder="Product details..."
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-900 cursor-pointer select-none">
                  Active Product (Visible in catalog)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/25 disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
