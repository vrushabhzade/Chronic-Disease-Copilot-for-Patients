import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Calendar, Activity, X } from 'lucide-react';
import AudioVisualizer from '../components/AudioVisualizer';
import clsx from 'clsx';

// Simulated conversation steps
const CONVERSATION_FLOW = [
    { role: 'assistant', text: "Good morning, John. I noticed you didn't log your blood pressure yesterday. Would you like to do that now?", type: 'question' },
    { role: 'user', text: "Yes, it was 128 over 82." },
    { role: 'assistant', text: "Got it. 128/82 is within your healthy range. I've logged that. Anything else bothering you?", type: 'confirmation' },
    { role: 'user', text: "I've been feeling a bit dizzy." },
    { role: 'assistant', text: "I'm sorry to hear that. Dizziness can be side effect of your Lisinopril. When did it start?", type: 'check' }
];

export default function Copilot() {
    const [isListening, setIsListening] = useState(false);
    const [conversationState, setConversationState] = useState(0);
    const [history, setHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeCard, setActiveCard] = useState(null);

    const startListening = async () => {
        if (isProcessing) return;
        setIsListening(true);

        // Simulate user speaking time (Mock)
        setTimeout(async () => {
            setIsListening(false);
            setIsProcessing(true);

            // Determine response text based on state
            let responseText = "";
            let nextStep = null;

            // Call Backend for Intelligence (LLM)
            let aiResponseText = "";
            let aiAction = null;

            try {
                const chatRes = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-privacy-mode': localStorage.getItem('privacyMode') || 'false'
                    },
                    body: JSON.stringify({
                        text: "User Voice Input (Simulated)", // In real app, this comes from Whisper STT
                        context: activeCard,
                        history: history
                    })
                });
                const chatData = await chatRes.json();
                aiResponseText = chatData.text;
                aiAction = chatData.action;

                if (aiAction === 'log_complete' || activeCard) {
                    setActiveCard(null); // Clear context if action done
                }

            } catch (err) {
                console.error("Chat API Error", err);
                aiResponseText = "I'm having trouble connecting to the network. Please try again.";
            }

            // Call Backend for TTS (ElevenLabs)
            try {
                const ttsRes = await fetch('/api/elevenlabs/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: aiResponseText })
                });

                if (ttsRes.ok) {
                    const blob = await ttsRes.blob();
                    const audio = new Audio(URL.createObjectURL(blob));
                    audio.play();
                }
            } catch (err) {
                console.error("TTS Error", err);
            }

            // Update UI
            setHistory(prev => [...prev,
            { role: 'user', text: "User Voice Input (Simulated)" },
            { role: 'assistant', text: aiResponseText, type: 'response' }
            ]);

            // Advance state (simple increment for demo visual flow)
            setConversationState(prev => prev + 1);
            setIsProcessing(false);

        }, 3000);
    };

    useEffect(() => {
        // Initial Greeting
        if (history.length === 0) {
            setHistory([CONVERSATION_FLOW[0]]);
        }
    }, []);

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col relative max-w-4xl mx-auto">

            {/* Dynamic Proactive Cards (Contextual Overlay) */}
            <AnimatePresence>
                {!isListening && !isProcessing && history.length < 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 absolute w-full top-0 z-10"
                    >
                        <button
                            onClick={() => setActiveCard('med-prep')}
                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 text-left hover:border-primary-300 transition-colors flex gap-4"
                        >
                            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-xl text-primary-600">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Prep for Dr. Smith</h3>
                                <p className="text-sm text-slate-500 line-clamp-2">Your appointment is tomorrow. Tap to hear your health summary.</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveCard('symptom-log')}
                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 text-left hover:border-emerald-300 transition-colors flex gap-4"
                        >
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl text-emerald-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Log Symptoms</h3>
                                <p className="text-sm text-slate-500 line-clamp-2">Feeling off? Tell me about it so we can track patterns.</p>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Conversation Area - Voice First */}
            <div className="flex-1 flex flex-col justify-end pb-32">
                <div className="space-y-6 overflow-y-auto max-h-[60vh] px-4 scrollbar-hide">
                    {history.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={clsx(
                                "flex w-full",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={clsx(
                                "max-w-[80%] p-6 rounded-3xl text-lg leading-relaxed shadow-sm",
                                msg.role === 'user'
                                    ? "bg-slate-800 text-white rounded-br-none"
                                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                            )}>
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white p-6 rounded-3xl rounded-bl-none border border-slate-100 flex items-center gap-3">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Interaction Controls */}
            <div className="fixed bottom-12 left-0 right-0 flex flex-col items-center justify-center gap-6 pointer-events-none">

                {/* Visualizer & Status */}
                <div className="pointer-events-auto min-h-[60px] flex flex-col items-center">
                    {isListening ? (
                        <AudioVisualizer isActive={true} />
                    ) : (
                        <p className="text-slate-400 text-sm font-medium animate-pulse">
                            {isProcessing ? "Processing..." : "Tap to Speak"}
                        </p>
                    )}
                </div>

                {/* Main Mic Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={startListening}
                    disabled={isProcessing}
                    className={clsx(
                        "pointer-events-auto w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative z-20",
                        isListening
                            ? "bg-red-500 shadow-red-500/50 ring-8 ring-red-500/20"
                            : "bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/50 ring-8 ring-transparent hover:ring-primary-500/20"
                    )}
                >
                    <AnimatePresence mode="wait">
                        {isListening ? (
                            <motion.div
                                key="mic-off"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <MicOff size={36} className="text-white" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="mic-on"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Mic size={36} className="text-white" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Ripple Effect Background when IDLE */}
                    {!isListening && !isProcessing && (
                        <div className="absolute inset-0 rounded-full border border-primary-400 opacity-0 animate-ping" />
                    )}
                </motion.button>

                {/* Helper Actions */}
                <div className="pointer-events-auto flex items-center gap-4">
                    <button
                        className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700/50 flex items-center justify-center text-slate-500 hover:text-primary-600 transition-colors"
                        title="Keyboard Input"
                    >
                        <span className="text-xs">⌨️</span>
                    </button>
                    <button
                        className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700/50 flex items-center justify-center text-slate-500 hover:text-primary-600 transition-colors"
                        title="Mute Audio Response"
                    >
                        <Volume2 size={20} />
                    </button>
                </div>
            </div>

        </div>
    );
}
