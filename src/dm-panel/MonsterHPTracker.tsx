import { useState } from "react";
import { useEncounter } from "../encounter-state/useEncounter";
import { EditTokenModal, TokenEdits } from "./EditTokenModal";
import { Token } from "../encounter-state/types";

export const HP_STATUS_COLORS: {
  healthy: string;
  bloodied: string;
  critical: string;
  dead: string;
} = {
  healthy: "bg-green-500",
  bloodied: "bg-yellow-400",
  critical: "bg-red-500",
  dead: "bg-gray-600",
};

function getHPStatus(current: number, max: number): keyof typeof HP_STATUS_COLORS {
  if (current <= 0) return "dead";
  const ratio = current / max;
  if (ratio >= 0.5) return "healthy";
  if (ratio >= 0.25) return "bloodied";
  return "critical";
}

function getBarColor(status: keyof typeof HP_STATUS_COLORS): string {
  return HP_STATUS_COLORS[status];
}

function getRowBorderColor(status: keyof typeof HP_STATUS_COLORS): string {
  switch (status) {
    case "healthy":
      return "border-green-500";
    case "bloodied":
      return "border-yellow-400";
    case "critical":
      return "border-red-500";
    case "dead":
      return "border-gray-600";
  }
}

export function MonsterHPTracker(): JSX.Element {
  const { state, dispatch } = useEncounter();

  const [damageInputs, setDamageInputs] = useState<Record<string, string>>({});
  const [healInputs, setHealInputs] = useState<Record<string, string>>({});
  const [editingHP, setEditingHP] = useState<Record<string, string>>({});
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  const monsters = state.tokens.filter((t) => t.type === "monster");

  function handleDamage(tokenId: string) {
    const raw = damageInputs[tokenId] ?? "";
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0) return;
    dispatch({ type: "DEAL_DAMAGE", payload: { tokenId, amount } });
    setDamageInputs((prev) => ({ ...prev, [tokenId]: "" }));
  }

  function handleHeal(tokenId: string) {
    const raw = healInputs[tokenId] ?? "";
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0) return;
    dispatch({ type: "HEAL_TOKEN", payload: { tokenId, amount } });
    setHealInputs((prev) => ({ ...prev, [tokenId]: "" }));
  }

  function handleHPClick(tokenId: string, currentHP: number) {
    setEditingHP((prev) => ({ ...prev, [tokenId]: String(currentHP) }));
  }

  function handleHPEditCommit(tokenId: string) {
    const raw = editingHP[tokenId] ?? "";
    const newHP = parseInt(raw, 10);
    if (!isNaN(newHP)) {
      dispatch({ type: "SET_HP", payload: { tokenId, hp: newHP } });
    }
    setEditingHP((prev) => {
      const next = { ...prev };
      delete next[tokenId];
      return next;
    });
  }

  function handleHPEditKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    tokenId: string
  ) {
    if (e.key === "Enter") {
      handleHPEditCommit(tokenId);
    } else if (e.key === "Escape") {
      setEditingHP((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }
  }

  function handleRemove(tokenId: string) {
    dispatch({ type: "REMOVE_TOKEN", payload: { tokenId } });
  }

  if (monsters.length === 0) {
    return (
      <div className="p-4 text-gray-400 text-sm italic">
        No monsters in encounter.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {monsters.map((token) => {
        if (token.type !== "monster") return null;
        const currentHP = token.currentHp;
        const maxHP = token.maxHp;
        const status = getHPStatus(currentHP, maxHP);
        const isDead = status === "dead";
        const barPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
        const tokenId = token.id;

        return (
          <div
            key={tokenId}
            className={`relative rounded border-2 ${getRowBorderColor(status)} bg-gray-800 p-2 ${
              isDead ? "opacity-60" : ""
            }`}
          >
            {isDead && (
              <div className="absolute inset-0 flex items-center justify-center rounded pointer-events-none z-10">
                <span className="text-red-400 font-bold text-lg tracking-widest uppercase opacity-80 rotate-[-15deg]">
                  Dead
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-semibold text-sm truncate max-w-[120px]">
                {token.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-xs">
                  {editingHP[tokenId] !== undefined ? (
                    <input
                      type="number"
                      className="w-12 bg-gray-700 text-white text-xs rounded px-1 border border-gray-500 focus:outline-none focus:border-blue-400"
                      value={editingHP[tokenId]}
                      autoFocus
                      onChange={(e) =>
                        setEditingHP((prev) => ({
                          ...prev,
                          [tokenId]: e.target.value,
                        }))
                      }
                      onBlur={() => handleHPEditCommit(tokenId)}
                      onKeyDown={(e) => handleHPEditKeyDown(e, tokenId)}
                    />
                  ) : (
                    <button
                      className="hover:text-white focus:outline-none focus:underline"
                      title="Click to edit HP"
                      onClick={() => handleHPClick(tokenId, currentHP)}
                    >
                      {currentHP}
                    </button>
                  )}
                  <span className="mx-0.5">/</span>
                  <span>{maxHP}</span>
                </span>
                <button
                  className="text-gray-500 hover:text-blue-400 text-xs transition-colors"
                  title="Edit monster"
                  onClick={() => setEditingToken(token)}
                >
                  &#9998;
                </button>
                <button
                  className="text-gray-500 hover:text-red-400 text-xs font-bold transition-colors"
                  title="Remove monster"
                  onClick={() => handleRemove(tokenId)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* HP bar */}
            <div className="w-full bg-gray-700 rounded h-2 mb-2 overflow-hidden">
              <div
                className={`h-2 rounded transition-all duration-300 ${getBarColor(status)}`}
                style={{ width: `${barPercent}%` }}
              />
            </div>

            {/* Damage and Heal controls */}
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  placeholder="DMG"
                  className="w-16 bg-gray-700 text-white text-xs rounded px-1 py-0.5 border border-gray-600 focus:outline-none focus:border-red-400 placeholder-gray-500"
                  value={damageInputs[tokenId] ?? ""}
                  onChange={(e) =>
                    setDamageInputs((prev) => ({
                      ...prev,
                      [tokenId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDamage(tokenId);
                  }}
                  disabled={isDead}
                />
                <button
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-bold px-2 py-0.5 rounded transition-colors"
                  onClick={() => handleDamage(tokenId)}
                  disabled={isDead}
                >
                  Dmg
                </button>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  placeholder="Heal"
                  className="w-16 bg-gray-700 text-white text-xs rounded px-1 py-0.5 border border-gray-600 focus:outline-none focus:border-green-400 placeholder-gray-500"
                  value={healInputs[tokenId] ?? ""}
                  onChange={(e) =>
                    setHealInputs((prev) => ({
                      ...prev,
                      [tokenId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleHeal(tokenId);
                  }}
                />
                <button
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-2 py-0.5 rounded transition-colors"
                  onClick={() => handleHeal(tokenId)}
                >
                  Heal
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {editingToken && (
        <EditTokenModal
          token={editingToken}
          onCancel={() => setEditingToken(null)}
          onSave={(edits: TokenEdits) => {
            dispatch({
              type: "UPDATE_TOKEN",
              payload: {
                tokenId: editingToken.id,
                name: edits.name,
                color: edits.color,
                maxHp: edits.maxHp,
                currentHp: edits.currentHp,
              },
            });
            setEditingToken(null);
          }}
        />
      )}
    </div>
  );
}
