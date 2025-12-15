'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 bg-[#0a0a0c] border border-green-500/30 text-white px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.2)] backdrop-blur-md"
        >
          <div className="bg-green-500/20 p-2 rounded-full">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Analysis Complete</h4>
            <p className="text-xs text-slate-400">{message}</p>
          </div>
          <button onClick={onClose} className="ml-4 hover:text-white text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}