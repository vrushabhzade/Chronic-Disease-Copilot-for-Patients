import React from 'react';
import { motion } from 'framer-motion';

const AudioVisualizer = ({ isActive }) => {
    return (
        <div className="flex justify-center items-center gap-1 h-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <motion.div
                    key={bar}
                    className="w-1.5 bg-primary-500 rounded-full"
                    animate={{
                        height: isActive ? [12, 32, 12] : 8,
                        opacity: isActive ? 1 : 0.5,
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: isActive ? Infinity : 0,
                        repeatType: "reverse",
                        delay: bar * 0.1,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

export default AudioVisualizer;
