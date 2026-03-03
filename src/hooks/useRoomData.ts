import { useState, useCallback } from 'react';
import { Room } from '@/types/game';
import type { Stroke } from '@/components/game/Canvas';

interface Message {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  isNearMatch: boolean;
  timestamp: number;
  icon?: string;
}

export function useRoomData() {
  const [room, setRoom] = useState<Room | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const updateRoomData = useCallback((data: Room) => {
    setRoom(data);

    if (data.canvas?.strokes) {
      setStrokes(Object.values(data.canvas.strokes));
    } else {
      setStrokes([]);
    }

    if (data.messages) {
      setMessages(Object.values(data.messages));
    } else {
      setMessages([]);
    }
  }, []);

  return {
    room,
    strokes,
    messages,
    updateRoomData,
  };
}