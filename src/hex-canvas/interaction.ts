import { CubeCoord, PixelPoint, pixelToHex } from './hex-math';

export type DragState =
  | { phase: 'idle' }
  | { phase: 'dragging'; tokenId: string; startCoord: CubeCoord; currentPixel: PixelPoint };

export type InteractionCallbacks = {
  onTokenMove: (tokenId: string, dest: CubeCoord) => void;
  onTokenRemove: (tokenId: string) => void;
  onCanvasClick: (coord: CubeCoord) => void;
};

export type TokenHitArea = { tokenId: string; center: PixelPoint; radius: number };

export function getCanvasPoint(canvas: HTMLCanvasElement, event: MouseEvent | Touch): PixelPoint {
  const rect = canvas.getBoundingClientRect();
  // Return CSS-pixel coords (not DPR-scaled), matching the canvas transform
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function hitTestTokens(point: PixelPoint, hitAreas: TokenHitArea[]): string | null {
  for (const area of hitAreas) {
    const dx = point.x - area.center.x;
    const dy = point.y - area.center.y;
    if (dx * dx + dy * dy <= area.radius * area.radius) {
      return area.tokenId;
    }
  }
  return null;
}

const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 600;

export function createInteractionHandler(
  canvas: HTMLCanvasElement,
  getHitAreas: () => TokenHitArea[],
  getHexSize: () => number,
  callbacks: InteractionCallbacks
): { attach: () => void; detach: () => void; getDragState: () => DragState } {
  let dragState: DragState = { phase: 'idle' };

  // Mouse state
  let mouseDownPoint: PixelPoint | null = null;
  let mouseDownTokenId: string | null = null;
  let mouseDragStarted = false;

  // Touch state
  let touchId: number | null = null;
  let touchDownPoint: PixelPoint | null = null;
  let touchDownTokenId: string | null = null;
  let touchDragStarted = false;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  function clearLongPressTimer(): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 && e.button !== 2) return;

    const point = getCanvasPoint(canvas, e);
    const hitId = hitTestTokens(point, getHitAreas());

    if (e.button === 2) {
      if (hitId !== null) {
        callbacks.onTokenRemove(hitId);
      }
      return;
    }

    // Left button
    mouseDownPoint = point;
    mouseDownTokenId = hitId;
    mouseDragStarted = false;
  }

  function onMouseMove(e: MouseEvent): void {
    if (mouseDownPoint === null) return;

    const point = getCanvasPoint(canvas, e);

    if (!mouseDragStarted) {
      const dx = point.x - mouseDownPoint.x;
      const dy = point.y - mouseDownPoint.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      mouseDragStarted = true;

      if (mouseDownTokenId !== null) {
        const startCoord = pixelToHex(mouseDownPoint, getHexSize());
        dragState = {
          phase: 'dragging',
          tokenId: mouseDownTokenId,
          startCoord,
          currentPixel: point,
        };
      }
    } else if (dragState.phase === 'dragging') {
      dragState = { ...dragState, currentPixel: point };
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    const point = getCanvasPoint(canvas, e);

    if (dragState.phase === 'dragging') {
      const dest = pixelToHex(point, getHexSize());
      callbacks.onTokenMove(dragState.tokenId, dest);
      dragState = { phase: 'idle' };
    } else if (!mouseDragStarted && mouseDownPoint !== null) {
      // It was a click
      if (mouseDownTokenId === null) {
        const coord = pixelToHex(point, getHexSize());
        callbacks.onCanvasClick(coord);
      }
    }

    mouseDownPoint = null;
    mouseDownTokenId = null;
    mouseDragStarted = false;
  }

  function onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  function onTouchStart(e: TouchEvent): void {
    if (touchId !== null) return;

    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    const point = getCanvasPoint(canvas, touch);
    touchDownPoint = point;
    touchDragStarted = false;
    touchDownTokenId = hitTestTokens(point, getHitAreas());

    if (touchDownTokenId !== null) {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (!touchDragStarted && touchDownTokenId !== null) {
          callbacks.onTokenRemove(touchDownTokenId);
          // Cancel further processing for this touch
          touchId = null;
          touchDownPoint = null;
          touchDownTokenId = null;
          dragState = { phase: 'idle' };
        }
      }, LONG_PRESS_MS);
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (touchId === null || touchDownPoint === null) return;

    let touch: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (touch === null) return;

    const point = getCanvasPoint(canvas, touch);

    if (!touchDragStarted) {
      const dx = point.x - touchDownPoint.x;
      const dy = point.y - touchDownPoint.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;

      touchDragStarted = true;
      clearLongPressTimer();

      if (touchDownTokenId !== null) {
        const startCoord = pixelToHex(touchDownPoint, getHexSize());
        dragState = {
          phase: 'dragging',
          tokenId: touchDownTokenId,
          startCoord,
          currentPixel: point,
        };
      }
    } else if (dragState.phase === 'dragging') {
      dragState = { ...dragState, currentPixel: point };
    }

    // Prevent scroll while dragging a token
    if (dragState.phase === 'dragging') {
      e.preventDefault();
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (touchId === null) return;

    let touch: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (touch === null) return;

    clearLongPressTimer();

    const point = getCanvasPoint(canvas, touch);

    if (dragState.phase === 'dragging') {
      const dest = pixelToHex(point, getHexSize());
      callbacks.onTokenMove(dragState.tokenId, dest);
      dragState = { phase: 'idle' };
    } else if (!touchDragStarted && touchDownPoint !== null) {
      if (touchDownTokenId === null) {
        const coord = pixelToHex(point, getHexSize());
        callbacks.onCanvasClick(coord);
      }
    }

    touchId = null;
    touchDownPoint = null;
    touchDownTokenId = null;
    touchDragStarted = false;
  }

  function onTouchCancel(e: TouchEvent): void {
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        found = true;
        break;
      }
    }
    if (!found && touchId !== null) return;

    clearLongPressTimer();
    dragState = { phase: 'idle' };
    touchId = null;
    touchDownPoint = null;
    touchDownTokenId = null;
    touchDragStarted = false;
  }

  function attach(): void {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchCancel);
  }

  function detach(): void {
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchCancel);
    clearLongPressTimer();
    dragState = { phase: 'idle' };
  }

  function getDragState(): DragState {
    return dragState;
  }

  return { attach, detach, getDragState };
}