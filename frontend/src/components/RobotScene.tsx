'use client';
import { memo } from 'react';
import dynamic from 'next/dynamic';

// Lazy load Spline inside this isolated component
const Spline = dynamic(() => import('@splinetool/react-spline'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#00f3ff] animate-pulse font-mono tracking-widest text-xl">
            INITIALIZING 3D CORE...
        </div>
    </div>
  )
});

// The 'memo' function tells React: "If props didn't change, DO NOT re-render this."
const RobotScene = memo(function RobotScene() {
  return (
    <div className="w-full h-full">
       <Spline scene="https://prod.spline.design/I-pCx-ZEk61Y8Yx2/scene.splinecode" />
    </div>
  );
});

export default RobotScene;