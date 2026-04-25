import React from 'react';
import { AppState, Frame } from '../types';
import { 
  Plus, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Clock,
  Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface TimelineProps {
  state: AppState;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onDeleteFrame: (id: string) => void;
  onToggleOnionSkin: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  state, 
  onSelectFrame, 
  onAddFrame,
  onDeleteFrame,
  onToggleOnionSkin
}) => {
  return (
    <div className="h-40 bg-[#1e1e1e] border-t border-[#333] flex flex-col">
      {/* Controls Bar */}
      <div className="flex items-center gap-6 px-4 h-10 bg-[#252525] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <button className="text-[#666] hover:text-white transition-colors p-1"><SkipBack size={14} /></button>
          <button className="w-7 h-7 bg-orange-600 hover:bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg transition-all"><Play size={14} className="ml-0.5" /></button>
          <button className="text-[#666] hover:text-white transition-colors p-1"><SkipForward size={14} /></button>
        </div>
        
        <div className="text-[10px] font-mono text-orange-500 tracking-tighter">00:01 / 00:12</div>

        <div className="h-4 w-px bg-[#444]" />
        
        <button 
          onClick={onToggleOnionSkin}
          className={cn(
            "text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded transition-all",
            state.onionSkin ? "bg-blue-600 text-white shadow-md" : "text-[#666] bg-[#1a1a1a] hover:bg-[#333] border border-[#333]"
          )}
        >
          Onion Skin
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-[#555] tracking-widest text-[9px] font-bold">
          <span>12 FPS</span>
          <div className="h-3 w-px bg-[#444]" />
          <span>LOOP</span>
        </div>
      </div>

      {/* Frames Area */}
      <div className="flex-1 flex overflow-x-auto p-4 gap-2 items-start bg-[#222]">
        {state.frames.map((frame, index) => (
          <div
            key={frame.id}
            onClick={() => onSelectFrame(frame.id)}
            className="group flex flex-col items-center gap-1 shrink-0 cursor-pointer"
          >
            <div className={cn(
              "w-10 h-10 rounded border transition-all duration-200 flex flex-col items-center justify-center overflow-hidden relative",
              state.currentFrameId === frame.id 
                ? "border-orange-500 bg-[#3a3a3a] shadow-lg scale-105" 
                : "border-[#444] bg-[#1a1a1a] hover:border-gray-500 hover:bg-[#252525]"
            )}>
              <span className={cn(
                "text-[9px] font-bold",
                state.currentFrameId === frame.id ? "text-orange-500" : "text-[#444]"
              )}>{index + 1}</span>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFrame(frame.id);
                }}
                className="absolute top-0 right-0 w-3 h-3 bg-red-900 text-white flex items-center justify-center text-[7px] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Frame"
              >X</button>
            </div>
          </div>
        ))}
        
        <button
          onClick={onAddFrame}
          className="w-10 h-10 rounded border border-dashed border-[#444] hover:border-gray-500 flex items-center justify-center text-[#444] hover:text-white transition-all bg-transparent shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Status Footer */}
      <div className="h-6 bg-[#111] border-t border-[#333] flex items-center justify-between px-3 text-[9px] uppercase tracking-widest text-[#555]">
        <div className="flex gap-4">
          <span>Ready.</span>
          <span>All changes saved to cloud.</span>
        </div>
        <div className="flex gap-4">
          <span>Cursor: {Math.floor(state.width/2)}, {Math.floor(state.height/2)}</span>
          <span>Zoom: {Math.round(state.zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
