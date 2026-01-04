import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Pill,
    Activity,
    Mic,
    Menu,
    X,
    Bell,
    User,
    FileText,
    Stethoscope,
    Calendar,
    Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import PrivacyToggle from './PrivacyToggle';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Pill, label: 'Medications', path: '/medications' },
        { icon: Activity, label: 'Interactions', path: '/interactions' },
        { icon: Mic, label: 'Voice Copilot', path: '/copilot' },
        { icon: Heart, label: 'Daily Check-in', path: '/check-in' },
        { icon: FileText, label: 'Symptoms', path: '/symptoms' },
        { icon: Stethoscope, label: 'Lab Results', path: '/lab-results' },
        { icon: Calendar, label: 'Appointments', path: '/appointments' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-inter overflow-hidden">

            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ x: -250, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -250, opacity: 0 }}
                        className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20"
                    >
                        <div className="p-6 flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                                <Activity className="text-white w-5 h-5" />
                            </div>
                            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 leading-tight">
                                Chronic Disease<br />Copilot for Patients
                            </h1>
                        </div>

                        <nav className="flex-1 px-4 space-y-2 mt-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={clsx(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold"
                                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200"
                                        )}
                                    >
                                        <Icon size={20} className={clsx(isActive && "text-primary-500")} />
                                        <span>{item.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 w-1 h-8 bg-primary-500 rounded-r-full"
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
                                <h4 className="font-bold text-sm">Pro Plan</h4>
                                <p className="text-xs opacity-80 mt-1 mb-3">Get advanced AI analysis</p>
                                <button className="w-full bg-white/20 hover:bg-white/30 text-xs font-semibold py-2 rounded-lg transition-colors">
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <Menu size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <PrivacyToggle />
                        <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <Bell size={20} className="text-slate-500" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                        </button>
                        <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Sarah Johnson</p>
                                <p className="text-xs text-slate-500">Patient ID: #1234</p>
                            </div>
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden border border-primary-200">
                                <User className="text-primary-600" />
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
