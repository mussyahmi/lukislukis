import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, update, get, onDisconnect } from 'firebase/database';
import { database, initializeAuth } from '@/lib/firebase';
import { toast } from 'sonner';

interface UseRoomPresenceParams {
  roomCode: string;
  needsName: boolean;
  onRoomData: (data: any) => void;
  onPlayerId: (id: string) => void;
  onLoading: (loading: boolean) => void;
  onNeedsName: (needs: boolean) => void;
}

export function useRoomPresence({
  roomCode,
  needsName,
  onRoomData,
  onPlayerId,
  onLoading,
  onNeedsName,
}: UseRoomPresenceParams) {
  const router = useRouter();
  const letterRevealTimers = useRef<NodeJS.Timeout[]>([]);
  const isLeavingRoom = useRef(false); // Track if user is intentionally leaving

  // Check if player needs to enter name
  useEffect(() => {
    const checkPlayerStatus = async () => {
      try {
        const uid = await initializeAuth();
        onPlayerId(uid);

        const roomRef = ref(database, `rooms/${roomCode}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          toast.error('Bilik tidak wujud');
          router.push('/');
          return;
        }

        const roomData = roomSnapshot.val();

        if (roomData.kickedPlayers?.[uid]) {
          toast.error('Anda telah ditendang dari bilik ini');
          router.push('/');
          return;
        }

        if (roomData.players && roomData.players[uid]) {
          onNeedsName(false);
        } else {
          onNeedsName(true);
        }

        onLoading(false);
      } catch (error) {
        console.error('Error checking player status:', error);
        toast.error('Gagal menyemak status');
        router.push('/');
      }
    };

    checkPlayerStatus();
  }, [roomCode, router, onPlayerId, onNeedsName, onLoading]);

  // Setup presence after name provided
  useEffect(() => {
    if (needsName) return;

    let unsubscribe: (() => void) | undefined;
    let activeInterval: NodeJS.Timeout | undefined;
    let activePlayerRef: ReturnType<typeof ref> | undefined;

    const initPresence = async () => {
      try {
        const uid = await initializeAuth();
        const roomRef = ref(database, `rooms/${roomCode}`);
        const playerRef = ref(database, `rooms/${roomCode}/players/${uid}`);
        activePlayerRef = playerRef;

        // Verify player exists before setting up presence
        const roomSnapshot = await get(roomRef);
        if (!roomSnapshot.exists()) {
          toast.error('Bilik tidak wujud');
          router.push('/');
          return;
        }

        const roomData = roomSnapshot.val();
        if (!roomData.players || !roomData.players[uid]) {
          onNeedsName(true);
          return;
        }

        // Setup disconnect handlers
        const playerDisconnectRef = onDisconnect(playerRef);
        playerDisconnectRef.update({
          isDisconnected: true,
          disconnectedAt: Date.now(),
        });

        // Setup room state disconnect handler if drawer
        if (roomData.currentDrawerId === uid) {
          const roomDisconnectRef = onDisconnect(ref(database, `rooms/${roomCode}`));
          const activePlayers = Object.keys(roomData.players).filter(pid => pid !== uid);

          if (roomData.gameState === 'WORD_SELECTION') {
            const currentIndex = roomData.currentDrawerIndex;

            if (currentIndex >= activePlayers.length - 1) {
              if (roomData.currentRound < roomData.totalRounds) {
                roomDisconnectRef.update({
                  gameState: 'ROUND_END',
                  turnStartTime: Date.now(),
                  drawOrder: activePlayers,
                });
              } else {
                roomDisconnectRef.update({
                  gameState: 'GAME_ENDED',
                  drawOrder: activePlayers,
                });
              }
            } else {
              const nextDrawerId = activePlayers[currentIndex < activePlayers.length ? currentIndex : 0];
              roomDisconnectRef.update({
                currentDrawerId: nextDrawerId,
                currentDrawerIndex: currentIndex,
                gameState: 'WORD_SELECTION',
                turnStartTime: Date.now(),
                drawOrder: activePlayers,
              });
            }
          } else if (roomData.gameState === 'DRAWING') {
            roomDisconnectRef.update({
              gameState: 'REVEAL',
              turnStartTime: Date.now(),
              drawOrder: activePlayers,
            });
          }
        }

        // Listen to room changes
        unsubscribe = onValue(roomRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();

            // Only show disconnect message if user is NOT intentionally leaving
            if (!data.players || !data.players[uid]) {
              // Cancel onDisconnect to prevent recreating the player node
              onDisconnect(playerRef).cancel();
              if (!isLeavingRoom.current) {
                if (data.kickedPlayers?.[uid]) {
                  toast.error('Anda telah ditendang dari bilik ini');
                } else {
                  toast.info('Sambungan terputus');
                }
                router.push('/');
              }
              return;
            }

            onRoomData(data);
          } else {
            // Only show error if user is NOT intentionally leaving
            if (!isLeavingRoom.current) {
              toast.error('Bilik tidak wujud atau telah ditutup');
              router.push('/');
            }
          }
        });

        // Update lastActive periodically
        let isActive = true;
        activeInterval = setInterval(() => {
          if (uid && isActive) {
            get(ref(database, `rooms/${roomCode}/players/${uid}`)).then(snapshot => {
              if (snapshot.exists()) {
                update(ref(database, `rooms/${roomCode}/players/${uid}`), {
                  lastActive: Date.now(),
                  isDisconnected: false,
                }).catch(() => {
                  isActive = false;
                });
              } else {
                isActive = false;
              }
            });
          }
        }, 5000);
      } catch (error) {
        console.error('Presence error:', error);
        toast.error('Gagal memulakan sesi');
        router.push('/');
      }
    };

    initPresence();

    return () => {
      if (unsubscribe) unsubscribe();
      if (activeInterval) clearInterval(activeInterval);
      letterRevealTimers.current.forEach(timer => clearTimeout(timer));
      // Cancel onDisconnect when navigating away so it doesn't recreate the player node
      if (activePlayerRef) onDisconnect(activePlayerRef).cancel();
    };
  }, [roomCode, needsName, router, onRoomData, onNeedsName]);

  // Expose method to mark that user is leaving intentionally
  useEffect(() => {
    // Expose to window for the leaveRoom handler to call
    (window as any).__markLeavingRoom = () => {
      isLeavingRoom.current = true;
    };

    return () => {
      delete (window as any).__markLeavingRoom;
    };
  }, []);

  // Return the ref directly, not as an object
  return letterRevealTimers;
}