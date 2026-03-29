import { useContext } from 'react';
import { EncounterContext, EncounterContextValue } from './EncounterProvider';

export function useEncounter(): EncounterContextValue {
  const value = useContext(EncounterContext);
  if (value === null) {
    throw new Error('useEncounter must be called within an EncounterProvider');
  }
  return value;
}