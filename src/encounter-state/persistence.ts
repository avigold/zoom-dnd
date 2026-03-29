import { Encounter, DEFAULT_ENCOUNTER, Token, InitiativeEntry } from './types';

export const STORAGE_KEY = 'zoom-dnd-encounter';

export function validateEncounter(raw: unknown): Encounter {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Encounter must be an object');
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.tokens)) {
    throw new Error('Encounter.tokens must be an array');
  }

  for (const token of obj.tokens) {
    if (token === null || typeof token !== 'object') {
      throw new Error('Each token must be an object');
    }
    const t = token as Record<string, unknown>;
    if (typeof t.id !== 'string') throw new Error('Token.id must be a string');
    if (typeof t.name !== 'string') throw new Error('Token.name must be a string');
    if (t.type !== 'player' && t.type !== 'monster') {
      throw new Error(`Token.type must be 'player' or 'monster', got: ${String(t.type)}`);
    }
    if (typeof t.color !== 'string') throw new Error('Token.color must be a string');
    if (t.position !== null) {
      if (t.position === undefined) {
        throw new Error('Token.position must be a HexCoord or null');
      }
      if (typeof t.position !== 'object') {
        throw new Error('Token.position must be a HexCoord or null');
      }
      const pos = t.position as Record<string, unknown>;
      if (typeof pos.q !== 'number' || typeof pos.r !== 'number' || typeof pos.s !== 'number') {
        throw new Error('Token.position must have numeric q, r, s fields');
      }
    }
    if (t.type === 'monster') {
      if (typeof t.maxHp !== 'number') throw new Error('MonsterToken.maxHp must be a number');
      if (typeof t.currentHp !== 'number') throw new Error('MonsterToken.currentHp must be a number');
      if (typeof t.isDead !== 'boolean') throw new Error('MonsterToken.isDead must be a boolean');
    }
  }

  if (!Array.isArray(obj.initiativeOrder)) {
    throw new Error('Encounter.initiativeOrder must be an array');
  }

  for (const entry of obj.initiativeOrder) {
    if (entry === null || typeof entry !== 'object') {
      throw new Error('Each initiativeOrder entry must be an object');
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.tokenId !== 'string') throw new Error('InitiativeEntry.tokenId must be a string');
    if (typeof e.initiative !== 'number') throw new Error('InitiativeEntry.initiative must be a number');
  }

  if (typeof obj.currentTurnIndex !== 'number') {
    throw new Error('Encounter.currentTurnIndex must be a number');
  }

  if (typeof obj.round !== 'number') {
    throw new Error('Encounter.round must be a number');
  }

  if (typeof obj.notes !== 'string') {
    throw new Error('Encounter.notes must be a string');
  }

  if (typeof obj.gridCols !== 'number') {
    throw new Error('Encounter.gridCols must be a number');
  }

  if (typeof obj.gridRows !== 'number') {
    throw new Error('Encounter.gridRows must be a number');
  }

  if (obj.backgroundImageDataUrl !== null && typeof obj.backgroundImageDataUrl !== 'string') {
    throw new Error('Encounter.backgroundImageDataUrl must be a string or null');
  }

  return {
    tokens: obj.tokens as Token[],
    initiativeOrder: obj.initiativeOrder as InitiativeEntry[],
    currentTurnIndex: obj.currentTurnIndex as number,
    round: obj.round as number,
    notes: obj.notes as string,
    gridCols: obj.gridCols as number,
    gridRows: obj.gridRows as number,
    backgroundImageDataUrl: obj.backgroundImageDataUrl as string | null,
  };
}

export function saveEncounter(encounter: Encounter): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encounter));
  } catch (err) {
    console.warn('Failed to save encounter to localStorage:', err);
  }
}

export function loadEncounter(): Encounter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_ENCOUNTER };
    const parsed = JSON.parse(raw) as unknown;
    return validateEncounter(parsed);
  } catch (err) {
    console.warn('Failed to load encounter from localStorage:', err);
    return { ...DEFAULT_ENCOUNTER };
  }
}

export function exportJSON(encounter: Encounter): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `encounter-${timestamp}.json`;
  const json = JSON.stringify(encounter, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<Encounter> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          reject(new Error('Failed to read file contents'));
          return;
        }
        const parsed = JSON.parse(text) as unknown;
        const encounter = validateEncounter(parsed);
        resolve(encounter);
      } catch (err) {
        if (err instanceof SyntaxError) {
          reject(new Error('Invalid JSON file: ' + err.message));
        } else if (err instanceof Error) {
          reject(new Error('Invalid encounter file: ' + err.message));
        } else {
          reject(new Error('Unknown error while importing encounter'));
        }
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };
    reader.readAsText(file);
  });
}