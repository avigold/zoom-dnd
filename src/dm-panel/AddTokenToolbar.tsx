import { useState } from "react";
import { useEncounter } from "../encounter-state/useEncounter";

export const PLAYER_COLOR_PRESETS: string[] = [
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#ec407a",
  "#e74c3c",
];

export const MONSTER_COLOR_PRESETS: string[] = [
  "#e74c3c",
  "#8b0000",
  "#2d572c",
  "#4a4a4a",
  "#6b3fa0",
  "#8b6914",
  "#1a5276",
  "#784212",
];

interface PlayerFormState {
  name: string;
  color: string;
}

interface MonsterFormState {
  name: string;
  quantity: number;
  maxHp: number;
  color: string;
}

function PlayerModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (form: PlayerFormState) => void;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLOR_PRESETS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm({ name: trimmed, color });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg">Add Player</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium" htmlFor="player-name">
              Name
            </label>
            <input
              id="player-name"
              type="text"
              autoFocus
              className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400 placeholder-gray-500"
              placeholder="Player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium">Colour</label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COLOR_PRESETS.map((preset) => (
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
              <label className="text-gray-400 text-xs" htmlFor="player-color-picker">
                Custom:
              </label>
              <input
                id="player-color-picker"
                type="color"
                className="w-8 h-7 rounded border border-gray-600 bg-gray-800 cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="text-gray-400 text-xs font-mono">{color}</span>
            </div>
          </div>

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
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MonsterModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (form: MonsterFormState) => void;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [maxHp, setMaxHp] = useState(10);
  const [color, setColor] = useState(MONSTER_COLOR_PRESETS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const safeQty = Math.max(1, Math.min(20, quantity));
    const safeHp = Math.max(1, maxHp);
    onConfirm({ name: trimmed, quantity: safeQty, maxHp: safeHp, color });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg">Add Monster</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium" htmlFor="monster-name">
              Name
            </label>
            <input
              id="monster-name"
              type="text"
              autoFocus
              className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400 placeholder-gray-500"
              placeholder="Monster name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium">Colour</label>
            <div className="flex flex-wrap gap-2">
              {MONSTER_COLOR_PRESETS.map((preset) => (
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
              <label className="text-gray-400 text-xs" htmlFor="monster-color-picker">
                Custom:
              </label>
              <input
                id="monster-color-picker"
                type="color"
                className="w-8 h-7 rounded border border-gray-600 bg-gray-800 cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="text-gray-400 text-xs font-mono">{color}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-gray-300 text-sm font-medium" htmlFor="monster-quantity">
                Quantity
              </label>
              <input
                id="monster-quantity"
                type="number"
                min={1}
                max={20}
                className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-gray-300 text-sm font-medium" htmlFor="monster-maxhp">
                Max HP
              </label>
              <input
                id="monster-maxhp"
                type="number"
                min={1}
                className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                value={maxHp}
                onChange={(e) => setMaxHp(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

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
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded transition-colors"
              disabled={!name.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddTokenToolbar(): JSX.Element {
  const { dispatch } = useEncounter();
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showMonsterModal, setShowMonsterModal] = useState(false);

  function handleAddPlayer(form: PlayerFormState) {
    dispatch({
      type: "ADD_PLAYER_TOKEN",
      payload: { name: form.name, color: form.color },
    });
    setShowPlayerModal(false);
  }

  function handleAddMonster(form: MonsterFormState) {
    dispatch({
      type: "ADD_MONSTER_TOKENS",
      payload: {
        name: form.name,
        quantity: form.quantity,
        maxHp: form.maxHp,
        color: form.color,
      },
    });
    setShowMonsterModal(false);
  }

  return (
    <>
      <div className="flex gap-2 p-2">
        <button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded transition-colors"
          onClick={() => setShowPlayerModal(true)}
        >
          + Add Player
        </button>
        <button
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-3 py-2 rounded transition-colors"
          onClick={() => setShowMonsterModal(true)}
        >
          + Add Monster
        </button>
      </div>

      {showPlayerModal && (
        <PlayerModal
          onConfirm={handleAddPlayer}
          onCancel={() => setShowPlayerModal(false)}
        />
      )}

      {showMonsterModal && (
        <MonsterModal
          onConfirm={handleAddMonster}
          onCancel={() => setShowMonsterModal(false)}
        />
      )}
    </>
  );
}