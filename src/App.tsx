/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useBojosprite } from './hooks/useBojosprite';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Timeline } from './components/Timeline';
import { Preview } from './components/Preview';
import { ToolType, Layer } from './types';
import { Download, Share2, Github, Settings, Moon, Sun, Film } from 'lucide-react';
import GIF from 'gif.js';
// @ts-ignore - Vite specific URL import
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';

export default function App() {
  const { 
    state, 
    updateState, 
    setPixel, 
    setPixelLive,
    beginStroke,
    commitStroke,
    activeBuffer,
    floodFill,
    drawBrush,
    copyToClipboard,
    drawLine,
    drawRect,
    drawCircle,
    applyPixels,
    resizeCanvas,
    moveCel,
    undo, 
    redo, 
    canUndo, 
    canRedo,
    addFrame,
    addLayer,
    deleteLayer,
    deleteFrame,
    createNewSprite
  } = useBojosprite();

  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const moveSnapshotRef = useRef<Uint8ClampedArray | null>(null);
  const wasMovingRef = useRef(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSize, setNewSize] = useState({ w: 32, h: 32 });
  const [createSpriteSize, setCreateSpriteSize] = useState({ w: 32, h: 32 });

  useEffect(() => {
    if (showResizeModal) {
      setNewSize({ w: state.width, h: state.height });
    }
  }, [showResizeModal, state.width, state.height]);

  const handleDraw = useCallback((x: number, y: number) => {
    let startX = x;
    let startY = y;
    
    if (!dragStart) {
        setDragStart({x, y});
        if (state.selectedTool === ToolType.MOVE) {
            const celKey = `${state.currentLayerId}-${state.currentFrameId}`;
            const pixels = state.cels[celKey];
            if (pixels) {
                moveSnapshotRef.current = new Uint8ClampedArray(pixels);
                wasMovingRef.current = true;
            }
        }

        if (state.selectedTool === ToolType.PENCIL || state.selectedTool === ToolType.ERASER) {
            beginStroke();
        }
        return;
    } else {
        startX = dragStart.x;
        startY = dragStart.y;
    }

    if (state.selectedTool === ToolType.RECT_SELECT) {
        updateState({
            selection: {
                x: Math.min(startX, x),
                y: Math.min(startY, y),
                w: Math.abs(x - startX),
                h: Math.abs(y - startY),
                active: true
            }
        }, false);
        return;
    }

    if (state.selectedTool === ToolType.LINE) {
        const line = drawLine(startX, startY, x, y);
        updateState({ previewPixels: line.map(p => ({ ...p, color: state.primaryColor })) }, false);
        return;
    }

    if (state.selectedTool === ToolType.RECTANGLE) {
        const rect = drawRect(startX, startY, x, y);
        updateState({ previewPixels: rect.map(p => ({ ...p, color: state.primaryColor })) }, false);
        return;
    }

    if (state.selectedTool === ToolType.CIRCLE) {
        const circle = drawCircle(startX, startY, x, y);
        updateState({ previewPixels: circle.map(p => ({ ...p, color: state.primaryColor })) }, false);
        return;
    }

    if (state.selectedTool === ToolType.MOVE) {
        if (moveSnapshotRef.current) {
            const dx = x - startX;
            const dy = y - startY;
            moveCel(dx, dy, moveSnapshotRef.current);
        }
        return;
    }

    if (state.selectedTool === ToolType.BRUSH) {
      drawBrush(x, y);
      return;
    }

    // Immediate draw tools (Optimized)
    if (state.selectedTool === ToolType.PENCIL) {
      setPixelLive(x, y, state.primaryColor);
    } else if (state.selectedTool === ToolType.ERASER) {
      setPixelLive(x, y, '#000000', 0);
    } else if (state.selectedTool === ToolType.BUCKET) {
      floodFill(x, y, state.primaryColor);
    } else if (state.selectedTool === ToolType.PICKER) {
      const celKey = `${state.currentLayerId}-${state.currentFrameId}`;
      const pixels = state.cels[celKey];
      const index = (y * state.width + x) * 4;
      const r = pixels[index];
      const g = pixels[index+1];
      const b = pixels[index+2];
      const alpha = pixels[index+3];
      if (alpha === 0) return;
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      updateState({ primaryColor: hex });
    }
  }, [state, dragStart, setPixel, updateState, drawLine, drawRect, drawCircle]);

  const handleDrawEnd = useCallback(() => {
    if (state.previewPixels) {
      applyPixels(state.previewPixels.map(p => ({ x: p.x, y: p.y })), state.primaryColor);
    }
    
    commitStroke();
    
    if (wasMovingRef.current) {
        // Explicitly trigger history save by calling updateState with current state but saveHistory=true
        updateState((prev) => ({ ...prev }), true); 
        wasMovingRef.current = false;
        moveSnapshotRef.current = null;
    }

    setDragStart(null);
    updateState({ previewPixels: null }, false);
  }, [state, applyPixels, updateState, commitStroke]);

  const handleImportBrush = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        updateState({ 
          clipboard: { pixels: imageData.data, w: img.width, h: img.height },
          selectedTool: ToolType.BRUSH
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  (window as any).onImportBrush = handleImportBrush;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          copyToClipboard();
        } else if (e.key === 'v') {
          updateState({ selectedTool: ToolType.BRUSH });
        } else if (e.key === 'z') {
          e.shiftKey ? redo() : undo();
        } else if (e.key === 'd') {
          e.preventDefault();
          updateState({ selection: null });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selection) {
          const pixelsToClear: {x: number, y: number}[] = [];
          for (let ix = 0; ix < state.selection.w; ix++) {
            for (let iy = 0; iy < state.selection.h; iy++) {
              pixelsToClear.push({ x: state.selection.x + ix, y: state.selection.y + iy });
            }
          }
          applyPixels(pixelsToClear, '#00000000');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyToClipboard, updateState, undo, redo]);

  const saveProjectLocally = () => {
    try {
      const serializableState = {
        ...state,
        cels: Object.fromEntries(
          Object.entries(state.cels).map(([key, val]) => [key, Array.from(val as Uint8ClampedArray)])
        )
      };
      
      const jsonStr = JSON.stringify(serializableState);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bojosprite-project-${Date.now()}.bojo`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to save project.");
    }
  };

  const loadProjectLocally = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const parsed = JSON.parse(jsonStr);
        
        // Reconstruct Uint8ClampedArrays
        const reconstructedCels: Record<string, Uint8ClampedArray> = {};
        for (const [key, val] of Object.entries(parsed.cels)) {
          reconstructedCels[key] = new Uint8ClampedArray(val as number[]);
        }
        
        parsed.cels = reconstructedCels;
        
        // Update the state entirely
        updateState({ ...parsed }, true);

      } catch (err) {
        console.error("Failed to parse project file.", err);
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
    
    e.target.value = ''; // reset input
  };

  const exportAsPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = state.width;
    canvas.height = state.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw all visible layers for current frame
    state.layers.forEach(layer => {
      if (!layer.visible) return;
      const celKey = `${layer.id}-${state.currentFrameId}`;
      const pixels = state.cels[celKey];
      if (pixels) {
        const imageData = new ImageData(new Uint8ClampedArray(pixels), state.width, state.height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.width;
        tempCanvas.height = state.height;
        tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(tempCanvas, 0, 0);
      }
    });

    const link = document.createElement('a');
    link.download = `bojosprite-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportAsSpriteSheet = () => {
    const canvas = document.createElement('canvas');
    canvas.width = state.width * state.frames.length;
    canvas.height = state.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    state.frames.forEach((frame, frameIdx) => {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = state.width;
      frameCanvas.height = state.height;
      const fCtx = frameCanvas.getContext('2d');
      if (!fCtx) return;

      state.layers.forEach(layer => {
        if (!layer.visible) return;
        const celKey = `${layer.id}-${frame.id}`;
        const pixels = state.cels[celKey];
        if (pixels) {
          const imageData = new ImageData(new Uint8ClampedArray(pixels), state.width, state.height);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = state.width;
          tempCanvas.height = state.height;
          tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
          fCtx.globalAlpha = layer.opacity;
          fCtx.drawImage(tempCanvas, 0, 0);
        }
      });

      ctx.drawImage(frameCanvas, frameIdx * state.width, 0);
    });

    const link = document.createElement('a');
    link.download = `spritesheet-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportAsGIF = () => {
    // We use a chroma key for exact transparency matching in GIF
    const chromaKey = '#ff00ff';
    
    const gif = new GIF({
      workers: 2,
      quality: 1, // lowest number is best quality
      width: state.width,
      height: state.height,
      workerScript: gifWorkerUrl,
      transparent: parseInt('ff00ff', 16), // gif.js expects hex number or string sometimes, actually it uses hex number internally if provided, or string parsing. 0xff00ff
    });

    state.frames.forEach((frame) => {
      const canvas = document.createElement('canvas');
      canvas.width = state.width;
      canvas.height = state.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill with chroma key first
      ctx.fillStyle = chromaKey;
      ctx.fillRect(0, 0, state.width, state.height);

      state.layers.forEach(layer => {
        if (!layer.visible) return;
        const celKey = `${layer.id}-${frame.id}`;
        const pixels = state.cels[celKey];
        if (pixels) {
          const imageData = new ImageData(new Uint8ClampedArray(pixels), state.width, state.height);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = state.width;
          tempCanvas.height = state.height;
          tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(tempCanvas, 0, 0);
        }
      });
      // dispose: 2 restores to background color, preventing overlapping
      gif.addFrame(canvas, { delay: 100, dispose: 2 });
    });

    gif.on('finished', function(blob: Blob) {
      if (blob) {
        const link = document.createElement('a');
        link.download = `bojosprite-${Date.now()}.gif`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    });

    gif.render();
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#d1d1d1] overflow-hidden font-sans select-none">
      {/* Header */}
      <header className="h-10 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4 shrink-0 transition-colors">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-sm font-bold tracking-tighter text-orange-500 uppercase">Bojosprite</span>
            <span className="text-[10px] text-gray-600 font-bold tracking-wider">v1.0</span>
          </div>
          
          <nav className="flex items-center gap-4 text-[11px] text-[#888] uppercase tracking-wider h-full relative">
            <div className="relative h-full flex items-center">
              <button onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')} className="hover:text-white transition-colors h-full px-2">File</button>
              {activeMenu === 'file' && (
                <div className="absolute top-10 left-0 bg-[#252525] border border-[#333] shadow-xl z-[100] min-w-[120px] rounded py-1">
                  <button onClick={() => { setShowNewModal(true); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">New Sprite...</button>
                  <label className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] cursor-pointer block">
                    Load Project
                    <input type="file" className="hidden" accept=".bojo,.json" onChange={(e) => { loadProjectLocally(e); setActiveMenu(null); }} />
                  </label>
                  <button onClick={() => { saveProjectLocally(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Save Project</button>
                  <div className="h-px bg-[#333] my-1" />
                  <label className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] cursor-pointer block">
                    Import PNG
                    <input type="file" className="hidden" accept="image/png" onChange={(e) => { /* TODO: Basic import */ setActiveMenu(null); }} />
                  </label>
                  <div className="h-px bg-[#333] my-1" />
                  <button onClick={exportAsPNG} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Export PNG</button>
                  <button onClick={exportAsGIF} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Export GIF</button>
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')} className="hover:text-white transition-colors h-full px-2">Edit</button>
              {activeMenu === 'edit' && (
                <div className="absolute top-10 left-0 bg-[#252525] border border-[#333] shadow-xl z-[100] min-w-[120px] rounded py-1">
                  <button onClick={() => { undo(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] disabled:opacity-30" disabled={!canUndo}>Undo</button>
                  <button onClick={() => { redo(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] disabled:opacity-30" disabled={!canRedo}>Redo</button>
                  <div className="h-px bg-[#333] my-1" />
                  <button onClick={() => { copyToClipboard(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Copy Selection</button>
                  <button onClick={() => { updateState({ selectedTool: ToolType.BRUSH }); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Paste</button>
                  <button onClick={() => { updateState({ selection: null }); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Clear Selection</button>
                  <div className="h-px bg-[#333] my-1" />
                  <button onClick={() => { setShowResizeModal(true); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px]">Canvas Size...</button>
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')} className="hover:text-white transition-colors h-full px-2">View</button>
              {activeMenu === 'view' && (
                <div className="absolute top-10 left-0 bg-[#252525] border border-[#333] shadow-xl z-[100] min-w-[120px] rounded py-1">
                  <button onClick={() => { updateState({ showGrid: !state.showGrid }); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] flex justify-between">
                    Grid <span>{state.showGrid ? 'ON' : 'OFF'}</span>
                  </button>
                  <button onClick={() => { updateState({ onionSkin: !state.onionSkin }); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[#333] text-[10px] flex justify-between">
                    Onion Skin <span>{state.onionSkin ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')} className="hover:text-white transition-colors h-full px-2">Help</button>
              {activeMenu === 'help' && (
                <div className="absolute top-10 left-0 bg-[#252525] border border-[#333] shadow-xl z-[100] min-w-[160px] rounded py-1 text-[10px]">
                  <div className="px-3 py-1.5 text-gray-500 font-bold uppercase tracking-widest border-b border-[#333] mb-1">Shortcuts</div>
                  <div className="px-3 py-1 flex justify-between"><span>Undo</span><span className="text-orange-500">Ctrl+Z</span></div>
                  <div className="px-3 py-1 flex justify-between"><span>Copy</span><span className="text-orange-500">Ctrl+C</span></div>
                  <div className="px-3 py-1 flex justify-between"><span>Paste</span><span className="text-orange-500">Ctrl+V</span></div>
                  <div className="px-3 py-1 flex justify-between"><span>Deselect</span><span className="text-orange-500">Ctrl+D</span></div>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#252525] rounded overflow-hidden border border-[#333]">
            <button 
              onClick={exportAsPNG}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold transition-colors border-r border-orange-700"
            >
              PNG
            </button>
            <button 
              onClick={exportAsGIF}
              className="px-3 py-1 hover:bg-[#333] text-gray-300 text-[10px] font-bold transition-colors border-r border-[#333] flex items-center gap-1"
            >
              <Film size={10} />
              GIF
            </button>
            <button 
              onClick={exportAsSpriteSheet}
              className="px-3 py-1 hover:bg-[#333] text-gray-300 text-[10px] font-bold transition-colors"
            >
              Sheet
            </button>
          </div>
          <div className="h-4 w-px bg-[#333] mx-1" />
          <button className="p-1.5 text-gray-500 hover:text-white bg-[#252525] rounded border border-[#333] transition-all"><Settings size={14} /></button>
          <button className="p-1.5 text-gray-500 hover:text-white bg-[#252525] rounded border border-[#333] transition-all"><Github size={14} /></button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar 
          selectedTool={state.selectedTool}
          onSelectTool={(tool) => updateState({ selectedTool: tool })}
          primaryColor={state.primaryColor}
          secondaryColor={state.secondaryColor}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          symmetry={state.symmetry}
          onToggleSymmetry={(axis) => updateState({ symmetry: { ...state.symmetry, [axis]: !state.symmetry[axis] } })}
        />

        <main 
          className="flex-1 overflow-auto relative"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const zoomChange = e.deltaY < 0 ? 2 : -2;
              updateState({ zoom: Math.min(Math.max(1, state.zoom + zoomChange), 64) });
            }
          }}
        >
          <Canvas 
            state={state}
            activeBuffer={activeBuffer}
            onDraw={handleDraw}
            onDrawEnd={handleDrawEnd}
          />
          
          <Preview state={state} />

          {/* Status Bar */}
          <div className="absolute bottom-2 left-2 flex items-center gap-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] text-gray-400 font-mono pointer-events-none">
            <span>{state.width}x{state.height} px</span>
            <div className="w-px h-2.5 bg-gray-700" />
            <span>Zoom: {Math.round(state.zoom * 100)}%</span>
            <div className="w-px h-2.5 bg-gray-700" />
            <span>Frame: {state.frames.findIndex(f => f.id === state.currentFrameId) + 1}/{state.frames.length}</span>
          </div>

          <div className="absolute top-2 left-2 flex flex-col gap-1">
             <button 
              onClick={() => updateState({ zoom: Math.min(state.zoom + 2, 64) })}
              className="w-6 h-6 bg-[#141414] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#222] transition-colors"
             >+</button>
             <button 
              onClick={() => updateState({ zoom: Math.max(state.zoom - 2, 1) })}
              className="w-6 h-6 bg-[#141414] border border-[#2a2a2a] flex items-center justify-center hover:bg-[#222] transition-colors"
             >-</button>
          </div>
        </main>

        <Sidebar 
          state={state}
          onUpdateLayer={(id, updates) => {
            updateState({
              layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
            });
          }}
          onAddLayer={addLayer}
          onDeleteLayer={deleteLayer}
          onSelectLayer={(id) => updateState({ currentLayerId: id })}
          onSelectColor={(color) => updateState({ primaryColor: color })}
          onAddPaletteColor={(color) => updateState({ palette: [...state.palette, { id: crypto.randomUUID(), color }] })}
        />
      </div>

      {/* Footer / Timeline */}
      <Timeline 
        state={state}
        onSelectFrame={(id) => updateState({ currentFrameId: id })}
        onAddFrame={addFrame}
        onDeleteFrame={deleteFrame}
        onToggleOnionSkin={() => updateState({ onionSkin: !state.onionSkin })}
      />

      {/* Resize Modal */}
      {showResizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888] mb-6">Resize Canvas</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#555] mb-1">Width (px)</label>
                <input 
                  type="number" 
                  value={newSize.w} 
                  onChange={(e) => setNewSize({ ...newSize, w: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#555] mb-1">Height (px)</label>
                <input 
                  type="number" 
                  value={newSize.h} 
                  onChange={(e) => setNewSize({ ...newSize, h: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowResizeModal(false)}
                className="flex-1 px-4 py-2 bg-[#252525] hover:bg-[#333] rounded text-xs font-bold transition-colors"
              >Cancel</button>
              <button 
                onClick={() => {
                  resizeCanvas(newSize.w, newSize.h);
                  setShowResizeModal(false);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-xs font-bold transition-colors"
              >Resize</button>
            </div>
          </div>
        </div>
      )}

      {/* New Sprite Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888] mb-6">New Sprite</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#555] mb-1">Width (px)</label>
                <input 
                  type="number" 
                  value={createSpriteSize.w} 
                  onChange={(e) => setCreateSpriteSize({ ...createSpriteSize, w: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#555] mb-1">Height (px)</label>
                <input 
                  type="number" 
                  value={createSpriteSize.h} 
                  onChange={(e) => setCreateSpriteSize({ ...createSpriteSize, h: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2 bg-[#252525] hover:bg-[#333] rounded text-xs font-bold transition-colors"
              >Cancel</button>
              <button 
                onClick={() => {
                  createNewSprite(createSpriteSize.w, createSpriteSize.h);
                  setShowNewModal(false);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-xs font-bold transition-colors"
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

