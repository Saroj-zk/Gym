import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

const TYPES = ['physio', 'pt', 'gynecologist', 'consultation'];

export function AppointmentsTab({ userId }: { userId: string }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'view' | 'book'>('view');

    const [form, setForm] = useState({
        type: 'consultation',
        userId: userId,
        date: new Date().toISOString().split('T')[0],
        timeSlot: '10:00',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        load();
    }, [userId]);

    async function load() {
        try {
            setLoading(true);
            const res = await api.get('/appointments', { params: { userId } });
            setItems(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function book(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/appointments', { ...form, userId }); // Ensure userId is passed
            setMode('view');
            load();
        } catch (e) {
            alert('Booking failed');
        } finally {
            setSubmitting(false);
        }
    }

    if (mode === 'book') {
        return (
            <div className="max-w-xl mx-auto">
                <button onClick={() => setMode('view')} className="text-sm font-bold text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-1">
                    &larr; BACK
                </button>
                <h2 className="text-2xl font-bold font-['Rajdhani'] uppercase mb-6 text-slate-900">Book Appointment</h2>

                <form onSubmit={book} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Appointment Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPES.map(t => (
                                <div key={t}
                                    onClick={() => setForm({ ...form, type: t })}
                                    className={clsx("p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center font-bold text-sm uppercase",
                                        form.type === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input type="date" className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                            <input type="time" className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                                required
                                value={form.timeSlot} onChange={e => setForm({ ...form, timeSlot: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                        <textarea className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-900"
                            rows={3}
                            placeholder="Any specific requests?"
                            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <button type="submit" disabled={submitting} className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                        {submitting ? 'Booking...' : 'Confirm Booking'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-['Rajdhani'] uppercase">My Appointments</h1>
                    <p className="text-slate-500 text-sm">Manage your consultations and sessions.</p>
                </div>
                <button onClick={() => setMode('book')} className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2">
                    <Plus size={18} />
                    BOOK NEW
                </button>
            </div>

            <div className="space-y-3">
                {items.map(apt => (
                    <div key={apt._id} className="bg-白 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-auto",
                                apt.type === 'physio' ? "bg-blue-50 text-blue-500" :
                                    apt.type === 'pt' ? "bg-orange-50 text-orange-500" :
                                        apt.type === 'gynecologist' ? "bg-pink-50 text-pink-500" :
                                            "bg-slate-50 text-slate-500"
                            )}>
                                {apt.type === 'physio' ? '🩺' : apt.type === 'pt' ? '💪' : apt.type === 'gynecologist' ? '⚕️' : '📅'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg capitalize">{apt.type}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium mt-1">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {apt.date}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> {apt.timeSlot}</span>
                                </div>
                                {apt.providerName && <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wide">With {apt.providerName}</p>}
                            </div>
                        </div>

                        <div className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                            apt.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                                apt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                    apt.status === 'completed' ? "bg-slate-100 text-slate-700" :
                                        "bg-amber-100 text-amber-700"
                        )}>
                            {apt.status}
                        </div>
                    </div>
                ))}
                {items.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                        You have no upcoming appointments.
                    </div>
                )}
            </div>
        </div>
    );
}
