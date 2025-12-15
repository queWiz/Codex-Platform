'use client';
import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, Play, X, FileVideo, Cpu, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0); // For the cool progress bar
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!file) return;

        setUploading(true);
        setStatus('idle');
        setProgress(0);

        // Simulate progress for visual feedback (since fetch doesn't give upload progress easily)
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
        }, 300);

        try {
            // 1. Get Presigned URL
            const res1 = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, content_type: file.type })
            });
            const { url, key } = await res1.json();

            // 2. Upload to S3
            await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            
            clearInterval(progressInterval);
            setProgress(100); // Complete bar

            // 3. Trigger AI
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, title: file.name })
            });

            setStatus('success');
            setFile(null);
            
            // Reset after success animation
            setTimeout(() => {
                setStatus('idle');
                setProgress(0);
                setUploading(false);
                onUploadComplete();
            }, 2500);

        } catch (error) {
            console.error(error);
            setStatus('error');
            setUploading(false);
            clearInterval(progressInterval);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        if (inputRef.current) inputRef.current.value = ''; // Reset input
    };

    return (
        <div className="relative group z-50">
            {/* INVISIBLE INPUT: Only active when no file is selected */}
            {!file && !uploading && (
                <input 
                    ref={inputRef}
                    type="file" 
                    accept="video/*" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
            )}
            
            {/* MAIN BUTTON CONTAINER */}
            <motion.div
                layout // <--- This magic prop animates width/height changes smoothly
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`
                    relative overflow-hidden flex items-center justify-between
                    backdrop-blur-xl border shadow-2xl transition-colors
                    ${file 
                        ? 'p-1.5 rounded-xl bg-[#0a0a0c] border-indigo-500/30 w-full min-w-[320px]' 
                        : 'px-5 py-2.5 rounded-lg bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 w-auto'
                    }
                    ${status === 'success' ? '!border-green-500/50 !bg-green-900/20' : ''}
                `}
            >
                {/* BACKGROUND PROGRESS BAR 
                  Only shows when uploading. Fills the button from left to right.
                */}
                {uploading && (
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="absolute inset-0 bg-indigo-600/20 z-0"
                    />
                )}

                <AnimatePresence mode='wait'>
                    
                    {/* STATE 1: UPLOADING */}
                    {uploading ? (
                        <motion.div 
                            key="uploading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center w-full gap-3 py-2 z-10"
                        >
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            <span className="font-mono text-xs text-indigo-300 tracking-widest uppercase">
                                {progress < 100 ? `UPLINKING ${progress}%` : 'PROCESSING NEURAL DATA...'}
                            </span>
                        </motion.div>

                    /* STATE 2: SUCCESS */
                    ) : status === 'success' ? (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center w-full gap-2 py-2 z-10"
                        >
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-bold text-green-300 text-sm tracking-wide">INGEST COMPLETE</span>
                        </motion.div>

                    /* STATE 3: FILE SELECTED (The "Cartridge" Look) */
                    ) : file ? (
                        <motion.div 
                            key="file-selected"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center justify-between w-full gap-4 z-10"
                        >
                            {/* File Info Section */}
                            <div className="flex items-center gap-3 pl-2">
                                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <FileVideo className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Ready to Ingest</span>
                                    <span className="text-sm text-white font-mono truncate max-w-[140px]">{file.name}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={clearFile}
                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                
                                <button 
                                    onClick={handleUpload}
                                    className="group/btn flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                                >
                                    <Cpu className="w-3 h-3" />
                                    <span>INITIATE</span>
                                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>

                    /* STATE 4: IDLE (Default) */
                    ) : (
                        <motion.div 
                            key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center gap-3 z-10"
                        >
                            <div className="p-1 rounded bg-white/10">
                                <Upload className="w-3 h-3 text-slate-300" />
                            </div>
                            <span className="font-medium text-slate-200 text-sm">Upload Video</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* VISUAL FLARE: Scanning Line Animation when uploading */}
                {uploading && (
                    <motion.div 
                        className="absolute top-0 bottom-0 w-[2px] bg-indigo-400/50 blur-[2px] z-20"
                        animate={{ left: ["0%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                )}
            </motion.div>
        </div>
    );
}