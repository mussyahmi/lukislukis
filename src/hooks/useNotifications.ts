import { useEffect, useRef } from 'react';
import { Room } from '@/types/game';

export function useNotifications(room: Room | null, playerId: string) {
  const prevGameState = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (!room) return;
    if (!document.hidden) {
      prevGameState.current = room.gameState;
      return;
    }

    const prev = prevGameState.current;
    prevGameState.current = room.gameState;

    const notify = (title: string, body: string) => {
      const n = new Notification(title, { body, icon: '/logo-192.png' });
      n.onclick = () => { window.focus(); n.close(); };
    };

    // Your turn to draw
    if (room.gameState === 'WORD_SELECTION' && room.currentDrawerId === playerId) {
      notify('LukisLukis — Giliran Anda!', 'Pilih perkataan untuk dilukis.');
      return;
    }

    // Game started (transition from WAITING)
    if (room.gameState === 'WORD_SELECTION' && prev === 'WAITING') {
      notify('LukisLukis — Permainan Bermula!', 'Sedia untuk melukis.');
      return;
    }

    // Game ended
    if (room.gameState === 'GAME_ENDED' && prev !== 'GAME_ENDED') {
      notify('LukisLukis — Permainan Tamat!', 'Lihat keputusan akhir.');
    }
  }, [room?.gameState, room?.currentDrawerId, playerId]);
}
