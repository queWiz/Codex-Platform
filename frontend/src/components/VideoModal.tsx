'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Sparkles, Play, 
  ListVideo, PenTool, Clock, Save 
} from 'lucide-react';

// Helper to parse "MM:SS" to seconds
const parseTimestamp = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return parts[0] || 0;
};

// Helper to format seconds back to "MM:SS" for the notes
const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface VideoModalProps {
    video: any;
    onClose: () => void;
}

export default function VideoModal({ video, startTime, onClose }: VideoModalProps) {
    const [isTheater, setIsTheater] = useState(false);
    const [activeTab, setActiveTab] = useState<'chapters' | 'notes'>('chapters'); // NEW: Tab State
    const [notes, setNotes] = useState(''); // NEW: Notes State
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 1);
        }
    };

    const getSegmentWidth = (startStr: string, nextStartStr?: string) => {
        const start = parseTimestamp(startStr);
        const end = nextStartStr ? parseTimestamp(nextStartStr) : duration;
        return ((end - start) / duration) * 100;
    };

    // NEW: Function to insert timestamp into notes
    const addTimestampToNotes = () => {
        const timeStamp = `[${formatTime(currentTime)}] `;
        setNotes(prev => prev + (prev.length > 0 && !prev.endsWith('\n') ? '\n' : '') + timeStamp);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-xl p-4 md:p-8"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div 
                layout 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className={`
                    relative bg-[#0a0a0c] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row transition-all duration-500
                    ${isTheater 
                        ? 'w-full h-full max-w-[98vw] max-h-[95vh]' // Theater: Full Screen Size
                        : 'w-full max-w-6xl h-[85vh]'                // Standard: Large Modal
                    }
                `}
            >
                {/* --- LEFT: VIDEO PLAYER --- */}
                <motion.div 
                    layout
                    className={`
                        relative bg-black flex flex-col justify-center
                        ${isTheater 
                            ? 'flex-1 h-full' // Theater: Grow to fill remaining width
                            : 'flex-[3] border-r border-white/5' // Standard: 70% width
                        }
                    `}
                >
                    {/* Toolbar */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        <button 
                            onClick={() => setIsTheater(!isTheater)}
                            className="p-2.5 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 text-white border border-white/10 transition-all hover:scale-105"
                        >
                            {isTheater ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-all hover:scale-105"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <video 
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        controls autoPlay playsInline src={video.url}
                        onTimeUpdate={handleTimeUpdate}

                        // --- THE JUMP LOGIC IS HERE ---
                        onLoadedMetadata={() => {
                            // If a specific startTime was passed from the search result...
                            if (startTime && startTime !== "00:00") {
                                const seconds = parseTimestamp(startTime);
                                if (seconds > 0 && videoRef.current) {
                                    videoRef.current.currentTime = seconds;
                                    videoRef.current.play().catch(console.error);
                                }
                            }
                        }}
                    />

                    {/* Timeline Strip */}
                    <div className="h-2 w-full flex bg-white/5 relative">
                        {video.chapters?.map((chap: any, i: number) => (
                            <div 
                                key={i}
                                style={{ width: `${getSegmentWidth(chap.timestamp, video.chapters[i+1]?.timestamp)}%` }}
                                className="h-full border-r border-black/50 hover:bg-indigo-500/50 bg-indigo-500/20 transition-colors cursor-pointer"
                                onClick={() => {
                                    if(videoRef.current) {
                                        videoRef.current.currentTime = parseTimestamp(chap.timestamp);
                                        videoRef.current.play();
                                    }
                                }}
                                title={chap.label}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* --- RIGHT: SIDEBAR (Tabs + Content) --- */}
                <motion.div 
                    layout
                    className={`
                        bg-[#0a0a0c] flex flex-col transition-all border-l border-white/5
                        ${isTheater 
                            ? 'w-[450px] h-full' // Theater: Fixed Wide Width, Full Height
                            : 'flex-1 min-w-[350px]' // Standard: Flexible Width
                        }
                    `}
                >
                    {/* HEADER & TABS */}
                    <div className="p-6 border-b border-white/5 flex-shrink-0">
                        <h3 className="font-bold text-white text-lg line-clamp-1">{video.title}</h3>
                        
                        {/* TAB SWITCHER */}
                        <div className="flex items-center gap-2 mt-4 p-1 bg-white/5 rounded-lg border border-white/5">
                            <button 
                                onClick={() => setActiveTab('chapters')}
                                className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md transition-all ${activeTab === 'chapters' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <ListVideo className="w-3.5 h-3.5" /> Segments
                            </button>
                            <button 
                                onClick={() => setActiveTab('notes')}
                                className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md transition-all ${activeTab === 'notes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <PenTool className="w-3.5 h-3.5" /> Notes
                            </button>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${isTheater && activeTab === 'chapters' ? 'grid grid-cols-2 lg:grid-cols-1 gap-3' : ''}`}>
                        
                        {/* TAB 1: CHAPTERS */}
                        {activeTab === 'chapters' && (
                            <div className="space-y-2">
                                {video.chapters?.map((chap: any, idx: number) => {
                                    const chapTime = parseTimestamp(chap.timestamp);
                                    const nextChapTime = video.chapters[idx+1] ? parseTimestamp(video.chapters[idx+1].timestamp) : duration;
                                    const isActive = currentTime >= chapTime && currentTime < nextChapTime;

                                    return (
                                        <button 
                                            key={idx} 
                                            onClick={() => {
                                                if(videoRef.current) {
                                                    videoRef.current.currentTime = chapTime;
                                                    videoRef.current.play();
                                                }
                                            }}
                                            className={`
                                                w-full text-left p-3 rounded-xl transition-all group flex gap-3 border
                                                ${isActive ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}
                                            `}
                                        >
                                            <div className={`font-mono text-[10px] py-1 px-2 rounded h-fit ${isActive ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                                                {chap.timestamp}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>
                                                    {chap.label}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* TAB 2: NEURAL NOTES */}
                        {activeTab === 'notes' && (
                            <div className="h-full flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-indigo-400" /> AI-Enhanced Editor
                                    </span>
                                    <button 
                                        onClick={addTimestampToNotes}
                                        className="text-[10px] flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                                    >
                                        <Clock className="w-3 h-3" /> Capture {formatTime(currentTime)}
                                    </button>
                                </div>
                                
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Start typing your observation..."
                                    className="flex-1 w-full bg-[#050508] border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed placeholder:text-slate-600"
                                    spellCheck={false}
                                />
                                
                                <button className="w-full py-3 bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-2">
                                    <Save className="w-3.5 h-3.5" /> Save to Memory Bank
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}