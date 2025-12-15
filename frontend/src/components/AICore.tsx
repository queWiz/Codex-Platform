'use client';
import { motion } from 'framer-motion';

export default function AICore({ state }: { state: 'idle' | 'searching' | 'processing' }) {
    // Different colors based on state
    const glowColor = state === 'searching' ? '#00f0ff' : state === 'processing' ? '#bd00ff' : '#ffffff';
    
    return (
        <div className="relative w-32 h-32 flex items-center justify-center perspective-1000">
            {/* Outer Ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-slate-700 rounded-full border-t-transparent border-l-transparent opacity-50"
            />
            
            {/* The 3D Cube */}
            <motion.div 
                className="relative w-16 h-16 transform-style-3d"
                animate={{ rotateX: 360, rotateY: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            >
                {/* Faces of the cube */}
                {[0, 90, 180, 270].map((deg, i) => (
                    <div 
                        key={i} 
                        className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-sm"
                        style={{ transform: `rotateY(${deg}deg) translateZ(32px)` }}
                    />
                ))}
                <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-sm" style={{ transform: `rotateX(90deg) translateZ(32px)` }} />
                <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-sm" style={{ transform: `rotateX(-90deg) translateZ(32px)` }} />
                
                {/* Inner Core Pulsing */}
                <motion.div 
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 m-auto w-8 h-8 rounded-full blur-md"
                    style={{ backgroundColor: glowColor }}
                />
            </motion.div>
        </div>
    );
}