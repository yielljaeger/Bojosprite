import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AppState, ToolType } from '../types';

interface CanvasProps {
  state: AppState;
  activeBuffer: React.MutableRefObject<Uint8ClampedArray | null>;
  onDraw: (x: number, y: number) => void;
  onDrawEnd: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ state, activeBuffer, onDraw, onDrawEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const renderRequestId = useRef<number>(0);

  const offscreenCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Helper to get or create an offscreen canvas for a cel
  const getCelCanvas = (celKey: string, width: number, height: number, pixels: Uint8ClampedArray) => {
    let offscreen = offscreenCanvases.current.get(celKey);
    if (!offscreen || offscreen.width !== width || offscreen.height !== height) {
      offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      offscreenCanvases.current.set(celKey, offscreen);
    }
    
    const ctx = offscreen.getContext('2d', { alpha: true });
    if (ctx) {
      const imageData = new ImageData(pixels, width, height);
      ctx.putImageData(imageData, 0, 0);
    }
    return offscreen;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Onion Skinning
    if (state.onionSkin) {
      const frameIdx = state.frames.findIndex(f => f.id === state.currentFrameId);
      if (frameIdx > 0) {
        const prevFrameId = state.frames[frameIdx - 1].id;
        ctx.globalAlpha = 0.3;
        state.layers.forEach(layer => {
          if (!layer.visible) return;
          const celKey = `${layer.id}-${prevFrameId}`;
          const pixels = state.cels[celKey];
          if (pixels) {
            const celCanvas = getCelCanvas(celKey, state.width, state.height, pixels);
            ctx.drawImage(celCanvas, 0, 0);
          }
        });
        ctx.globalAlpha = 1.0;
      }
    }

    // Render layers
    state.layers.forEach(layer => {
      if (!layer.visible) return;
      
      const isCurrentLayer = layer.id === state.currentLayerId;
      const celKey = `${layer.id}-${state.currentFrameId}`;
      const pixels = state.cels[celKey];
      
      if (pixels) {
        // If this is the active layer and we have an active buffer, use it instead of state
        const bufferToUse = (isCurrentLayer && activeBuffer.current) ? activeBuffer.current : pixels;
        const celCanvas = getCelCanvas(celKey, state.width, state.height, bufferToUse);
        
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode;
        ctx.drawImage(celCanvas, 0, 0);
      }
    });

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    
    renderRequestId.current = requestAnimationFrame(render);
  }, [state, activeBuffer]);

  useEffect(() => {
    renderRequestId.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderRequestId.current);
  }, [render]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing && e.type !== 'pointerdown') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / state.width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / state.height));

    if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
      onDraw(x, y);
    }
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onDrawEnd();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full bg-[#1a1a1a] overflow-hidden cursor-crosshair"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[#222] opacity-10" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      <div 
        style={{ 
          width: state.width * state.zoom, 
          height: state.height * state.zoom,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        className="relative bg-[#111] border-4 border-[#333]"
      >
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: 'linear-gradient(45deg, #181818 25%, transparent 25%), linear-gradient(-45deg, #181818 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181818 75%), linear-gradient(-45deg, transparent 75%, #181818 75%)', 
            backgroundSize: '20px 20px', 
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' 
          }} 
        />
        <canvas
          ref={canvasRef}
          width={state.width}
          height={state.height}
          className="relative z-10 w-full h-full image-render-pixel"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />

        {/* Preview Pixels Overlay */}
        {state.previewPixels && (
          <div className="absolute inset-0 z-15 pointer-events-none">
            <canvas
              width={state.width}
              height={state.height}
              className="w-full h-full image-render-pixel"
              ref={(el) => {
                if (el) {
                  const ctx = el.getContext('2d');
                  if (ctx) {
                    ctx.clearRect(0, 0, state.width, state.height);
                    state.previewPixels!.forEach(({x, y, color}) => {
                      ctx.fillStyle = color;
                      ctx.fillRect(x, y, 1, 1);
                    });
                  }
                }
              }}
            />
          </div>
        )}
        
        {state.showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: `${state.zoom}px ${state.zoom}px`
            }}
          />
        )}

        {/* Symmetry Guides */}
        {state.symmetry.x && (
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-orange-500/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
        )}
        {state.symmetry.y && (
          <div className="absolute left-0 right-0 top-1/2 h-px bg-orange-500/40 z-30 pointer-events-none shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
        )}

        {state.selection && (
          <div 
            className="absolute border border-dashed border-white shadow-[0_0_0_1px_black] pointer-events-none"
            style={{
              left: state.selection.x * state.zoom,
              top: state.selection.y * state.zoom,
              width: (state.selection.w + 1) * state.zoom,
              height: (state.selection.h + 1) * state.zoom,
            }}
          />
        )}
      </div>
    </div>
  );
};
