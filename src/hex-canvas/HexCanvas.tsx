import React, { useRef, useEffect, useCallback } from 'react';
import { CubeCoord, hexToPixel, HEX_SIZE } from './hex-math';
import { RenderToken, renderFrame } from './renderer';
import { createInteractionHandler, TokenHitArea, DragState } from './interaction';

export interface HexCanvasProps {
  tokens: RenderToken[];
  hexSize?: number;
  backgroundImage: HTMLImageElement | null;
  showGrid?: boolean;
  onTokenMove: (tokenId: string, dest: CubeCoord) => void;
  onTokenRemove: (tokenId: string) => void;
  onCanvasClick?: (coord: CubeCoord) => void;
  className?: string;
}

export function HexCanvas(props: HexCanvasProps): JSX.Element {
  const {
    tokens,
    hexSize = HEX_SIZE,
    backgroundImage,
    showGrid = true,
    onTokenMove,
    onTokenRemove,
    onCanvasClick,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokensRef = useRef<RenderToken[]>(tokens);
  const hexSizeRef = useRef<number>(hexSize);
  const animFrameRef = useRef<number | null>(null);
  const getDragStateRef = useRef<(() => DragState) | null>(null);
  const gridRef = useRef({ cols: 1, rows: 1, hexSize });
  const showGridRef = useRef(showGrid);
  const backgroundImageRef = useRef(backgroundImage);

  // Keep refs in sync so interaction callbacks always see current values
  tokensRef.current = tokens;
  hexSizeRef.current = hexSize;
  showGridRef.current = showGrid;
  backgroundImageRef.current = backgroundImage;

  const onTokenMoveRef = useRef(onTokenMove);
  const onTokenRemoveRef = useRef(onTokenRemove);
  const onCanvasClickRef = useRef(onCanvasClick);
  onTokenMoveRef.current = onTokenMove;
  onTokenRemoveRef.current = onTokenRemove;
  onCanvasClickRef.current = onCanvasClick;

  const getHitAreas = useCallback((): TokenHitArea[] => {
    return tokensRef.current.map((token) => ({
      tokenId: token.id,
      center: hexToPixel(token.cubeCoord, hexSizeRef.current),
      radius: hexSizeRef.current * 0.45,
    }));
  }, []);

  const getHexSize = useCallback((): number => {
    return hexSizeRef.current;
  }, []);

  // Size canvas to fill container and compute grid dimensions
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';

      const ctx = canvas!.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Compute how many hex columns/rows fit
      const cols = Math.floor((w - hexSize * 0.5) / (hexSize * 1.5)) + 1;
      const rowH = hexSize * Math.sqrt(3);
      const rows = Math.floor((h - rowH * 0.5) / rowH) + 1;

      gridRef.current = { cols, rows, hexSize };
    }

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [hexSize]);

  // Attach interaction handler once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = createInteractionHandler(canvas, getHitAreas, getHexSize, {
      onTokenMove: (tokenId, dest) => onTokenMoveRef.current(tokenId, dest),
      onTokenRemove: (tokenId) => onTokenRemoveRef.current(tokenId),
      onCanvasClick: (coord) => onCanvasClickRef.current?.(coord),
    });

    getDragStateRef.current = handler.getDragState;
    handler.attach();
    return () => {
      handler.detach();
      getDragStateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    function loop() {
      if (!running) return;
      try {
        const drag = getDragStateRef.current?.();
        const dragInfo =
          drag && drag.phase === 'dragging'
            ? { tokenId: drag.tokenId, currentPixel: drag.currentPixel }
            : null;

        renderFrame(
          ctx!,
          gridRef.current,
          tokensRef.current,
          { showGrid: showGridRef.current, backgroundImage: backgroundImageRef.current },
          dragInfo
        );
      } catch (err) {
        console.error('[HexCanvas] renderFrame error:', err);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block' }}
      />
    </div>
  );
}
