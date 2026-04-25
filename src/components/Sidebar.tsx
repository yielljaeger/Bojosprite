import React from 'react';
import { AppState, Layer, PaletteColor } from '../types';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  ChevronUp,
  ChevronDown,
  Palette as PaletteIcon,
  Layers as LayersIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  state: AppState;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onSelectColor: (color: string) => void;
  onAddPaletteColor: (color: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  state, 
  onUpdateLayer, 
  onAddLayer,
  onDeleteLayer,
  onSelectLayer,
  onSelectColor,
  onAddPaletteColor
}) => {
  return (
    <div className="flex flex-col w-64 bg-[#1e1e1e] border-l border-[#333] h-full overflow-hidden">
      {/* Palette Section */}
      <div className="p-4 border-b border-[#333]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#666] tracking-widest">Palette</span>
          </div>
          <button className="text-[#666] hover:text-white transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {state.palette.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectColor(p.color)}
              className={cn(
                "w-full aspect-square rounded-sm transition-all duration-200 hover:scale-110",
                state.primaryColor === p.color ? "ring-1 ring-white ring-offset-1 ring-offset-[#1e1e1e]" : "border border-[#333]"
              )}
              style={{ backgroundColor: p.color }}
              title={p.color}
            />
          ))}
        </div>
        
        <div className="mt-4 flex flex-col gap-2">
            <label className="text-[9px] text-[#666] uppercase font-bold tracking-wider">Quick Color</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={state.primaryColor}
                onChange={(e) => onSelectColor(e.target.value)}
                className="w-10 h-6 bg-transparent border-none cursor-pointer p-0"
              />
              <span className="text-[10px] font-mono text-[#888] uppercase">{state.primaryColor}</span>
            </div>
        </div>
        
        <div className="mt-4 flex flex-col gap-2">
            <button 
              onClick={() => document.getElementById('brush-upload')?.click()}
              className="w-full py-1.5 bg-[#252525] border border-[#333] text-[10px] uppercase font-bold text-[#888] rounded hover:bg-[#333] hover:text-white transition-all shadow-sm"
            >
              Import Brush
            </button>
            <input 
              id="brush-upload"
              type="file" 
              accept="image/*"
              onChange={(e) => {
                if ((window as any).onImportBrush) (window as any).onImportBrush(e);
              }}
              className="hidden"
            />
        </div>
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-[#1a1a1a]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#666] tracking-widest">Layers</span>
          </div>
          <button 
            onClick={onAddLayer}
            className="text-[#666] hover:text-white transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="flex flex-col gap-1">
          {state.layers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded transition-all group cursor-pointer border-l-2",
                state.currentLayerId === layer.id 
                  ? "bg-[#3a3a3a] text-white border-orange-500 shadow-md" 
                  : "hover:bg-[#252525] text-[#888] border-transparent"
              )}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { visible: !layer.visible });
                }}
                className="hover:text-white transition-colors"
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <span className="flex-1 text-[11px] truncate font-medium">
                {layer.name}
              </span>
              <span className="text-[9px] opacity-40 italic lowercase mr-2">{layer.blendMode}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { locked: !layer.locked });
                }}
                className={cn("hover:text-white transition-colors", layer.locked ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLayer(layer.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors ml-1"
                title="Delete Layer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )).reverse()}
        </div>
      </div>
    </div>
  );
};
