import { AppState, INITIAL_PALETTE, ToolType, createEmptyPixels } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_WIDTH = 32;
export const DEFAULT_HEIGHT = 32;

const initialLayerId = uuidv4();
const initialFrameId = uuidv4();

export const INITIAL_STATE: AppState = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  frames: [{ id: initialFrameId, duration: 100 }],
  layers: [{ id: initialLayerId, name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'normal' }],
  cels: {
    [`${initialLayerId}-${initialFrameId}`]: createEmptyPixels(DEFAULT_WIDTH, DEFAULT_HEIGHT),
  },
  currentFrameId: initialFrameId,
  currentLayerId: initialLayerId,
  selectedTool: ToolType.PENCIL,
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  palette: INITIAL_PALETTE.map(color => ({ id: uuidv4(), color })),
  zoom: 15,
  showGrid: true,
  onionSkin: false,
  symmetry: {
    x: false,
    y: false,
  },
  selection: null,
  clipboard: null,
  previewPixels: null,
};
