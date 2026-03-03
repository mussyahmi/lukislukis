import { Player } from "@/types/game";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Player validation helpers
export const isValidPlayer = (player: any): player is Player => {
  return !!(
    player &&
    typeof player === 'object' &&
    'playerId' in player &&
    'name' in player &&
    typeof player.name === 'string' &&
    player.name.trim().length > 0
  );
};

export const getValidPlayers = (players: Record<string, any> | undefined): Player[] => {
  if (!players) return [];
  return Object.values(players).filter(isValidPlayer);
};