import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AppState, ToolType, createEmptyPixels, Layer, Frame } from '../types';
import { INITIAL_STATE, DEFAULT_WIDTH, DEFAULT_HEIGHT } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export function useBojosprite() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [history, setHistory] = useState<AppState[]>([]);
  const [undoStack, setUndoStack] = useState<AppState[]>([]);

  // Internal function to update state and manage history
  const updateState = useCallback((newState: Partial<AppState> | ((prev: AppState) => AppState), saveHistory = true) => {
    setState(prev => {
      const appliedState = typeof newState === 'function' ? newState(prev) : { ...prev, ...newState };
      if (saveHistory) {
        setHistory(h => [prev, ...h].slice(0, 50));
        setUndoStack([]);
      }
      return appliedState;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[0];
      const newHistory = h.slice(1);
      setUndoStack(u => [state, ...u]);
      setState(prev);
      return newHistory;
    });
  }, [state]);

  const redo = useCallback(() => {
    setUndoStack(u => {
      if (u.length === 0) return u;
      const next = u[0];
      const newUndoStack = u.slice(1);
      setHistory(h => [state, ...h]);
      setState(next);
      return newUndoStack;
    });
  }, [state]);

  // Pixel manipulation
  const setPixel = useCallback((x: number, y: number, color: string, alpha = 255) => {
    setState(prev => {
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const existingPixels = prev.cels[celKey];
      if (!existingPixels) return prev;
      
      const pixels = new Uint8ClampedArray(existingPixels);
      
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const index = (y * prev.width + x) * 4;
      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = alpha;

      // Handle Symmetry
      if (prev.symmetry.x) {
        const sx = prev.width - 1 - x;
        const sIndex = (y * prev.width + sx) * 4;
        pixels[sIndex] = r; pixels[sIndex + 1] = g; pixels[sIndex + 2] = b; pixels[sIndex + 3] = alpha;
      }
      if (prev.symmetry.y) {
        const sy = prev.height - 1 - y;
        const sIndex = (sy * prev.width + x) * 4;
        pixels[sIndex] = r; pixels[sIndex + 1] = g; pixels[sIndex + 2] = b; pixels[sIndex + 3] = alpha;
      }

      return {
        ...prev,
        cels: { ...prev.cels, [celKey]: pixels }
      };
    });
  }, []);

  // Frame management
  const addFrame = useCallback(() => {
    setState(prev => {
      const newFrameId = uuidv4();
      const newCels = { ...prev.cels };
      prev.layers.forEach(layer => {
        newCels[`${layer.id}-${newFrameId}`] = createEmptyPixels(prev.width, prev.height);
      });

      return {
        ...prev,
        frames: [...prev.frames, { id: newFrameId, duration: 100 }],
        currentFrameId: newFrameId,
        cels: newCels,
      };
    });
  }, []);

  // Layer management
  const addLayer = useCallback(() => {
    setState(prev => {
      const newLayerId = uuidv4();
      const newCels = { ...prev.cels };
      prev.frames.forEach(frame => {
        newCels[`${newLayerId}-${frame.id}`] = createEmptyPixels(prev.width, prev.height);
      });

      return {
        ...prev,
        layers: [...prev.layers, { id: newLayerId, name: `Layer ${prev.layers.length + 1}`, visible: true, locked: false, opacity: 1, blendMode: 'normal' }],
        currentLayerId: newLayerId,
        cels: newCels,
      };
    });
  }, []);

  // Drawing algorithms
  const floodFill = useCallback((x: number, y: number, targetColor: string) => {
    setState(prev => {
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const oldPixels = prev.cels[celKey];
      if (!oldPixels) return prev;
      const pixels = new Uint8ClampedArray(oldPixels);
      const index = (y * prev.width + x) * 4;
      
      const startR = pixels[index];
      const startG = pixels[index+1];
      const startB = pixels[index+2];
      const startA = pixels[index+3];

      const r = parseInt(targetColor.slice(1, 3), 16);
      const g = parseInt(targetColor.slice(3, 5), 16);
      const b = parseInt(targetColor.slice(5, 7), 16);

      if (r === startR && g === startG && b === startB && startA === 255) return prev;

      const stack = [[x, y]];
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        if (cx < 0 || cx >= prev.width || cy < 0 || cy >= prev.height) continue;
        const cIndex = (cy * prev.width + cx) * 4;

        if (
          pixels[cIndex] === startR && 
          pixels[cIndex+1] === startG && 
          pixels[cIndex+2] === startB &&
          pixels[cIndex+3] === startA
        ) {
          pixels[cIndex] = r;
          pixels[cIndex+1] = g;
          pixels[cIndex+2] = b;
          pixels[cIndex+3] = 255;

          stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
        }
      }

      return { ...prev, cels: { ...prev.cels, [celKey]: pixels } };
    });
  }, []);

  const drawBrush = useCallback((x: number, y: number) => {
    setState(prev => {
      if (!prev.clipboard) return prev;
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const oldPixels = prev.cels[celKey];
      if (!oldPixels) return prev;
      const pixels = new Uint8ClampedArray(oldPixels);
      const brush = prev.clipboard!;

      for (let bx = 0; bx < brush.w; bx++) {
        for (let by = 0; by < brush.h; by++) {
          const px = x + bx;
          const py = y + by;
          if (px >= 0 && px < prev.width && py >= 0 && py < prev.height) {
            const bIndex = (by * brush.w + bx) * 4;
            const pIndex = (py * prev.width + px) * 4;
            if (brush.pixels[bIndex + 3] > 0) {
                pixels[pIndex] = brush.pixels[bIndex];
                pixels[pIndex+1] = brush.pixels[bIndex+1];
                pixels[pIndex+2] = brush.pixels[bIndex+2];
                pixels[pIndex+3] = brush.pixels[bIndex+3];
            }
          }
        }
      }
      return { ...prev, cels: { ...prev.cels, [celKey]: pixels } };
    });
  }, []);

  const copyToClipboard = useCallback(() => {
    setState(prev => {
      if (!prev.selection) return prev;
      const { x, y, w, h } = prev.selection;
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const pixels = prev.cels[celKey];
      if (!pixels) return prev;
      
      const brushPixels = new Uint8ClampedArray((w + 1) * (h + 1) * 4);
      for (let bx = 0; bx <= w; bx++) {
        for (let by = 0; by <= h; by++) {
          const px = x + bx;
          const py = y + by;
          const bIndex = (by * (w + 1) + bx) * 4;
          const pIndex = (py * prev.width + px) * 4;
          
          if (px >= 0 && px < prev.width && py >= 0 && py < prev.height) {
            brushPixels[bIndex] = pixels[pIndex];
            brushPixels[bIndex+1] = pixels[pIndex+1];
            brushPixels[bIndex+2] = pixels[pIndex+2];
            brushPixels[bIndex+3] = pixels[pIndex+3];
          }
        }
      }

      return { ...prev, clipboard: { pixels: brushPixels, w: w + 1, h: h + 1 } };
    });
  }, []);

  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const pixelsToUpdate: {x: number, y: number}[] = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      pixelsToUpdate.push({x: x0, y: y0});
      if ((x0 === x1) && (y0 === y1)) break;
      let e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return pixelsToUpdate;
  }, []);

  const drawRect = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const pixelsToUpdate: {x: number, y: number}[] = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let x = minX; x <= maxX; x++) {
      pixelsToUpdate.push({x, y: minY});
      pixelsToUpdate.push({x, y: maxY});
    }
    for (let y = minY; y <= maxY; y++) {
      pixelsToUpdate.push({x: minX, y});
      pixelsToUpdate.push({x: maxX, y});
    }
    return pixelsToUpdate;
  }, []);

  const drawCircle = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const pixelsToUpdate: {x: number, y: number}[] = [];
    const radius = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
    let x = radius;
    let y = 0;
    let err = 0;

    while (x >= y) {
      pixelsToUpdate.push({x: x0 + x, y: y0 + y});
      pixelsToUpdate.push({x: x0 + y, y: y0 + x});
      pixelsToUpdate.push({x: x0 - y, y: y0 + x});
      pixelsToUpdate.push({x: x0 - x, y: y0 + y});
      pixelsToUpdate.push({x: x0 - x, y: y0 - y});
      pixelsToUpdate.push({x: x0 - y, y: y0 - x});
      pixelsToUpdate.push({x: x0 + y, y: y0 - x});
      pixelsToUpdate.push({x: x0 + x, y: y0 - y});

      if (err <= 0) {
        y += 1;
        err += 2 * y + 1;
      }
      if (err > 0) {
        x -= 1;
        err -= 2 * x + 1;
      }
    }
    return pixelsToUpdate;
  }, []);

  const applyPixels = useCallback((pixelsToDraw: {x: number, y: number}[], color: string) => {
    setState(prev => {
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const oldPixels = prev.cels[celKey];
      if (!oldPixels) return prev;
      const pixels = new Uint8ClampedArray(oldPixels);
      
      let r = 0, g = 0, b = 0, a = 255;
      if (color.startsWith('#')) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
        if (color.length === 9) {
          a = parseInt(color.slice(7, 9), 16);
        }
      }

      pixelsToDraw.forEach(({x, y}) => {
        if (x >= 0 && x < prev.width && y >= 0 && y < prev.height) {
          const index = (y * prev.width + x) * 4;
          pixels[index] = r;
          pixels[index + 1] = g;
          pixels[index + 2] = b;
          pixels[index + 3] = a;
          
          if (prev.symmetry.x) {
            const sx = prev.width - 1 - x;
            const sIndex = (y * prev.width + sx) * 4;
            pixels[sIndex] = r; pixels[sIndex+1] = g; pixels[sIndex+2] = b; pixels[sIndex+3] = a;
          }
          if (prev.symmetry.y) {
            const sy = prev.height - 1 - y;
            const sIndex = (sy * prev.width + x) * 4;
            pixels[sIndex] = r; pixels[sIndex+1] = g; pixels[sIndex+2] = b; pixels[sIndex+3] = a;
          }
        }
      });

      return {
        ...prev,
        cels: { ...prev.cels, [celKey]: pixels }
      };
    });
  }, []);

  const resizeCanvas = useCallback((newWidth: number, newHeight: number) => {
    setState(prev => {
      const newCels = Object.fromEntries(
        Object.entries(prev.cels).map(([key, oldPixels]) => {
          const pixels = createEmptyPixels(newWidth, newHeight);
          for (let y = 0; y < Math.min(prev.height, newHeight); y++) {
            for (let x = 0; x < Math.min(prev.width, newWidth); x++) {
              const oldIdx = (y * prev.width + x) * 4;
              const newIdx = (y * newWidth + x) * 4;
              pixels[newIdx] = oldPixels[oldIdx];
              pixels[newIdx + 1] = oldPixels[oldIdx + 1];
              pixels[newIdx + 2] = oldPixels[oldIdx + 2];
              pixels[newIdx + 3] = oldPixels[oldIdx + 3];
            }
          }
          return [key, pixels];
        })
      );
      return { ...prev, width: newWidth, height: newHeight, cels: newCels };
    });
  }, []);

  const moveCel = useCallback((dx: number, dy: number, snapshot?: Uint8ClampedArray) => {
    setState(prev => {
      const celKey = `${prev.currentLayerId}-${prev.currentFrameId}`;
      const sourcePixels = snapshot || prev.cels[celKey];
      if (!sourcePixels) return prev;
      
      const newPixels = createEmptyPixels(prev.width, prev.height);

      for (let y = 0; y < prev.height; y++) {
        for (let x = 0; x < prev.width; x++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < prev.width && ny >= 0 && ny < prev.height) {
            const oldIdx = (y * prev.width + x) * 4;
            const newIdx = (ny * prev.width + nx) * 4;
            newPixels[newIdx] = sourcePixels[oldIdx];
            newPixels[newIdx + 1] = sourcePixels[oldIdx + 1];
            newPixels[newIdx + 2] = sourcePixels[oldIdx + 2];
            newPixels[newIdx + 3] = sourcePixels[oldIdx + 3];
          }
        }
      }
      return { ...prev, cels: { ...prev.cels, [celKey]: newPixels } };
    });
  }, []);

  const createNewSprite = useCallback((w: number, h: number) => {
    const initialLayerId = uuidv4();
    const initialFrameId = uuidv4();
    setState({
        ...INITIAL_STATE,
        width: w,
        height: h,
        frames: [{ id: initialFrameId, duration: 100 }],
        layers: [{ id: initialLayerId, name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'normal' }],
        cels: {
          [`${initialLayerId}-${initialFrameId}`]: createEmptyPixels(w, h),
        },
        currentFrameId: initialFrameId,
        currentLayerId: initialLayerId,
        history: [],
        undoStack: []
    });
  }, []);


  const deleteLayer = useCallback((id: string) => {
    setState(prev => {
      if (prev.layers.length <= 1) return prev;
      const newLayers = prev.layers.filter(l => l.id !== id);
      const newCels = { ...prev.cels };
      prev.frames.forEach(frame => {
        delete newCels[`${id}-${frame.id}`];
      });
      return {
        ...prev,
        layers: newLayers,
        currentLayerId: prev.currentLayerId === id ? newLayers[0].id : prev.currentLayerId,
        cels: newCels
      };
    });
  }, []);

  const deleteFrame = useCallback((id: string) => {
    setState(prev => {
      if (prev.frames.length <= 1) return prev;
      const newFrames = prev.frames.filter(f => f.id !== id);
      const newCels = { ...prev.cels };
      prev.layers.forEach(layer => {
        delete newCels[`${layer.id}-${id}`];
      });
      return {
        ...prev,
        frames: newFrames,
        currentFrameId: prev.currentFrameId === id ? newFrames[0].id : prev.currentFrameId,
        cels: newCels
      };
    });
  }, []);

  const activeBufferRef = useRef<Uint8ClampedArray | null>(null);
  const activeCelKeyRef = useRef<string | null>(null);

  const beginStroke = useCallback(() => {
    const celKey = `${state.currentLayerId}-${state.currentFrameId}`;
    const pixels = state.cels[celKey];
    if (pixels) {
      activeBufferRef.current = new Uint8ClampedArray(pixels);
      activeCelKeyRef.current = celKey;
    }
  }, [state.currentLayerId, state.currentFrameId, state.cels]);

  const setPixelLive = useCallback((x: number, y: number, color: string, alpha = 255) => {
    if (!activeBufferRef.current || x < 0 || x >= state.width || y < 0 || y >= state.height) return;
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const pixels = activeBufferRef.current;

    const index = (y * state.width + x) * 4;
    pixels[index] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
    pixels[index + 3] = alpha;

    // Symmetry in live buffer
    if (state.symmetry.x) {
      const sx = state.width - 1 - x;
      const sIndex = (y * state.width + sx) * 4;
      pixels[sIndex] = r; pixels[sIndex + 1] = g; pixels[sIndex + 2] = b; pixels[sIndex + 3] = alpha;
    }
    if (state.symmetry.y) {
      const sy = state.height - 1 - y;
      const sIndex = (sy * state.width + x) * 4;
      pixels[sIndex] = r; pixels[sIndex + 1] = g; pixels[sIndex + 2] = b; pixels[sIndex + 3] = alpha;
    }

    // Update state occasionally or just signal a redraw
    // To keep it fast, we can use previewPixels or just the ref
    // For now, let's just use the ref and force a redraw in Canvas
  }, [state.width, state.height, state.symmetry]);

  const commitStroke = useCallback(() => {
    if (activeBufferRef.current && activeCelKeyRef.current) {
      const pixels = activeBufferRef.current;
      const celKey = activeCelKeyRef.current;
      updateState(prev => ({
        ...prev,
        cels: { ...prev.cels, [celKey]: pixels }
      }), true);
    }
    activeBufferRef.current = null;
    activeCelKeyRef.current = null;
  }, [updateState]);

  return {
    state,
    updateState,
    setPixel,
    setPixelLive,
    beginStroke,
    commitStroke,
    activeBuffer: activeBufferRef,
    floodFill,
    drawBrush,
    copyToClipboard,
    drawLine,
    drawRect,
    drawCircle,
    applyPixels,
    resizeCanvas,
    moveCel,
    createNewSprite,
    addFrame,
    addLayer,
    deleteLayer,
    deleteFrame,
    canUndo: history.length > 0,
    canRedo: undoStack.length > 0,
    undo,
    redo
  };
}
