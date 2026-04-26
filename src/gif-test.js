import { quantize, applyPalette, GIFEncoder } from 'gifenc';

export function createGifFromState(state) {
  const gif = new GIFEncoder();
  const width = state.width;
  const height = state.height;

  state.frames.forEach((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with a magic transparent color (magenta)
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, width, height);

    // Draw layers
    state.layers.forEach(layer => {
      if (!layer.visible) return;
      const celKey = `${layer.id}-${frame.id}`;
      const pixels = state.cels[celKey];
      if (pixels) {
        const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(tempCanvas, 0, 0);
      }
    });

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // We want to force #ff00ff to be our transparent color.
    // gifenc quantize can take max colors 256.
    const palette = quantize(data, 256, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');

    // Find the palette index for our transparent color #ff00ff (rgba(255, 0, 255, 255))
    // Actually, any pixel that is magenta in original but not in sprite?
    // gifenc supports clear pixels easily if we just pass a custom transparent color
  });
}
