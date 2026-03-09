'use client';

import { useEffect, useState } from 'react';
import { database, ref, onValue, initializeAuth } from '@/lib/firebase';

interface LiveStats {
  activeRooms: number;
  activePlayers: number;
}

export function useLiveStats(): LiveStats | null {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initializeAuth().then(() => {
      unsubscribe = onValue(ref(database, 'rooms'), (snapshot) => {
        if (!snapshot.exists()) {
          setStats({ activeRooms: 0, activePlayers: 0 });
          return;
        }
        const rooms = snapshot.val();
        const roomKeys = Object.keys(rooms);
        let totalPlayers = 0;
        for (const key of roomKeys) {
          const room = rooms[key];
          if (room.players) {
            const count = Object.values(room.players as Record<string, { isDisconnected?: boolean }>)
              .filter(p => !p.isDisconnected).length;
            totalPlayers += count;
          }
        }
        setStats({ activeRooms: roomKeys.length, activePlayers: totalPlayers });
      });
    }).catch(() => {});

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return stats;
}
