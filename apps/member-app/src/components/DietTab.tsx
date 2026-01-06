import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Flame, Utensils, Check } from 'lucide-react';

export function DietTab({ userId }: { userId: string }) {
    const [log, setLog] = useState<any>(null);
    const [foods, setFoods] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [weight, setWeight] = useState("");
    const [mode, setMode] = useState<'view' | 'add'>('view');

    useEffect(() => {
        loadLog();
    }, [userId]);

    function loadLog() {
        const today = new Date().toISOString().split('T')[0];
        api.get('/diet/logs', { params: { userId, date: today } })
            .then(res => {
                setLog(res.data);
                if (res.data?.weightLogged) setWeight(res.data.weightLogged);
            })
            .catch(() => { });
    }

    function searchFoods() {
        api.get('/diet/foods', { params: { q } }).then(res => setFoods(res.data));
    }

    useEffect(() => {
        if (mode === 'add') searchFoods();
    }, [mode, q]);

    async function addFood(food: any) {
        const today = new Date().toISOString().split('T')[0];
        await api.post('/diet/logs/item', {
            userId,
            date: today,
            items: [{
                foodName: food.name,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                qty: 1
            }]
        });
        setMode('view');
        loadLog();
    }

    async function updateWeight() {
        await api.post('/diet/weight', { userId, weight: Number(weight) });
        loadLog(); // reload to sync
    }

    // BMR Calc (Mifflin-St Jeor approx) (generic fallback)
    const maintenance = weight ? Math.round(Number(weight) * 24 * 1.2) : 2000;
    const current = log?.totalCalories || 0;
    const progress = Math.min((current / maintenance) * 100, 100);

    if (mode === 'add') {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setMode('view')} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                        &larr; BACK
                    </button>
                    <h2 className="text-xl font-bold font-['Rajdhani'] uppercase">Add Food</h2>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 focus:outline-none focus:border-slate-900 font-bold"
                        placeholder="Search foods..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="space-y-3">
                    {foods.map(f => (
                        <div key={f._id} onClick={() => addFood(f)} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors">
                            <div>
                                <p className="font-bold text-slate-900">{f.name}</p>
                                <p className="text-xs text-slate-500">{f.calories} kcal • {f.protein}g P • {f.carbs}g C</p>
                            </div>
                            <Plus className="w-5 h-5 text-emerald-600" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calorie Card */}
                <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-3xl font-black font-['Rajdhani']">{current}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Calories Consumed</p>
                        </div>
                        <div className="text-right opacity-50">
                            <h2 className="text-xl font-bold font-['Rajdhani']">/ {maintenance}</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Daily Target</p>
                        </div>
                    </div>

                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button onClick={() => setMode('add')} className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-emerald-50 transition-colors">
                            + Log Food
                        </button>
                    </div>
                </div>

                {/* Weight Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Current Weight</h3>
                        <p className="text-xs text-slate-500 mb-6">Update to recalculate needs.</p>

                        <div className="flex items-baseline gap-2">
                            <input
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                className="w-24 text-4xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-transparent font-['Rajdhani']"
                                placeholder="0"
                            />
                            <span className="text-sm font-bold text-slate-400">KG</span>
                        </div>
                    </div>

                    <button onClick={updateWeight} className="mt-6 w-full py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">
                        UPDATE STATS
                    </button>
                </div>
            </div>

            {/* Log History */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 font-['Rajdhani'] uppercase">Today's Logs</h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-2 space-y-1">
                    {log?.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Utensils size={14} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">{item.foodName}</span>
                                <span className="text-xs text-slate-400">x{item.qty}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">{item.calories * item.qty} kcal</span>
                        </div>
                    ))}
                    {(!log?.items || log.items.length === 0) && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No food logged today. Start tracking!
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
