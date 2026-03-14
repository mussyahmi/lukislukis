import { useEffect } from 'react';
import { ref, update, push, set, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Room, Player } from '@/types/game';

export function useDisconnectCleanup(
  room: Room | null,
  playerId: string,
  roomCode: string
) {
  useEffect(() => {
    if (!room || !playerId) return;

    const cleanupInterval = setInterval(async () => {
      if (!room.players) return;

      const now = Date.now();
      const DISCONNECT_THRESHOLD = 10000;

      const disconnectedPlayers: string[] = [];

      Object.entries(room.players).forEach(([pid, player]) => {
        const typedPlayer = player as Player;

        if (typedPlayer.isDisconnected && typedPlayer.disconnectedAt) {
          const disconnectDuration = now - typedPlayer.disconnectedAt;

          if (disconnectDuration > DISCONNECT_THRESHOLD) {
            disconnectedPlayers.push(pid);
          }
        }
      });

      if (disconnectedPlayers.length > 0) {
        const activePlayerIds = Object.keys(room.players)
          .filter(pid => !disconnectedPlayers.includes(pid))
          .sort();

        // Prefer admin as cleanup handler to avoid race condition between clients.
        // Fall back to first active player only when admin is not present.
        const adminIsActive = activePlayerIds.includes(room.adminId);
        const shouldHandle = adminIsActive
          ? playerId === room.adminId
          : activePlayerIds.length > 0 && activePlayerIds[0] === playerId;

        if (shouldHandle) {
          const updates: any = {};
          const messagesToSend: any[] = [];

          disconnectedPlayers.forEach(pid => {
            const player = room.players[pid] as Player;
            updates[`rooms/${roomCode}/players/${pid}`] = null;

            messagesToSend.push({
              text: `${player.name} terputus sambungan`,
              icon: 'user-minus',
            });
          });

          const activePlayers = Object.keys(room.players).filter(
            pid => !disconnectedPlayers.includes(pid)
          );

          // If no players remain, delete the room entirely
          if (activePlayers.length === 0) {
            await remove(ref(database, `rooms/${roomCode}`));
            return;
          }

          updates[`rooms/${roomCode}/drawOrder`] = activePlayers;

          const drawerDisconnected = room.currentDrawerId && disconnectedPlayers.includes(room.currentDrawerId);

          if (drawerDisconnected) {
            if (room.gameState === 'WORD_SELECTION' || room.gameState === 'DRAWING') {
              const currentIndex = room.currentDrawerIndex;

              if (currentIndex >= activePlayers.length - 1) {
                if (room.currentRound < room.totalRounds) {
                  updates[`rooms/${roomCode}/gameState`] = 'ROUND_END';
                  updates[`rooms/${roomCode}/turnStartTime`] = Date.now();
                } else {
                  updates[`rooms/${roomCode}/gameState`] = 'GAME_ENDED';
                }
              } else {
                const nextDrawerId = activePlayers[currentIndex < activePlayers.length ? currentIndex : 0];
                updates[`rooms/${roomCode}/currentDrawerId`] = nextDrawerId;
                updates[`rooms/${roomCode}/currentDrawerIndex`] = currentIndex;
                updates[`rooms/${roomCode}/gameState`] = 'WORD_SELECTION';
                updates[`rooms/${roomCode}/turnStartTime`] = Date.now();
              }

              messagesToSend.push({
                text: `Pelukis terputus sambungan`,
                icon: 'skip-forward',
              });
            }
          }

          if (activePlayers.length < 3 && room.gameState !== 'WAITING') {
            updates[`rooms/${roomCode}/gameState`] = 'GAME_ENDED';

            messagesToSend.push({
              text: `Pemain tidak mencukupi - permainan tamat`,
              icon: 'alert-triangle',
            });
          }

          for (const msg of messagesToSend) {
            const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
            await set(msgRef, {
              id: msgRef.key,
              playerId: 'system',
              playerName: 'Sistem',
              text: msg.text,
              isCorrect: false,
              isNearMatch: false,
              timestamp: Date.now(),
              icon: msg.icon,
            });
          }

          await update(ref(database), updates);
        }
      }
    }, 3000);

    return () => clearInterval(cleanupInterval);
  }, [room, playerId, roomCode]);
}
