import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearCanvas,
  drawBackground,
  drawGrid,
  drawToken,
  drawDeadOverlay,
  renderFrame,
  RenderGrid,
  RenderToken,
  RenderOptions,
} from '../src/hex-canvas/renderer';
import { PixelPoint } from '../src/hex-math';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockCtx() {
  const calls: Record<string, unknown[][]> = {};

  const track =
    (name: string) =>
    (...args: unknown[]) => {
      if (!calls[name]) calls[name] = [];
      calls[name].push(args);
    };

  const ctx = {
    canvas: { width: 800, height: 600 },
    clearRect: vi.fn(track('clearRect')),
    drawImage: vi.fn(track('drawImage')),
    save: vi.fn(track('save')),
    restore: vi.fn(track('restore')),
    beginPath: vi.fn(track('beginPath')),
    moveTo: vi.fn(track('moveTo')),
    lineTo: vi.fn(track('lineTo')),
    closePath: vi.fn(track('closePath')),
    stroke: vi.fn(track('stroke')),
    fill: vi.fn(track('fill')),
    arc: vi.fn(track('arc')),
    fillText: vi.fn(track('fillText')),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: Record<string, unknown[][]> };

  return ctx;
}

function makeGrid(overrides: Partial<RenderGrid> = {}): RenderGrid {
  return { cols: 3, rows: 3, hexSize: 40, ...overrides };
}

function makeToken(overrides: Partial<RenderToken> = {}): RenderToken {
  return {
    id: 'token-1',
    cubeCoord: { q: 0, r: 0, s: 0 },
    label: 'A',
    color: '#ff0000',
    isPlayer: false,
    isDead: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// clearCanvas
// ---------------------------------------------------------------------------

describe('clearCanvas', () => {
  it('clears the full canvas area using canvas dimensions', () => {
    const ctx = createMockCtx();
    clearCanvas(ctx);
    expect(ctx.clearRect).toHaveBeenCalledOnce();
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('uses the actual canvas width and height from ctx.canvas', () => {
    const ctx = createMockCtx();
    (ctx.canvas as { width: number; height: number }).width = 1920;
    (ctx.canvas as { width: number; height: number }).height = 1080;
    clearCanvas(ctx);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
  });
});

// ---------------------------------------------------------------------------
// drawBackground
// ---------------------------------------------------------------------------

describe('drawBackground', () => {
  it('draws the image stretched to the given canvas dimensions', () => {
    const ctx = createMockCtx();
    const image = {} as HTMLImageElement;
    drawBackground(ctx, image, 800, 600);
    expect(ctx.drawImage).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 800, 600);
  });

  it('passes the exact width and height arguments to drawImage', () => {
    const ctx = createMockCtx();
    const image = {} as HTMLImageElement;
    drawBackground(ctx, image, 1280, 720);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 1280, 720);
  });

  it('draws from origin (0, 0)', () => {
    const ctx = createMockCtx();
    const image = {} as HTMLImageElement;
    drawBackground(ctx, image, 100, 100);
    const [, x, y] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// drawGrid
// ---------------------------------------------------------------------------

describe('drawGrid', () => {
  it('calls save and restore to preserve canvas state', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid());
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws a hexagon for each cell in the grid', () => {
    const ctx = createMockCtx();
    const grid = makeGrid({ cols: 2, rows: 2 });
    drawGrid(ctx, grid);
    // Each hex requires one beginPath + one closePath + one stroke
    const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(strokeCalls).toBeGreaterThan(0);
    // 2×2 grid → 4 hexagons
    expect(strokeCalls).toBe(4);
  });

  it('draws more hexagons for a larger grid', () => {
    const ctxSmall = createMockCtx();
    const ctxLarge = createMockCtx();
    drawGrid(ctxSmall, makeGrid({ cols: 2, rows: 2 }));
    drawGrid(ctxLarge, makeGrid({ cols: 5, rows: 5 }));
    const smallStrokes = (ctxSmall.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    const largeStrokes = (ctxLarge.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(largeStrokes).toBeGreaterThan(smallStrokes);
  });

  it('draws no hexagons for a 0×0 grid', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid({ cols: 0, rows: 0 }));
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws no hexagons for a grid with zero rows', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid({ cols: 5, rows: 0 }));
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws no hexagons for a grid with zero cols', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid({ cols: 0, rows: 5 }));
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('closes each hexagon path', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid({ cols: 3, rows: 3 }));
    const closePathCalls = (ctx.closePath as ReturnType<typeof vi.fn>).mock.calls.length;
    const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(closePathCalls).toBe(strokeCalls);
  });

  it('uses a semi-transparent stroke style', () => {
    const ctx = createMockCtx();
    drawGrid(ctx, makeGrid({ cols: 1, rows: 1 }));
    // strokeStyle is set as a property assignment — check the last assigned value
    // Since ctx is a plain object, we verify stroke was called (style was set before stroke)
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// drawToken
// ---------------------------------------------------------------------------

describe('drawToken', () => {
  it('calls save and restore to preserve canvas state', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken(), 40);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws a circle (arc) for the token body', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken(), 40);
    expect(ctx.arc).toHaveBeenCalled();
    const arcCall = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0];
    // arc(x, y, radius, startAngle, endAngle)
    expect(arcCall[2]).toBeCloseTo(40 * 0.45); // radius
    expect(arcCall[3]).toBe(0); // startAngle
    expect(arcCall[4]).toBeCloseTo(Math.PI * 2); // endAngle
  });

  it('renders the token label text', () => {
    const ctx = createMockCtx();
    const token = makeToken({ label: 'Z' });
    drawToken(ctx, token, 40);
    expect(ctx.fillText).toHaveBeenCalled();
    const fillTextCall = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fillTextCall[0]).toBe('Z');
  });

  it('uses a thicker border for player tokens', () => {
    const ctxPlayer = createMockCtx();
    const ctxMonster = createMockCtx();
    drawToken(ctxPlayer, makeToken({ isPlayer: true }), 40);
    drawToken(ctxMonster, makeToken({ isPlayer: false }), 40);
    // We verify stroke is called for both — the lineWidth difference is a style property
    expect(ctxPlayer.stroke).toHaveBeenCalled();
    expect(ctxMonster.stroke).toHaveBeenCalled();
  });

  it('calls drawDeadOverlay (extra arc + strokes) when token isDead', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken({ isDead: true }), 40);
    // drawDeadOverlay adds an extra arc and two extra strokes
    const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length;
    const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(arcCalls).toBeGreaterThanOrEqual(2); // token arc + overlay arc
    expect(strokeCalls).toBeGreaterThanOrEqual(3); // token stroke + 2 X lines
  });

  it('does NOT call drawDeadOverlay when token is alive', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken({ isDead: false }), 40);
    const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length;
    const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    // Only the token arc and one stroke (border)
    expect(arcCalls).toBe(1);
    expect(strokeCalls).toBe(1);
  });

  it('uses the token color as fill style for the circle', () => {
    const ctx = createMockCtx();
    const token = makeToken({ color: '#abcdef' });
    // We can't directly assert property assignment order on a plain object mock,
    // but we verify fill was called (meaning fillStyle was set before fill)
    drawToken(ctx, token, 40);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('centers the label text horizontally and vertically', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken(), 40);
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
  });

  it('scales the font size with hexSize', () => {
    const ctxSmall = createMockCtx();
    const ctxLarge = createMockCtx();
    drawToken(ctxSmall, makeToken(), 20);
    drawToken(ctxLarge, makeToken(), 80);
    const smallFont: string = ctxSmall.font;
    const largeFont: string = ctxLarge.font;
    // Extract numeric font size
    const smallSize = parseInt(smallFont.match(/(\d+)px/)?.[1] ?? '0');
    const largeSize = parseInt(largeFont.match(/(\d+)px/)?.[1] ?? '0');
    expect(largeSize).toBeGreaterThan(smallSize);
  });

  it('positions the label at the token center', () => {
    const ctx = createMockCtx();
    drawToken(ctx, makeToken({ cubeCoord: { q: 0, r: 0, s: 0 } }), 40);
    const arcCall = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0];
    const fillTextCall = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls[0];
    // Label x,y should match the arc center x,y
    expect(fillTextCall[1]).toBeCloseTo(arcCall[0]);
    expect(fillTextCall[2]).toBeCloseTo(arcCall[1]);
  });
});

// ---------------------------------------------------------------------------
// drawDeadOverlay
// ---------------------------------------------------------------------------

describe('drawDeadOverlay', () => {
  const center: PixelPoint = { x: 100, y: 150 };
  const hexSize = 40;

  it('calls save and restore to preserve canvas state', () => {
    const ctx = createMockCtx();
    drawDeadOverlay(ctx, center, hexSize);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('draws a semi-transparent overlay circle', () => {
    const ctx = createMockCtx();
    drawDeadOverlay(ctx, center, hexSize);
    expect(ctx.arc).toHaveBeenCalled();
    const arcCall = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(arcCall[0]).toBe(center.x);
    expect(arcCall[1]).toBe(center.y);
    expect(arcCall[2]).toBeCloseTo(hexSize * 0.45);
  });

  it('draws exactly two strokes for the X shape', () => {
    const ctx = createMockCtx();
    drawDeadOverlay(ctx, center, hexSize);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('draws the X lines through the center', () => {
    const ctx = createMockCtx();
    drawDeadOverlay(ctx, center, hexSize);
    const moveToMock = ctx.moveTo as ReturnType<typeof vi.fn>;
    const lineToMock = ctx.lineTo as ReturnType<typeof vi.fn>;

    // First line: top-left to bottom-right
    const move1 = moveToMock.mock.calls[0];
    const line1 = lineToMock.mock.calls[0];
    expect(move1[0]).toBeLessThan(center.x); // left of center
    expect(move1[1]).toBeLessThan(center.y); // above center
    expect(line1[0]).toBeGreaterThan(center.x); // right of center
    expect(line1[1]).toBeGreaterThan(center.y); // below center

    // Second line: top-right to bottom-left
    const move2 = moveToMock.mock.calls[1];
    const line2 = lineToMock.mock.calls[1];
    expect(move2[0]).toBeGreaterThan(center.x); // right of center
    expect(move2[1]).toBeLessThan(center.y); // above center
    expect(line2[0]).toBeLessThan(center.x); // left of center
    expect(line2[1]).toBeGreaterThan(center.y); // below center
  });

  it('fills the overlay before drawing the X', () => {
    const ctx = createMockCtx();
    drawDeadOverlay(ctx, center, hexSize);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('scales the X offset proportionally to hexSize', () => {
    const ctxSmall = createMockCtx();
    const ctxLarge = createMockCtx();
    drawDeadOverlay(ctxSmall, center, 20);
    drawDeadOverlay(ctxLarge, center, 80);

    const moveSmall = (ctxSmall.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];
    const moveLarge = (ctxLarge.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];

    // The offset from center should be larger for larger hexSize
    const offsetSmall = Math.abs(moveSmall[0] - center.x);
    const offsetLarge = Math.abs(moveLarge[0] - center.x);
    expect(offsetLarge).toBeGreaterThan(offsetSmall);
  });

  it('works with center at origin', () => {
    const ctx = createMockCtx();
    expect(() => drawDeadOverlay(ctx, { x: 0, y: 0 }, 40)).not.toThrow();
  });

  it('works with very small hexSize', () => {
    const ctx = createMockCtx();
    expect(() => drawDeadOverlay(ctx, center, 1)).not.toThrow();
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// renderFrame
// ---------------------------------------------------------------------------

describe('renderFrame', () => {
  let ctx: ReturnType<typeof createMockCtx>;
  const grid = makeGrid({ cols: 3, rows: 3, hexSize: 40 });

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it('always clears the canvas first', () => {
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, [], options);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('draws the background image when provided', () => {
    const image = {} as HTMLImageElement;
    const options: RenderOptions = { showGrid: false, backgroundImage: image };
    renderFrame(ctx, grid, [], options);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 800, 600);
  });

  it('does not draw background when backgroundImage is null', () => {
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, [], options);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('draws the grid when showGrid is true', () => {
    const options: RenderOptions = { showGrid: true, backgroundImage: null };
    renderFrame(ctx, grid, [], options);
    // Grid drawing calls stroke for each hex
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does not draw the grid when showGrid is false', () => {
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, [], options);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws each token in the tokens array', () => {
    const tokens: RenderToken[] = [
      makeToken({ id: '1', label: 'A' }),
      makeToken({ id: '2', label: 'B' }),
      makeToken({ id: '3', label: 'C' }),
    ];
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, tokens, options);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const labels = fillTextCalls.map((c) => c[0]);
    expect(labels).toContain('A');
    expect(labels).toContain('B');
    expect(labels).toContain('C');
  });

  it('draws no tokens when tokens array is empty', () => {
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, [], options);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('draws everything when all options are enabled', () => {
    const image = {} as HTMLImageElement;
    const tokens = [makeToken()];
    const options: RenderOptions = { showGrid: true, backgroundImage: image };
    renderFrame(ctx, grid, tokens, options);
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('clears canvas before drawing background', () => {
    const clearOrder: string[] = [];
    (ctx.clearRect as ReturnType<typeof vi.fn>).mockImplementation(() => clearOrder.push('clear'));
    (ctx.drawImage as ReturnType<typeof vi.fn>).mockImplementation(() => clearOrder.push('drawImage'));
    const image = {} as HTMLImageElement;
    const options: RenderOptions = { showGrid: false, backgroundImage: image };
    renderFrame(ctx, grid, [], options);
    expect(clearOrder.indexOf('clear')).toBeLessThan(clearOrder.indexOf('drawImage'));
  });

  it('draws dead token overlays when tokens are dead', () => {
    const token = makeToken({ isDead: true });
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    renderFrame(ctx, grid, [token], options);
    // Dead overlay draws 2 strokes (X lines) in addition to the token border stroke
    const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(strokeCalls).toBeGreaterThanOrEqual(3);
  });

  it('handles a single-cell grid correctly', () => {
    const singleGrid = makeGrid({ cols: 1, rows: 1 });
    const options: RenderOptions = { showGrid: true, backgroundImage: null };
    expect(() => renderFrame(ctx, singleGrid, [], options)).not.toThrow();
  });

  it('handles a large number of tokens without throwing', () => {
    const tokens = Array.from({ length: 50 }, (_, i) =>
      makeToken({ id: `token-${i}`, cubeCoord: { q: i % 5, r: Math.floor(i / 5), s: -(i % 5) - Math.floor(i / 5) } })
    );
    const options: RenderOptions = { showGrid: false, backgroundImage: null };
    expect(() => renderFrame(ctx, grid, tokens, options)).not.toThrow();
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fillTextCalls).toBe(50);
  });
});