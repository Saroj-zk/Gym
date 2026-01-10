import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { clsx } from 'clsx';
import { MessageSquare, Check, X, AlertCircle, Activity, Send, Search, Users, UserCheck } from 'lucide-react';

type SimpleUser = {
    _id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    mobile?: string;
    status?: string;
};

export default function Messages() {
    const [activeTab, setActiveTab] = useState<'templates' | 'broadcast'>('templates');
    const [templates, setTemplates] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Broadcast State
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastTarget, setBroadcastTarget] = useState<'active' | 'all' | 'selected'>('active');
    const [broadcastStatus, setBroadcastStatus] = useState<any>(null);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    // User Selection State
    const [userList, setUserList] = useState<SimpleUser[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQ, setSearchQ] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        api.get('/settings/messages')
            .then(res => {
                if (mounted) setTemplates(res.data);
            })
            .catch(err => console.error('Failed to load templates', err))
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    // Load users when "selected" mode is active
    useEffect(() => {
        if (broadcastTarget === 'selected' && userList.length === 0) {
            setUsersLoading(true);
            api.get('/users', { params: { limit: 1000 } }) // Fetch a reasonable batch
                .then(res => setUserList(res.data || []))
                .catch(console.error)
                .finally(() => setUsersLoading(false));
        }
    }, [broadcastTarget, userList.length]);

    const saveTemplates = async () => {
        if (!templates) return;
        setSaving(true);
        setStatusMsg({ type: '', text: '' });
        try {
            await api.put('/settings/messages', templates);
            setStatusMsg({ type: 'success', text: 'Templates updated successfully! ✨' });
            setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
        } catch (e) {
            setStatusMsg({ type: 'error', text: 'Failed to save templates.' });
        } finally {
            setSaving(false);
        }
    };

    const sendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        if (broadcastTarget === 'selected' && selectedIds.size === 0) {
            setBroadcastStatus({ error: true, msg: 'Select at least one member.' });
            return;
        }

        setSaving(true);
        setBroadcastStatus({ loading: true });
        try {
            const payload: any = { message: broadcastMsg, target: broadcastTarget };
            if (broadcastTarget === 'selected') {
                payload.recipients = Array.from(selectedIds);
            }

            const res = await api.post('/settings/broadcast', payload);
            setBroadcastStatus({ success: true, sent: res.data.sent, total: res.data.total });
            setBroadcastMsg('');
            if (broadcastTarget === 'selected') setSelectedIds(new Set());
            setTimeout(() => setBroadcastStatus(null), 10000);
        } catch (e: any) {
            setBroadcastStatus({ error: true, msg: e.response?.data?.error || 'Failed to send.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSelectUser = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u._id)));
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQ.trim()) return userList;
        const q = searchQ.toLowerCase();
        return userList.filter(u =>
            (u.firstName?.toLowerCase().includes(q)) ||
            (u.lastName?.toLowerCase().includes(q)) ||
            (u.userId?.toLowerCase().includes(q)) ||
            (u.mobile?.includes(q))
        );
    }, [userList, searchQ]);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-slate-400 text-sm">Syncing Messaging Center...</p>
            </div>
        </div>
    );

    const fields = [
        { key: 'welcome', label: 'Welcome SMS', desc: 'Sent on new membership', vars: 'USER_NAME, PACK_NAME, START_DATE, END_DATE, USER_ID' },
        { key: 'reminder_7d', label: '7-Day Expiry', desc: 'Auto-reminder', vars: 'USER_NAME, END_DATE' },
        { key: 'reminder_3d', label: '3-Day Expiry', desc: 'Urgent reminder', vars: 'USER_NAME, END_DATE' },
        { key: 'supplement', label: 'Supplement Alert', desc: 'New stock notification', vars: 'PRODUCT_NAME' },
        { key: 'broadcast', label: 'Broadcast Base', desc: 'Base template for manual messages', vars: 'MESSAGE' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Messages</h1>
                <p className="text-slate-500 mt-1">Configure automated SMS templates and send broadcasts.</p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <MessageSquare className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Messaging Hub</h2>
                            <p className="text-slate-500 text-xs">Manage automated notifications & manual broadcasts.</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeTab === 'templates' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            Templates
                        </button>
                        <button
                            onClick={() => setActiveTab('broadcast')}
                            className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeTab === 'broadcast' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            Broadcast
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'templates' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {fields.map(f => (
                                    <div key={f.key} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800">{f.label}</h4>
                                                <p className="text-[10px] text-slate-400 font-medium lowercase tracking-wide">{f.desc}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {f.vars.split(', ').map(v => (
                                                    <span key={v} className="text-[8px] font-mono font-bold text-brand-600 bg-brand-50 px-1 rounded uppercase">
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                            value={templates?.[f.key] || ''}
                                            onChange={e => setTemplates({ ...templates, [f.key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs">
                                    {statusMsg.text && (
                                        <span className={clsx("flex items-center gap-2 font-bold", statusMsg.type === 'success' ? "text-emerald-600" : "text-rose-600")}>
                                            {statusMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                            {statusMsg.text}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={saveTemplates}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <Activity size={16} />}
                                    Update All Templates
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-6 py-4">
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-slate-900">New Broadcast</h3>
                                <p className="text-slate-500 text-sm mt-1">Send a custom message to your members.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Message Content</label>
                                        <textarea
                                            value={broadcastMsg}
                                            onChange={e => setBroadcastMsg(e.target.value)}
                                            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 text-base focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder-slate-400 shadow-inner"
                                            placeholder="Enter your announcement here..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audience</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button onClick={() => setBroadcastTarget('active')} className={clsx("flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all", broadcastTarget === 'active' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                                                Active Members
                                            </button>
                                            <button onClick={() => setBroadcastTarget('all')} className={clsx("flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all", broadcastTarget === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                                                All Accounts
                                            </button>
                                            <button onClick={() => setBroadcastTarget('selected')} className={clsx("flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all", broadcastTarget === 'selected' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                                                Select Members
                                            </button>
                                        </div>

                                        {broadcastTarget === 'selected' && (
                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                                                <div className="p-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                                    <Search size={16} className="text-slate-400" />
                                                    <input
                                                        value={searchQ}
                                                        onChange={e => setSearchQ(e.target.value)}
                                                        className="flex-1 bg-transparent border-none text-sm outline-none placeholder-slate-400"
                                                        placeholder="Search by name, ID or mobile..."
                                                    />
                                                </div>
                                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                                                    {usersLoading ? (
                                                        <div className="p-4 text-center text-xs text-slate-400">Loading members...</div>
                                                    ) : filteredUsers.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-slate-400">No members found.</div>
                                                    ) : (
                                                        <>
                                                            <div className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 flex justify-between items-center sticky top-0">
                                                                <span>{filteredUsers.length} MEMBERS FOUND</span>
                                                                <button onClick={toggleSelectAll} className="text-brand-600 hover:underline">
                                                                    {selectedIds.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                                                                </button>
                                                            </div>
                                                            {filteredUsers.map(u => (
                                                                <label key={u._id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                                                    <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-all", selectedIds.has(u._id) ? "bg-brand-600 border-brand-600 text-white" : "border-slate-300 bg-white")}>
                                                                        {selectedIds.has(u._id) && <Check size={12} />}
                                                                    </div>
                                                                    <input type="checkbox" className="hidden" checked={selectedIds.has(u._id)} onChange={() => handleSelectUser(u._id)} />
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm font-medium text-slate-900">{[u.firstName, u.lastName].join(' ')}</span>
                                                                            <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded", u.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                                                                {u.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-slate-400 flex gap-2">
                                                                            <span>{u.userId}</span>
                                                                            <span>•</span>
                                                                            <span>{u.mobile || 'No Mobile'}</span>
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">Selected: <strong className="text-slate-900">{selectedIds.size}</strong> members</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={sendBroadcast}
                                        disabled={saving || !broadcastMsg.trim() || (broadcastTarget === 'selected' && selectedIds.size === 0)}
                                        className="w-full px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {broadcastStatus?.loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : <Send size={18} />}
                                        Send Message {broadcastTarget === 'selected' ? `to ${selectedIds.size}` : ''}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Activity size={18} className="text-brand-600" />
                                            Status
                                        </h4>

                                        {broadcastStatus && !broadcastStatus.loading ? (
                                            <div className={clsx("p-4 rounded-xl border mb-4", broadcastStatus.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800")}>
                                                {broadcastStatus.success ? (
                                                    <div className="flex gap-3">
                                                        <div className="mt-1"><Check size={18} className="text-emerald-600" /></div>
                                                        <div>
                                                            <p className="font-bold">Sent Successfully!</p>
                                                            <p className="text-xs mt-1 opacity-80">Delivered to {broadcastStatus.sent} recipients.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-3">
                                                        <div className="mt-1"><X size={18} className="text-rose-600" /></div>
                                                        <div>
                                                            <p className="font-bold">Failed to Send</p>
                                                            <p className="text-xs mt-1 opacity-80">{broadcastStatus.msg || 'Unknown error occurred.'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 mb-4">No recent activity.</p>
                                        )}

                                        <div className="text-xs text-slate-500 space-y-2 pt-4 border-t border-slate-100">
                                            <p><strong className="text-slate-900">Note:</strong> Your message will include the standard {'{{GYM_NAME}}'} header.</p>
                                            <p>Use clear, concise language for better engagement.</p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-brand-900 text-white rounded-2xl shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <Users size={100} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-lg mb-1">Targeting Tips</h4>
                                            <p className="text-brand-200 text-xs mb-4">Maximize your reach.</p>
                                            <ul className="space-y-2 text-xs text-brand-100/80 list-disc list-inside">
                                                <li>Use "Active Members" for operational updates.</li>
                                                <li>Use "All Accounts" for re-engagement campaigns.</li>
                                                <li>Use "Select Members" for personalized follow-ups.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
