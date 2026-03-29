import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  DEFAULT_ENCOUNTER,
  type HexCoord,
  type TokenType,
  type BaseToken,
  type PlayerToken,
  type MonsterToken,
  type Token,
  type InitiativeEntry,
  type Encounter,
  type Action,
} from '../src/encounter-state/types';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makePlayerToken(overrides: Partial<PlayerToken> = {}): PlayerToken {
  return {
    id: 'player-1',
    label: 'P1',
    type: 'player',
    position: null,
    color: '#ff0000',
    ...overrides,
  };
}

function makeMonsterToken(overrides: Partial<MonsterToken> = {}): MonsterToken {
  return {
    id: 'monster-1',
    label: 'M1',
    type: 'monster',
    position: null,
    color: '#00ff00',
    maxHp: 20,
    currentHp: 20,
    isDead: false,
    ...overrides,
  };
}

function makeHexCoord(q = 0, r = 0, s = 0): HexCoord {
  return { q, r, s };
}

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    tokens: [],
    initiativeOrder: [],
    currentTurnIndex: 0,
    round: 1,
    notes: '',
    gridCols: DEFAULT_GRID_COLS,
    gridRows: DEFAULT_GRID_ROWS,
    backgroundImageDataUrl: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('DEFAULT_GRID_COLS', () => {
  it('equals 20', () => {
    expect(DEFAULT_GRID_COLS).toBe(20);
  });

  it('is a number', () => {
    expect(typeof DEFAULT_GRID_COLS).toBe('number');
  });
});

describe('DEFAULT_GRID_ROWS', () => {
  it('equals 15', () => {
    expect(DEFAULT_GRID_ROWS).toBe(15);
  });

  it('is a number', () => {
    expect(typeof DEFAULT_GRID_ROWS).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_ENCOUNTER
// ---------------------------------------------------------------------------

describe('DEFAULT_ENCOUNTER', () => {
  it('has an empty tokens array', () => {
    expect(DEFAULT_ENCOUNTER.tokens).toEqual([]);
  });

  it('has an empty initiativeOrder array', () => {
    expect(DEFAULT_ENCOUNTER.initiativeOrder).toEqual([]);
  });

  it('starts at currentTurnIndex 0', () => {
    expect(DEFAULT_ENCOUNTER.currentTurnIndex).toBe(0);
  });

  it('starts at round 1', () => {
    expect(DEFAULT_ENCOUNTER.round).toBe(1);
  });

  it('has an empty notes string', () => {
    expect(DEFAULT_ENCOUNTER.notes).toBe('');
  });

  it('uses DEFAULT_GRID_COLS for gridCols', () => {
    expect(DEFAULT_ENCOUNTER.gridCols).toBe(DEFAULT_GRID_COLS);
  });

  it('uses DEFAULT_GRID_ROWS for gridRows', () => {
    expect(DEFAULT_ENCOUNTER.gridRows).toBe(DEFAULT_GRID_ROWS);
  });

  it('has null backgroundImageDataUrl', () => {
    expect(DEFAULT_ENCOUNTER.backgroundImageDataUrl).toBeNull();
  });

  it('satisfies the Encounter interface shape', () => {
    const enc: Encounter = DEFAULT_ENCOUNTER;
    expect(enc).toBeDefined();
  });

  it('is a plain object (not a class instance)', () => {
    expect(Object.getPrototypeOf(DEFAULT_ENCOUNTER)).toBe(Object.prototype);
  });
});

// ---------------------------------------------------------------------------
// HexCoord shape
// ---------------------------------------------------------------------------

describe('HexCoord', () => {
  it('accepts zero coordinates', () => {
    const coord: HexCoord = makeHexCoord(0, 0, 0);
    expect(coord).toEqual({ q: 0, r: 0, s: 0 });
  });

  it('accepts positive coordinates', () => {
    const coord: HexCoord = makeHexCoord(3, 5, -8);
    expect(coord.q).toBe(3);
    expect(coord.r).toBe(5);
    expect(coord.s).toBe(-8);
  });

  it('accepts negative coordinates', () => {
    const coord: HexCoord = makeHexCoord(-1, -2, 3);
    expect(coord.q).toBe(-1);
    expect(coord.r).toBe(-2);
    expect(coord.s).toBe(3);
  });

  it('has exactly three numeric fields', () => {
    const coord: HexCoord = makeHexCoord(1, 2, 3);
    expect(typeof coord.q).toBe('number');
    expect(typeof coord.r).toBe('number');
    expect(typeof coord.s).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// PlayerToken
// ---------------------------------------------------------------------------

describe('PlayerToken', () => {
  it('has type "player"', () => {
    const token = makePlayerToken();
    expect(token.type).toBe('player');
  });

  it('can have a null position (not placed)', () => {
    const token = makePlayerToken({ position: null });
    expect(token.position).toBeNull();
  });

  it('can have a HexCoord position', () => {
    const position = makeHexCoord(2, 3, -5);
    const token = makePlayerToken({ position });
    expect(token.position).toEqual(position);
  });

  it('stores id, label, and color as strings', () => {
    const token = makePlayerToken({ id: 'abc', label: 'A1', color: '#123456' });
    expect(typeof token.id).toBe('string');
    expect(typeof token.label).toBe('string');
    expect(typeof token.color).toBe('string');
  });

  it('is assignable to the Token union type', () => {
    const token: Token = makePlayerToken();
    expect(token.type).toBe('player');
  });

  it('is assignable to BaseToken', () => {
    const token: BaseToken = makePlayerToken();
    expect(token).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MonsterToken
// ---------------------------------------------------------------------------

describe('MonsterToken', () => {
  it('has type "monster"', () => {
    const token = makeMonsterToken();
    expect(token.type).toBe('monster');
  });

  it('stores maxHp and currentHp as numbers', () => {
    const token = makeMonsterToken({ maxHp: 50, currentHp: 30 });
    expect(typeof token.maxHp).toBe('number');
    expect(typeof token.currentHp).toBe('number');
    expect(token.maxHp).toBe(50);
    expect(token.currentHp).toBe(30);
  });

  it('stores isDead as a boolean', () => {
    const alive = makeMonsterToken({ isDead: false });
    expect(alive.isDead).toBe(false);

    const dead = makeMonsterToken({ isDead: true });
    expect(dead.isDead).toBe(true);
  });

  it('can have a null position', () => {
    const token = makeMonsterToken({ position: null });
    expect(token.position).toBeNull();
  });

  it('can have a HexCoord position', () => {
    const position = makeHexCoord(1, -1, 0);
    const token = makeMonsterToken({ position });
    expect(token.position).toEqual(position);
  });

  it('is assignable to the Token union type', () => {
    const token: Token = makeMonsterToken();
    expect(token.type).toBe('monster');
  });

  it('is assignable to BaseToken', () => {
    const token: BaseToken = makeMonsterToken();
    expect(token).toBeDefined();
  });

  it('allows currentHp of 0 (fully depleted)', () => {
    const token = makeMonsterToken({ currentHp: 0, isDead: true });
    expect(token.currentHp).toBe(0);
    expect(token.isDead).toBe(true);
  });

  it('allows currentHp greater than maxHp (overhealed scenario)', () => {
    const token = makeMonsterToken({ maxHp: 20, currentHp: 25 });
    expect(token.currentHp).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Token discriminated union narrowing
// ---------------------------------------------------------------------------

describe('Token discriminated union', () => {
  it('narrows to PlayerToken when type is "player"', () => {
    const token: Token = makePlayerToken();
    if (token.type === 'player') {
      // TypeScript would enforce this; at runtime we just verify the type field
      expect(token.type).toBe('player');
    }
  });

  it('narrows to MonsterToken when type is "monster"', () => {
    const token: Token = makeMonsterToken({ maxHp: 10, currentHp: 5 });
    if (token.type === 'monster') {
      expect(token.maxHp).toBe(10);
      expect(token.currentHp).toBe(5);
    }
  });

  it('a mixed array of tokens preserves each token type', () => {
    const tokens: Token[] = [makePlayerToken(), makeMonsterToken()];
    expect(tokens[0].type).toBe('player');
    expect(tokens[1].type).toBe('monster');
  });
});

// ---------------------------------------------------------------------------
// InitiativeEntry
// ---------------------------------------------------------------------------

describe('InitiativeEntry', () => {
  it('stores tokenId and initiative', () => {
    const entry: InitiativeEntry = { tokenId: 'abc', initiative: 18 };
    expect(entry.tokenId).toBe('abc');
    expect(entry.initiative).toBe(18);
  });

  it('allows initiative of 0', () => {
    const entry: InitiativeEntry = { tokenId: 'xyz', initiative: 0 };
    expect(entry.initiative).toBe(0);
  });

  it('allows negative initiative', () => {
    const entry: InitiativeEntry = { tokenId: 'xyz', initiative: -3 };
    expect(entry.initiative).toBe(-3);
  });
});

// ---------------------------------------------------------------------------
// Encounter interface
// ---------------------------------------------------------------------------

describe('Encounter', () => {
  it('can hold multiple tokens', () => {
    const enc = makeEncounter({
      tokens: [makePlayerToken(), makeMonsterToken()],
    });
    expect(enc.tokens).toHaveLength(2);
  });

  it('can hold an initiativeOrder list', () => {
    const order: InitiativeEntry[] = [
      { tokenId: 'p1', initiative: 20 },
      { tokenId: 'm1', initiative: 15 },
    ];
    const enc = makeEncounter({ initiativeOrder: order });
    expect(enc.initiativeOrder).toHaveLength(2);
    expect(enc.initiativeOrder[0].initiative).toBe(20);
  });

  it('tracks currentTurnIndex', () => {
    const enc = makeEncounter({ currentTurnIndex: 3 });
    expect(enc.currentTurnIndex).toBe(3);
  });

  it('tracks round number', () => {
    const enc = makeEncounter({ round: 5 });
    expect(enc.round).toBe(5);
  });

  it('stores notes as a string', () => {
    const enc = makeEncounter({ notes: 'The dragon awakens.' });
    expect(enc.notes).toBe('The dragon awakens.');
  });

  it('stores gridCols and gridRows as numbers', () => {
    const enc = makeEncounter({ gridCols: 30, gridRows: 20 });
    expect(enc.gridCols).toBe(30);
    expect(enc.gridRows).toBe(20);
  });

  it('allows backgroundImageDataUrl to be null', () => {
    const enc = makeEncounter({ backgroundImageDataUrl: null });
    expect(enc.backgroundImageDataUrl).toBeNull();
  });

  it('allows backgroundImageDataUrl to be a data URL string', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    const enc = makeEncounter({ backgroundImageDataUrl: dataUrl });
    expect(enc.backgroundImageDataUrl).toBe(dataUrl);
  });
});

// ---------------------------------------------------------------------------
// Action discriminated union — structural checks at runtime
// ---------------------------------------------------------------------------

describe('Action discriminated union', () => {
  it('ADD_PLAYER_TOKEN action has correct shape', () => {
    const action: Action = {
      type: 'ADD_PLAYER_TOKEN',
      payload: { name: 'Aragorn', color: '#ff0000' },
    };
    expect(action.type).toBe('ADD_PLAYER_TOKEN');
    if (action.type === 'ADD_PLAYER_TOKEN') {
      expect(action.payload.name).toBe('Aragorn');
      expect(action.payload.color).toBe('#ff0000');
    }
  });

  it('ADD_MONSTER_TOKENS action has correct shape', () => {
    const action: Action = {
      type: 'ADD_MONSTER_TOKENS',
      payload: { name: 'Goblin', quantity: 3, maxHp: 10, color: '#00ff00' },
    };
    expect(action.type).toBe('ADD_MONSTER_TOKENS');
    if (action.type === 'ADD_MONSTER_TOKENS') {
      expect(action.payload.name).toBe('Goblin');
      expect(action.payload.quantity).toBe(3);
      expect(action.payload.maxHp).toBe(10);
      expect(action.payload.color).toBe('#00ff00');
    }
  });

  it('REMOVE_TOKEN action has correct shape', () => {
    const action: Action = {
      type: 'REMOVE_TOKEN',
      payload: { tokenId: 'token-99' },
    };
    expect(action.type).toBe('REMOVE_TOKEN');
    if (action.type === 'REMOVE_TOKEN') {
      expect(action.payload.tokenId).toBe('token-99');
    }
  });

  it('MOVE_TOKEN action has correct shape', () => {
    const position: HexCoord = { q: 1, r: -1, s: 0 };
    const action: Action = {
      type: 'MOVE_TOKEN',
      payload: { tokenId: 'token-1', position },
    };
    expect(action.type).toBe('MOVE_TOKEN');
    if (action.type === 'MOVE_TOKEN') {
      expect(action.payload.tokenId).toBe('token-1');
      expect(action.payload.position).toEqual(position);
    }
  });

  it('DEAL_DAMAGE action has correct shape', () => {
    const action: Action = {
      type: 'DEAL_DAMAGE',
      payload: { tokenId: 'token-2', amount: 5 },
    };
    expect(action.type).toBe('DEAL_DAMAGE');
    if (action.type === 'DEAL_DAMAGE') {
      expect(action.payload.amount).toBe(5);
    }
  });

  it('HEAL_TOKEN action has correct shape', () => {
    const action: Action = {
      type: 'HEAL_TOKEN',
      payload: { tokenId: 'token-3', amount: 8 },
    };
    expect(action.type).toBe('HEAL_TOKEN');
    if (action.type === 'HEAL_TOKEN') {
      expect(action.payload.amount).toBe(8);
    }
  });

  it('SET_HP action has correct shape', () => {
    const action: Action = {
      type: 'SET_HP',
      payload: { tokenId: 'token-4', hp: 15 },
    };
    expect(action.type).toBe('SET_HP');
    if (action.type === 'SET_HP') {
      expect(action.payload.hp).toBe(15);
    }
  });

  it('SET_INITIATIVE action has correct shape', () => {
    const action: Action = {
      type: 'SET_INITIATIVE',
      payload: { tokenId: 'token-5', initiative: 17 },
    };
    expect(action.type).toBe('SET_INITIATIVE');
    if (action.type === 'SET_INITIATIVE') {
      expect(action.payload.initiative).toBe(17);
    }
  });

  it('NEXT_TURN action has no payload', () => {
    const action: Action = { type: 'NEXT_TURN' };
    expect(action.type).toBe('NEXT_TURN');
    expect(Object.keys(action)).toEqual(['type']);
  });

  it('UPDATE_NOTES action has correct shape', () => {
    const action: Action = {
      type: 'UPDATE_NOTES',
      payload: { notes: 'Remember the traps.' },
    };
    expect(action.type).toBe('UPDATE_NOTES');
    if (action.type === 'UPDATE_NOTES') {
      expect(action.payload.notes).toBe('Remember the traps.');
    }
  });

  it('SET_BACKGROUND action accepts a data URL string', () => {
    const action: Action = {
      type: 'SET_BACKGROUND',
      payload: { dataUrl: 'data:image/png;base64,xyz' },
    };
    expect(action.type).toBe('SET_BACKGROUND');
    if (action.type === 'SET_BACKGROUND') {
      expect(action.payload.dataUrl).toBe('data:image/png;base64,xyz');
    }
  });

  it('SET_BACKGROUND action accepts null dataUrl', () => {
    const action: Action = {
      type: 'SET_BACKGROUND',
      payload: { dataUrl: null },
    };
    expect(action.type).toBe('SET_BACKGROUND');
    if (action.type === 'SET_BACKGROUND') {
      expect(action.payload.dataUrl).toBeNull();
    }
  });

  it('RESET_ENCOUNTER action has no payload', () => {
    const action: Action = { type: 'RESET_ENCOUNTER' };
    expect(action.type).toBe('RESET_ENCOUNTER');
    expect(Object.keys(action)).toEqual(['type']);
  });

  it('LOAD_ENCOUNTER action carries a full Encounter in payload', () => {
    const encounter: Encounter = makeEncounter({ round: 3, notes: 'loaded' });
    const action: Action = {
      type: 'LOAD_ENCOUNTER',
      payload: { encounter },
    };
    expect(action.type).toBe('LOAD_ENCOUNTER');
    if (action.type === 'LOAD_ENCOUNTER') {
      expect(action.payload.encounter.round).toBe(3);
      expect(action.payload.encounter.notes).toBe('loaded');
    }
  });

  it('all action type strings are unique', () => {
    const actionTypes = [
      'ADD_PLAYER_TOKEN',
      'ADD_MONSTER_TOKENS',
      'REMOVE_TOKEN',
      'MOVE_TOKEN',
      'DEAL_DAMAGE',
      'HEAL_TOKEN',
      'SET_HP',
      'SET_INITIATIVE',
      'NEXT_TURN',
      'UPDATE_NOTES',
      'SET_BACKGROUND',
      'RESET_ENCOUNTER',
      'LOAD_ENCOUNTER',
    ];
    const uniqueTypes = new Set(actionTypes);
    expect(uniqueTypes.size).toBe(actionTypes.length);
  });
});

// ---------------------------------------------------------------------------
// Structural integrity — DEFAULT_ENCOUNTER is independent of mutations
// ---------------------------------------------------------------------------

describe('DEFAULT_ENCOUNTER immutability expectations', () => {
  it('does not share array references between accesses', () => {
    // Shallow copy to simulate what a reducer would do
    const copy = { ...DEFAULT_ENCOUNTER, tokens: [...DEFAULT_ENCOUNTER.tokens] };
    copy.tokens.push(makePlayerToken());
    // The original should still be empty
    expect(DEFAULT_ENCOUNTER.tokens).toHaveLength(0);
  });

  it('round is always 1 in the default encounter', () => {
    expect(DEFAULT_ENCOUNTER.round).toBe(1);
  });

  it('currentTurnIndex is always 0 in the default encounter', () => {
    expect(DEFAULT_ENCOUNTER.currentTurnIndex).toBe(0);
  });
});