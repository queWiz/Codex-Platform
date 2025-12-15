'use client';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Clock, FileVideo, Command, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';

export default function Sidebar({ videos }: { videos: any[] }) {
  const [isOpen, setIsOpen] = useState(true);

  // Animation variants for the sidebar
  const sidebarVariants = {
    open: {
      width: "18rem", // 288px
      transition: {
        duration: 0.5,
        // THE FIX: Changed from a number array to a string
        ease: "easeInOut", 
      },
    },
    closed: {
      width: "5rem", // 80px
      transition: {
        duration: 0.5,
        // THE FIX: Changed from a number array to a string
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.aside
      initial="open"
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      className="h-screen sticky top-0 z-50 flex flex-col 
      border-r border-indigo-500/20  {/* Brighter border for separation */}
      bg-[#050508]/95 backdrop-blur-2xl 
      shadow-2xl shadow-indigo-900/10"
    >
      {/* --- HEADER --- */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3 h-24">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <Command className="text-white w-4 h-4" />
        </div>
        <AnimatePresence>
            {isOpen && (
                <motion.span 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="font-bold tracking-widest text-xl text-white whitespace-nowrap"
                >
                    CODEX
                </motion.span>
            )}
        </AnimatePresence>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="p-4 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 text-white rounded-lg transition-all border-l-2 border-indigo-500 shadow-lg">
          <HomeIcon className="w-5 h-5 text-indigo-400 shrink-0" />
          {isOpen && <span className="text-sm font-medium whitespace-nowrap">Dashboard</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
          <BarChart2 className="w-5 h-5 shrink-0" />
          {isOpen && <span className="text-sm font-medium whitespace-nowrap">Analytics</span>}
        </button>
      </nav>

      {/* --- MEMORY BANK --- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Bank</h3>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">{videos.length}</span>
        </div>
        <div className="space-y-2">
            {videos.map((vid) => (
                <div key={vid.id} className="p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group flex items-center gap-3 border border-transparent hover:border-white/5">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <FileVideo className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                    </div>
                    {isOpen && (
                        <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-300 truncate w-32 group-hover:text-white">{vid.title}</div>
                            <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(vid.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
      
      {/* --- FOOTER / COLLAPSE BUTTON --- */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            {isOpen && (
                <div className="text-xs text-slate-500 whitespace-nowrap">
                    <p className="text-white font-medium">Operations</p>
                    <p>Online</p>
                </div>
            )}
        </div>
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex justify-center items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
        >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}