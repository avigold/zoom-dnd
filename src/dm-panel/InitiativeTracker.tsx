import { useState } from "react";
import { useEncounter } from "../encounter-state/useEncounter";
import { EditTokenModal, TokenEdits } from "./EditTokenModal";
import { Token } from "../encounter-state/types";

export function InitiativeTracker(): JSX.Element {
  const { state, dispatch } = useEncounter();
  const [initiativeInputs, setInitiativeInputs] = useState<Record<string, string>>({});
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  const sorted = [...state.initiativeOrder].sort((a, b) => b.initiative - a.initiative);

  function handleNextTurn() {
    dispatch({ type: "NEXT_TURN" });
  }

  function handleInitiativeChange(tokenId: string, value: string) {
    setInitiativeInputs((prev) => ({ ...prev, [tokenId]: value }));
  }

  function handleInitiativeCommit(tokenId: string) {
    const raw = initiativeInputs[tokenId];
    if (raw === undefined) return;
    const value = parseInt(raw, 10);
    if (!isNaN(value)) {
      dispatch({ type: "SET_INITIATIVE", payload: { tokenId, initiative: value } });
    }
    setInitiativeInputs((prev) => {
      const next = { ...prev };
      delete next[tokenId];
      return next;
    });
  }

  function handleInitiativeKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    tokenId: string
  ) {
    if (e.key === "Enter") {
      handleInitiativeCommit(tokenId);
    } else if (e.key === "Escape") {
      setInitiativeInputs((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }
  }

  function getDisplayInitiative(tokenId: string, initiative: number): string {
    if (initiativeInputs[tokenId] !== undefined) {
      return initiativeInputs[tokenId];
    }
    return String(initiative);
  }

  const activeEntry = sorted[state.currentTurnIndex] ?? null;

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-gray-400 text-sm italic">
        No initiative order set.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-gray-300 text-sm font-semibold">
            Round <span className="text-white font-bold">{state.round}</span>
          </span>
          <span className="text-gray-500 text-xs">Init &#x25B8;</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold px-2 py-1 rounded transition-colors"
            onClick={() => dispatch({ type: "RESET_ROUND" })}
            title="Reset round to 1"
          >
            Reset
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded transition-colors"
            onClick={handleNextTurn}
          >
            Next Turn
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {sorted.map((entry) => {
          const isActive = activeEntry !== null && entry.tokenId === activeEntry.tokenId;
          const token = state.tokens.find((t) => t.id === entry.tokenId);
          const name = token?.name ?? entry.tokenId;

          return (
            <div
              key={entry.tokenId}
              className={`flex items-center justify-between rounded px-2 py-1.5 border ${
                isActive
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-gray-700 bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {isActive && (
                  <span className="text-yellow-400 text-xs font-bold">&#9654;</span>
                )}
                {!isActive && <span className="w-3" />}
                {token && (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: token.color }}
                  />
                )}
                <span
                  className={`text-sm font-medium truncate max-w-[110px] ${
                    isActive ? "text-yellow-300" : "text-white"
                  }`}
                >
                  {name}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {token && (
                  <button
                    className="text-gray-500 hover:text-blue-400 text-xs transition-colors"
                    title="Edit token"
                    onClick={() => setEditingToken(token)}
                  >
                    &#9998;
                  </button>
                )}
                <input
                  type="number"
                  className={`w-14 text-xs rounded px-1 py-0.5 border focus:outline-none text-right ${
                    isActive
                      ? "bg-yellow-900/40 border-yellow-500 text-yellow-200 focus:border-yellow-300"
                      : "bg-gray-700 border-gray-600 text-white focus:border-blue-400"
                  }`}
                  value={getDisplayInitiative(entry.tokenId, entry.initiative)}
                  onChange={(e) => handleInitiativeChange(entry.tokenId, e.target.value)}
                  onBlur={() => handleInitiativeCommit(entry.tokenId)}
                  onKeyDown={(e) => handleInitiativeKeyDown(e, entry.tokenId)}
                  title="Initiative roll"
                  placeholder="Init"
                />
                <button
                  className="text-gray-500 hover:text-red-400 text-xs font-bold transition-colors"
                  title="Remove token"
                  onClick={() => dispatch({ type: "REMOVE_TOKEN", payload: { tokenId: entry.tokenId } })}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
