import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, Calendar, Activity, CheckCircle2, Clock } from 'lucide-react';

const StatCard = ({ title, value, label, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-start justify-between">
        <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
            <p className="text-xs text-slate-400 mt-2">{label}</p>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
    </div>
);

export default function Dashboard() {
    const [stats, setStats] = useState({
        taken: 0,
        total: 0,
        streak: 0,
        nextDose: 'None'
    });
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [medsRes, adhereRes] = await Promise.all([
                    fetch('/api/medications'),
                    fetch('/api/adherence')
                ]);

                const meds = await medsRes.json();
                const logs = await adhereRes.json();

                // Calculate Stats
                const totalScheduled = meds.length;
                const takenCount = logs.filter(l => l.status === 'taken').length;

                // Find next dose
                const sortedMeds = [...meds].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
                const next = sortedMeds.find(m => {
                    const now = new Date();
                    const [hours, minutes] = (m.time || '00:00').split(':');
                    const medTime = new Date();
                    medTime.setHours(hours, minutes);
                    return medTime > now;
                }) || sortedMeds[0];

                setStats({
                    taken: takenCount,
                    total: totalScheduled,
                    streak: 5,
                    nextDose: next ? `${next.name} (${next.time})` : 'All Done'
                });

                // Merge for Schedule List
                const mergedSchedule = meds.map(m => ({
                    ...m,
                    isTaken: logs.some(l => l.med_id === m.id && l.status === 'taken')
                }));

                setSchedule(mergedSchedule);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const toggleMed = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/medications/${id}/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-privacy-mode': localStorage.getItem('privacyMode') || 'false'
                },
                body: JSON.stringify({ status: currentStatus ? 'undo' : 'taken' })
            });
            if (res.ok) {
                // Optimistic Update
                setStats(prev => ({
                    ...prev,
                    taken: currentStatus ? prev.taken - 1 : prev.taken + 1
                }));
                setSchedule(prev => prev.map(m =>
                    m.id === id ? { ...m, isTaken: !m.isTaken } : m
                ));
            }
        } catch (e) { console.error(e); }
    };
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Welcome Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Good Morning, John 👋</h2>
                    <p className="text-slate-500 mt-1">Here's your health overview for today.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div variants={item}>
                    <StatCard
                        title="Medications"
                        value={`${stats.taken}/${stats.total}`}
                        label="Taken today"
                        icon={Pill}
                        color="bg-blue-500"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Adherence"
                        value={`${stats.streak} Day`}
                        label="Streak"
                        icon={CheckCircle2}
                        color="bg-emerald-500"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Next Dose"
                        value={stats.nextDose.split('(')[0]}
                        label={stats.nextDose.split('(')[1]?.replace(')', '') || 'Scheduled'}
                        icon={Clock}
                        color="bg-purple-500"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatCard
                        title="Latest Vitals"
                        value="120/80"
                        label="BP - Normal"
                        icon={Activity}
                        color="bg-rose-500"
                    />
                </motion.div>
            </div>

            {/* Upcoming Schedule */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-primary-500" />
                        Today's Schedule
                    </h3>

                    {loading ? (
                        <p className="text-slate-500">Loading schedule...</p>
                    ) : (
                        <div className="space-y-4">
                            {schedule.map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${!item.isTaken ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/10 dark:border-primary-900/30' : 'border-slate-100 dark:border-slate-700/40'}`}>
                                    <div className="w-20 font-mono text-sm text-slate-500">{item.time}</div>
                                    <div className="flex-1">
                                        <h4 className={`font-semibold ${item.isTaken ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{item.name}</h4>
                                        <p className="text-xs text-slate-400">{item.dosage}</p>
                                    </div>
                                    <div>
                                        {item.isTaken ? (
                                            <button
                                                onClick={() => toggleMed(item.id, true)}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-red-100 hover:text-red-800 cursor-pointer"
                                            >
                                                Taken
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleMed(item.id, false)}
                                                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-primary-500/30"
                                            >
                                                Take
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {schedule.length === 0 && <p className="text-slate-400">No medications scheduled for today.</p>}
                        </div>
                    )}
                </div>

                {/* AI Assistant Quick Prompt */}
                <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                            <Activity className="text-white w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Feeling unwell?</h3>
                        <p className="text-primary-100 text-sm mb-6">Describe your symptoms to your personal AI health assistant for instant guidance.</p>
                        <a href="/copilot" className="block text-center w-full bg-white text-primary-600 font-semibold py-3 rounded-xl hover:bg-primary-50 transition-colors">
                            Start Chat
                        </a>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>
            </motion.div>
        </motion.div>
    );
}
