import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HexCanvas, HexCanvasProps } from '../src/hex-canvas/HexCanvas';
import { RenderToken } from '../src/hex-canvas/renderer';
import { CubeCoord, DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS, HEX_SIZE } from '../src/hex-canvas/hex-math';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRenderFrame = vi.fn();
const mockAttach = vi.fn();
const mockDetach = vi.fn();
const mockCreateInteractionHandler = vi.fn();

vi.mock('../src/hex-canvas/renderer', () => ({
  renderFrame: (...args: unknown[]) => mockRenderFrame(...args),
}));

vi.mock('../src/hex-canvas/interaction', () => ({
  createInteractionHandler: (...args: unknown[]) =>
    mockCreateInteractionHandler(...args),
}));

vi.mock('../src/hex-canvas/hex-math', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/hex-canvas/hex-math')>();
  return {
    ...actual,
    hexToPixel: (coord: CubeCoord, size: number) => ({
      x: coord.q * size,
      y: coord.r * size,
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(id: string, q = 0, r = 0, s = 0): RenderToken {
  return {
    id,
    cubeCoord: { q, r, s },
    label: id,
    color: '#ff0000',
    isPlayer: false,
    isDead: false,
  };
}

function defaultProps(overrides: Partial<HexCanvasProps> = {}): HexCanvasProps {
  return {
    tokens: [],
    backgroundImage: null,
    onTokenMove: vi.fn(),
    onTokenRemove: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafHandle = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafHandle = 0;

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    rafHandle += 1;
    rafCallbacks.push(cb);
    return rafHandle;
  });

  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((handle) => {
    // remove matching callback by handle index (handle === position in array + 1)
    const idx = handle - 1;
    if (idx >= 0 && idx < rafCallbacks.length) {
      rafCallbacks[idx] = () => {};
    }
  });

  mockCreateInteractionHandler.mockReturnValue({
    attach: mockAttach,
    detach: mockDetach,
  });

  mockRenderFrame.mockClear();
  mockAttach.mockClear();
  mockDetach.mockClear();
  mockCreateInteractionHandler.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function flushRaf() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb(performance.now()));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HexCanvas', () => {
  describe('rendering', () => {
    it('renders a <canvas> element', () => {
      render(<HexCanvas {...defaultProps()} />);
      expect(document.querySelector('canvas')).not.toBeNull();
    });

    it('applies the className prop to the canvas element', () => {
      render(<HexCanvas {...defaultProps({ className: 'my-canvas' })} />);
      const canvas = document.querySelector('canvas');
      expect(canvas?.className).toContain('my-canvas');
    });

    it('sets display:block style on the canvas', () => {
      render(<HexCanvas {...defaultProps()} />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.display).toBe('block');
    });

    it('does not throw when className is omitted', () => {
      expect(() => render(<HexCanvas {...defaultProps()} />)).not.toThrow();
    });
  });

  describe('canvas sizing', () => {
    it('sets canvas dimensions based on default grid size and hexSize', () => {
      render(<HexCanvas {...defaultProps()} />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;

      const expectedWidth = Math.ceil(HEX_SIZE * 1.5 * DEFAULT_GRID_COLS + HEX_SIZE * 0.5);
      const expectedHeight = Math.ceil(
        HEX_SIZE * Math.sqrt(3) * DEFAULT_GRID_ROWS +
          HEX_SIZE * Math.sqrt(3) * 0.5
      );

      expect(canvas.width).toBe(expectedWidth);
      expect(canvas.height).toBe(expectedHeight);
    });

    it('sets canvas dimensions based on custom gridCols, gridRows, and hexSize', () => {
      const hexSize = 40;
      const gridCols = 8;
      const gridRows = 6;

      render(
        <HexCanvas
          {...defaultProps({ hexSize, gridCols, gridRows })}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const expectedWidth = Math.ceil(hexSize * 1.5 * gridCols + hexSize * 0.5);
      const expectedHeight = Math.ceil(
        hexSize * Math.sqrt(3) * gridRows + hexSize * Math.sqrt(3) * 0.5
      );

      expect(canvas.width).toBe(expectedWidth);
      expect(canvas.height).toBe(expectedHeight);
    });

    it('updates canvas dimensions when hexSize prop changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ hexSize: 30 })} />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const widthBefore = canvas.width;

      rerender(<HexCanvas {...defaultProps({ hexSize: 60 })} />);
      expect(canvas.width).toBeGreaterThan(widthBefore);
    });

    it('updates canvas dimensions when gridCols changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ gridCols: 5 })} />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const widthBefore = canvas.width;

      rerender(<HexCanvas {...defaultProps({ gridCols: 10 })} />);
      expect(canvas.width).toBeGreaterThan(widthBefore);
    });
  });

  describe('interaction handler lifecycle', () => {
    it('creates and attaches an interaction handler on mount', () => {
      render(<HexCanvas {...defaultProps()} />);
      expect(mockCreateInteractionHandler).toHaveBeenCalledTimes(1);
      expect(mockAttach).toHaveBeenCalledTimes(1);
    });

    it('detaches the interaction handler on unmount', () => {
      const { unmount } = render(<HexCanvas {...defaultProps()} />);
      unmount();
      expect(mockDetach).toHaveBeenCalledTimes(1);
    });

    it('passes the canvas element as the first argument to createInteractionHandler', () => {
      render(<HexCanvas {...defaultProps()} />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(mockCreateInteractionHandler.mock.calls[0][0]).toBe(canvas);
    });

    it('passes onTokenMove callback in the callbacks object', () => {
      const onTokenMove = vi.fn();
      render(<HexCanvas {...defaultProps({ onTokenMove })} />);
      const callbacksArg = mockCreateInteractionHandler.mock.calls[0][3];
      expect(callbacksArg.onTokenMove).toBe(onTokenMove);
    });

    it('passes onTokenRemove callback in the callbacks object', () => {
      const onTokenRemove = vi.fn();
      render(<HexCanvas {...defaultProps({ onTokenRemove })} />);
      const callbacksArg = mockCreateInteractionHandler.mock.calls[0][3];
      expect(callbacksArg.onTokenRemove).toBe(onTokenRemove);
    });

    it('does not recreate the interaction handler when tokens prop changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps()} />);
      expect(mockCreateInteractionHandler).toHaveBeenCalledTimes(1);

      rerender(<HexCanvas {...defaultProps({ tokens: [makeToken('a')] })} />);
      expect(mockCreateInteractionHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHitAreas (via interaction handler)', () => {
    it('provides a getHitAreas function that returns hit areas for current tokens', () => {
      const tokens = [makeToken('t1', 1, 0, -1), makeToken('t2', 0, 1, -1)];
      render(<HexCanvas {...defaultProps({ tokens })} />);

      // Extract the getHitAreas callback passed to createInteractionHandler
      const getHitAreas = mockCreateInteractionHandler.mock.calls[0][1] as () => unknown[];
      const hitAreas = getHitAreas();

      expect(hitAreas).toHaveLength(2);
      expect((hitAreas[0] as { tokenId: string }).tokenId).toBe('t1');
      expect((hitAreas[1] as { tokenId: string }).tokenId).toBe('t2');
    });

    it('hit areas include a center and radius', () => {
      const tokens = [makeToken('t1', 2, 1, -3)];
      render(<HexCanvas {...defaultProps({ tokens })} />);

      const getHitAreas = mockCreateInteractionHandler.mock.calls[0][1] as () => unknown[];
      const hitAreas = getHitAreas() as Array<{
        tokenId: string;
        center: { x: number; y: number };
        radius: number;
      }>;

      expect(hitAreas[0].center).toBeDefined();
      expect(typeof hitAreas[0].center.x).toBe('number');
      expect(typeof hitAreas[0].center.y).toBe('number');
      expect(hitAreas[0].radius).toBeGreaterThan(0);
    });

    it('returns empty hit areas when there are no tokens', () => {
      render(<HexCanvas {...defaultProps({ tokens: [] })} />);
      const getHitAreas = mockCreateInteractionHandler.mock.calls[0][1] as () => unknown[];
      expect(getHitAreas()).toHaveLength(0);
    });

    it('getHitAreas reflects updated tokens after re-render (ref stays current)', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ tokens: [] })} />);

      const getHitAreas = mockCreateInteractionHandler.mock.calls[0][1] as () => unknown[];
      expect(getHitAreas()).toHaveLength(0);

      rerender(<HexCanvas {...defaultProps({ tokens: [makeToken('a'), makeToken('b')] })} />);
      expect(getHitAreas()).toHaveLength(2);
    });

    it('radius is proportional to hexSize', () => {
      const hexSize = 50;
      const tokens = [makeToken('t1')];
      render(<HexCanvas {...defaultProps({ tokens, hexSize })} />);

      const getHitAreas = mockCreateInteractionHandler.mock.calls[0][1] as () => Array<{
        radius: number;
      }>;
      const hitAreas = getHitAreas();
      expect(hitAreas[0].radius).toBeCloseTo(hexSize * 0.45);
    });
  });

  describe('getHexSize (via interaction handler)', () => {
    it('provides a getHexSize function that returns the current hexSize', () => {
      const hexSize = 55;
      render(<HexCanvas {...defaultProps({ hexSize })} />);

      const getHexSize = mockCreateInteractionHandler.mock.calls[0][2] as () => number;
      expect(getHexSize()).toBe(hexSize);
    });

    it('getHexSize reflects updated hexSize after re-render', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ hexSize: 30 })} />);
      const getHexSize = mockCreateInteractionHandler.mock.calls[0][2] as () => number;

      rerender(<HexCanvas {...defaultProps({ hexSize: 70 })} />);
      expect(getHexSize()).toBe(70);
    });
  });

  describe('render loop', () => {
    it('calls requestAnimationFrame when tokens change', () => {
      render(<HexCanvas {...defaultProps()} />);
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('calls renderFrame with correct arguments after animation frame fires', () => {
      const tokens = [makeToken('t1')];
      const gridCols = 7;
      const gridRows = 5;
      const hexSize = 40;
      const showGrid = false;
      const backgroundImage = null;

      render(
        <HexCanvas
          {...defaultProps({ tokens, gridCols, gridRows, hexSize, showGrid, backgroundImage })}
        />
      );

      flushRaf();

      expect(mockRenderFrame).toHaveBeenCalledTimes(1);
      const [, gridConfig, renderedTokens, options] = mockRenderFrame.mock.calls[0];
      expect(gridConfig).toEqual({ cols: gridCols, rows: gridRows, hexSize });
      expect(renderedTokens).toBe(tokens);
      expect(options.showGrid).toBe(showGrid);
      expect(options.backgroundImage).toBe(backgroundImage);
    });

    it('passes showGrid=true by default to renderFrame', () => {
      render(<HexCanvas {...defaultProps()} />);
      flushRaf();
      const options = mockRenderFrame.mock.calls[0][3];
      expect(options.showGrid).toBe(true);
    });

    it('passes backgroundImage to renderFrame', () => {
      const backgroundImage = new Image();
      render(<HexCanvas {...defaultProps({ backgroundImage })} />);
      flushRaf();
      const options = mockRenderFrame.mock.calls[0][3];
      expect(options.backgroundImage).toBe(backgroundImage);
    });

    it('calls renderFrame again when tokens prop changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps()} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(1);

      rerender(<HexCanvas {...defaultProps({ tokens: [makeToken('a')] })} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(2);
    });

    it('calls renderFrame again when showGrid changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ showGrid: true })} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(1);

      rerender(<HexCanvas {...defaultProps({ showGrid: false })} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(2);
    });

    it('calls renderFrame again when backgroundImage changes', () => {
      const { rerender } = render(<HexCanvas {...defaultProps({ backgroundImage: null })} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(1);

      rerender(<HexCanvas {...defaultProps({ backgroundImage: new Image() })} />);
      flushRaf();
      expect(mockRenderFrame).toHaveBeenCalledTimes(2);
    });

    it('cancels pending animation frame on unmount', () => {
      const { unmount } = render(<HexCanvas {...defaultProps()} />);
      // Do not flush — leave the RAF pending
      unmount();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('does not throw when renderFrame throws an error', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRenderFrame.mockImplementationOnce(() => {
        throw new Error('render failure');
      });

      render(<HexCanvas {...defaultProps()} />);
      expect(() => flushRaf()).not.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        '[HexCanvas] renderFrame error:',
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('renders with an empty tokens array without errors', () => {
      expect(() => render(<HexCanvas {...defaultProps({ tokens: [] })} />)).not.toThrow();
    });

    it('renders with a large number of tokens', () => {
      const tokens = Array.from({ length: 100 }, (_, i) =>
        makeToken(`t${i}`, i % 10, Math.floor(i / 10), -(i % 10) - Math.floor(i / 10))
      );
      expect(() => render(<HexCanvas {...defaultProps({ tokens })} />)).not.toThrow();
    });

    it('renders with gridCols=1 and gridRows=1', () => {
      expect(() =>
        render(<HexCanvas {...defaultProps({ gridCols: 1, gridRows: 1 })} />)
      ).not.toThrow();
    });

    it('renders with hexSize=1 (minimum meaningful size)', () => {
      expect(() =>
        render(<HexCanvas {...defaultProps({ hexSize: 1 })} />)
      ).not.toThrow();
    });

    it('handles null backgroundImage gracefully', () => {
      expect(() =>
        render(<HexCanvas {...defaultProps({ backgroundImage: null })} />)
      ).not.toThrow();
    });

    it('renders without optional className prop', () => {
      const { container } = render(<HexCanvas {...defaultProps()} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).not.toBeNull();
    });
  });
});