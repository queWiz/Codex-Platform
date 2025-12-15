'use client';
import { useState, useEffect, useRef } from 'react';
// FIX: Import SignInButton for the landing page
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs'; 
import VideoUpload from '../components/VideoUpload';
import RobotScene from '../components/RobotScene';
import SpotlightCard from '../components/SpotlightCard';
import NeuralBackground from '../components/NeuralBackground';
import Toast from '../components/Toast'; 
import { Search, Play, X, Zap, Command, Clock, Sparkles, Home as HomeIcon, FileVideo, Loader2, Database, Maximize2, ArrowRight } from 'lucide-react';
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

  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
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
      
      sortedData.forEach((vid: any) => {
        if (processingIdsRef.current.has(vid.id) && vid.processed) {
            setToastMsg(`"${vid.title}" is ready for search.`);
            setShowToast(true);
            processingIdsRef.current.delete(vid.id);
        }
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
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return 0;
  };

  // --- LANDING PAGE (Unauthenticated State) ---
  if (!isSignedIn) {
     return (
         <div className="flex h-screen items-center justify-center relative overflow-hidden">
            {/* Main Content Container */}
            <div className="z-10 text-center max-w-4xl px-6 relative">
                
                {/* WRAPPER for Text and Robot Layering */}
                <div className="relative">

                    {/* --- 3D ROBOT (LAYERED BEHIND) --- */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ duration: 1, ease: "easeOut" }}
                        // ABSOLUTE POSITIONING to layer it. 
                        // top-[-20%] pulls it up so the bottom sits behind the text.
                        // z-0 places it behind the text.
                        className="absolute top-[-60%] -translate-x-1/2 w-80 h-80 md:w-[400px] md:h-[400px] z-0 pointer-events-none opacity-80" 
                    >
                        <RobotScene />
                        {/* Gradient to fade the robot's base */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#020204] via-[#020204]/60 to-transparent"></div>
                    </motion.div>

                    {/* --- TYPOGRAPHY (LAYERED IN FRONT) --- */}
                    {/* z-10 ensures this sits ON TOP of the robot */}
                    <div className="relative z-10 space-y-4 pt-20 md:pt-32"> {/* Added padding-top to make room for robot head */}
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.2 }}
                            className="text-7xl md:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl"
                        >
                            CODEX
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: 0.4 }}
                            className="text-blue-200/80 text-lg md:text-xl tracking-[0.2em] font-medium uppercase"
                        >
                            Neural Interface Online
                        </motion.p>
                    </div>
                </div>

                {/* --- LOGIN BUTTON --- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 relative z-20" // z-20 to be sure it's clickable
                >
                    <SignInButton mode="modal">
                        <button className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-slate-200 transition-all flex items-center gap-2 mx-auto shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                            ACCESS ARCHIVES
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </SignInButton>
                </motion.div>
            </div>
         </div>
     )
  }

  // --- DASHBOARD (Authenticated State) ---
  return (
    <div className="flex min-h-screen bg-[#020204] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <div className="bg-ambient-glow"></div>
      <NeuralBackground />

      <Sidebar videos={videos} />

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar">
        <div className="absolute top-8 right-10 z-50">
            <VideoUpload onUploadComplete={fetchVideos} />
        </div>

        <div className="max-w-5xl mx-auto pt-16 px-10 pb-32">
            
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

            <div className="space-y-6 relative z-10">
                <AnimatePresence>
                    {results.map((vid, index) => {
                        const isBestMatch = index === 0 && vid.start_at !== "00:00";

                        return (
                            <motion.div 
                                key={vid.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }} 
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="relative"
                            >
                                <SpotlightCard 
                                    onClick={() => setActiveVideo({ ...vid, url: vid.playback_url })}
                                    className={`
                                        !p-0 cursor-pointer group relative overflow-hidden h-auto md:h-64 rounded-xl border
                                        ${isBestMatch 
                                            ? 'bg-indigo-950/10 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.1)]' 
                                            : 'bg-[#0a0a0c]/80 border-white/5 hover:border-indigo-400/30'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col md:flex-row h-full w-full relative">
                                        <div className="w-full md:w-[40%] h-48 md:h-full relative bg-black border-r border-white/5 overflow-hidden shrink-0">
                                            {isBestMatch && (
                                                <div className="absolute top-0 left-0 z-30">
                                                    <div className="bg-indigo-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-br-lg shadow-lg flex items-center gap-1.5">
                                                        <Sparkles className="w-2.5 h-2.5 fill-current" /> BEST MATCH
                                                    </div>
                                                </div>
                                            )}
                                            <video 
                                                src={vid.playback_url}
                                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100"
                                                muted loop playsInline
                                                onMouseOver={(e) => e.currentTarget.play()}
                                                onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                <div className={`
                                                    w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-lg border
                                                    ${isBestMatch ? 'bg-indigo-600/20 border-indigo-400' : 'bg-white/10 border-white/20'}
                                                `}>
                                                    <Play className="w-5 h-5 fill-current" />
                                                </div>
                                            </div>
                                            <div id={`details-${vid.id}`} className="absolute inset-0 bg-[#0a0a0c]/95 z-40 p-6 flex flex-col opacity-0 pointer-events-none">
                                                <h4 className="text-white font-bold mb-2 text-xs uppercase tracking-widest flex items-center gap-2">
                                                    <Maximize2 className="w-3 h-3 text-indigo-400" /> Quick Summary
                                                </h4>
                                                <p className="text-slate-400 text-xs leading-relaxed overflow-y-auto custom-scrollbar">
                                                    {vid.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-6 flex flex-col gap-2 bg-transparent relative z-10">
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className={`text-xl font-bold tracking-tight line-clamp-1 ${isBestMatch ? 'text-indigo-100' : 'text-white'}`}>
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
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {vid.start_at !== "00:00" && (
                                                        <span className={`
                                                            flex-shrink-0 flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg border
                                                            ${isBestMatch 
                                                                ? 'bg-indigo-500 text-white border-indigo-400' 
                                                                : 'bg-white/5 text-indigo-300 border-white/10'}
                                                        `}>
                                                            <Zap className="w-3 h-3 fill-current" />
                                                            JUMP {vid.start_at}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`text-sm leading-6 line-clamp-2 ${isBestMatch ? 'text-indigo-200/70' : 'text-slate-400'}`}>
                                                {vid.description}
                                            </p>
                                            <div className="mt-auto pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {vid.chapters.slice(0, 3).map((c: any, i: number) => (
                                                        <span key={i} className="flex items-center gap-2 text-[10px] font-mono bg-white/5 text-slate-400 px-2 py-1.5 rounded">
                                                            <span className="text-indigo-500">●</span>
                                                            {c.timestamp}
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

      <AnimatePresence>
        {activeVideo && (
            <VideoModal 
                video={activeVideo} 
                startTime={activeVideo.start_at} 
                onClose={() => setActiveVideo(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
}