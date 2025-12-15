'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar'; 
import VideoModal from '@/components/VideoModal'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Calendar, Database, Loader2 } from 'lucide-react';

export default function MemoryBankPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCHING LOGIC (2-STEP) ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // 1. Fetch the initial list of videos (without URLs)
        const videosRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/`);
        const videosData = await videosRes.json();
        
        if (videosData && videosData.length > 0) {
            const videoIds = videosData.map((v: any) => v.id);

            // 2. Fetch the signed playback URLs for these videos
            const urlsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/urls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: videoIds })
            });
            const urlMap = await urlsRes.json();
            
            // 3. Merge the URLs back into the video data
            const videosWithUrls = videosData.map((vid: any) => ({
                ...vid,
                playback_url: urlMap[vid.id] || ''
            }));
            
            setVideos(videosWithUrls);
        } else {
            setVideos([]);
        }

      } catch (err) {
        console.error("Failed to load memory bank:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#050508] text-white font-sans selection:bg-indigo-500/30">
      
      {/* SIDEBAR */}
      <Sidebar videos={videos} />

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto h-screen custom-scrollbar">
        <header className="mb-12 max-w-4xl">
            <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-2"
            >
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Memory Bank</h1>
            </motion.div>
            <motion.p 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="text-slate-400 text-lg"
            >
                Access all archived video data and neural analyses.
            </motion.p>
        </header>

        {/* LOADING STATE */}
        {loading && (
            <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin"/>
                <span className="text-sm">Loading Archives...</span>
            </div>
        )}

        {/* VIDEO GRID */}
        {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                {videos.map((vid, i) => (
                    <motion.div
                        key={vid.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                            // The URL is now guaranteed to be here
                            setActiveVideo({ 
                                ...vid, 
                                url: vid.playback_url 
                            })
                        }}
                        className="group bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all cursor-pointer flex flex-col hover:-translate-y-1"
                    >
                        {/* Thumbnail Area */}
                        <div className="h-48 bg-black relative overflow-hidden shrink-0">
                            {/* VIDEO PREVIEW - Now has a valid src */}
                            <video 
                                src={vid.playback_url} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                muted loop 
                                onMouseOver={e => e.currentTarget.play()} 
                                onMouseOut={e => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                }}
                            />
                            
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono border border-white/10">
                                {vid.chapters ? `${vid.chapters.length} SEGS` : 'RAW'}
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-indigo-600/90 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play className="w-5 h-5 fill-white text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Info Area */}
                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-base text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                                {vid.title}
                            </h3>
                            
                            <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                                {vid.transcript_summary || "No summary available."}
                            </p>
                            
                            <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                    <Calendar className="w-3 h-3"/> 
                                    {new Date(vid.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </main>

      {/* VIDEO MODAL */}
      <AnimatePresence>
        {activeVideo && (
            <VideoModal 
                video={activeVideo} 
                onClose={() => setActiveVideo(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
}