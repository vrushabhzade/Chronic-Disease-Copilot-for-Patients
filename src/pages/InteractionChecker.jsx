import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, Search, Plus, X } from 'lucide-react';
import clsx from 'clsx';

// Mock Interaction Database
const INTERACTIONS_DB = {
    'aspirin-warfarin': {
        severity: 'High',
        description: 'Increases the risk of bleeding. Aspirin has antiplatelet effects which can amplify the anticoagulant effect of Warfarin.',
        recommendation: 'Avoid concurrent use unless monitored closely by a physician.'
    },
    'lisinopril-potassium': {
        severity: 'Medium',
        description: 'May causing hyperkalemia (high blood potassium levels).',
        recommendation: 'Monitor potassium levels regularly.'
    },
    'ibuprofen-lisinopril': {
        severity: 'Medium',
        description: 'NSAIDs may reduce the antihypertensive effect of ACE inhibitors and increase risk of renal impairment.',
        recommendation: 'Use lowest effective dose of NSAID and monitor blood pressure.'
    }
};

export default function InteractionChecker() {
    const [medsToCheck, setMedsToCheck] = useState(['', '']);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleMedChange = (index, value) => {
        const newMeds = [...medsToCheck];
        newMeds[index] = value;
        setMedsToCheck(newMeds);
        setResult(null); // Clear result on change
    };

    const addField = () => {
        if (medsToCheck.length < 5) {
            setMedsToCheck([...medsToCheck, '']);
        }
    };

    const removeField = (index) => {
        if (medsToCheck.length > 2) {
            const newMeds = medsToCheck.filter((_, i) => i !== index);
            setMedsToCheck(newMeds);
            setResult(null);
        }
    };

    const checkInteractions = async () => {
        setLoading(true);
        setResult(null);

        try {
            const drugs = medsToCheck; // Already state
            const res = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs })
            });
            const data = await res.json();

            if (data.error) {
                setResult({ status: 'error', message: data.error });
            } else {
                setResult(data);
            }
        } catch (err) {
            console.error("Interaction Check Error", err);
            setResult({ status: 'error', message: "Failed to connect to server." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Interaction Checker</h2>
                <p className="text-slate-500 max-w-lg mx-auto">Ensure your medication regimen is safe. Enter your drugs below to check for potential conflicts.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700/50">
                <div className="space-y-4 mb-8">
                    {medsToCheck.map((med, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                    {idx + 1}
                                </div>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100 text-lg transition-all"
                                    placeholder={`Enter drug name (e.g. ${idx === 0 ? 'Aspirin' : 'Warfarin'})`}
                                    value={med}
                                    onChange={(e) => handleMedChange(idx, e.target.value)}
                                />
                                {medsToCheck.length > 2 && (
                                    <button
                                        onClick={() => removeField(idx)}
                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {medsToCheck.length < 5 && (
                        <button
                            onClick={addField}
                            className="px-6 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-500 font-medium hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            Add Another Drug
                        </button>
                    )}
                    <button
                        onClick={checkInteractions}
                        disabled={loading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {loading ? (
                            <Activity className="animate-spin" />
                        ) : (
                            <Search size={20} />
                        )}
                        {loading ? 'Analyzing...' : 'Analyze for Interactions'}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={clsx(
                            "rounded-3xl p-8 border-l-8 shadow-lg",
                            result.status === 'warning' ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500" :
                                result.status === 'safe' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500" :
                                    "bg-slate-100 dark:bg-slate-800 border-slate-400"
                        )}
                    >
                        <div className="flex items-start gap-5">
                            <div className={clsx(
                                "p-4 rounded-2xl shrink-0",
                                result.status === 'warning' ? "bg-amber-100 text-amber-600" :
                                    result.status === 'safe' ? "bg-emerald-100 text-emerald-600" :
                                        "bg-slate-200 text-slate-500"
                            )}>
                                {result.status === 'warning' ? <AlertTriangle size={32} /> :
                                    result.status === 'safe' ? <CheckCircle size={32} /> :
                                        <Activity size={32} />}
                            </div>
                            <div>
                                <h3 className={clsx(
                                    "text-xl font-bold mb-2",
                                    result.status === 'warning' ? "text-amber-800 dark:text-amber-400" :
                                        result.status === 'safe' ? "text-emerald-800 dark:text-emerald-400" :
                                            "text-slate-800 dark:text-slate-200"
                                )}>
                                    {result.status === 'warning' ? "Potential Interaction Detected" :
                                        result.status === 'safe' ? "No Interactions Found" :
                                            "Analysis Complete"}
                                </h3>

                                {result.status === 'warning' ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full uppercase tracking-wider">
                                                Severity: {result.data.severity}
                                            </span>
                                            <span className="text-sm font-medium text-amber-700/70 dark:text-amber-400/70">
                                                Between <span className="underline">{result.data.pair[0]}</span> and <span className="underline">{result.data.pair[1]}</span>
                                            </span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {result.data.description}
                                        </p>
                                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-amber-200/50">
                                            <strong className="text-amber-900 dark:text-amber-200 block mb-1">Recommendation</strong>
                                            <p className="text-amber-800/80 dark:text-amber-300/80 text-sm">{result.data.recommendation}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                                        {result.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
