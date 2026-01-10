import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Users, Package, CreditCard, CalendarCheck,
    Dumbbell, Pill, ShoppingCart, Trophy, Monitor,
    LogOut, LayoutDashboard, Menu, X, Utensils, CalendarDays, MessageSquare
} from 'lucide-react';
import { clsx } from 'clsx';

interface AppLayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
    user?: { firstName?: string; email?: string } | null;
}

export function AppLayout({ children, onLogout, user }: AppLayoutProps) {
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Users', path: '/users', icon: Users },
        { label: 'Packs', path: '/packs', icon: Package },
        { label: 'Payments', path: '/payments', icon: CreditCard },
        { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { label: 'Workouts', path: '/workouts', icon: Dumbbell },
        { label: 'Supplements', path: '/supplements', icon: Pill },
        { label: 'Diet Foods', path: '/diet-foods', icon: Utensils },
        { label: 'Orders', path: '/sales', icon: ShoppingCart },
        { label: 'Appointments', path: '/appointments', icon: CalendarDays },
        { label: 'Messages', path: '/messages', icon: MessageSquare },
        { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ];

    const kioskItem = { label: 'Kiosk Mode', path: '/kiosk', icon: Monitor };

    const NavItem = ({ item, onClick }: { item: typeof navItems[0], onClick?: () => void }) => {
        const active = location.pathname === item.path;
        return (
            <Link
                to={item.path}
                onClick={onClick}
                className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    active
                        ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
            >
                <item.icon size={18} className={clsx("transition-colors", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
                        G
                    </div>
                    <span className="font-bold text-xl text-slate-900 tracking-tight">AG Fitness</span>
                    <button className="ml-auto md:hidden" onClick={() => setIsMobileOpen(false)}>
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters</div>
                    {navItems.map((item) => (
                        <NavItem key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
                    ))}

                    <div className="px-3 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</div>
                    <NavItem item={kioskItem} onClick={() => setIsMobileOpen(false)} />
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-brand-600 font-bold shadow-sm">
                            {user?.firstName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName || 'Admin'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@gymstack.com'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 rounded-lg transition-all shadow-sm"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
                    <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 text-slate-600">
                        <Menu size={24} />
                    </button>
                    <span className="ml-3 font-semibold text-slate-900">AG Fitness</span>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
