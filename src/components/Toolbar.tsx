import React from 'react';
import { ToolType } from '../types';
import { 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Pipette, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Move,
  Slash,
  Grid,
  History,
  Copy,
  Layers,
  Undo2,
  Redo2,
  Settings,
  Split,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface ToolbarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  primaryColor: string;
  secondaryColor: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  symmetry: { x: boolean, y: boolean };
  onToggleSymmetry: (axis: 'x' | 'y') => void;
}

const TOOLS = [
  { type: ToolType.PENCIL, icon: Pencil, label: 'Pencil' },
  { type: ToolType.ERASER, icon: Eraser, label: 'Eraser' },
  { type: ToolType.BUCKET, icon: PaintBucket, label: 'Bucket' },
  { type: ToolType.PICKER, icon: Pipette, label: 'Picker' },
  { type: ToolType.MOVE, icon: Move, label: 'Move' },
  { type: ToolType.RECTANGLE, icon: Square, label: 'Rectangle' },
  { type: ToolType.CIRCLE, icon: CircleIcon, label: 'Circle' },
  { type: ToolType.LINE, icon: Slash, label: 'Line' },
  { type: ToolType.RECT_SELECT, icon: Copy, label: 'Selection' },
  { type: ToolType.BRUSH, icon: History, label: 'Brush' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedTool, 
  onSelectTool, 
  primaryColor, 
  secondaryColor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  symmetry,
  onToggleSymmetry
}) => {
  return (
    <div className="flex flex-col w-12 bg-[#1e1e1e] border-r border-[#333] py-4 items-center gap-4">
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onSelectTool(type)}
          className={cn(
            "p-2 rounded transition-all duration-200",
            selectedTool === type ? "bg-orange-600 text-white shadow-lg" : "text-[#888] hover:bg-[#333] hover:text-white"
          )}
          title={label}
        >
          <Icon size={18} />
        </button>
      ))}

      <div className="w-6 h-px bg-[#333] my-2" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 text-[#888] hover:bg-[#333] hover:text-white disabled:opacity-20 transition-colors"
        title="Undo"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 text-[#888] hover:bg-[#333] hover:text-white disabled:opacity-20 transition-colors"
        title="Redo"
      >
        <Redo2 size={18} />
      </button>

      <div className="w-6 h-px bg-[#333] my-2" />

      <button
        onClick={() => onToggleSymmetry('x')}
        className={cn(
          "p-2 rounded transition-colors",
          symmetry.x ? "text-orange-500 bg-orange-500/10" : "text-[#888] hover:bg-[#333]"
        )}
        title="Mirror X"
      >
        <Split className="rotate-90" size={18} />
      </button>
      <button
        onClick={() => onToggleSymmetry('y')}
        className={cn(
          "p-2 rounded transition-colors",
          symmetry.y ? "text-orange-500 bg-orange-500/10" : "text-[#888] hover:bg-[#333]"
        )}
        title="Mirror Y"
      >
        <Split size={18} />
      </button>

      <div className="mt-auto flex flex-col items-center gap-3 pb-2">
        <div className="relative w-7 h-7">
          <div 
            className="absolute bottom-0 right-0 w-5 h-5 rounded-sm border border-[#444] z-0"
            style={{ backgroundColor: secondaryColor }}
          />
          <div 
            className="absolute top-0 left-0 w-5 h-5 rounded-sm border border-white z-10 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
      </div>
    </div>
  );
};
