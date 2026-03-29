import React, { createContext, useReducer, useEffect, useRef } from 'react';
import { Encounter, Action } from './types';
import { encounterReducer } from './reducer';
import { saveEncounter, loadEncounter, exportJSON as exportJSONFile, importJSON as importJSONFile } from './persistence';

export interface EncounterContextValue {
  encounter: Encounter;
  state: Encounter;
  dispatch: React.Dispatch<Action>;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
}

export const EncounterContext = createContext<EncounterContextValue>(
  null as unknown as EncounterContextValue
);

const CHANNEL_NAME = 'zoom-dnd-encounter-sync';

export function EncounterProvider({ children }: { children: React.ReactNode }) {
  const [encounter, dispatch] = useReducer(encounterReducer, undefined, loadEncounter);

  const channelRef = useRef<BroadcastChannel | null>(null);
  // Counter that increments for remote updates; the useEffect checks if it changed
  const remoteUpdateCount = useRef(0);
  const lastBroadcastCount = useRef(0);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.type !== '__SYNC_STATE__') return;
        remoteUpdateCount.current += 1;
        dispatch({ type: 'LOAD_ENCOUNTER', payload: { encounter: data.encounter } });
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch (err) {
      console.warn('BroadcastChannel unavailable — multi-tab sync disabled:', err);
    }
  }, []);

  useEffect(() => {
    saveEncounter(encounter);

    // Only broadcast if this state change was NOT caused by a remote sync
    if (remoteUpdateCount.current !== lastBroadcastCount.current) {
      // This render was triggered by a remote update — don't re-broadcast
      lastBroadcastCount.current = remoteUpdateCount.current;
      return;
    }

    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type: '__SYNC_STATE__', encounter });
      } catch (err) {
        console.warn('Failed to broadcast state:', err);
      }
    }
  }, [encounter]);

  const wrappedDispatch: React.Dispatch<Action> = (action: Action) => {
    dispatch(action);
  };

  const exportJSON = () => {
    exportJSONFile(encounter);
  };

  const importJSON = async (file: File): Promise<void> => {
    try {
      const imported = await importJSONFile(file);
      wrappedDispatch({ type: 'LOAD_ENCOUNTER', payload: { encounter: imported } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error while importing encounter';
      alert(message);
    }
  };

  const value: EncounterContextValue = {
    encounter,
    state: encounter,
    dispatch: wrappedDispatch,
    exportJSON,
    importJSON,
  };

  return (
    <EncounterContext.Provider value={value}>
      {children}
    </EncounterContext.Provider>
  );
}