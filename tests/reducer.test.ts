import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encounterReducer } from '../src/encounter-state/reducer';
import {
  Encounter,
  Action,
  Token,
  MonsterToken,
  InitiativeEntry,
  DEFAULT_ENCOUNTER,
} from '../src/encounter-state/types';

vi.mock('uuid', () => ({
  v4: vi
    .fn()
    .mockReturnValueOnce('uuid-1')
    .mockReturnValueOnce('uuid-2')
    .mockReturnValueOnce('uuid-3')
    .mockReturnValueOnce('uuid-4')
    .mockReturnValueOnce('uuid-5')
    .mockReturnValueOnce('uuid-6')
    .mockReturnValueOnce('uuid-7')
    .mockReturnValueOnce('uuid-8')
    .mockReturnValueOnce('uuid-9')
    .mockReturnValueOnce('uuid-10'),
}));

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    tokens: [],
    initiativeOrder: [],
    currentTurnIndex: 0,
    round: 1,
    notes: '',
    gridCols: 20,
    gridRows: 15,
    backgroundImageDataUrl: null,
    ...overrides,
  };
}

function makePlayerToken(id: string, name = 'Player'): Token {
  return {
    id,
    name,
    type: 'player',
    position: null,
    color: '#ff0000',
  };
}

function makeMonsterToken(
  id: string,
  overrides: Partial<MonsterToken> = {}
): MonsterToken {
  return {
    id,
    name: 'Goblin',
    type: 'monster',
    position: null,
    color: '#00ff00',
    maxHp: 10,
    currentHp: 10,
    isDead: false,
    ...overrides,
  };
}

function makeInitiativeEntry(tokenId: string, initiative = 0): InitiativeEntry {
  return { tokenId, initiative };
}

describe('encounterReducer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { v4 } = vi.mocked(await import('uuid'));
    let counter = 0;
    const ids = [
      'uuid-1', 'uuid-2', 'uuid-3', 'uuid-4', 'uuid-5',
      'uuid-6', 'uuid-7', 'uuid-8', 'uuid-9', 'uuid-10',
    ];
    (v4 as ReturnType<typeof vi.fn>).mockImplementation(() => ids[counter++] ?? `uuid-${counter}`);
  });

  describe('ADD_PLAYER_TOKEN', () => {
    it('adds a player token to an empty encounter', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Aragorn', color: '#ff0000' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toMatchObject({
        name: 'Aragorn',
        type: 'player',
        color: '#ff0000',
        position: null,
      });
      expect(result.tokens[0].id).toBeDefined();
    });

    it('adds a player token to the initiative order', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Legolas', color: '#0000ff' },
      };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder).toHaveLength(1);
      expect(result.initiativeOrder[0].tokenId).toBe(result.tokens[0].id);
      expect(result.initiativeOrder[0].initiative).toBe(0);
    });

    it('appends a player token when tokens already exist', () => {
      const existingToken = makePlayerToken('existing-id', 'Gimli');
      const state = makeEncounter({
        tokens: [existingToken],
        initiativeOrder: [makeInitiativeEntry('existing-id', 15)],
      });
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Frodo', color: '#ffff00' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].id).toBe('existing-id');
      expect(result.initiativeOrder).toHaveLength(2);
      expect(result.initiativeOrder[0]).toEqual({ tokenId: 'existing-id', initiative: 15 });
    });

    it('does not modify other state fields', () => {
      const state = makeEncounter({ round: 3, currentTurnIndex: 1, notes: 'some notes' });
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Sam', color: '#aaaaaa' },
      };
      const result = encounterReducer(state, action);

      expect(result.round).toBe(3);
      expect(result.currentTurnIndex).toBe(1);
      expect(result.notes).toBe('some notes');
    });

    it('does not duplicate existing tokens in initiative order', () => {
      const existingToken = makePlayerToken('p1', 'Player1');
      const state = makeEncounter({
        tokens: [existingToken],
        initiativeOrder: [makeInitiativeEntry('p1', 10)],
      });
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Player2', color: '#cccccc' },
      };
      const result = encounterReducer(state, action);

      const p1Entries = result.initiativeOrder.filter((e) => e.tokenId === 'p1');
      expect(p1Entries).toHaveLength(1);
    });
  });

  describe('ADD_MONSTER_TOKENS', () => {
    it('adds a single monster token when quantity is 1', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Goblin', quantity: 1, maxHp: 7, color: '#008000' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toMatchObject({
        name: 'Goblin',
        type: 'monster',
        maxHp: 7,
        currentHp: 7,
        isDead: false,
        color: '#008000',
        position: null,
      });
    });

    it('names a single monster without a number suffix', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Orc', quantity: 1, maxHp: 15, color: '#333333' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0].name).toBe('Orc');
    });

    it('adds multiple monster tokens with numbered names', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Skeleton', quantity: 3, maxHp: 13, color: '#ffffff' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].name).toBe('Skeleton 1');
      expect(result.tokens[1].name).toBe('Skeleton 2');
      expect(result.tokens[2].name).toBe('Skeleton 3');
    });

    it('sets currentHp equal to maxHp for new monsters', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Troll', quantity: 2, maxHp: 84, color: '#555555' },
      };
      const result = encounterReducer(state, action);

      result.tokens.forEach((t) => {
        if (t.type === 'monster') {
          expect(t.currentHp).toBe(84);
          expect(t.maxHp).toBe(84);
          expect(t.isDead).toBe(false);
        }
      });
    });

    it('adds all new monsters to the initiative order', () => {
      const state = makeEncounter();
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Rat', quantity: 3, maxHp: 2, color: '#999999' },
      };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder).toHaveLength(3);
      result.tokens.forEach((t) => {
        const entry = result.initiativeOrder.find((e) => e.tokenId === t.id);
        expect(entry).toBeDefined();
        expect(entry?.initiative).toBe(0);
      });
    });

    it('appends monsters to existing tokens and initiative order', () => {
      const existingToken = makePlayerToken('player-1', 'Paladin');
      const state = makeEncounter({
        tokens: [existingToken],
        initiativeOrder: [makeInitiativeEntry('player-1', 20)],
      });
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Zombie', quantity: 2, maxHp: 22, color: '#aaaaaa' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(3);
      expect(result.initiativeOrder).toHaveLength(3);
      expect(result.initiativeOrder[0]).toEqual({ tokenId: 'player-1', initiative: 20 });
    });
  });

  describe('REMOVE_TOKEN', () => {
    it('removes the specified token from tokens list', () => {
      const t1 = makePlayerToken('t1', 'Player1');
      const t2 = makePlayerToken('t2', 'Player2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1'), makeInitiativeEntry('t2')],
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't1' } };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].id).toBe('t2');
    });

    it('removes the token from the initiative order', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1'), makeInitiativeEntry('t2')],
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't1' } };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder).toHaveLength(1);
      expect(result.initiativeOrder[0].tokenId).toBe('t2');
    });

    it('clamps currentTurnIndex when it would be out of bounds', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const t3 = makePlayerToken('t3');
      const state = makeEncounter({
        tokens: [t1, t2, t3],
        initiativeOrder: [
          makeInitiativeEntry('t1'),
          makeInitiativeEntry('t2'),
          makeInitiativeEntry('t3'),
        ],
        currentTurnIndex: 2,
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't3' } };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(1);
    });

    it('sets currentTurnIndex to 0 when all tokens are removed', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1')],
        currentTurnIndex: 0,
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't1' } };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(0);
      expect(result.tokens).toHaveLength(0);
      expect(result.initiativeOrder).toHaveLength(0);
    });

    it('does nothing meaningful when removing a non-existent token id', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1')],
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 'nonexistent' } };
      const result = encounterReducer(state, action);

      expect(result.tokens).toHaveLength(1);
      expect(result.initiativeOrder).toHaveLength(1);
    });

    it('does not change currentTurnIndex when it remains in bounds', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const t3 = makePlayerToken('t3');
      const state = makeEncounter({
        tokens: [t1, t2, t3],
        initiativeOrder: [
          makeInitiativeEntry('t1'),
          makeInitiativeEntry('t2'),
          makeInitiativeEntry('t3'),
        ],
        currentTurnIndex: 0,
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't3' } };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(0);
    });
  });

  describe('MOVE_TOKEN', () => {
    it('updates the position of the specified token', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({ tokens: [t1] });
      const action: Action = {
        type: 'MOVE_TOKEN',
        payload: { tokenId: 't1', position: { q: 2, r: 3 } },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0].position).toEqual({ q: 2, r: 3 });
    });

    it('only moves the specified token, not others', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({ tokens: [t1, t2] });
      const action: Action = {
        type: 'MOVE_TOKEN',
        payload: { tokenId: 't1', position: { q: 5, r: 5 } },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[1].position).toBeNull();
    });

    it('can set position to null (remove from board)', () => {
      const t1 = makePlayerToken('t1');
      t1.position = { q: 1, r: 1 };
      const state = makeEncounter({ tokens: [t1] });
      const action: Action = {
        type: 'MOVE_TOKEN',
        payload: { tokenId: 't1', position: null },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0].position).toBeNull();
    });

    it('does not affect other state when moving a token', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        round: 4,
        notes: 'important notes',
      });
      const action: Action = {
        type: 'MOVE_TOKEN',
        payload: { tokenId: 't1', position: { q: 0, r: 0 } },
      };
      const result = encounterReducer(state, action);

      expect(result.round).toBe(4);
      expect(result.notes).toBe('important notes');
    });
  });

  describe('DEAL_DAMAGE', () => {
    it('reduces currentHp by the damage amount', () => {
      const monster = makeMonsterToken('m1', { maxHp: 20, currentHp: 20 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 8 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(12);
      expect(resultToken.isDead).toBe(false);
    });

    it('clamps currentHp to 0 and marks isDead when damage exceeds hp', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 5 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 100 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(0);
      expect(resultToken.isDead).toBe(true);
    });

    it('marks isDead when damage exactly equals currentHp', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 10 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 10 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(0);
      expect(resultToken.isDead).toBe(true);
    });

    it('does not affect player tokens', () => {
      const player = makePlayerToken('p1');
      const state = makeEncounter({ tokens: [player] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'p1', amount: 5 },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0]).toEqual(player);
    });

    it('does not affect other monster tokens', () => {
      const m1 = makeMonsterToken('m1', { maxHp: 10, currentHp: 10 });
      const m2 = makeMonsterToken('m2', { maxHp: 10, currentHp: 10 });
      const state = makeEncounter({ tokens: [m1, m2] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 5 },
      };
      const result = encounterReducer(state, action);
      const m2Result = result.tokens[1] as MonsterToken;

      expect(m2Result.currentHp).toBe(10);
    });

    it('handles zero damage without changing hp', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 8 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 0 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(8);
      expect(resultToken.isDead).toBe(false);
    });
  });

  describe('HEAL_TOKEN', () => {
    it('increases currentHp by the heal amount', () => {
      const monster = makeMonsterToken('m1', { maxHp: 20, currentHp: 10 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'HEAL_TOKEN',
        payload: { tokenId: 'm1', amount: 5 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(15);
    });

    it('clamps currentHp to maxHp when healing would exceed it', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 8 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'HEAL_TOKEN',
        payload: { tokenId: 'm1', amount: 100 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(10);
    });

    it('clears isDead when healing a dead monster', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 0, isDead: true });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'HEAL_TOKEN',
        payload: { tokenId: 'm1', amount: 5 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(5);
      expect(resultToken.isDead).toBe(false);
    });

    it('does not affect player tokens', () => {
      const player = makePlayerToken('p1');
      const state = makeEncounter({ tokens: [player] });
      const action: Action = {
        type: 'HEAL_TOKEN',
        payload: { tokenId: 'p1', amount: 10 },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0]).toEqual(player);
    });

    it('handles zero heal amount without changing hp', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 5 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'HEAL_TOKEN',
        payload: { tokenId: 'm1', amount: 0 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(5);
    });
  });

  describe('SET_HP', () => {
    it('sets currentHp to the specified value', () => {
      const monster = makeMonsterToken('m1', { maxHp: 20, currentHp: 10 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'm1', hp: 15 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(15);
      expect(resultToken.isDead).toBe(false);
    });

    it('clamps hp to maxHp when value exceeds maxHp', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 5 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'm1', hp: 999 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(10);
    });

    it('clamps hp to 0 and marks isDead when value is negative', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 5 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'm1', hp: -5 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(0);
      expect(resultToken.isDead).toBe(true);
    });

    it('marks isDead when hp is set to 0', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 7 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'm1', hp: 0 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.currentHp).toBe(0);
      expect(resultToken.isDead).toBe(true);
    });

    it('clears isDead when hp is set above 0', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 0, isDead: true });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'm1', hp: 5 },
      };
      const result = encounterReducer(state, action);
      const resultToken = result.tokens[0] as MonsterToken;

      expect(resultToken.isDead).toBe(false);
    });

    it('does not affect player tokens', () => {
      const player = makePlayerToken('p1');
      const state = makeEncounter({ tokens: [player] });
      const action: Action = {
        type: 'SET_HP',
        payload: { tokenId: 'p1', hp: 5 },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens[0]).toEqual(player);
    });
  });

  describe('SET_INITIATIVE', () => {
    it('sets the initiative value for the specified token', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 0)],
      });
      const action: Action = {
        type: 'SET_INITIATIVE',
        payload: { tokenId: 't1', initiative: 18 },
      };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder[0].initiative).toBe(18);
    });

    it('only updates the specified token initiative', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1', 10), makeInitiativeEntry('t2', 15)],
      });
      const action: Action = {
        type: 'SET_INITIATIVE',
        payload: { tokenId: 't1', initiative: 20 },
      };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder[0].initiative).toBe(20);
      expect(result.initiativeOrder[1].initiative).toBe(15);
    });

    it('does not change tokens list', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 0)],
      });
      const action: Action = {
        type: 'SET_INITIATIVE',
        payload: { tokenId: 't1', initiative: 12 },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toEqual([t1]);
    });

    it('handles setting initiative for a non-existent token id gracefully', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 5)],
      });
      const action: Action = {
        type: 'SET_INITIATIVE',
        payload: { tokenId: 'nonexistent', initiative: 20 },
      };
      const result = encounterReducer(state, action);

      expect(result.initiativeOrder[0].initiative).toBe(5);
    });
  });

  describe('NEXT_TURN', () => {
    it('advances currentTurnIndex by 1', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1'), makeInitiativeEntry('t2')],
        currentTurnIndex: 0,
        round: 1,
      });
      const action: Action = { type: 'NEXT_TURN' };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(1);
      expect(result.round).toBe(1);
    });

    it('wraps currentTurnIndex to 0 and increments round at end of order', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1'), makeInitiativeEntry('t2')],
        currentTurnIndex: 1,
        round: 1,
      });
      const action: Action = { type: 'NEXT_TURN' };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(0);
      expect(result.round).toBe(2);
    });

    it('does nothing when initiative order is empty', () => {
      const state = makeEncounter({
        initiativeOrder: [],
        currentTurnIndex: 0,
        round: 1,
      });
      const action: Action = { type: 'NEXT_TURN' };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(0);
      expect(result.round).toBe(1);
    });

    it('handles single-token initiative order correctly', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1')],
        currentTurnIndex: 0,
        round: 2,
      });
      const action: Action = { type: 'NEXT_TURN' };
      const result = encounterReducer(state, action);

      expect(result.currentTurnIndex).toBe(0);
      expect(result.round).toBe(3);
    });

    it('does not change tokens or other state fields', () => {
      const t1 = makePlayerToken('t1');
      const t2 = makePlayerToken('t2');
      const state = makeEncounter({
        tokens: [t1, t2],
        initiativeOrder: [makeInitiativeEntry('t1'), makeInitiativeEntry('t2')],
        currentTurnIndex: 0,
        notes: 'test notes',
      });
      const action: Action = { type: 'NEXT_TURN' };
      const result = encounterReducer(state, action);

      expect(result.tokens).toEqual([t1, t2]);
      expect(result.notes).toBe('test notes');
    });
  });

  describe('UPDATE_NOTES', () => {
    it('updates the notes field', () => {
      const state = makeEncounter({ notes: '' });
      const action: Action = {
        type: 'UPDATE_NOTES',
        payload: { notes: 'The party enters the dungeon.' },
      };
      const result = encounterReducer(state, action);

      expect(result.notes).toBe('The party enters the dungeon.');
    });

    it('can clear notes by setting empty string', () => {
      const state = makeEncounter({ notes: 'Some existing notes' });
      const action: Action = {
        type: 'UPDATE_NOTES',
        payload: { notes: '' },
      };
      const result = encounterReducer(state, action);

      expect(result.notes).toBe('');
    });

    it('does not affect other state fields', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        round: 5,
        notes: 'old notes',
      });
      const action: Action = {
        type: 'UPDATE_NOTES',
        payload: { notes: 'new notes' },
      };
      const result = encounterReducer(state, action);

      expect(result.tokens).toEqual([t1]);
      expect(result.round).toBe(5);
    });
  });

  describe('SET_BACKGROUND', () => {
    it('sets the backgroundImageDataUrl', () => {
      const state = makeEncounter({ backgroundImageDataUrl: null });
      const action: Action = {
        type: 'SET_BACKGROUND',
        payload: { dataUrl: 'data:image/png;base64,abc123' },
      };
      const result = encounterReducer(state, action);

      expect(result.backgroundImageDataUrl).toBe('data:image/png;base64,abc123');
    });

    it('can update an existing background image', () => {
      const state = makeEncounter({ backgroundImageDataUrl: 'data:image/png;base64,old' });
      const action: Action = {
        type: 'SET_BACKGROUND',
        payload: { dataUrl: 'data:image/png;base64,new' },
      };
      const result = encounterReducer(state, action);

      expect(result.backgroundImageDataUrl).toBe('data:image/png;base64,new');
    });

    it('does not affect other state fields', () => {
      const state = makeEncounter({ round: 3, notes: 'notes here' });
      const action: Action = {
        type: 'SET_BACKGROUND',
        payload: { dataUrl: 'data:image/png;base64,xyz' },
      };
      const result = encounterReducer(state, action);

      expect(result.round).toBe(3);
      expect(result.notes).toBe('notes here');
    });
  });

  describe('RESET_ENCOUNTER', () => {
    it('resets state to DEFAULT_ENCOUNTER', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 15)],
        currentTurnIndex: 1,
        round: 5,
        notes: 'some notes',
        backgroundImageDataUrl: 'data:image/png;base64,abc',
      });
      const action: Action = { type: 'RESET_ENCOUNTER' };
      const result = encounterReducer(state, action);

      expect(result).toEqual({ ...DEFAULT_ENCOUNTER });
    });

    it('returns a new object, not the same reference as DEFAULT_ENCOUNTER', () => {
      const state = makeEncounter();
      const action: Action = { type: 'RESET_ENCOUNTER' };
      const result = encounterReducer(state, action);

      expect(result).not.toBe(DEFAULT_ENCOUNTER);
    });
  });

  describe('LOAD_ENCOUNTER', () => {
    it('replaces state with the loaded encounter', () => {
      const loadedEncounter: Encounter = {
        tokens: [makePlayerToken('loaded-player', 'Loaded Player')],
        initiativeOrder: [makeInitiativeEntry('loaded-player', 12)],
        currentTurnIndex: 0,
        round: 3,
        notes: 'loaded notes',
        backgroundImageDataUrl: 'data:image/png;base64,loaded',
      };
      const state = makeEncounter({ round: 1, notes: 'original notes' });
      const action: Action = {
        type: 'LOAD_ENCOUNTER',
        payload: { encounter: loadedEncounter },
      };
      const result = encounterReducer(state, action);

      expect(result).toEqual(loadedEncounter);
    });

    it('returns a new object, not the same reference as the payload', () => {
      const loadedEncounter: Encounter = makeEncounter({ round: 2 });
      const state = makeEncounter();
      const action: Action = {
        type: 'LOAD_ENCOUNTER',
        payload: { encounter: loadedEncounter },
      };
      const result = encounterReducer(state, action);

      expect(result).not.toBe(loadedEncounter);
    });

    it('completely replaces all previous state', () => {
      const previousState = makeEncounter({
        tokens: [makePlayerToken('old-token', 'Old Player')],
        round: 10,
        notes: 'old notes',
      });
      const newEncounter: Encounter = makeEncounter({ round: 1, notes: '' });
      const action: Action = {
        type: 'LOAD_ENCOUNTER',
        payload: { encounter: newEncounter },
      };
      const result = encounterReducer(previousState, action);

      expect(result.tokens).toHaveLength(0);
      expect(result.round).toBe(1);
      expect(result.notes).toBe('');
    });
  });

  describe('state immutability', () => {
    it('does not mutate the original state on ADD_PLAYER_TOKEN', () => {
      const state = makeEncounter();
      const originalTokens = state.tokens;
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'Test', color: '#000000' },
      };
      encounterReducer(state, action);

      expect(state.tokens).toBe(originalTokens);
      expect(state.tokens).toHaveLength(0);
    });

    it('does not mutate the original state on DEAL_DAMAGE', () => {
      const monster = makeMonsterToken('m1', { maxHp: 10, currentHp: 10 });
      const state = makeEncounter({ tokens: [monster] });
      const action: Action = {
        type: 'DEAL_DAMAGE',
        payload: { tokenId: 'm1', amount: 5 },
      };
      encounterReducer(state, action);

      const originalMonster = state.tokens[0] as MonsterToken;
      expect(originalMonster.currentHp).toBe(10);
    });

    it('does not mutate the original state on REMOVE_TOKEN', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1')],
      });
      const action: Action = { type: 'REMOVE_TOKEN', payload: { tokenId: 't1' } };
      encounterReducer(state, action);

      expect(state.tokens).toHaveLength(1);
      expect(state.initiativeOrder).toHaveLength(1);
    });
  });

  describe('buildInitiativeOrder integration', () => {
    it('preserves existing initiative values when adding new tokens', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 17)],
      });
      const action: Action = {
        type: 'ADD_PLAYER_TOKEN',
        payload: { name: 'NewPlayer', color: '#123456' },
      };
      const result = encounterReducer(state, action);

      const t1Entry = result.initiativeOrder.find((e) => e.tokenId === 't1');
      expect(t1Entry?.initiative).toBe(17);
    });

    it('new tokens are appended to initiative order with initiative 0', () => {
      const t1 = makePlayerToken('t1');
      const state = makeEncounter({
        tokens: [t1],
        initiativeOrder: [makeInitiativeEntry('t1', 17)],
      });
      const action: Action = {
        type: 'ADD_MONSTER_TOKENS',
        payload: { name: 'Bat', quantity: 1, maxHp: 4, color: '#000000' },
      };
      const result = encounterReducer(state, action);

      const newEntry = result.initiativeOrder.find((e) => e.tokenId !== 't1');
      expect(newEntry?.initiative).toBe(0);
    });
  });
});