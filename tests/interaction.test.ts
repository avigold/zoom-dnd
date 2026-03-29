import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCanvasPoint,
  hitTestTokens,
  createInteractionHandler,
  type TokenHitArea,
  type InteractionCallbacks,
  type DragState,
} from '../src/hex-canvas/interaction';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(
  width = 800,
  height = 600,
  rect = { left: 0, top: 0, width: 800, height: 600 }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect);
  return canvas;
}

function makeCallbacks(): InteractionCallbacks & {
  onTokenMove: ReturnType<typeof vi.fn>;
  onTokenRemove: ReturnType<typeof vi.fn>;
  onCanvasClick: ReturnType<typeof vi.fn>;
} {
  return {
    onTokenMove: vi.fn(),
    onTokenRemove: vi.fn(),
    onCanvasClick: vi.fn(),
  };
}

function mouseEvent(
  type: string,
  opts: Partial<MouseEventInit> & { clientX?: number; clientY?: number; button?: number } = {}
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    button: opts.button ?? 0,
    ...opts,
  });
}

function makeTouchList(touches: Array<{ identifier: number; clientX: number; clientY: number }>): TouchList {
  const list = touches.map(
    (t) =>
      ({
        identifier: t.identifier,
        clientX: t.clientX,
        clientY: t.clientY,
        target: document.createElement('canvas'),
        screenX: t.clientX,
        screenY: t.clientY,
        pageX: t.clientX,
        pageY: t.clientY,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
      } as unknown as Touch)
  );

  const touchList = {
    length: list.length,
    item: (i: number) => list[i] ?? null,
    [Symbol.iterator]: function* () {
      yield* list;
    },
  } as unknown as TouchList;

  list.forEach((t, i) => {
    (touchList as unknown as Record<number, Touch>)[i] = t;
  });

  return touchList;
}

function touchEvent(
  type: string,
  changedTouches: Array<{ identifier: number; clientX: number; clientY: number }>,
  opts: TouchEventInit = {}
): TouchEvent {
  const tl = makeTouchList(changedTouches);
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    changedTouches: tl as unknown as Touch[],
    touches: tl as unknown as Touch[],
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// getCanvasPoint
// ---------------------------------------------------------------------------

describe('getCanvasPoint', () => {
  it('returns correct pixel point when canvas fills its CSS rect exactly', () => {
    const canvas = makeCanvas(800, 600, { left: 0, top: 0, width: 800, height: 600 });
    const event = mouseEvent('mousemove', { clientX: 100, clientY: 200 });
    const point = getCanvasPoint(canvas, event);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(200);
  });

  it('applies scale when canvas resolution differs from CSS size', () => {
    // Canvas is 1600×1200 but displayed at 800×600 (2× DPR)
    const canvas = makeCanvas(1600, 1200, { left: 0, top: 0, width: 800, height: 600 });
    const event = mouseEvent('mousemove', { clientX: 100, clientY: 150 });
    const point = getCanvasPoint(canvas, event);
    expect(point.x).toBeCloseTo(200);
    expect(point.y).toBeCloseTo(300);
  });

  it('accounts for canvas offset within the viewport', () => {
    const canvas = makeCanvas(800, 600, { left: 50, top: 80, width: 800, height: 600 });
    const event = mouseEvent('mousemove', { clientX: 150, clientY: 280 });
    const point = getCanvasPoint(canvas, event);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(200);
  });

  it('returns (0,0) for a click at the top-left corner of the canvas', () => {
    const canvas = makeCanvas(800, 600, { left: 10, top: 20, width: 800, height: 600 });
    const event = mouseEvent('mousedown', { clientX: 10, clientY: 20 });
    const point = getCanvasPoint(canvas, event);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
  });

  it('handles combined offset and scale correctly', () => {
    // Canvas 400×300 displayed at 200×150 starting at (50,50)
    const canvas = makeCanvas(400, 300, { left: 50, top: 50, width: 200, height: 150 });
    const event = mouseEvent('mousemove', { clientX: 150, clientY: 125 });
    // CSS coords relative to canvas: (100, 75); scale: 2x
    const point = getCanvasPoint(canvas, event);
    expect(point.x).toBeCloseTo(200);
    expect(point.y).toBeCloseTo(150);
  });
});

// ---------------------------------------------------------------------------
// hitTestTokens
// ---------------------------------------------------------------------------

describe('hitTestTokens', () => {
  const areas: TokenHitArea[] = [
    { tokenId: 'a', center: { x: 100, y: 100 }, radius: 20 },
    { tokenId: 'b', center: { x: 200, y: 200 }, radius: 15 },
  ];

  it('returns tokenId when point is exactly at center', () => {
    expect(hitTestTokens({ x: 100, y: 100 }, areas)).toBe('a');
  });

  it('returns tokenId when point is inside radius', () => {
    expect(hitTestTokens({ x: 110, y: 110 }, areas)).toBe('a');
  });

  it('returns tokenId when point is exactly on the boundary', () => {
    expect(hitTestTokens({ x: 120, y: 100 }, areas)).toBe('a');
  });

  it('returns null when point is just outside radius', () => {
    expect(hitTestTokens({ x: 121, y: 100 }, areas)).toBeNull();
  });

  it('returns null when no hit areas exist', () => {
    expect(hitTestTokens({ x: 100, y: 100 }, [])).toBeNull();
  });

  it('returns null when point misses all tokens', () => {
    expect(hitTestTokens({ x: 0, y: 0 }, areas)).toBeNull();
  });

  it('returns first matching token when areas overlap', () => {
    const overlapping: TokenHitArea[] = [
      { tokenId: 'first', center: { x: 100, y: 100 }, radius: 30 },
      { tokenId: 'second', center: { x: 100, y: 100 }, radius: 30 },
    ];
    expect(hitTestTokens({ x: 100, y: 100 }, overlapping)).toBe('first');
  });

  it('hits the second token when point is in its area but not the first', () => {
    expect(hitTestTokens({ x: 200, y: 200 }, areas)).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// createInteractionHandler — mouse interactions
// ---------------------------------------------------------------------------

describe('createInteractionHandler — mouse', () => {
  let canvas: HTMLCanvasElement;
  let callbacks: ReturnType<typeof makeCallbacks>;
  let hitAreas: TokenHitArea[];
  let handler: ReturnType<typeof createInteractionHandler>;

  beforeEach(() => {
    canvas = makeCanvas();
    callbacks = makeCallbacks();
    hitAreas = [];
    handler = createInteractionHandler(
      canvas,
      () => hitAreas,
      () => 40,
      callbacks
    );
    handler.attach();
  });

  afterEach(() => {
    handler.detach();
  });

  // --- initial state ---

  it('starts in idle state', () => {
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  // --- right-click removes token ---

  it('calls onTokenRemove when right-clicking a token', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 50, y: 50 }, radius: 20 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 50, clientY: 50, button: 2 }));
    expect(callbacks.onTokenRemove).toHaveBeenCalledWith('tok1');
  });

  it('does not call onTokenRemove when right-clicking empty space', () => {
    hitAreas = [];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 50, clientY: 50, button: 2 }));
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });

  it('prevents context menu default', () => {
    const e = mouseEvent('contextmenu', { clientX: 50, clientY: 50 });
    const spy = vi.spyOn(e, 'preventDefault');
    canvas.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
  });

  // --- click on empty space ---

  it('calls onCanvasClick when clicking empty space', () => {
    hitAreas = [];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 100, clientY: 100 }));
    expect(callbacks.onCanvasClick).toHaveBeenCalledOnce();
    expect(callbacks.onTokenMove).not.toHaveBeenCalled();
  });

  it('does not call onCanvasClick when clicking on a token', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 100, clientY: 100 }));
    expect(callbacks.onCanvasClick).not.toHaveBeenCalled();
  });

  it('remains idle after a simple click', () => {
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 100, clientY: 100 }));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  // --- drag threshold ---

  it('does not start dragging below the threshold', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    // Move 3 pixels — below threshold of 6
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 103, clientY: 100 }));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  it('starts dragging a token after exceeding the threshold', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    const state = handler.getDragState();
    expect(state.phase).toBe('dragging');
    if (state.phase === 'dragging') {
      expect(state.tokenId).toBe('tok1');
    }
  });

  it('updates currentPixel as mouse moves during drag', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 150, clientY: 120 }));
    const state = handler.getDragState();
    expect(state.phase).toBe('dragging');
    if (state.phase === 'dragging') {
      expect(state.currentPixel.x).toBeCloseTo(150);
      expect(state.currentPixel.y).toBeCloseTo(120);
    }
  });

  it('does not start dragging when mouse down on empty space and moved', () => {
    hitAreas = [];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 120, clientY: 100 }));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  // --- drop / mouseup ---

  it('calls onTokenMove with destination coord on drop', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 200, clientY: 200 }));
    expect(callbacks.onTokenMove).toHaveBeenCalledOnce();
    expect(callbacks.onTokenMove.mock.calls[0][0]).toBe('tok1');
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  it('does not call onCanvasClick after a drag', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 200, clientY: 200 }));
    expect(callbacks.onCanvasClick).not.toHaveBeenCalled();
  });

  it('ignores mouseup for non-left buttons', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    // Right button mouseup should be ignored
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 200, clientY: 200, button: 2 }));
    expect(handler.getDragState().phase).toBe('dragging');
  });

  it('ignores mousemove when no mousedown has occurred', () => {
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
    expect(callbacks.onTokenMove).not.toHaveBeenCalled();
  });

  // --- detach ---

  it('resets to idle on detach', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    handler.detach();
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  it('stops responding to events after detach', () => {
    handler.detach();
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 110, clientY: 100 }));
    canvas.dispatchEvent(mouseEvent('mouseup', { clientX: 200, clientY: 200 }));
    expect(callbacks.onTokenMove).not.toHaveBeenCalled();
    expect(callbacks.onCanvasClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createInteractionHandler — touch interactions
// ---------------------------------------------------------------------------

describe('createInteractionHandler — touch', () => {
  let canvas: HTMLCanvasElement;
  let callbacks: ReturnType<typeof makeCallbacks>;
  let hitAreas: TokenHitArea[];
  let handler: ReturnType<typeof createInteractionHandler>;

  beforeEach(() => {
    canvas = makeCanvas();
    callbacks = makeCallbacks();
    hitAreas = [];
    handler = createInteractionHandler(
      canvas,
      () => hitAreas,
      () => 40,
      callbacks
    );
    handler.attach();
    vi.useFakeTimers();
  });

  afterEach(() => {
    handler.detach();
    vi.useRealTimers();
  });

  // --- tap on empty space ---

  it('calls onCanvasClick on a tap on empty space', () => {
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchend', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    expect(callbacks.onCanvasClick).toHaveBeenCalledOnce();
  });

  it('does not call onCanvasClick on tap on a token', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchend', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    expect(callbacks.onCanvasClick).not.toHaveBeenCalled();
  });

  // --- long press removes token ---

  it('calls onTokenRemove after long press on a token', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    vi.advanceTimersByTime(600);
    expect(callbacks.onTokenRemove).toHaveBeenCalledWith('tok1');
  });

  it('does not call onTokenRemove before long press duration', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    vi.advanceTimersByTime(599);
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });

  it('does not call onTokenRemove when long press is cancelled by drag', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    // Drag beyond threshold
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    vi.advanceTimersByTime(600);
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });

  it('does not trigger long press on empty space', () => {
    hitAreas = [];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    vi.advanceTimersByTime(600);
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });

  // --- touch drag ---

  it('starts dragging a token after touch move exceeds threshold', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    const state = handler.getDragState();
    expect(state.phase).toBe('dragging');
    if (state.phase === 'dragging') {
      expect(state.tokenId).toBe('tok1');
    }
  });

  it('does not start dragging below threshold', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 103, clientY: 100 }]));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  it('updates currentPixel during touch drag', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 150, clientY: 130 }]));
    const state = handler.getDragState();
    expect(state.phase).toBe('dragging');
    if (state.phase === 'dragging') {
      expect(state.currentPixel.x).toBeCloseTo(150);
      expect(state.currentPixel.y).toBeCloseTo(130);
    }
  });

  it('calls onTokenMove on touch end after drag', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchend', [{ identifier: 1, clientX: 200, clientY: 200 }]));
    expect(callbacks.onTokenMove).toHaveBeenCalledOnce();
    expect(callbacks.onTokenMove.mock.calls[0][0]).toBe('tok1');
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  // --- touch cancel ---

  it('resets to idle on touchcancel', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchcancel', [{ identifier: 1, clientX: 115, clientY: 100 }]));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
    expect(callbacks.onTokenMove).not.toHaveBeenCalled();
  });

  it('clears long press timer on touchcancel', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchcancel', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    vi.advanceTimersByTime(600);
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });

  // --- multi-touch: second touch ignored ---

  it('ignores a second touch while first is active', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 1, clientX: 115, clientY: 100 }]));

    // Second finger
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 2, clientX: 300, clientY: 300 }]));

    // End second finger — should not trigger anything
    canvas.dispatchEvent(touchEvent('touchend', [{ identifier: 2, clientX: 300, clientY: 300 }]));

    // First drag should still be active
    expect(handler.getDragState().phase).toBe('dragging');
  });

  it('ignores touchmove for a different touch identifier', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 30 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    // Move with wrong identifier
    canvas.dispatchEvent(touchEvent('touchmove', [{ identifier: 99, clientX: 200, clientY: 100 }]));
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
  });

  // --- touch end clears long press ---

  it('clears long press timer on touchend', () => {
    hitAreas = [{ tokenId: 'tok1', center: { x: 100, y: 100 }, radius: 20 }];
    canvas.dispatchEvent(touchEvent('touchstart', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    canvas.dispatchEvent(touchEvent('touchend', [{ identifier: 1, clientX: 100, clientY: 100 }]));
    vi.advanceTimersByTime(600);
    // onTokenRemove should NOT have been called (timer was cleared)
    expect(callbacks.onTokenRemove).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createInteractionHandler — getDragState
// ---------------------------------------------------------------------------

describe('createInteractionHandler — getDragState', () => {
  it('returns a stable idle reference before any interaction', () => {
    const canvas = makeCanvas();
    const callbacks = makeCallbacks();
    const handler = createInteractionHandler(canvas, () => [], () => 40, callbacks);
    handler.attach();
    expect(handler.getDragState()).toEqual({ phase: 'idle' });
    handler.detach();
  });

  it('reflects dragging state with correct tokenId and startCoord', () => {
    const canvas = makeCanvas();
    const callbacks = makeCallbacks();
    const hitAreas: TokenHitArea[] = [
      { tokenId: 'hero', center: { x: 200, y: 200 }, radius: 30 },
    ];
    const handler = createInteractionHandler(canvas, () => hitAreas, () => 40, callbacks);
    handler.attach();

    canvas.dispatchEvent(mouseEvent('mousedown', { clientX: 200, clientY: 200 }));
    canvas.dispatchEvent(mouseEvent('mousemove', { clientX: 215, clientY: 200 }));

    const state = handler.getDragState();
    expect(state.phase).toBe('dragging');
    if (state.phase === 'dragging') {
      expect(state.tokenId).toBe('hero');
      // startCoord should be a valid CubeCoord (q + r + s === 0)
      expect(state.startCoord.q + state.startCoord.r + state.startCoord.s).toBeCloseTo(0);
    }

    handler.detach();
  });
});