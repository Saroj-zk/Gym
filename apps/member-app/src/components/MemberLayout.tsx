import React, { ReactNode } from "react";
import { LogOut, User, Dumbbell, ShoppingBag, History, Menu, X, Trophy, Utensils, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberLayoutProps {
    children: ReactNode;
    user: { firstName?: string; lastName?: string; userId: string } | null;
    activeTab: string;
    onTabChange: (tab: any) => void;
}

export function MemberLayout({ children, user, activeTab, onTabChange }: MemberLayoutProps) {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Member';

    const menuItems = [
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'diet', label: 'My Diet', icon: Utensils },
        { id: 'appointments', label: 'Appointments', icon: CalendarDays },
        { id: 'workouts', label: 'Workouts', icon: Dumbbell },
        { id: 'shop', label: 'Supplements', icon: ShoppingBag },
        { id: 'orders', label: 'My Orders', icon: History },

    ];

    function logout() {
        localStorage.clear();
        navigate('/', { replace: true });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
                <div className="p-8 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl tracking-tighter">
                            GS
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 leading-none">AG FITNESS</h2>
                            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Member Hub</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm ${activeTab === item.id
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-50">
                    <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                                <User size={20} className="text-slate-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">#{user?.userId}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                    >
                        <LogOut size={16} />
                        LOG OUT
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-base">
                            GS
                        </div>
                        <h1 className="font-bold text-slate-900">AG FITNESS</h1>
                    </div>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-4 animate-in slide-in-from-top-2 duration-300">
                        <nav className="space-y-1">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { onTabChange(item.id); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-sm ${activeTab === item.id ? "bg-slate-900 text-white" : "text-slate-600"
                                        }`}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </button>
                            ))}
                            <div className="pt-4 mt-4 border-t border-slate-50">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-red-600 font-bold text-sm bg-red-50"
                                >
                                    <LogOut size={18} />
                                    LOG OUT
                                </button>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 relative pb-20 md:pb-0 h-screen overflow-y-auto">
                <div className="max-w-5xl mx-auto p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
