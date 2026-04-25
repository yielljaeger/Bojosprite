import { v4 as uuidv4 } from 'uuid';

export enum ToolType {
  PENCIL = 'pencil',
  ERASER = 'eraser',
  BUCKET = 'bucket',
  PICKER = 'picker',
  MOVE = 'move',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  LINE = 'line',
  RECT_SELECT = 'rect_select',
  BRUSH = 'brush',
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface Frame {
  id: string;
  duration: number; // in ms
}

export interface Cel {
  layerId: string;
  frameId: string;
  pixels: Uint8ClampedArray; // RGBA data
}

export interface PaletteColor {
  id: string;
  color: string; // hex
}

export interface AppState {
  width: number;
  height: number;
  frames: Frame[];
  layers: Layer[];
  cels: Record<string, Uint8ClampedArray>; // key: `${layerId}-${frameId}`
  currentFrameId: string;
  currentLayerId: string;
  selectedTool: ToolType;
  primaryColor: string;
  secondaryColor: string;
  palette: PaletteColor[];
  zoom: number;
  showGrid: boolean;
  onionSkin: boolean;
  symmetry: {
    x: boolean;
    y: boolean;
  };
  selection: {
    x: number;
    y: number;
    w: number;
    h: number;
    active: boolean;
  } | null;
  clipboard: {
    pixels: Uint8ClampedArray;
    w: number;
    h: number;
  } | null;
  previewPixels: { x: number; y: number; color: string }[] | null;
}

export const INITIAL_PALETTE: string[] = [
  '#000000', '#ffffff', '#888888', '#c3c3c3', '#ed1c24', '#ffaec9', '#ff7f27', '#fff200', 
  '#22b14c', '#b5e61d', '#00a2e8', '#99d9ea', '#3f48cc', '#7092be', '#a349a4', '#c8bfe7'
];

export const createEmptyPixels = (width: number, height: number) => {
  return new Uint8ClampedArray(width * height * 4);
};
