'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import VideoUpload from '../components/VideoUpload';
import RobotScene from '../components/RobotScene';
import SpotlightCard from '../components/SpotlightCard';
import NeuralBackground from '../components/NeuralBackground';
import Toast from '../components/Toast'; 
import { Search, Play, X, Zap, Command, Clock, Sparkles, Home as HomeIcon, FileVideo, Loader2, Database, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import VideoModal from '@/components/VideoModal';

export default function Home() {
  const { isSignedIn } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  // TOAST STATE
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // TRACKING PROCESSING STATUS
  // We use a Ref to store the IDs of videos that were processing in the last fetch.
  const processingIdsRef = useRef<Set<number>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetchVideos();
      const interval = setInterval(fetchVideos, 5000); 
      return () => clearInterval(interval);
    }
  }, [isSignedIn]);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/`);
      const data = await res.json();
      
      const sortedData = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // CHECK FOR COMPLETIONS
      sortedData.forEach((vid: any) => {
        // If it WAS processing before, but is NOW processed...
        if (processingIdsRef.current.has(vid.id) && vid.processed) {
            setToastMsg(`"${vid.title}" is ready for search.`);
            setShowToast(true);
            processingIdsRef.current.delete(vid.id);
        }
        
        // If it IS processing, add to set
        if (!vid.processed) {
            processingIdsRef.current.add(vid.id);
        }
      });

      setVideos(sortedData);
    } catch (e) { console.error("Failed to fetch library"); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setResults(data);
    } catch (err) { alert("Search failed"); } 
    finally { setLoading(false); }
  };

  const parseTimestamp = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    // Case 1: HH:MM:SS (3 parts) -> e.g., "01:12:05"
    if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    
    // Case 2: MM:SS (2 parts) -> e.g., "12:05"
    if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
    }
    
    // Case 3: Just Seconds (1 part) -> e.g., "45"
    if (parts.length === 1) {
        return parts[0];
    }

    return 0;
};

  if (!isSignedIn) return null;

  return (
    <div className="flex min-h-screen bg-[#020204] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">

      {/* NOTIFICATION TOAST */}
      <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <div className="bg-ambient-glow"></div>
      <NeuralBackground />

      {/* --- SIDEBAR --- */}
      <Sidebar videos={videos} />

      {/* --- CENTER STAGE --- */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar">
        <div className="absolute top-8 right-10 z-50">
            <VideoUpload onUploadComplete={fetchVideos} />
        </div>

        <div className="max-w-5xl mx-auto pt-16 px-10 pb-32">
            
            {/* HERO SECTION */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative mb-20 flex flex-col items-center"
            >
                <h1 className="relative z-10 text-5xl font-bold text-center text-white mb-2 drop-shadow-2xl tracking-tight">
                    Access Knowledge Base
                </h1>
                <p className="text-slate-500 text-sm tracking-widest uppercase mb-4">Neural Interface Online</p>

                <div className="w-full h-[470px] flex justify-center items-center pointer-events-none z-0 -mb-24 mask-gradient-bottom pt-20">
                     <RobotScene />
                </div>

                <div className="w-1 h-16 bg-gradient-to-b from-indigo-500 to-transparent opacity-50"></div>

                <div className="relative z-20 w-full max-w-2xl group mt-[-10px]">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-700"></div>
                    <SpotlightCard className="!p-0 !bg-[#0a0a0c] !backdrop-blur-xl !border-white/10 !rounded-2xl overflow-hidden shadow-2xl">
                        <form onSubmit={handleSearch} className="flex items-center h-[72px] px-4">
                            <Search className={`w-6 h-6 ml-2 ${loading ? 'text-indigo-400 animate-spin' : 'text-slate-500'}`} />
                            <input 
                                type="text" 
                                placeholder="Ask the archive..." 
                                className="flex-1 h-full bg-transparent border-none text-white text-lg px-4 focus:ring-0 focus:outline-none placeholder:text-slate-600 font-medium"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button type="submit" className="h-10 px-6 bg-white text-black hover:bg-indigo-50 rounded-lg font-bold text-sm transition-all shadow-lg tracking-wide">
                                {loading ? 'SCANNING' : 'ENTER'}
                            </button>
                        </form>
                    </SpotlightCard>
                </div>
            </motion.div>

            {/* --- RESULTS FEED (FIXED GRID LAYOUT) --- */}
            <div className="space-y-6 relative z-10">
                <AnimatePresence>
                    {results.map((vid, index) => {
                        const isBestMatch = index === 0;

                        return (
                            <motion.div 
                                key={vid.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                // 1. ADD THIS: The target scale
                                whileHover={{ scale: 1.02 }} 
                                // 2. ADD THIS: The "Spring" physics config
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 300, // Higher = snappier, Lower = softer
                                    damping: 20,    // "Friction" (prevents it from wobbling too much)
                                    mass: 0.5       // Lighter feels faster
                                }}
                                className="relative"
                            >
                                <SpotlightCard 
                                    onClick={() => setActiveVideo({ ...vid, url: vid.playback_url })}
                                    className={`
                                        !p-0 cursor-pointer group relative overflow-hidden h-auto md:h-64 rounded-xl border
                                        ${isBestMatch 
                                            // BEST MATCH: Glowing border + Same hover scale as others
                                            ? 'bg-indigo-950/10 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:shadow-[0_0_60px_rgba(99,102,241,0.2)]' 
                                            // STANDARD: Subtle border + Same hover scale
                                            : 'bg-[#0a0a0c]/80 border-white/5 hover:border-indigo-400/30 hover:bg-[#0f0f12] hover:shadow-xl'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col md:flex-row h-full w-full relative">
                                        
                                        {/* LEFT: THUMBNAIL AREA */}
                                        <div className="w-full md:w-[40%] h-48 md:h-full relative bg-black border-r border-white/5 overflow-hidden shrink-0">
                                            
                                            {/* 1. BEST MATCH BADGE (Moved INSIDE thumbnail to fix text alignment) */}
                                            {isBestMatch && (
                                                <div className="absolute top-0 left-0 z-30">
                                                    <div className="bg-indigo-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-br-lg shadow-lg border-b border-r border-indigo-400/50 tracking-widest flex items-center gap-1.5">
                                                        <Sparkles className="w-2.5 h-2.5 fill-current animate-pulse" />
                                                        BEST MATCH
                                                    </div>
                                                </div>
                                            )}

                                            <video 
                                                src={vid.playback_url}
                                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"
                                                muted loop playsInline
                                                onMouseOver={(e) => e.currentTarget.play()}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0; 
                                                }}
                                            />
                                            
                                            {/* Play Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                <div className={`
                                                    w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-lg border
                                                    ${isBestMatch ? 'bg-indigo-600/20 border-indigo-400 text-white' : 'bg-white/10 border-white/20 text-white'}
                                                `}>
                                                    <Play className="w-5 h-5 fill-current" />
                                                </div>
                                            </div>

                                            {/* INFO OVERLAY */}
                                            <div 
                                                id={`details-${vid.id}`}
                                                className="absolute inset-0 bg-[#0a0a0c]/95 z-40 p-6 flex flex-col opacity-0 pointer-events-none transition-opacity duration-300"
                                            >
                                                <h4 className="text-white font-bold mb-2 text-xs uppercase tracking-widest flex items-center gap-2">
                                                    <Maximize2 className="w-3 h-3 text-indigo-400" /> Quick Summary
                                                </h4>
                                                <p className="text-slate-400 text-xs leading-relaxed overflow-y-auto custom-scrollbar pr-2">
                                                    {vid.description || vid.transcript_summary}
                                                </p>
                                            </div>
                                        </div>

                                        {/* RIGHT: CONTENT (Now perfectly aligned for all cards) */}
                                        <div className="flex-1 p-6 flex flex-col gap-2 bg-transparent relative z-10">
                                            
                                            {/* ROW 1: Title & Actions */}
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className={`text-xl font-bold tracking-tight transition-colors line-clamp-1 ${isBestMatch ? 'text-indigo-100' : 'text-white'}`}>
                                                    {vid.title}
                                                </h3>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation(); 
                                                            const el = document.getElementById(`details-${vid.id}`);
                                                            if (el) {
                                                                const isVisible = el.style.opacity === '1';
                                                                el.style.opacity = isVisible ? '0' : '1';
                                                                el.style.pointerEvents = isVisible ? 'none' : 'auto';
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all border border-transparent hover:border-indigo-400"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    {vid.start_at !== "00:00" && (
                                                        <span className={`
                                                            flex-shrink-0 flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap transition-all border
                                                            ${isBestMatch 
                                                                ? 'bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/40' 
                                                                : 'bg-white/5 text-indigo-300 border-white/10 group-hover:border-indigo-500/50'}
                                                        `}>
                                                            <Zap className="w-3 h-3 fill-current" />
                                                            JUMP {vid.start_at}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* ROW 2: Description */}
                                            <p className={`text-sm leading-6 line-clamp-2 font-medium ${isBestMatch ? 'text-indigo-200/70' : 'text-slate-400'}`}>
                                                {vid.description}
                                            </p>

                                            {/* ROW 3: Segments */}
                                            <div className="mt-auto pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {vid.chapters.slice(0, 3).map((c: any, i: number) => (
                                                        <span key={i} className="flex items-center gap-2 text-[10px] font-mono bg-white/5 text-slate-400 px-2 py-1.5 rounded border border-white/5 hover:bg-white/10 transition-colors">
                                                            <span className="text-indigo-500">●</span>
                                                            {c.timestamp}
                                                            <span className="opacity-30">|</span>
                                                            <span className="truncate max-w-[80px]">{c.label}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
      </main>

      {/* VIDEO MODAL */}
      <AnimatePresence>
        {activeVideo && (
            <VideoModal 
                video={activeVideo} 
                // Pass the specific start time to the modal
                startTime={activeVideo.start_at} 
                onClose={() => setActiveVideo(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
}