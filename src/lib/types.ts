export type Action =
  | 'look'
  | 'take'
  | 'open'
  | 'unlock'
  | 'hint'
  | 'inventory'
  | 'unknown';

export interface Intent {
  action: Action;
  object: string;
  secondaryObject?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  isLocked?: boolean;
  isTaken?: boolean;
  isHidden?: boolean; // 아이템이 숨겨져 있는지 여부
  canBeTaken?: boolean;
  unlocks?: string;
  contains?: string[]; // 아이템이 다른 아이템을 포함하는지 여부
  clue?: {
    content: string;
    isDiscovered: boolean;
  };
}

export interface GameState {
  items: {
    [key: string]: Item;
  };
  inventory: string[];
  roomDescription: string;
  lastMessage: string | null;
  isEscaped: boolean;
} 