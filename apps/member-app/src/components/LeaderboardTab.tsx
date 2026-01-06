import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Trophy, Medal, User as UserIcon } from 'lucide-react';

export function LeaderboardTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/users/leaderboard')
            .then(res => setUsers(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-['Rajdhani'] uppercase">Leaderboard</h1>
                <p className="text-slate-500 text-sm">Top performers this month based on gym visits.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No data available for this month yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {users.map((u, i) => (
                            <div key={u._id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-xl 
                  ${i === 0 ? 'bg-yellow-100 text-yellow-600' :
                                        i === 1 ? 'bg-slate-100 text-slate-600' :
                                            i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                    {i + 1}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">{u.firstName} {u.lastName}</p>
                                        {i < 3 && <Medal className="w-4 h-4 fill-current text-yellow-500" />}
                                    </div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Member #{u.userId}</p>
                                </div>

                                <div className="text-right">
                                    <span className="text-lg font-black text-slate-900 font-['Rajdhani']">{u.count}</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">CHECK-INS</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
