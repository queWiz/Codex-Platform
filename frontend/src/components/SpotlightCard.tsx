'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function SpotlightCard({ 
  children, 
  className = "", 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      onClick={onClick}
      // Added h-full to outer container
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/50 text-neutral-200 transition-colors hover:border-white/20 h-full ${className}`}
    >
      {/* The Spotlight Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
        }}
      />
      
      {/* 
         THE FIX: Added 'h-full w-full' to this inner wrapper.
         This ensures your content can stretch to fill the card.
      */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}