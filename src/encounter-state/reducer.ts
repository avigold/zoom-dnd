import { v4 as uuidv4 } from 'uuid';
import {
  Action,
  Encounter,
  InitiativeEntry,
  MonsterToken,
  Token,
  DEFAULT_ENCOUNTER,
} from './types';

function applyDamage(token: MonsterToken, amount: number): MonsterToken {
  const newHp = Math.max(0, Math.min(token.maxHp, token.currentHp - amount));
  return {
    ...token,
    currentHp: newHp,
    isDead: newHp === 0,
  };
}

function buildInitiativeOrder(
  tokens: Token[],
  existing: InitiativeEntry[]
): InitiativeEntry[] {
  const existingIds = new Set(existing.map((e) => e.tokenId));
  const newEntries: InitiativeEntry[] = tokens
    .filter((t) => !existingIds.has(t.id))
    .map((t) => ({ tokenId: t.id, initiative: 0 }));
  return [...existing, ...newEntries];
}

function nextTurn(state: Encounter): Encounter {
  const count = state.initiativeOrder.length;
  if (count === 0) return state;
  const nextIndex = state.currentTurnIndex + 1;
  if (nextIndex >= count) {
    return {
      ...state,
      currentTurnIndex: 0,
      round: state.round + 1,
    };
  }
  return {
    ...state,
    currentTurnIndex: nextIndex,
  };
}

export function encounterReducer(state: Encounter, action: Action): Encounter {
  switch (action.type) {
    case 'ADD_PLAYER_TOKEN': {
      const token: Token = {
        id: uuidv4(),
        name: action.payload.name,
        type: 'player',
        position: null,
        color: action.payload.color,
      };
      const tokens = [...state.tokens, token];
      return {
        ...state,
        tokens,
        initiativeOrder: buildInitiativeOrder(tokens, state.initiativeOrder),
      };
    }

    case 'ADD_MONSTER_TOKENS': {
      const { name, quantity, maxHp, color } = action.payload;
      const newTokens: Token[] = Array.from({ length: quantity }, (_, i) => ({
        id: uuidv4(),
        name: quantity === 1 ? name : `${name} ${i + 1}`,
        type: 'monster' as const,
        position: null,
        color,
        maxHp,
        currentHp: maxHp,
        isDead: false,
      }));
      const tokens = [...state.tokens, ...newTokens];
      return {
        ...state,
        tokens,
        initiativeOrder: buildInitiativeOrder(tokens, state.initiativeOrder),
      };
    }

    case 'UPDATE_TOKEN': {
      const { tokenId, name, color, maxHp, currentHp } = action.payload;
      return {
        ...state,
        tokens: state.tokens.map((t) => {
          if (t.id !== tokenId) return t;
          const updated = { ...t };
          if (name !== undefined) updated.name = name;
          if (color !== undefined) updated.color = color;
          if (t.type === 'monster') {
            const m = updated as typeof t;
            if (maxHp !== undefined) m.maxHp = maxHp;
            if (currentHp !== undefined) {
              m.currentHp = Math.max(0, Math.min(currentHp, m.maxHp));
            }
            m.isDead = m.currentHp === 0;
          }
          return updated;
        }),
      };
    }

    case 'REMOVE_TOKEN': {
      const { tokenId } = action.payload;
      const tokens = state.tokens.filter((t) => t.id !== tokenId);
      const initiativeOrder = state.initiativeOrder.filter(
        (e) => e.tokenId !== tokenId
      );
      // Clamp currentTurnIndex in case it's now out of bounds
      const currentTurnIndex =
        initiativeOrder.length === 0
          ? 0
          : Math.min(state.currentTurnIndex, initiativeOrder.length - 1);
      return {
        ...state,
        tokens,
        initiativeOrder,
        currentTurnIndex,
      };
    }

    case 'MOVE_TOKEN': {
      const { tokenId, position } = action.payload;
      return {
        ...state,
        tokens: state.tokens.map((t) =>
          t.id === tokenId ? { ...t, position } : t
        ),
      };
    }

    case 'DEAL_DAMAGE': {
      const { tokenId, amount } = action.payload;
      return {
        ...state,
        tokens: state.tokens.map((t) =>
          t.id === tokenId && t.type === 'monster'
            ? applyDamage(t, amount)
            : t
        ),
      };
    }

    case 'HEAL_TOKEN': {
      const { tokenId, amount } = action.payload;
      return {
        ...state,
        tokens: state.tokens.map((t) => {
          if (t.id !== tokenId || t.type !== 'monster') return t;
          const newHp = Math.min(t.maxHp, t.currentHp + amount);
          return {
            ...t,
            currentHp: newHp,
            isDead: newHp === 0,
          };
        }),
      };
    }

    case 'SET_HP': {
      const { tokenId, hp } = action.payload;
      return {
        ...state,
        tokens: state.tokens.map((t) => {
          if (t.id !== tokenId || t.type !== 'monster') return t;
          const newHp = Math.max(0, Math.min(t.maxHp, hp));
          return {
            ...t,
            currentHp: newHp,
            isDead: newHp === 0,
          };
        }),
      };
    }

    case 'SET_INITIATIVE': {
      const { tokenId, initiative } = action.payload;
      return {
        ...state,
        initiativeOrder: state.initiativeOrder.map((e) =>
          e.tokenId === tokenId ? { ...e, initiative } : e
        ),
      };
    }

    case 'NEXT_TURN': {
      return nextTurn(state);
    }

    case 'UPDATE_NOTES': {
      return {
        ...state,
        notes: action.payload.notes,
      };
    }

    case 'SET_BACKGROUND': {
      return {
        ...state,
        backgroundImageDataUrl: action.payload.dataUrl,
      };
    }

    case 'RESET_ROUND': {
      return {
        ...state,
        round: 1,
        currentTurnIndex: 0,
      };
    }

    case 'RESET_ENCOUNTER': {
      return { ...DEFAULT_ENCOUNTER };
    }

    case 'LOAD_ENCOUNTER': {
      return { ...action.payload.encounter };
    }
  }
}