import { useState, useMemo, useEffect } from 'react';
import { HexCanvas } from '../hex-canvas/HexCanvas';
import { useEncounter } from '../encounter-state/useEncounter';
import type { RenderToken } from '../hex-canvas/renderer';

export default function BattleMapPage(): JSX.Element {
  const { encounter } = useEncounter();
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      <HexCanvas
        tokens={renderTokens}
        backgroundImage={bgImage}
        onTokenMove={() => {}}
        onTokenRemove={() => {}}
      />
      <button
        onClick={() => window.open(import.meta.env.BASE_URL + 'dm', 'dm-panel')}
        className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-gray-800/40 text-white/40 rounded text-sm transition-all hover:bg-gray-800 hover:text-white"
      >
        DM
      </button>
    </div>
  );
}
