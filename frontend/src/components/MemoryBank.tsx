'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar'; // Adjust path
import VideoModal from '@/components/VideoModal'; // Adjust path
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Calendar } from 'lucide-react';

export default function MemoryBank() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Videos (Same logic as main page)
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/videos/?skip=0&limit=100');
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#050508] text-white font-sans selection:bg-indigo-500/30">
      
      {/* SIDEBAR (Reuse your existing component) */}
      <Sidebar videos={videos} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Memory Bank</h1>
            <p className="text-slate-400">Archived neural simulations and recordings.</p>
        </header>

        {/* VIDEO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((vid, i) => (
                <motion.div
                    key={vid.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveVideo({ ...vid, url: vid.playback_url || vid.s3_key })} // Ensure URL exists
                    className="group bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl transition-all cursor-pointer"
                >
                    {/* Thumbnail Area */}
                    <div className="h-48 bg-black relative overflow-hidden">
                        {/* If you have a thumbnail URL, use <img> here. Otherwise, use video preview */}
                        <video 
                             src={vid.playback_url} 
                             className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                             muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                <Play className="w-5 h-5 fill-current" />
                            </div>
                        </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-5">
                        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-indigo-400 transition-colors">{vid.title}</h3>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(vid.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {vid.chapters?.length || 0} Segments</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
      </main>

      {/* REUSE YOUR VIDEO MODAL */}
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