import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, X, Calendar, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type Appointment = {
    _id: string;
    type: string;
    memberName?: string;
    providerName?: string;
    date: string;
    timeSlot: string;
    status: string;
    notes?: string;
};

const TYPES = ['physio', 'pt', 'gynecologist', 'consultation'];

const emptyForm = {
    type: 'consultation',
    userId: '', // Optional, for simplicity focusing on manual entry or existing user ID
    memberName: '', // If no userID, maybe just a name
    providerName: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:00',
    notes: ''
};

export default function Appointments() {
    const [items, setItems] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);

    // Search members for autocomplete could be complex, for now simple ID or manual name
    // Actually the backend takes `userId` to fetch name. Let's provide a User ID input.

    useEffect(() => {
        load();
    }, [filterType]);

    async function load() {
        try {
            setLoading(true);
            const res = await api.get('/appointments', { params: { type: filterType || undefined } });
            setItems(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/appointments', form);
            setOpen(false);
            setForm({ ...emptyForm });
            load();
        } catch (e) {
            alert('Failed to book appointment');
        } finally {
            setSubmitting(false);
        }
    }

    async function updateStatus(id: string, status: string) {
        if (!window.confirm(`Mark as ${status}?`)) return;
        try {
            await api.patch(`/appointments/${id}`, { status });
            load();
        } catch (e) { alert('Failed to update'); }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Appointments</h1>
                    <p className="text-slate-500 mt-1">Manage consultations and sessions.</p>
                </div>
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} />
                    Book Appointment
                </button>
            </div>

            <div className="flex gap-2 pb-2">
                <button onClick={() => setFilterType('')} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", !filterType ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600")}>
                    All
                </button>
                {TYPES.map(t => (
                    <button key={t} onClick={() => setFilterType(t)} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize", filterType === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600")}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(apt => (
                    <div key={apt._id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-xl",
                                apt.type === 'physio' ? "bg-blue-100 text-blue-600" :
                                    apt.type === 'pt' ? "bg-orange-100 text-orange-600" :
                                        apt.type === 'gynecologist' ? "bg-pink-100 text-pink-600" :
                                            "bg-slate-100 text-slate-600"
                            )}>
                                {apt.type === 'physio' ? '🩺' : apt.type === 'pt' ? '💪' : apt.type === 'gynecologist' ? '⚕️' : '📅'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">{apt.memberName || 'Guest'}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                    <span className="capitalize font-medium text-slate-700">{apt.type}</span>
                                    <span>with {apt.providerName || 'Staff'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                                    <Calendar size={12} /> {apt.date}
                                    <Clock size={12} className="ml-2" /> {apt.timeSlot}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                                apt.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                                    apt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                        apt.status === 'completed' ? "bg-slate-100 text-slate-700" :
                                            "bg-amber-100 text-amber-700"
                            )}>
                                {apt.status}
                            </span>
                            {apt.status === 'pending' && (
                                <div className="flex gap-1 mt-2">
                                    <button onClick={() => updateStatus(apt._id, 'confirmed')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Confirm">
                                        <CheckCircle size={18} />
                                    </button>
                                    <button onClick={() => updateStatus(apt._id, 'cancelled')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Cancel">
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                            {apt.status === 'confirmed' && (
                                <button onClick={() => updateStatus(apt._id, 'completed')} className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg mt-2">
                                    Complete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        No appointments found.
                    </div>
                )}
            </div>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
                        <form onSubmit={create} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-brand-500"
                                        value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                    >
                                        {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User ID (Optional)</label>
                                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                                        placeholder="Member ID"
                                        value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provider Name</label>
                                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                                    placeholder="e.g. Dr. Smith"
                                    value={form.providerName} onChange={e => setForm({ ...form, providerName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                                        required
                                        value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time Slot</label>
                                    <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                                        required
                                        value={form.timeSlot} onChange={e => setForm({ ...form, timeSlot: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500"
                                    rows={3}
                                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg">Confirm Booking</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
