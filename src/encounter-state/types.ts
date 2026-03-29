export type HexCoord = { q: number; r: number; s: number };

export type TokenType = 'player' | 'monster';

export interface BaseToken {
  id: string;
  name: string;
  type: TokenType;
  position: HexCoord | null;
  color: string;
}

export interface PlayerToken extends BaseToken {
  type: 'player';
}

export interface MonsterToken extends BaseToken {
  type: 'monster';
  maxHp: number;
  currentHp: number;
  isDead: boolean;
}

export type Token = PlayerToken | MonsterToken;

export interface InitiativeEntry {
  tokenId: string;
  initiative: number;
}

export interface Encounter {
  tokens: Token[];
  initiativeOrder: InitiativeEntry[];
  currentTurnIndex: number;
  round: number;
  notes: string;
  gridCols: number;
  gridRows: number;
  backgroundImageDataUrl: string | null;
}

export type Action =
  | { type: 'ADD_PLAYER_TOKEN'; payload: { name: string; color: string } }
  | { type: 'ADD_MONSTER_TOKENS'; payload: { name: string; quantity: number; maxHp: number; color: string } }
  | { type: 'UPDATE_TOKEN'; payload: { tokenId: string; name?: string; color?: string; maxHp?: number; currentHp?: number } }
  | { type: 'REMOVE_TOKEN'; payload: { tokenId: string } }
  | { type: 'MOVE_TOKEN'; payload: { tokenId: string; position: HexCoord } }
  | { type: 'DEAL_DAMAGE'; payload: { tokenId: string; amount: number } }
  | { type: 'HEAL_TOKEN'; payload: { tokenId: string; amount: number } }
  | { type: 'SET_HP'; payload: { tokenId: string; hp: number } }
  | { type: 'SET_INITIATIVE'; payload: { tokenId: string; initiative: number } }
  | { type: 'NEXT_TURN' }
  | { type: 'UPDATE_NOTES'; payload: { notes: string } }
  | { type: 'SET_BACKGROUND'; payload: { dataUrl: string | null } }
  | { type: 'RESET_ROUND' }
  | { type: 'RESET_ENCOUNTER' }
  | { type: 'LOAD_ENCOUNTER'; payload: { encounter: Encounter } };

export const DEFAULT_GRID_COLS: number = 20;
export const DEFAULT_GRID_ROWS: number = 15;

export const DEFAULT_ENCOUNTER: Encounter = {
  tokens: [],
  initiativeOrder: [],
  currentTurnIndex: 0,
  round: 1,
  notes: '',
  gridCols: DEFAULT_GRID_COLS,
  gridRows: DEFAULT_GRID_ROWS,
  backgroundImageDataUrl: null,
};