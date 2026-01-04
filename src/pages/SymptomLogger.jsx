import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Activity, AlertCircle, TrendingUp, Calendar, Clock, MapPin } from 'lucide-react';
import AudioVisualizer from '../components/AudioVisualizer';
import axios from 'axios';

export default function SymptomLogger() {
    const [isListening, setIsListening] = useState(false);
    const [symptoms, setSymptoms] = useState([]);
    const [currentSymptom, setCurrentSymptom] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [patterns, setPatterns] = useState([]);
    const [followUpQuestions, setFollowUpQuestions] = useState([]);

    useEffect(() => {
        fetchSymptomHistory();
        detectPatterns();
    }, []);

    const fetchSymptomHistory = async () => {
        try {
            const response = await axios.get('/api/symptoms');
            setSymptoms(response.data || []);
        } catch (error) {
            console.error('Error fetching symptoms:', error);
        }
    };

    const detectPatterns = async () => {
        try {
            const response = await axios.get('/api/symptoms/patterns');
            setPatterns(response.data || []);
        } catch (error) {
            console.error('Error detecting patterns:', error);
        }
    };

    const startListening = async () => {
        setIsListening(true);
        setAiResponse('');

        try {
            // Initialize speech recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Speech recognition not supported in this browser');
                setIsListening(false);
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = async (event) => {
                const transcript = event.results[0][0].transcript;
                setCurrentSymptom(transcript);
                await processSymptom(transcript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
        }
    };

    const processSymptom = async (symptomText) => {
        setIsProcessing(true);

        try {
            // Send to backend for AI processing
            const response = await axios.post('/api/symptoms/analyze', {
                symptom: symptomText,
                timestamp: new Date().toISOString()
            });

            const { analysis, followUp, severity, tags } = response.data;

            setAiResponse(analysis);
            setFollowUpQuestions(followUp || []);

            // Add to symptom list
            const newSymptom = {
                id: Date.now(),
                text: symptomText,
                severity,
                tags,
                timestamp: new Date().toISOString(),
                analysis
            };

            setSymptoms(prev => [newSymptom, ...prev]);

            // Use ElevenLabs TTS to read response
            await speakResponse(analysis);

            // Refresh patterns
            await detectPatterns();
        } catch (error) {
            console.error('Error processing symptom:', error);
            setAiResponse('I had trouble processing that. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const speakResponse = async (text) => {
        try {
            // ElevenLabs TTS integration
            const response = await axios.post('/api/voice/speak', {
                text,
                voice: 'empathetic-female'
            });

            if (response.data.audioUrl) {
                const audio = new Audio(response.data.audioUrl);
                audio.play();
            }
        } catch (error) {
            console.error('Error with TTS:', error);
        }
    };

    const answerFollowUp = async (question, answer) => {
        setIsProcessing(true);

        try {
            const response = await axios.post('/api/symptoms/follow-up', {
                question,
                answer,
                symptomId: symptoms[0]?.id
            });

            setAiResponse(response.data.analysis);
            await speakResponse(response.data.analysis);
            setFollowUpQuestions([]);
        } catch (error) {
            console.error('Error processing follow-up:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            low: 'text-green-600 bg-green-50 border-green-200',
            medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            high: 'text-orange-600 bg-orange-50 border-orange-200',
            critical: 'text-red-600 bg-red-50 border-red-200'
        };
        return colors[severity] || colors.low;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        Voice Symptom Logger
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Speak naturally about how you're feeling
                    </p>
                </div>
            </div>

            {/* Pattern Alerts */}
            <AnimatePresence>
                {patterns.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="text-orange-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-orange-900 text-lg mb-2">
                                    Pattern Detected
                                </h3>
                                {patterns.map((pattern, idx) => (
                                    <p key={idx} className="text-orange-800 mb-2">
                                        {pattern.message}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Input Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700"
            >
                <div className="text-center space-y-6">
                    <div className="relative inline-block">
                        <motion.button
                            onClick={isListening ? null : startListening}
                            disabled={isProcessing}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                                    ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-2xl shadow-red-500/50'
                                    : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:shadow-2xl hover:shadow-primary-500/50'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isListening ? (
                                <MicOff className="text-white" size={48} />
                            ) : (
                                <Mic className="text-white" size={48} />
                            )}
                        </motion.button>

                        {isListening && (
                            <motion.div
                                className="absolute inset-0 rounded-full border-4 border-red-400"
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Tap to Speak'}
                        </h2>
                        <p className="text-slate-500">
                            {isListening
                                ? 'Describe your symptoms naturally'
                                : isProcessing
                                    ? 'Analyzing your symptoms...'
                                    : 'Tell me how you\'re feeling today'}
                        </p>
                    </div>

                    {isListening && <AudioVisualizer />}

                    {currentSymptom && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4"
                        >
                            <p className="text-slate-700 dark:text-slate-300 italic">
                                "{currentSymptom}"
                            </p>
                        </motion.div>
                    )}

                    {aiResponse && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl p-6"
                        >
                            <div className="flex items-start gap-3">
                                <Activity className="text-primary-600 flex-shrink-0 mt-1" size={20} />
                                <p className="text-slate-700 dark:text-slate-300 text-left">
                                    {aiResponse}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Follow-up Questions */}
            <AnimatePresence>
                {followUpQuestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <AlertCircle className="text-primary-500" size={20} />
                            I need a bit more information
                        </h3>
                        <div className="space-y-3">
                            {followUpQuestions.map((question, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                                    <p className="text-slate-700 dark:text-slate-300 mb-3">{question.text}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {question.options?.map((option, optIdx) => (
                                            <button
                                                key={optIdx}
                                                onClick={() => answerFollowUp(question.text, option)}
                                                className="px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Symptom History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Calendar className="text-primary-500" size={20} />
                    Recent Symptoms
                </h3>
                <div className="space-y-3">
                    {symptoms.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">
                            No symptoms logged yet. Start by describing how you feel.
                        </p>
                    ) : (
                        symptoms.slice(0, 10).map((symptom) => (
                            <motion.div
                                key={symptom.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`border rounded-xl p-4 ${getSeverityColor(symptom.severity)}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <p className="font-medium mb-1">{symptom.text}</p>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {symptom.tags?.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-white/50 rounded-md text-xs font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-xs opacity-75 flex items-center gap-1 ml-4">
                                        <Clock size={12} />
                                        {new Date(symptom.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                {symptom.analysis && (
                                    <p className="text-sm opacity-90 mt-2 pt-2 border-t border-current/20">
                                        {symptom.analysis}
                                    </p>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
