import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar, Download, Share2 } from 'lucide-react';
import axios from 'axios';

export default function LabResults() {
    const [labResults, setLabResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [aiExplanation, setAiExplanation] = useState('');
    const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

    useEffect(() => {
        fetchLabResults();
    }, []);

    const fetchLabResults = async () => {
        try {
            const response = await axios.get('/api/lab-results');
            setLabResults(response.data || []);
        } catch (error) {
            console.error('Error fetching lab results:', error);
            // Mock data for demonstration
            setLabResults([
                {
                    id: 1,
                    testName: 'HbA1c',
                    value: 7.2,
                    unit: '%',
                    referenceRange: '< 5.7',
                    status: 'improving',
                    previousValue: 8.1,
                    date: '2026-01-02',
                    interpretation: 'Prediabetic range',
                    trend: 'down',
                    changePercent: -11.1
                },
                {
                    id: 2,
                    testName: 'Total Cholesterol',
                    value: 185,
                    unit: 'mg/dL',
                    referenceRange: '< 200',
                    status: 'normal',
                    previousValue: 218,
                    date: '2026-01-02',
                    interpretation: 'Desirable',
                    trend: 'down',
                    changePercent: -15.1
                },
                {
                    id: 3,
                    testName: 'Potassium',
                    value: 3.2,
                    unit: 'mEq/L',
                    referenceRange: '3.5-5.0',
                    status: 'low',
                    previousValue: 3.8,
                    date: '2026-01-02',
                    interpretation: 'Below normal',
                    trend: 'down',
                    changePercent: -15.8,
                    alert: true
                },
                {
                    id: 4,
                    testName: 'Vitamin B12',
                    value: 180,
                    unit: 'pg/mL',
                    referenceRange: '200-900',
                    status: 'low',
                    previousValue: 195,
                    date: '2026-01-02',
                    interpretation: 'Below normal',
                    trend: 'down',
                    changePercent: -7.7,
                    alert: true
                },
                {
                    id: 5,
                    testName: 'Creatinine',
                    value: 1.1,
                    unit: 'mg/dL',
                    referenceRange: '0.7-1.3',
                    status: 'normal',
                    previousValue: 1.0,
                    date: '2026-01-02',
                    interpretation: 'Normal kidney function',
                    trend: 'stable'
                }
            ]);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            normal: 'text-green-600 bg-green-50 border-green-200',
            improving: 'text-blue-600 bg-blue-50 border-blue-200',
            low: 'text-orange-600 bg-orange-50 border-orange-200',
            high: 'text-red-600 bg-red-50 border-red-200',
            critical: 'text-red-700 bg-red-100 border-red-300'
        };
        return colors[status] || colors.normal;
    };

    const getStatusIcon = (status) => {
        if (status === 'normal' || status === 'improving') {
            return <CheckCircle size={20} />;
        }
        return <AlertTriangle size={20} />;
    };

    const getTrendIcon = (trend) => {
        if (trend === 'down') return <TrendingDown size={16} className="text-green-600" />;
        if (trend === 'up') return <TrendingUp size={16} className="text-red-600" />;
        return <span className="text-slate-400">—</span>;
    };

    const explainResult = async (result) => {
        setSelectedResult(result);
        setIsLoadingExplanation(true);

        try {
            const response = await axios.post('/api/lab-results/explain', {
                testName: result.testName,
                value: result.value,
                referenceRange: result.referenceRange,
                previousValue: result.previousValue,
                medications: [] // Would fetch from user profile
            });

            setAiExplanation(response.data.explanation);

            // Use ElevenLabs to speak the explanation
            await speakExplanation(response.data.explanation);
        } catch (error) {
            console.error('Error getting explanation:', error);
            // Fallback explanation
            const fallbackExplanation = generateFallbackExplanation(result);
            setAiExplanation(fallbackExplanation);
            await speakExplanation(fallbackExplanation);
        } finally {
            setIsLoadingExplanation(false);
        }
    };

    const generateFallbackExplanation = (result) => {
        if (result.testName === 'HbA1c') {
            return `Your HbA1c is ${result.value}%, down from ${result.previousValue}% last quarter. That's a ${Math.abs(result.changePercent).toFixed(1)}% improvement! This measures your average blood sugar over the past 3 months. You're moving in the right direction. Keep up with your current medications and lifestyle changes.`;
        } else if (result.testName === 'Potassium') {
            return `Your potassium is ${result.value} ${result.unit}, which is below the normal range of ${result.referenceRange}. Low potassium can cause muscle weakness, fatigue, and irregular heartbeat. This might be related to your blood pressure medication. Contact your doctor today to discuss whether you need a potassium supplement or dietary changes.`;
        } else if (result.testName === 'Vitamin B12') {
            return `Your vitamin B12 is ${result.value} ${result.unit}, slightly below normal (${result.referenceRange}). Low B12 can cause fatigue, dizziness, and nerve problems. Combined with your recent dizziness symptoms, these may be related. Ask your doctor about B12 supplements or B12 injections.`;
        } else if (result.testName === 'Total Cholesterol') {
            return `Your total cholesterol is ${result.value} ${result.unit}, which is in the desirable range! It's improved ${Math.abs(result.changePercent).toFixed(1)}% from ${result.previousValue} six months ago. Your statin medication is working well. Continue with your current treatment plan.`;
        }
        return `Your ${result.testName} is ${result.value} ${result.unit}. Reference range is ${result.referenceRange}.`;
    };

    const speakExplanation = async (text) => {
        try {
            const response = await axios.post('/api/voice/speak', {
                text,
                voice: 'professional-female'
            });

            if (response.data.audioUrl) {
                const audio = new Audio(response.data.audioUrl);
                audio.play();
            }
        } catch (error) {
            console.error('Error with TTS:', error);
        }
    };

    const downloadReport = () => {
        // Generate PDF or CSV download
        alert('Download feature coming soon!');
    };

    const shareWithDoctor = () => {
        // Share results with healthcare provider
        alert('Share feature coming soon!');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        Lab Results & Insights
                    </h1>
                    <p className="text-slate-500 mt-1">
                        AI-powered interpretation of your health metrics
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadReport}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Download size={18} />
                        Download
                    </button>
                    <button
                        onClick={shareWithDoctor}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Share2 size={18} />
                        Share
                    </button>
                </div>
            </div>

            {/* Alert Banner for Abnormal Results */}
            {labResults.some(r => r.alert) && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-orange-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-orange-900 text-lg mb-2">
                                Action Required
                            </h3>
                            <p className="text-orange-800">
                                You have {labResults.filter(r => r.alert).length} abnormal result(s) that need attention.
                                Please review and contact your doctor if needed.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Lab Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {labResults.map((result) => (
                    <motion.div
                        key={result.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        className={`border rounded-2xl p-6 cursor-pointer transition-all ${getStatusColor(result.status)} ${selectedResult?.id === result.id ? 'ring-2 ring-primary-500' : ''
                            }`}
                        onClick={() => explainResult(result)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                                    {getStatusIcon(result.status)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{result.testName}</h3>
                                    <p className="text-xs opacity-75 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(result.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            {result.alert && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                    Alert
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <span className="text-3xl font-bold">{result.value}</span>
                                    <span className="text-sm ml-2 opacity-75">{result.unit}</span>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-sm font-medium">
                                        {getTrendIcon(result.trend)}
                                        {result.changePercent && (
                                            <span className={result.trend === 'down' && result.status === 'improving' ? 'text-green-600' : ''}>
                                                {result.changePercent > 0 ? '+' : ''}{result.changePercent.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    {result.previousValue && (
                                        <p className="text-xs opacity-75">
                                            from {result.previousValue} {result.unit}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-current/20">
                                <p className="text-xs opacity-75 mb-1">Reference Range</p>
                                <p className="text-sm font-medium">{result.referenceRange} {result.unit}</p>
                            </div>

                            <div className="bg-white/30 rounded-lg p-3">
                                <p className="text-sm font-medium">{result.interpretation}</p>
                            </div>

                            <button className="w-full py-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors text-sm font-medium">
                                Click for AI Explanation
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* AI Explanation Panel */}
            {selectedResult && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700"
                >
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="text-primary-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl mb-2">
                                AI Explanation: {selectedResult.testName}
                            </h3>
                            {isLoadingExplanation ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                                    <span>Analyzing your results...</span>
                                </div>
                            ) : (
                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {aiExplanation}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => speakExplanation(aiExplanation)}
                            disabled={isLoadingExplanation}
                            className="px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            🔊 Listen Again
                        </button>
                        <button
                            onClick={() => setSelectedResult(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
