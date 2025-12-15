'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, Home, FileVideo, ChevronLeft, ChevronRight, 
  Loader2, Clock, User 
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- ANIMATION CONFIG ---
// Switched from "spring" to "easeInOut" for a stable, high-end feel
const sidebarVariants = {
  open: { 
    width: "18rem", 
    transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] as const } // Custom bezier for smooth expansion
  },
  closed: { 
    width: "5rem", 
    transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] as const } 
  }
};

const textVariants = {
  hidden: { opacity: 0, x: -10, transition: { duration: 0.2 } },
  visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.3 } }
};

interface SidebarProps {
  videos: any[]; 
}

export default function Sidebar({ videos }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.aside
      initial="open"
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      className="h-screen sticky top-0 z-50 flex flex-col 
      border-r border-indigo-500/20  {/* Brighter border for separation */}
      bg-[#050508]/95 backdrop-blur-2xl 
      shadow-[5px_0_30px_-10px_rgba(79,70,229,0.2)] {/* The Blueish Glow */}
      overflow-visible"
    >

      {/* --- HEADER --- */}
      {/* Fixed height and padding ensures icons don't jump during collapse */}
      <div className="h-[80px] flex items-center relative pl-5">
        
        {/* LOGO CONTAINER */}
        <div className="flex items-center gap-4 overflow-hidden">
          <motion.div
            whileHover={{ rotate: 180 }}
            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] flex-shrink-0 z-20 cursor-pointer border border-indigo-400/30"
          >
            <Command className="text-white w-5 h-5" />
          </motion.div>
          
          <AnimatePresence>
            {isOpen && (
              <motion.span
                variants={textVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="font-bold text-l text-white tracking-[0.2em] whitespace-nowrap"
              >
                CODEX
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* COLLAPSE TOGGLE BUTTON 
            Now strictly positioned on the border line. 
            Because parent is overflow-visible, this won't be cut off.
        */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-[12px] top-1/2 -translate-y-1/2 z-50 w-6 h-6 rounded-full bg-[#0a0a0c] border border-white/20 text-slate-400 hover:text-white hover:scale-110 hover:border-indigo-500 transition-all flex items-center justify-center shadow-lg"
        >
          {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      {/* --- NAV SECTION --- */}
      <div className="px-4 mt-6 space-y-2"> {/* Added space-y-2 for gap */}
         
         {/* 1. DASHBOARD LINK */}
         <Link href="/">
            <div className={`
                h-12 flex items-center gap-3 px-3 rounded-xl transition-all group cursor-pointer overflow-hidden relative w-full border
                ${pathname === '/' 
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' // Active: Glow + Blue Border
                    : 'hover:bg-white/5 border-transparent opacity-80 hover:opacity-100' // Inactive
                }
            `}>
                {/* Active Indicator Line (Left) - CONDITIONAL ON PATHNAME */}
                {isOpen && pathname === '/' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}

                <Home className={`w-5 h-5 flex-shrink-0 transition-colors ${pathname === '/' ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                
                <AnimatePresence>
                    {isOpen && (
                        <motion.span 
                            variants={textVariants}
                            initial="hidden" animate="visible" exit="hidden"
                            className={`text-sm font-medium whitespace-nowrap ${pathname === '/' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                        >
                            Dashboard
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
         </Link>

         {/* 2. MEMORY BANK LINK */}
         <Link href="/memory-bank">
            <div className={`
                h-12 flex items-center gap-3 px-3 rounded-xl transition-all group cursor-pointer overflow-hidden relative w-full border
                ${pathname === '/memory-bank' 
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' // Active: Matches Dashboard
                    : 'hover:bg-white/5 border-transparent opacity-80 hover:opacity-100'
                }
            `}>
                {/* Active Indicator Line (Left) - CONDITIONAL ON PATHNAME */}
                {isOpen && pathname === '/memory-bank' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}
                
                <FileVideo className={`w-5 h-5 flex-shrink-0 transition-colors ${pathname === '/memory-bank' ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`} />

                <AnimatePresence>
                    {isOpen && (
                        <motion.span 
                            variants={textVariants}
                            initial="hidden" animate="visible" exit="hidden"
                            className={`text-sm font-medium whitespace-nowrap ${pathname === '/memory-bank' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                        >
                            All Recordings
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
         </Link>
      </div>

      {/* --- MEMORY BANK LIST --- */}
      {/* CHANGED: overflow-y-auto is here, so content clips properly inside the sidebar */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 custom-scrollbar">
        
        {/* Section Header */}
        <div className={`flex items-center mb-4 min-h-[20px] ${isOpen ? 'justify-between px-1' : 'justify-center'}`}>
            <AnimatePresence mode='wait'>
                {isOpen ? (
                    <motion.h3 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                    >
                        Memory Bank
                    </motion.h3>
                ) : (
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="w-8 h-[1px] bg-white/20" 
                    />
                )}
            </AnimatePresence>
            
            {isOpen && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {videos.length}
                </span>
            )}
        </div>

        {/* Video Items */}
        <div className="space-y-3">
            <AnimatePresence>
                {videos.map((vid, i) => (
                    <motion.div 
                        key={vid.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`
                            relative p-2 rounded-xl transition-all cursor-pointer group flex items-center border overflow-hidden
                            ${isOpen ? 'gap-3' : 'justify-center'} 
                            ${vid.processed 
                                ? 'bg-transparent border-transparent hover:bg-white/5' 
                                : 'bg-indigo-900/10 border-indigo-500/20' 
                            }
                        `}
                    >
                        {/* Shimmer (Only visible when processing) */}
                        {!vid.processed && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                        )}

                        {/* Icon Box */}
                        <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors z-10 border border-white/5
                            ${vid.processed 
                                ? 'bg-[#0f0f12] group-hover:bg-indigo-600 group-hover:border-indigo-500' 
                                : 'bg-indigo-900/20 border-indigo-500/30'
                            }
                        `}>
                            {vid.processed ? (
                                <FileVideo className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                            ) : (
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            )}
                        </div>
                        
                        {/* Text Details */}
                        {isOpen && (
                            <motion.div 
                                variants={textVariants}
                                initial="hidden" animate="visible" exit="hidden"
                                className="min-w-0 flex-1 relative z-10"
                            >
                                <div className={`text-sm font-medium truncate ${vid.processed ? 'text-slate-300 group-hover:text-white' : 'text-indigo-300'}`}>
                                    {vid.title}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    {vid.processed ? (
                                        <><Clock className="w-3 h-3" /> {new Date(vid.created_at).toLocaleDateString()}</>
                                    ) : (
                                        <span className="text-indigo-400 font-mono text-[10px] tracking-wider">ANALYZING...</span>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className={`flex items-center gap-4 transition-all ${isOpen ? '' : 'justify-center'}`}>
            <div className="hover:scale-105 transition-transform flex-shrink-0 shadow-lg relative group">
                 {/* Online Status Dot (Floating on Avatar) */}
                 <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full z-20"></div>
                 
                 <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-full h-full" } }} />
                 </div>
            </div>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        variants={textVariants}
                        initial="hidden" animate="visible" exit="hidden"
                        className="overflow-hidden whitespace-nowrap"
                    >
                        <p className="text-white text-sm font-medium tracking-wide">Operations</p>
                        <p className="text-xs text-indigo-400/80 font-mono">SYSTEM ONLINE</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}