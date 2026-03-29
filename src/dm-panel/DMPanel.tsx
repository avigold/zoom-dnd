import { useRef } from "react";
import { AddTokenToolbar } from "./AddTokenToolbar";
import { InitiativeTracker } from "./InitiativeTracker";
import { MonsterHPTracker } from "./MonsterHPTracker";
import { NotesEditor } from "./NotesEditor";
import { useEncounter } from "../encounter-state/useEncounter";

export default function DMPanel(): JSX.Element {
  const { encounter, dispatch } = useEncounter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch({ type: "SET_BACKGROUND", payload: { dataUrl: reader.result as string } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleResetEncounter() {
    if (window.confirm("Reset encounter? This will remove all tokens and clear the board.")) {
      dispatch({ type: "RESET_ENCOUNTER" });
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-2 border-b border-gray-700">
        <AddTokenToolbar />
      </div>

      <div className="border-b border-gray-700">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider px-3 pt-3 pb-1">
          Initiative
        </h2>
        <InitiativeTracker />
      </div>

      <div className="border-b border-gray-700">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider px-3 pt-3 pb-1">
          Monster HP
        </h2>
        <MonsterHPTracker />
      </div>

      <div className="border-b border-gray-700">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider px-3 pt-3 pb-1">
          Notes
        </h2>
        <NotesEditor />
      </div>

      <div className="border-b border-gray-700 p-3">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider pb-2">
          Background Map
        </h2>
        <div className="flex gap-2">
          <button
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {encounter.backgroundImageDataUrl ? "Change Image" : "Upload Image"}
          </button>
          {encounter.backgroundImageDataUrl && (
            <button
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium px-3 py-1.5 rounded transition-colors"
              onClick={() => dispatch({ type: "SET_BACKGROUND", payload: { dataUrl: null } })}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBackgroundUpload}
        />
      </div>

      <div className="p-3">
        <button
          className="w-full bg-red-900/50 hover:bg-red-900 text-red-300 text-xs font-bold px-3 py-2 rounded transition-colors"
          onClick={handleResetEncounter}
        >
          Reset Encounter
        </button>
      </div>
    </div>
  );
}