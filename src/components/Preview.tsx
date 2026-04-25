import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { Play, Pause } from 'lucide-react';

interface PreviewProps {
  state: AppState;
}

export const Preview: React.FC<PreviewProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx(prev => (prev + 1) % state.frames.length);
    }, state.frames[currentFrameIdx]?.duration || 100);
    return () => clearInterval(interval);
  }, [isPlaying, state.frames, currentFrameIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // checkerboard
    const size = 2;
    for (let x = 0; x < canvas.width; x += size) {
        for (let y = 0; y < canvas.height; y += size) {
          ctx.fillStyle = (x/size + y/size) % 2 === 0 ? '#111' : '#222';
          ctx.fillRect(x, y, size, size);
        }
    }

    const currentFrameId = state.frames[currentFrameIdx]?.id;
    if (!currentFrameId) return;

    state.layers.forEach(layer => {
      if (!layer.visible) return;
      const celKey = `${layer.id}-${currentFrameId}`;
      const pixels = state.cels[celKey];
      if (pixels) {
        const imageData = new ImageData(new Uint8ClampedArray(pixels), state.width, state.height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.width;
        tempCanvas.height = state.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(imageData, 0, 0);
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode;
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    });

  }, [state, currentFrameIdx]);

  return (
    <div className="absolute top-4 right-72 w-32 bg-[#252525] border border-[#444] rounded overflow-hidden shadow-2xl z-20 flex flex-col">
      <div className="flex items-center justify-between px-2 py-1 bg-[#333] border-b border-[#444]">
        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">Minimap</span>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          {isPlaying ? <Pause size={10} /> : <Play size={10} />}
        </button>
      </div>
      <div className="p-3 bg-[#111] flex items-center justify-center">
        <div className="relative w-full aspect-square bg-[#1a1a1a] rounded-sm overflow-hidden flex items-center justify-center">
          <canvas 
            ref={canvasRef} 
            width={state.width} 
            height={state.height}
            className="w-full h-full image-render-pixel"
          />
        </div>
      </div>
    </div>
  );
};
