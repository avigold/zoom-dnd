import { CubeCoord, PixelPoint, hexToPixel, hexVertices, generateGridCoords } from './hex-math';

export type RenderGrid = { cols: number; rows: number; hexSize: number };
export type RenderToken = { id: string; cubeCoord: CubeCoord; label: string; color: string; isPlayer: boolean; isDead: boolean };
export type RenderOptions = { showGrid: boolean; backgroundImage: HTMLImageElement | null };

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
}

export function drawGrid(ctx: CanvasRenderingContext2D, grid: RenderGrid): void {
  const coords = generateGridCoords(grid.cols, grid.rows);

  ctx.save();
  ctx.strokeStyle = 'rgba(100, 120, 160, 0.5)';
  ctx.lineWidth = 1;

  for (const coord of coords) {
    const center = hexToPixel(coord, grid.hexSize);
    const vertices = hexVertices(center, grid.hexSize);

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function drawOutlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, hexSize: number): void {
  const maxWidth = hexSize * 1.7; // flat-top hex width is 2 * hexSize, leave a little margin
  const idealSize = Math.round(hexSize * 0.48);
  let fontSize = idealSize;

  ctx.font = `bold ${fontSize}px sans-serif`;
  while (fontSize > 8 && ctx.measureText(text).width > maxWidth) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

export function drawToken(ctx: CanvasRenderingContext2D, token: RenderToken, hexSize: number): void {
  const center = hexToPixel(token.cubeCoord, hexSize);
  const radius = hexSize * 0.45;

  ctx.save();

  // Token circle
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = token.color;
  ctx.fill();

  // Border: thicker/different for players vs monsters
  ctx.lineWidth = token.isPlayer ? 3 : 1.5;
  ctx.strokeStyle = token.isPlayer ? '#ffffff' : 'rgba(0,0,0,0.6)';
  ctx.stroke();

  drawOutlinedText(ctx, token.label, center.x, center.y, hexSize);

  ctx.restore();

  if (token.isDead) {
    drawDeadOverlay(ctx, center, hexSize);
  }
}

export function drawDeadOverlay(ctx: CanvasRenderingContext2D, center: PixelPoint, hexSize: number): void {
  const radius = hexSize * 0.45;

  ctx.save();

  // Semi-transparent dark overlay
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();

  // Red X
  const offset = radius * 0.5;
  ctx.strokeStyle = '#e53e3e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(center.x - offset, center.y - offset);
  ctx.lineTo(center.x + offset, center.y + offset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(center.x + offset, center.y - offset);
  ctx.lineTo(center.x - offset, center.y + offset);
  ctx.stroke();

  ctx.restore();
}

export function drawTokenAtPixel(ctx: CanvasRenderingContext2D, token: RenderToken, center: PixelPoint, hexSize: number): void {
  const radius = hexSize * 0.45;

  ctx.save();
  ctx.globalAlpha = 0.8;

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = token.color;
  ctx.fill();

  ctx.lineWidth = token.isPlayer ? 3 : 1.5;
  ctx.strokeStyle = token.isPlayer ? '#ffffff' : 'rgba(0,0,0,0.6)';
  ctx.stroke();

  drawOutlinedText(ctx, token.label, center.x, center.y, hexSize);

  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  grid: RenderGrid,
  tokens: RenderToken[],
  options: RenderOptions,
  dragState?: { tokenId: string; currentPixel: PixelPoint } | null
): void {
  clearCanvas(ctx);

  if (options.backgroundImage) {
    drawBackground(ctx, options.backgroundImage, ctx.canvas.width, ctx.canvas.height);
  }

  if (options.showGrid) {
    drawGrid(ctx, grid);
  }

  for (const token of tokens) {
    if (dragState && token.id === dragState.tokenId) continue;
    drawToken(ctx, token, grid.hexSize);
  }

  if (dragState) {
    const draggedToken = tokens.find((t) => t.id === dragState.tokenId);
    if (draggedToken) {
      drawTokenAtPixel(ctx, draggedToken, dragState.currentPixel, grid.hexSize);
    }
  }
}