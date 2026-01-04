import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pill, Clock, Calendar, Trash2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Medications() {
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMedications();
    }, []);

    const fetchMedications = async () => {
        try {
            const res = await fetch('/api/medications');
            const data = await res.json();
            setMedications(data);
        } catch (err) {
            console.error('Failed to fetch meds', err);
        } finally {
            setLoading(false);
        }
    };

    const [isAdding, setIsAdding] = useState(false);
    const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: 'Daily', time: '' });

    const handleAddMed = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/medications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newMed, adherence: 0 })
            });
            if (res.ok) {
                fetchMedications();
                setNewMed({ name: '', dosage: '', frequency: 'Daily', time: '' });
                setIsAdding(false);
            }
        } catch (err) {
            console.error('Failed to add med', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`/api/medications/${id}`, { method: 'DELETE' });
            fetchMedications();
        } catch (err) {
            console.error('Failed to delete med', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Medications</h2>
                    <p className="text-slate-500">Manage and track your active prescriptions.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors shadow-sm shadow-primary-500/20"
                >
                    <Plus size={20} />
                    Add New
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {medications.map((med) => (
                        <motion.div
                            key={med.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => handleDelete(med.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                                    <Pill size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{med.name}</h3>
                                    <p className="text-slate-500 text-sm">{med.dosage}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span>{med.frequency}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Clock size={16} className="text-slate-400" />
                                    <span>{med.time}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-slate-500">Adherence Score</span>
                                    <span className={clsx(
                                        "text-xs font-bold",
                                        med.adherence >= 90 ? "text-emerald-500" : med.adherence >= 70 ? "text-yellow-500" : "text-red-500"
                                    )}>{med.adherence}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full",
                                            med.adherence >= 90 ? "bg-emerald-500" : med.adherence >= 70 ? "bg-yellow-500" : "bg-red-500"
                                        )}
                                        style={{ width: `${med.adherence}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State / Add Placeholder */}
                <motion.button
                    layout
                    onClick={() => setIsAdding(true)}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-primary-500 hover:border-primary-200 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all min-h-[280px]"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Plus size={32} />
                    </div>
                    <p className="font-medium">Add Medication</p>
                </motion.button>
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Medication</h3>
                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><AlertCircle className="rotate-45" /></button>
                            </div>
                            <form onSubmit={handleAddMed} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medication Name</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                                        value={newMed.name}
                                        onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                        placeholder="e.g. Lisinopril"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                                        value={newMed.dosage}
                                        onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                                        placeholder="e.g. 10mg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                                            value={newMed.frequency}
                                            onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                                        >
                                            <option>Daily</option>
                                            <option>Twice Daily</option>
                                            <option>Weekly</option>
                                            <option>As Needed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                                            value={newMed.time}
                                            onChange={e => setNewMed({ ...newMed, time: e.target.value })}
                                            placeholder="08:00 AM"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 shadow-lg shadow-primary-500/20">Add Medication</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
