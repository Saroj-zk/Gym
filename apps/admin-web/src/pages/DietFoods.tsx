import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Search, Plus, Trash2, Utensils, X, Info } from 'lucide-react';
import { clsx } from 'clsx';

type DietFood = {
    _id: string;
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    category?: string;
};

const emptyForm = {
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    category: 'General',
};

export default function DietFoods() {
    const [items, setItems] = useState<DietFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        load();
    }, [q]);

    async function load() {
        try {
            setLoading(true);
            const res = await api.get('/diet/foods', { params: { q } });
            setItems(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/diet/foods', {
                name: form.name,
                calories: Number(form.calories),
                protein: Number(form.protein || 0),
                carbs: Number(form.carbs || 0),
                fats: Number(form.fats || 0),
                category: form.category
            });
            setOpen(false);
            setForm({ ...emptyForm });
            load();
        } catch (e) {
            alert('Failed to create food');
        } finally {
            setSubmitting(false);
        }
    }

    // Since we don't have a delete route yet in the diet router shown previously, 
    // I'll assume I might need to add it or just omit for now.
    // The previous edit to diet.ts only showed GET and POST.
    // I should probably add DELETE /diet/foods/:id to backend if I want delete here.
    // For now, I will omit the delete action or just stub it.

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Diet Foods</h1>
                    <p className="text-slate-500 mt-1">Manage food database for calorie tracking.</p>
                </div>
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} />
                    Add Food
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                <Search size={18} className="text-slate-400 my-auto ml-2" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search foods..."
                    className="flex-1 outline-none text-sm"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-left">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Calories</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Macros (P/C/F)</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Category</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                            <tr key={item._id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                                <td className="px-6 py-4">{item.calories} kcal</td>
                                <td className="px-6 py-4 text-slate-500">
                                    {item.protein}g / {item.carbs}g / {item.fats}g
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                                        {item.category || 'General'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">No foods found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setOpen(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">Add Diet Food</h2>
                        <form onSubmit={create} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Calories</label>
                                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                        required
                                        value={form.calories}
                                        onChange={e => setForm({ ...form, calories: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Protein (g)</label>
                                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                        value={form.protein}
                                        onChange={e => setForm({ ...form, protein: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carbs (g)</label>
                                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                        value={form.carbs}
                                        onChange={e => setForm({ ...form, carbs: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fats (g)</label>
                                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-500 outline-none"
                                        value={form.fats}
                                        onChange={e => setForm({ ...form, fats: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg">Save Food</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
