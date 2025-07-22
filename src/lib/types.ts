export type Action = 'look' | 'take' | 'open' | 'use' | 'unlock' | 'enter' | 'hint';

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
  canBeTaken?: boolean;
  isTaken?: boolean;
  clue?: {
    content: string;
    isDiscovered: boolean;
  };
  unlocks?: string;
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