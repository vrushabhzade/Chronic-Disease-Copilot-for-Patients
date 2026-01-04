import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyToggle() {
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('privacyMode') === 'true';
        setIsPrivacyMode(stored);
        // Dispatch event for other components to listen if needed
        window.dispatchEvent(new CustomEvent('privacy-change', { detail: stored }));
    }, []);

    const toggle = () => {
        const newState = !isPrivacyMode;
        setIsPrivacyMode(newState);
        localStorage.setItem('privacyMode', newState);
        window.dispatchEvent(new CustomEvent('privacy-change', { detail: newState }));

        // Force reload to ensure all fetchers pick up the new header if they aren't reactive
        // Or we can rely on context. For MVP, simple localStorage check in fetch wrappers works.
        // Let's reload to be safe and clear current view state.
        window.location.reload();
    };

    return (
        <button
            onClick={toggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${isPrivacyMode
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
            title={isPrivacyMode ? "Zero Retention Active: Data is NOT saved." : "Standard Mode: Data is saved."}
        >
            {isPrivacyMode ? <Shield size={16} /> : <ShieldAlert size={16} className="text-slate-400" />}
            <span className="text-xs font-semibold">
                {isPrivacyMode ? 'Incognito' : 'Standard'}
            </span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isPrivacyMode ? 'bg-emerald-900' : 'bg-slate-200'}`}>
                <motion.div
                    layout
                    className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm ${isPrivacyMode ? 'bg-emerald-400 left-4.5' : 'bg-white left-0.5'}`}
                />
            </div>
        </button>
    );
}
