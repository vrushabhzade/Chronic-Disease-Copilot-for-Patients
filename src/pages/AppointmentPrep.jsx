import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, FileText, CheckCircle, AlertCircle, MessageSquare, Download, Volume2 } from 'lucide-react';
import axios from 'axios';

export default function AppointmentPrep() {
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [preparationData, setPreparationData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const response = await axios.get('/api/appointments');
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            // Mock data
            setAppointments([
                {
                    id: 1,
                    doctor: 'Dr. Sarah Johnson',
                    specialty: 'Cardiology',
                    date: '2026-01-06',
                    time: '14:00',
                    location: 'Heart Center, 3rd Floor',
                    type: 'Follow-up',
                    status: 'upcoming'
                },
                {
                    id: 2,
                    doctor: 'Dr. Michael Chen',
                    specialty: 'Endocrinology',
                    date: '2026-01-10',
                    time: '10:30',
                    location: 'Diabetes Clinic, 2nd Floor',
                    type: 'Routine Check-up',
                    status: 'upcoming'
                }
            ]);
        }
    };

    const generatePreparation = async (appointment) => {
        setSelectedAppointment(appointment);
        setIsGenerating(true);

        try {
            const response = await axios.post('/api/appointments/prepare', {
                appointmentId: appointment.id,
                specialty: appointment.specialty
            });

            setPreparationData(response.data);
        } catch (error) {
            console.error('Error generating preparation:', error);
            // Fallback mock data
            setPreparationData({
                summary: `Preparing for your ${appointment.specialty} appointment with ${appointment.doctor}`,
                keyTopics: [
                    'Recent blood pressure elevations (60% of mornings)',
                    'Dizziness episodes (3 times this week)',
                    'Medication adjustment needed for Lisinopril',
                    'Low potassium levels from recent lab work'
                ],
                suggestedQuestions: [
                    'Should we adjust my blood pressure medication due to morning elevations?',
                    'Could my dizziness be related to low potassium levels?',
                    'Do I need to add a potassium supplement?',
                    'What lifestyle changes can help stabilize my blood pressure?',
                    'Should I monitor my blood pressure more frequently?'
                ],
                recentSymptoms: [
                    { symptom: 'Dizziness', frequency: '3 times this week', severity: 'Moderate' },
                    { symptom: 'Morning headaches', frequency: '4 days this week', severity: 'Mild' },
                    { symptom: 'Fatigue', frequency: 'Daily', severity: 'Moderate' }
                ],
                medications: [
                    { name: 'Lisinopril', dose: '10mg', frequency: 'Daily', adherence: '95%' },
                    { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', adherence: '98%' },
                    { name: 'Atorvastatin', dose: '20mg', frequency: 'Daily', adherence: '92%' }
                ],
                labResults: [
                    { test: 'Blood Pressure', value: '145/92 mmHg', status: 'Elevated', trend: 'Worsening' },
                    { test: 'Potassium', value: '3.2 mEq/L', status: 'Low', trend: 'Declining' },
                    { test: 'HbA1c', value: '7.2%', status: 'Improved', trend: 'Improving' }
                ],
                actionItems: [
                    'Bring updated medication list',
                    'Bring blood pressure log from past 2 weeks',
                    'Discuss potassium supplementation',
                    'Request prescription refills if needed'
                ],
                voiceSummary: `Good morning! Let me help you prepare for your cardiology appointment tomorrow at 2 PM with Dr. Sarah Johnson. 

Based on your recent health data, here are the key topics to discuss:

First, your blood pressure has been elevated 60% of mornings, averaging 145 over 92. This is higher than your target range.

Second, you've experienced dizziness 3 times this week, which could be related to your recent lab results showing low potassium at 3.2.

Third, your HbA1c has improved to 7.2%, down from 8.1% - that's great progress on your diabetes management!

I recommend asking your doctor about adjusting your Lisinopril dosage and whether you need potassium supplementation. Also discuss if your dizziness and low potassium are connected.

Don't forget to bring your blood pressure log and updated medication list. Would you like me to generate a summary document to share with Dr. Johnson?`
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const playVoiceSummary = async () => {
        if (!preparationData?.voiceSummary) return;

        setIsPlaying(true);
        try {
            const response = await axios.post('/api/voice/speak', {
                text: preparationData.voiceSummary,
                voice: 'professional-female'
            });

            if (response.data.audioUrl) {
                const audio = new Audio(response.data.audioUrl);
                audio.onended = () => setIsPlaying(false);
                audio.play();
            }
        } catch (error) {
            console.error('Error playing voice summary:', error);
            setIsPlaying(false);
        }
    };

    const downloadSummary = () => {
        alert('Download feature coming soon!');
    };

    const shareWithDoctor = async () => {
        try {
            await axios.post('/api/appointments/share', {
                appointmentId: selectedAppointment.id,
                preparationData
            });
            alert('Summary shared with your doctor!');
        } catch (error) {
            console.error('Error sharing:', error);
            alert('Share feature coming soon!');
        }
    };

    const getAppointmentStatus = (appointment) => {
        const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
        const now = new Date();
        const hoursDiff = (appointmentDate - now) / (1000 * 60 * 60);

        if (hoursDiff < 0) return { text: 'Past', color: 'text-slate-400 bg-slate-50' };
        if (hoursDiff <= 48) return { text: 'Soon', color: 'text-orange-600 bg-orange-50' };
        return { text: 'Upcoming', color: 'text-blue-600 bg-blue-50' };
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    Appointment Preparation Coach
                </h1>
                <p className="text-slate-500 mt-1">
                    AI-powered preparation for your doctor visits
                </p>
            </div>

            {/* Appointments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((appointment) => {
                    const status = getAppointmentStatus(appointment);
                    return (
                        <motion.div
                            key={appointment.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 cursor-pointer transition-all ${selectedAppointment?.id === appointment.id
                                    ? 'border-primary-500'
                                    : 'border-slate-200 dark:border-slate-700'
                                }`}
                            onClick={() => generatePreparation(appointment)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                        <User className="text-primary-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                            {appointment.doctor}
                                        </h3>
                                        <p className="text-sm text-slate-500">{appointment.specialty}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                    {status.text}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Calendar size={16} />
                                    <span>{new Date(appointment.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Clock size={16} />
                                    <span>{appointment.time}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <FileText size={16} />
                                    <span>{appointment.type}</span>
                                </div>
                            </div>

                            <button className="w-full mt-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium">
                                Prepare for Appointment
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Preparation Panel */}
            <AnimatePresence>
                {selectedAppointment && preparationData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Voice Summary Card */}
                        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl p-8 text-white">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Your Appointment Brief</h2>
                                    <p className="opacity-90">
                                        {selectedAppointment.doctor} • {new Date(selectedAppointment.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={playVoiceSummary}
                                    disabled={isPlaying}
                                    className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                                >
                                    <Volume2 size={28} className={isPlaying ? 'animate-pulse' : ''} />
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={downloadSummary}
                                    className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Download size={18} />
                                    Download PDF
                                </button>
                                <button
                                    onClick={shareWithDoctor}
                                    className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={18} />
                                    Share with Doctor
                                </button>
                            </div>
                        </div>

                        {/* Key Topics */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                                <AlertCircle className="text-primary-500" size={20} />
                                Key Topics to Discuss
                            </h3>
                            <div className="space-y-2">
                                {preparationData.keyTopics.map((topic, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <CheckCircle className="text-primary-500 flex-shrink-0 mt-0.5" size={18} />
                                        <span className="text-slate-700 dark:text-slate-300">{topic}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Suggested Questions */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                                <MessageSquare className="text-primary-500" size={20} />
                                Questions to Ask
                            </h3>
                            <div className="space-y-3">
                                {preparationData.suggestedQuestions.map((question, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">
                                            {idx + 1}.
                                        </span>
                                        <span className="text-slate-700 dark:text-slate-300">{question}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Symptoms & Lab Results Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Symptoms */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4">
                                    Recent Symptoms
                                </h3>
                                <div className="space-y-3">
                                    {preparationData.recentSymptoms.map((symptom, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {symptom.symptom}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${symptom.severity === 'Severe' ? 'bg-red-100 text-red-700' :
                                                        symptom.severity === 'Moderate' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {symptom.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {symptom.frequency}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lab Results */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4">
                                    Recent Lab Results
                                </h3>
                                <div className="space-y-3">
                                    {preparationData.labResults.map((lab, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                                    {lab.test}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${lab.status === 'Elevated' || lab.status === 'Low' ? 'bg-orange-100 text-orange-700' :
                                                        lab.status === 'Improved' ? 'bg-green-100 text-green-700' :
                                                            'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {lab.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {lab.value} • {lab.trend}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Items */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                                <CheckCircle className="text-primary-500" size={20} />
                                Pre-Appointment Checklist
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {preparationData.actionItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-green-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isGenerating && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">
                            Analyzing your health data and preparing your appointment brief...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
