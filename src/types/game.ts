export type GameState = 'WAITING' | 'WORD_SELECTION' | 'DRAWING' | 'REVEAL' | 'ROUND_END' | 'GAME_ENDED';

export interface Player {
  playerId: string;
  name: string;
  score: number;
  correctGuesses: number;
  isDrawing: boolean;
  hasGuessed: boolean;
  lastActive: number;
  joinedAt: number;
  votedToKick: Record<string, boolean>;
  lastRoundPoints?: number;
  isDisconnected?: boolean;
  disconnectedAt?: number;
}

export interface Room {
  roomCode: string;
  createdAt: number;
  adminId: string;
  hasPassword: boolean;
  password?: string;
  maxPlayers: number;
  gameState: GameState;
  currentDrawerId: string | null;
  currentWord: string | null;
  currentRound: number;
  totalRounds: number;
  turnStartTime: number | null;
  turnDuration: number;
  wordSelectionTime: number;
  revealedLetters: number[];
  usedWords: string[];
  players: Record<string, Player>;
  drawOrder: string[];
  currentDrawerIndex: number;
  canvas?: {
    strokes: Record<string, any>;
    cleared?: boolean;
  };
  messages?: Record<string, any>;
  kickedPlayers?: Record<string, boolean>;
}