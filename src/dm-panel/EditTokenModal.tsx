import { useState } from "react";
import { Token } from "../encounter-state/types";
import { PLAYER_COLOR_PRESETS, MONSTER_COLOR_PRESETS } from "./AddTokenToolbar";

export interface TokenEdits {
  name: string;
  color: string;
  maxHp?: number;
  currentHp?: number;
}

export function EditTokenModal({
  token,
  onSave,
  onCancel,
}: {
  token: Token;
  onSave: (edits: TokenEdits) => void;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState(token.name);
  const [color, setColor] = useState(token.color);
  const [maxHp, setMaxHp] = useState(token.type === "monster" ? token.maxHp : 0);
  const [currentHp, setCurrentHp] = useState(token.type === "monster" ? token.currentHp : 0);

  const isMonster = token.type === "monster";
  const presets = isMonster ? MONSTER_COLOR_PRESETS : PLAYER_COLOR_PRESETS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const edits: TokenEdits = { name: trimmed, color };
    if (isMonster) {
      const safeMax = Math.max(1, maxHp);
      edits.maxHp = safeMax;
      edits.currentHp = Math.max(0, Math.min(currentHp, safeMax));
    }
    onSave(edits);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg">
          Edit {isMonster ? "Monster" : "Player"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium" htmlFor="edit-name">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              autoFocus
              className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400 placeholder-gray-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium">Colour</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === preset
                      ? "border-white scale-110"
                      : "border-transparent hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                  title={preset}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-gray-400 text-xs" htmlFor="edit-color-picker">
                Custom:
              </label>
              <input
                id="edit-color-picker"
                type="color"
                className="w-8 h-7 rounded border border-gray-600 bg-gray-800 cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="text-gray-400 text-xs font-mono">{color}</span>
            </div>
          </div>

          {isMonster && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-gray-300 text-sm font-medium" htmlFor="edit-currenthp">
                  Current HP
                </label>
                <input
                  id="edit-currenthp"
                  type="number"
                  min={0}
                  className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  value={currentHp}
                  onChange={(e) => setCurrentHp(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-gray-300 text-sm font-medium" htmlFor="edit-maxhp">
                  Max HP
                </label>
                <input
                  id="edit-maxhp"
                  type="number"
                  min={1}
                  className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  value={maxHp}
                  onChange={(e) => setMaxHp(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded transition-colors"
              disabled={!name.trim()}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
