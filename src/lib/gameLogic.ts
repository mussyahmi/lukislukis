import { Player, Room } from '@/types/game';
import wordsData from '../../public/words.json';

export class GameLogic {
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static sanitizePlayerName(name: string): string {
    return name.trim().slice(0, 15);
  }

  static ensureUniqueName(name: string, existingPlayers: Record<string, Player>): string {
    const baseName = this.sanitizePlayerName(name);
    if (!baseName) return 'Pemain';

    const existingNames = Object.values(existingPlayers).map(p => p.name.toLowerCase());

    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }

    let counter = 1;
    let uniqueName = `${baseName}${counter}`;
    while (existingNames.includes(uniqueName.toLowerCase())) {
      counter++;
      uniqueName = `${baseName}${counter}`;
    }
    return uniqueName;
  }

  static getWordOptions(usedWords: string[]): string[] {
    const all = wordsData as string[];
    const available = all.filter(w => !usedWords.includes(w));
    // If all words have been used, reset and draw from the full list
    const pool = available.length >= 3 ? available : all;
    return this.shuffleArray(pool).slice(0, 3);
  }

  static checkGuess(guess: string, correctWord: string): { isCorrect: boolean; isNearMatch: boolean } {
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = correctWord.toLowerCase();

    if (normalizedGuess === normalizedWord) {
      return { isCorrect: true, isNearMatch: false };
    }

    // Levenshtein distance for near matches
    // Also require same first character to avoid false positives on short words
    const sameStart = normalizedGuess[0] === normalizedWord[0];
    const similarity = this.calculateSimilarity(normalizedGuess, normalizedWord);
    return { isCorrect: false, isNearMatch: sameStart && similarity >= 0.7 };
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  static getRevealedWord(word: string, revealedIndices: number[]): string {
    return word.split('').map((char, i) => {
      if (char === ' ') {
        return '  '; // Triple space untuk visual spacing yang lebih jelas
      }
      return revealedIndices.includes(i) ? char : '_';
    }).join(' ');
  }

  static getRandomLetterIndex(word: string, alreadyRevealed: number[]): number {
    // Get all indices that are letters (not spaces) and not already revealed
    const availableIndices = word.split('').map((char, i) => {
      if (char === ' ') return -1; // Skip spaces
      if (alreadyRevealed.includes(i)) return -1; // Skip already revealed
      return i;
    }).filter(i => i !== -1);

    if (availableIndices.length === 0) return -1;
    return availableIndices[Math.floor(Math.random() * availableIndices.length)];
  }

  static calculateGuessScore(timeRemaining: number, maxTime: number): number {
    const timeBonus = Math.floor((timeRemaining / maxTime) * 100);
    return 50 + timeBonus;
  }

  static calculateDrawerScore(correctGuessCount: number): number {
    if (correctGuessCount === 0) return 0;
    return correctGuessCount * 50;
  }

  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}