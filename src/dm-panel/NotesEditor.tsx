import { useEncounter } from "../encounter-state/useEncounter";

export function NotesEditor(): JSX.Element {
  const { state, dispatch } = useEncounter();

  return (
    <div className="flex flex-col gap-1 p-2">
      <label htmlFor="encounter-notes" className="text-gray-300 text-sm font-semibold">
        Notes
      </label>
      <textarea
        id="encounter-notes"
        className="w-full min-h-[120px] bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-y placeholder-gray-500"
        placeholder="Enter encounter notes..."
        value={state.notes ?? ""}
        onChange={(e) =>
          dispatch({ type: "UPDATE_NOTES", payload: { notes: e.target.value } })
        }
      />
    </div>
  );
}