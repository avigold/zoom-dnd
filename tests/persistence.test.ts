import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  validateEncounter,
  saveEncounter,
  loadEncounter,
  exportJSON,
  importJSON,
} from '../src/encounter-state/persistence';
import { DEFAULT_ENCOUNTER, Encounter } from '../src/encounter-state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    tokens: [],
    initiativeOrder: [],
    currentTurnIndex: 0,
    round: 1,
    notes: '',
    gridCols: 10,
    gridRows: 8,
    backgroundImageDataUrl: null,
    ...overrides,
  };
}

function makePlayerToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'player-1',
    name: 'Aragorn',
    type: 'player',
    color: '#ff0000',
    position: null,
    ...overrides,
  };
}

function makeMonsterToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'monster-1',
    name: 'Goblin',
    type: 'monster',
    color: '#00ff00',
    position: null,
    maxHp: 10,
    currentHp: 10,
    isDead: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// STORAGE_KEY
// ---------------------------------------------------------------------------

describe('STORAGE_KEY', () => {
  it('is the expected string value', () => {
    expect(STORAGE_KEY).toBe('zoom-dnd-encounter');
  });
});

// ---------------------------------------------------------------------------
// validateEncounter
// ---------------------------------------------------------------------------

describe('validateEncounter', () => {
  describe('happy path', () => {
    it('accepts a minimal valid encounter with no tokens', () => {
      const raw = makeValidEncounter();
      const result = validateEncounter(raw);
      expect(result).toEqual(raw);
    });

    it('accepts an encounter with a player token at null position', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken()] as any });
      expect(() => validateEncounter(raw)).not.toThrow();
    });

    it('accepts an encounter with a player token at a hex position', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken({ position: { q: 1, r: -1, s: 0 } })] as any,
      });
      expect(() => validateEncounter(raw)).not.toThrow();
    });

    it('accepts an encounter with a monster token', () => {
      const raw = makeValidEncounter({ tokens: [makeMonsterToken()] as any });
      expect(() => validateEncounter(raw)).not.toThrow();
    });

    it('accepts an encounter with initiative entries', () => {
      const raw = makeValidEncounter({
        initiativeOrder: [{ tokenId: 'player-1', initiative: 18 }],
      });
      expect(() => validateEncounter(raw)).not.toThrow();
    });

    it('accepts backgroundImageDataUrl as a string', () => {
      const raw = makeValidEncounter({ backgroundImageDataUrl: 'data:image/png;base64,abc' });
      const result = validateEncounter(raw);
      expect(result.backgroundImageDataUrl).toBe('data:image/png;base64,abc');
    });

    it('accepts backgroundImageDataUrl as null', () => {
      const raw = makeValidEncounter({ backgroundImageDataUrl: null });
      const result = validateEncounter(raw);
      expect(result.backgroundImageDataUrl).toBeNull();
    });

    it('returns an object with all expected fields', () => {
      const raw = makeValidEncounter();
      const result = validateEncounter(raw);
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('initiativeOrder');
      expect(result).toHaveProperty('currentTurnIndex');
      expect(result).toHaveProperty('round');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('gridCols');
      expect(result).toHaveProperty('gridRows');
      expect(result).toHaveProperty('backgroundImageDataUrl');
    });

    it('accepts multiple tokens of mixed types', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken(), makeMonsterToken()] as any,
      });
      expect(() => validateEncounter(raw)).not.toThrow();
    });
  });

  describe('top-level validation errors', () => {
    it('throws when raw is null', () => {
      expect(() => validateEncounter(null)).toThrow('Encounter must be an object');
    });

    it('throws when raw is a string', () => {
      expect(() => validateEncounter('not an object')).toThrow('Encounter must be an object');
    });

    it('throws when raw is a number', () => {
      expect(() => validateEncounter(42)).toThrow('Encounter must be an object');
    });

    it('throws when raw is an array', () => {
      // Arrays are objects but tokens won't be an array on the array itself
      expect(() => validateEncounter([])).toThrow('Encounter.tokens must be an array');
    });

    it('throws when tokens is missing', () => {
      const raw = { ...makeValidEncounter(), tokens: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.tokens must be an array');
    });

    it('throws when tokens is not an array', () => {
      const raw = { ...makeValidEncounter(), tokens: 'not-array' };
      expect(() => validateEncounter(raw)).toThrow('Encounter.tokens must be an array');
    });

    it('throws when initiativeOrder is missing', () => {
      const raw = { ...makeValidEncounter(), initiativeOrder: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.initiativeOrder must be an array');
    });

    it('throws when initiativeOrder is not an array', () => {
      const raw = { ...makeValidEncounter(), initiativeOrder: {} };
      expect(() => validateEncounter(raw)).toThrow('Encounter.initiativeOrder must be an array');
    });

    it('throws when currentTurnIndex is missing', () => {
      const raw = { ...makeValidEncounter(), currentTurnIndex: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.currentTurnIndex must be a number');
    });

    it('throws when currentTurnIndex is a string', () => {
      const raw = { ...makeValidEncounter(), currentTurnIndex: '0' };
      expect(() => validateEncounter(raw)).toThrow('Encounter.currentTurnIndex must be a number');
    });

    it('throws when round is missing', () => {
      const raw = { ...makeValidEncounter(), round: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.round must be a number');
    });

    it('throws when notes is missing', () => {
      const raw = { ...makeValidEncounter(), notes: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.notes must be a string');
    });

    it('throws when notes is not a string', () => {
      const raw = { ...makeValidEncounter(), notes: 42 };
      expect(() => validateEncounter(raw)).toThrow('Encounter.notes must be a string');
    });

    it('throws when gridCols is missing', () => {
      const raw = { ...makeValidEncounter(), gridCols: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.gridCols must be a number');
    });

    it('throws when gridRows is missing', () => {
      const raw = { ...makeValidEncounter(), gridRows: undefined };
      expect(() => validateEncounter(raw)).toThrow('Encounter.gridRows must be a number');
    });

    it('throws when backgroundImageDataUrl is a number', () => {
      const raw = { ...makeValidEncounter(), backgroundImageDataUrl: 123 };
      expect(() => validateEncounter(raw)).toThrow(
        'Encounter.backgroundImageDataUrl must be a string or null'
      );
    });
  });

  describe('token validation errors', () => {
    it('throws when a token is null', () => {
      const raw = makeValidEncounter({ tokens: [null] as any });
      expect(() => validateEncounter(raw)).toThrow('Each token must be an object');
    });

    it('throws when a token is a string', () => {
      const raw = makeValidEncounter({ tokens: ['bad'] as any });
      expect(() => validateEncounter(raw)).toThrow('Each token must be an object');
    });

    it('throws when token.id is not a string', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken({ id: 123 })] as any });
      expect(() => validateEncounter(raw)).toThrow('Token.id must be a string');
    });

    it('throws when token.name is not a string', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken({ name: true })] as any });
      expect(() => validateEncounter(raw)).toThrow('Token.name must be a string');
    });

    it('throws when token.type is invalid', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken({ type: 'npc' })] as any });
      expect(() => validateEncounter(raw)).toThrow(
        "Token.type must be 'player' or 'monster', got: npc"
      );
    });

    it('throws when token.color is not a string', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken({ color: 0xff0000 })] as any });
      expect(() => validateEncounter(raw)).toThrow('Token.color must be a string');
    });

    it('throws when token.position is undefined', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken({ position: undefined })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('Token.position must be a HexCoord or null');
    });

    it('throws when token.position is not an object', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken({ position: 'hex' })] as any });
      expect(() => validateEncounter(raw)).toThrow('Token.position must be a HexCoord or null');
    });

    it('throws when token.position has non-numeric q', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken({ position: { q: 'a', r: 0, s: 0 } })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow(
        'Token.position must have numeric q, r, s fields'
      );
    });

    it('throws when token.position has non-numeric r', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken({ position: { q: 0, r: null, s: 0 } })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow(
        'Token.position must have numeric q, r, s fields'
      );
    });

    it('throws when token.position has non-numeric s', () => {
      const raw = makeValidEncounter({
        tokens: [makePlayerToken({ position: { q: 0, r: 0, s: undefined } })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow(
        'Token.position must have numeric q, r, s fields'
      );
    });

    it('throws when monster token is missing maxHp', () => {
      const raw = makeValidEncounter({
        tokens: [makeMonsterToken({ maxHp: undefined })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('MonsterToken.maxHp must be a number');
    });

    it('throws when monster token is missing currentHp', () => {
      const raw = makeValidEncounter({
        tokens: [makeMonsterToken({ currentHp: undefined })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('MonsterToken.currentHp must be a number');
    });

    it('throws when monster token is missing isDead', () => {
      const raw = makeValidEncounter({
        tokens: [makeMonsterToken({ isDead: undefined })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('MonsterToken.isDead must be a boolean');
    });

    it('throws when monster token isDead is not a boolean', () => {
      const raw = makeValidEncounter({
        tokens: [makeMonsterToken({ isDead: 'false' })] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('MonsterToken.isDead must be a boolean');
    });

    it('does not require maxHp/currentHp/isDead on player tokens', () => {
      const raw = makeValidEncounter({ tokens: [makePlayerToken()] as any });
      expect(() => validateEncounter(raw)).not.toThrow();
    });
  });

  describe('initiativeOrder validation errors', () => {
    it('throws when an initiative entry is null', () => {
      const raw = makeValidEncounter({ initiativeOrder: [null] as any });
      expect(() => validateEncounter(raw)).toThrow('Each initiativeOrder entry must be an object');
    });

    it('throws when an initiative entry has no tokenId', () => {
      const raw = makeValidEncounter({
        initiativeOrder: [{ tokenId: 123, initiative: 15 }] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('InitiativeEntry.tokenId must be a string');
    });

    it('throws when an initiative entry has non-numeric initiative', () => {
      const raw = makeValidEncounter({
        initiativeOrder: [{ tokenId: 'p1', initiative: '15' }] as any,
      });
      expect(() => validateEncounter(raw)).toThrow('InitiativeEntry.initiative must be a number');
    });
  });
});

// ---------------------------------------------------------------------------
// saveEncounter / loadEncounter
// ---------------------------------------------------------------------------

describe('saveEncounter and loadEncounter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves an encounter and loads it back correctly', () => {
    const encounter = makeValidEncounter({ round: 3, notes: 'Test notes' });
    saveEncounter(encounter);
    const loaded = loadEncounter();
    expect(loaded).toEqual(encounter);
  });

  it('saves the encounter under STORAGE_KEY', () => {
    const encounter = makeValidEncounter();
    saveEncounter(encounter);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(encounter);
  });

  it('returns DEFAULT_ENCOUNTER when localStorage is empty', () => {
    const loaded = loadEncounter();
    expect(loaded).toEqual(DEFAULT_ENCOUNTER);
  });

  it('returns DEFAULT_ENCOUNTER when stored JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {{{');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loaded = loadEncounter();
    expect(loaded).toEqual(DEFAULT_ENCOUNTER);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('returns DEFAULT_ENCOUNTER when stored data fails schema validation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens: 'bad' }));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loaded = loadEncounter();
    expect(loaded).toEqual(DEFAULT_ENCOUNTER);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('does not throw when localStorage.setItem fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => saveEncounter(makeValidEncounter())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs a warning when save fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveEncounter(makeValidEncounter());
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save'),
      expect.any(Error)
    );
  });

  it('preserves tokens with positions when round-tripping', () => {
    const encounter = makeValidEncounter({
      tokens: [makePlayerToken({ position: { q: 2, r: -1, s: -1 } })] as any,
    });
    saveEncounter(encounter);
    const loaded = loadEncounter();
    expect(loaded.tokens[0]).toMatchObject({ position: { q: 2, r: -1, s: -1 } });
  });

  it('preserves monster tokens when round-tripping', () => {
    const encounter = makeValidEncounter({
      tokens: [makeMonsterToken({ currentHp: 5, isDead: false })] as any,
    });
    saveEncounter(encounter);
    const loaded = loadEncounter();
    expect(loaded.tokens[0]).toMatchObject({ maxHp: 10, currentHp: 5, isDead: false });
  });

  it('returns a copy of DEFAULT_ENCOUNTER, not the same reference', () => {
    const loaded = loadEncounter();
    expect(loaded).not.toBe(DEFAULT_ENCOUNTER);
  });

  it('overwrites a previous save with a new one', () => {
    saveEncounter(makeValidEncounter({ round: 1 }));
    saveEncounter(makeValidEncounter({ round: 5 }));
    const loaded = loadEncounter();
    expect(loaded.round).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// exportJSON
// ---------------------------------------------------------------------------

describe('exportJSON', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    mockAnchor = { href: '', download: '', click: vi.fn() };
    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchor as unknown as HTMLElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob and object URL', () => {
    exportJSON(makeValidEncounter());
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('sets href on the anchor element', () => {
    exportJSON(makeValidEncounter());
    expect(mockAnchor.href).toBe('blob:http://localhost/fake-url');
  });

  it('sets a download filename matching encounter-<timestamp>.json pattern', () => {
    exportJSON(makeValidEncounter());
    expect(mockAnchor.download).toMatch(/^encounter-.+\.json$/);
  });

  it('clicks the anchor element to trigger download', () => {
    exportJSON(makeValidEncounter());
    expect(mockAnchor.click).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after clicking', () => {
    exportJSON(makeValidEncounter());
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-url');
  });

  it('creates an anchor element', () => {
    exportJSON(makeValidEncounter());
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('exports valid JSON that can be parsed back', () => {
    let capturedBlob: Blob | undefined;
    createObjectURLMock.mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:fake';
    });

    const encounter = makeValidEncounter({ round: 7, notes: 'export test' });
    exportJSON(encounter);

    expect(capturedBlob).toBeDefined();
    return capturedBlob!.text().then((text) => {
      const parsed = JSON.parse(text);
      expect(parsed.round).toBe(7);
      expect(parsed.notes).toBe('export test');
    });
  });

  it('exports pretty-printed JSON (with indentation)', () => {
    let capturedBlob: Blob | undefined;
    createObjectURLMock.mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:fake';
    });

    exportJSON(makeValidEncounter());

    return capturedBlob!.text().then((text) => {
      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});

// ---------------------------------------------------------------------------
// importJSON
// ---------------------------------------------------------------------------

describe('importJSON', () => {
  function makeFile(content: string, name = 'encounter.json'): File {
    return new File([content], name, { type: 'application/json' });
  }

  it('resolves with a valid encounter from a well-formed JSON file', async () => {
    const encounter = makeValidEncounter({ round: 2, notes: 'imported' });
    const file = makeFile(JSON.stringify(encounter));
    const result = await importJSON(file);
    expect(result).toEqual(encounter);
  });

  it('resolves with an encounter containing tokens', async () => {
    const encounter = makeValidEncounter({
      tokens: [makePlayerToken(), makeMonsterToken()] as any,
    });
    const file = makeFile(JSON.stringify(encounter));
    const result = await importJSON(file);
    expect(result.tokens).toHaveLength(2);
  });

  it('rejects with a descriptive error for invalid JSON', async () => {
    const file = makeFile('{ not valid json }}}');
    await expect(importJSON(file)).rejects.toThrow(/Invalid JSON file/);
  });

  it('rejects with a descriptive error when schema validation fails', async () => {
    const file = makeFile(JSON.stringify({ tokens: 'bad', round: 1 }));
    await expect(importJSON(file)).rejects.toThrow(/Invalid encounter file/);
  });

  it('rejects with a descriptive error when tokens array contains invalid token', async () => {
    const bad = { ...makeValidEncounter(), tokens: [{ id: 123 }] };
    const file = makeFile(JSON.stringify(bad));
    await expect(importJSON(file)).rejects.toThrow(/Invalid encounter file/);
  });

  it('rejects when file read fails', async () => {
    const file = makeFile('{}');
    // Override FileReader to simulate onerror
    const originalFileReader = global.FileReader;
    class ErrorFileReader {
      onload: ((e: ProgressEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 0);
      }
    }
    global.FileReader = ErrorFileReader as any;

    await expect(importJSON(file)).rejects.toThrow('Failed to read the file');

    global.FileReader = originalFileReader;
  });

  it('rejects when file result is not a string', async () => {
    const file = makeFile('{}');
    const originalFileReader = global.FileReader;

    class NullResultFileReader {
      onload: ((e: { target: { result: null } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          if (this.onload) this.onload({ target: { result: null } });
        }, 0);
      }
    }
    global.FileReader = NullResultFileReader as any;

    await expect(importJSON(file)).rejects.toThrow(/Invalid encounter file|Failed to read file/);

    global.FileReader = originalFileReader;
  });

  it('resolves with backgroundImageDataUrl preserved', async () => {
    const encounter = makeValidEncounter({ backgroundImageDataUrl: 'data:image/png;base64,abc' });
    const file = makeFile(JSON.stringify(encounter));
    const result = await importJSON(file);
    expect(result.backgroundImageDataUrl).toBe('data:image/png;base64,abc');
  });

  it('resolves with initiative order preserved', async () => {
    const encounter = makeValidEncounter({
      initiativeOrder: [
        { tokenId: 'player-1', initiative: 20 },
        { tokenId: 'monster-1', initiative: 14 },
      ],
    });
    const file = makeFile(JSON.stringify(encounter));
    const result = await importJSON(file);
    expect(result.initiativeOrder).toHaveLength(2);
    expect(result.initiativeOrder[0].initiative).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Integration: exportJSON -> importJSON round-trip
// ---------------------------------------------------------------------------

describe('exportJSON / importJSON round-trip', () => {
  it('produces an encounter that can be imported back', async () => {
    let capturedBlob: Blob | undefined;
    const createObjectURLMock = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:fake';
    });
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

    const original = makeValidEncounter({
      round: 4,
      notes: 'round-trip test',
      tokens: [makePlayerToken(), makeMonsterToken()] as any,
      initiativeOrder: [{ tokenId: 'player-1', initiative: 18 }],
    });

    exportJSON(original);

    const text = await capturedBlob!.text();
    const file = new File([text], 'encounter.json', { type: 'application/json' });
    const imported = await importJSON(file);

    expect(imported).toEqual(original);

    vi.restoreAllMocks();
  });
});