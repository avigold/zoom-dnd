import { useState, useMemo, useEffect, useCallback } from 'react';
import { HexCanvas } from '../hex-canvas/HexCanvas';
import DMPanel from '../dm-panel/DMPanel';
import { useEncounter } from '../encounter-state/useEncounter';
import type { RenderToken } from '../hex-canvas/renderer';
import type { CubeCoord } from '../hex-canvas/hex-math';

export default function DMPage(): JSX.Element {
  const { encounter, dispatch } = useEncounter();
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    if (!encounter.backgroundImageDataUrl) {
      setBgImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = encounter.backgroundImageDataUrl;
  }, [encounter.backgroundImageDataUrl]);

  const renderTokens: RenderToken[] = useMemo(
    () =>
      encounter.tokens
        .filter((t) => t.position !== null)
        .map((t) => ({
          id: t.id,
          cubeCoord: t.position!,
          label: t.name,
          color: t.color,
          isPlayer: t.type === 'player',
          isDead: t.type === 'monster' ? t.isDead : false,
        })),
    [encounter.tokens]
  );

  const handleCanvasClick = useCallback(
    (coord: CubeCoord) => {
      const unplaced = encounter.tokens.find((t) => t.position === null);
      if (unplaced) {
        dispatch({ type: 'MOVE_TOKEN', payload: { tokenId: unplaced.id, position: coord } });
      }
    },
    [encounter.tokens, dispatch]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      <HexCanvas
        tokens={renderTokens}
        backgroundImage={bgImage}
        onTokenMove={(tokenId, position) =>
          dispatch({ type: 'MOVE_TOKEN', payload: { tokenId, position } })
        }
        onTokenRemove={(tokenId) =>
          dispatch({ type: 'REMOVE_TOKEN', payload: { tokenId } })
        }
        onCanvasClick={handleCanvasClick}
      />

      {/* Toggle tab — always visible on right edge */}
      <button
        onClick={() => setDrawerOpen((v) => !v)}
        className={`absolute top-3 z-20 px-2 py-1.5 rounded-l text-xs font-bold transition-all ${
          drawerOpen
            ? 'right-80 bg-gray-900/80 text-white hover:bg-gray-900'
            : 'right-0 bg-gray-800/40 text-white/40 hover:bg-gray-800 hover:text-white'
        }`}
      >
        {drawerOpen ? '\u25B6' : '\u25C0 DM'}
      </button>

      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-80 z-10 transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto bg-gray-900/85 backdrop-blur-sm border-l border-gray-700/50">
          <DMPanel />
        </div>
      </div>
    </div>
  );
}
