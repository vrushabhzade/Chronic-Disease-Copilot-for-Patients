import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, ShieldCheck, CheckCircle, AlertCircle, Heart, Pill, Activity, Calendar } from 'lucide-react';
import axios from 'axios';
import AudioVisualizer from '../components/AudioVisualizer';

export default function DailyCheckIn() {
    const [step, setStep] = useState('welcome'); // welcome, verifying, conversation, complete
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkInData, setCheckInData] = useState({
        mood: '',
        symptoms: '',
        adherence: '',
        vitalSigns: ''
    });
    const [voiceVerified, setVoiceVerified] = useState(false);

    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const current = event.results[event.results.length - 1][0].transcript;
                setTranscript(current);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (transcript) {
                    processVoiceInput(transcript);
                }
            };

            recognitionRef.current = recognition;
        }
    }, [transcript]);

    const startCheckIn = async () => {
        setStep('verifying');
        // Initial greeting
        const greeting = "Good morning, Sarah. I'm ready for your daily check-in. To begin, please say: 'My health is my priority' so I can verify your identity.";
        setAiResponse(greeting);
        await speakResponse(greeting);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const processVoiceInput = async (text) => {
        setIsProcessing(true);
        try {
            if (step === 'verifying') {
                // Mock voice biometric verification
                const response = await axios.post('/api/auth/voice-verify', { transcript: text });
                if (response.data.verified) {
                    setVoiceVerified(true);
                    setStep('conversation');
                    const nextQuestion = "Identity verified. Thank you, Sarah. How are you feeling overall today? Any dizziness like you had yesterday?";
                    setAiResponse(nextQuestion);
                    await speakResponse(nextQuestion);
                } else {
                    const retry = "I couldn't verify your voice. Please try saying the phrase again: 'My health is my priority'.";
                    setAiResponse(retry);
                    await speakResponse(retry);
                }
            } else if (step === 'conversation') {
                const response = await axios.post('/api/check-in/process', {
                    text,
                    currentStep: Object.keys(checkInData).find(key => !checkInData[key])
                });

                const { nextQuestion, updatedData, isComplete } = response.data;
                setCheckInData(prev => ({ ...prev, ...updatedData }));

                if (isComplete) {
                    setStep('complete');
                    const closing = "Thank you for the update, Sarah. I've logged your symptoms and confirmed your medication adherence. Your data shows a slight improvement in vitality logs. Have a wonderful day!";
                    setAiResponse(closing);
                    await speakResponse(closing);
                } else {
                    setAiResponse(nextQuestion);
                    await speakResponse(nextQuestion);
                }
            }
        } catch (error) {
            console.error('Check-in processing error:', error);
        } finally {
            setIsProcessing(false);
            setTranscript('');
        }
    };

    const speakResponse = async (text) => {
        try {
            const response = await axios.post('/api/voice/speak', {
                text,
                voice: 'empathetic-female'
            });

            if (response.data.audioUrl) {
                const audio = new Audio(response.data.audioUrl);
                audio.play();
            }
        } catch (error) {
            console.error('TTS Error:', error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-8 text-white relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Daily Voice Check-in</h1>
                            <p className="opacity-90">Personal Health Assistant Engine</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <ShieldCheck size={20} className={voiceVerified ? "text-green-300" : "text-white/60"} />
                            <span className="text-sm font-medium">{voiceVerified ? "Identity Verified" : "Verifying Identity"}</span>
                        </div>
                    </div>
                </div>

                <div className="p-10 text-center">
                    <AnimatePresence mode="wait">
                        {step === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-8"
                            >
                                <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Heart className="text-primary-600 animate-pulse" size={64} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Start Your Morning Routine</h2>
                                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                        Let's spend 2 minutes checking in on your health. We'll verify your voice and log your symptoms together.
                                    </p>
                                </div>
                                <button
                                    onClick={startCheckIn}
                                    className="px-10 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105"
                                >
                                    Start Daily Check-in
                                </button>
                            </motion.div>
                        )}

                        {(step === 'verifying' || step === 'conversation') && (
                            <motion.div
                                key="interaction"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-10"
                            >
                                {/* AI Response Visualization */}
                                <div className="min-h-[120px] flex items-center justify-center">
                                    <p className="text-2xl font-medium text-slate-800 dark:text-slate-100 italic leading-relaxed">
                                        "{aiResponse || "Listening for your health update..."}"
                                    </p>
                                </div>

                                {/* Visualizer */}
                                <div className="relative flex justify-center py-10">
                                    <AudioVisualizer isActive={isListening} />
                                </div>

                                {/* Transcription */}
                                <div className="h-10 text-slate-500">
                                    {transcript && (
                                        <p className="animate-in fade-in slide-in-from-bottom-2">
                                            "{transcript}"
                                        </p>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col items-center gap-6">
                                    <button
                                        onClick={toggleListening}
                                        disabled={isProcessing}
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${isListening
                                            ? 'bg-red-500 hover:bg-red-600 scale-110'
                                            : 'bg-primary-600 hover:bg-primary-700'
                                            }`}
                                    >
                                        {isListening ? (
                                            <MicOff className="text-white" size={40} />
                                        ) : (
                                            <Mic className="text-white" size={40} />
                                        )}
                                        {isListening && (
                                            <span className="absolute -inset-2 rounded-full border-4 border-red-500/20 animate-ping" />
                                        )}
                                    </button>
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        {isListening ? 'Stop Speaking' : 'Tap to Speak'}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {step === 'complete' && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="text-green-600" size={64} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">Check-in Complete!</h2>
                                    <p className="text-slate-600 dark:text-slate-400">Your health data has been securely logged and analyzed.</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                                        <Heart className="text-red-500 mb-2 mx-auto" size={24} />
                                        <p className="text-xs text-slate-500">Mood</p>
                                        <p className="font-bold">Positive</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                                        <Pill className="text-primary-500 mb-2 mx-auto" size={24} />
                                        <p className="text-xs text-slate-500">Meds</p>
                                        <p className="font-bold">Logged</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                                        <Activity className="text-green-500 mb-2 mx-auto" size={24} />
                                        <p className="text-xs text-slate-500">Symptoms</p>
                                        <p className="font-bold">Stable</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                                        <Calendar className="text-blue-500 mb-2 mx-auto" size={24} />
                                        <p className="text-xs text-slate-500">Log Date</p>
                                        <p className="font-bold">Today</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                                >
                                    Return to Dashboard
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Bar */}
                <div className="px-10 py-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <ShieldCheck size={16} className="text-primary-500" />
                        <span>HIPAA Compliant Session</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Volume2 size={16} />
                        <span>Powered by ElevenLabs AI</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
