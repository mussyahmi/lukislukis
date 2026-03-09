import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ref, update, remove, push, set, get, onDisconnect } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Room, Player } from '@/types/game';
import { GameLogic } from '@/lib/gameLogic';
import type { Stroke } from '@/components/game/Canvas';
import { toast } from 'sonner';

export function useGameHandlers(
  room: Room | null,
  playerId: string,
  roomCode: string
) {
  const router = useRouter();

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Kod bilik disalin!');
  }, [roomCode]);

  const handleJoinRoom = useCallback(async (name: string) => {
    if (!name.trim()) {
      toast.error('Sila masukkan nama anda');
      return false;
    }

    if (name.length > 20) {
      toast.error('Nama terlalu panjang (maksimum 20 aksara)');
      return false;
    }

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const roomSnapshot = await get(roomRef);

      if (!roomSnapshot.exists()) {
        toast.error('Bilik tidak wujud');
        router.push('/');
        return false;
      }

      const roomData = roomSnapshot.val();

      if (roomData.kickedPlayers?.[playerId]) {
        toast.error('Anda telah ditendang dari bilik ini');
        router.push('/');
        return false;
      }

      const currentPlayerCount = Object.keys(roomData.players || {}).length;
      if (currentPlayerCount >= roomData.maxPlayers) {
        toast.error('Bilik sudah penuh!');
        router.push('/');
        return false;
      }

      const newPlayer = {
        playerId,
        name: name.trim(),
        score: 0,
        correctGuesses: 0,
        isDrawing: false,
        hasGuessed: false,
        lastActive: Date.now(),
        joinedAt: Date.now(),
        votedToKick: {},
      };

      await update(ref(database, `rooms/${roomCode}/players/${playerId}`), newPlayer);

      const joinMessageRef = push(ref(database, `rooms/${roomCode}/messages`));
      await set(joinMessageRef, {
        id: joinMessageRef.key,
        playerId: 'system',
        playerName: 'Sistem',
        text: `${name.trim()} telah menyertai bilik!`,
        isCorrect: false,
        isNearMatch: false,
        timestamp: Date.now(),
        icon: 'user-plus',
      });

      const currentDrawOrder = roomData.drawOrder || [];
      await update(ref(database, `rooms/${roomCode}`), {
        drawOrder: [...currentDrawOrder, playerId],
      });

      toast.success(`Selamat datang, ${name.trim()}!`);
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Gagal menyertai bilik');
      return false;
    }
  }, [playerId, roomCode, router]);

  const leaveRoom = useCallback(async () => {
    if (!playerId || !room) return;

    // Mark that user is intentionally leaving to prevent disconnect toast
    if ((window as any).__markLeavingRoom) {
      (window as any).__markLeavingRoom();
    }

    try {
      const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
      if (!roomSnapshot.exists()) {
        router.push('/');
        return;
      }

      const currentRoom = roomSnapshot.val();
      const leavingPlayer = currentRoom.players[playerId];
      const remainingPlayers = Object.keys(currentRoom.players || {}).filter(id => id !== playerId);

      if (leavingPlayer) {
        const leaveMessageRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(leaveMessageRef, {
          id: leaveMessageRef.key,
          playerId: 'system',
          playerName: 'Sistem',
          text: `${leavingPlayer.name} telah keluar dari bilik`,
          isCorrect: false,
          isNearMatch: false,
          timestamp: Date.now(),
          icon: 'user-minus',
        });
      }

      if (remainingPlayers.length === 0) {
        await remove(ref(database, `rooms/${roomCode}`));
        toast.info('Bilik ditutup - tiada pemain lagi');
        router.push('/');
        return;
      }

      const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
      await onDisconnect(playerRef).cancel();
      await remove(playerRef);

      const newDrawOrder = currentRoom.drawOrder.filter((id: string) => id !== playerId);

      const updates: any = {
        drawOrder: newDrawOrder,
      };

      if (currentRoom.adminId === playerId) {
        const newAdminId = remainingPlayers[0];
        updates.adminId = newAdminId;
      }

      if (remainingPlayers.length < 3 && currentRoom.gameState !== 'WAITING') {
        updates.gameState = 'GAME_ENDED';

        const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(msgRef, {
          id: msgRef.key,
          playerId: 'system',
          playerName: 'Sistem',
          text: `Pemain tidak mencukupi - permainan tamat`,
          isCorrect: false,
          isNearMatch: false,
          timestamp: Date.now(),
          icon: 'alert-triangle',
        });

        await update(ref(database, `rooms/${roomCode}`), updates);
        toast.info('Anda telah keluar dari bilik');
        router.push('/');
        return;
      }

      if (currentRoom.currentDrawerId === playerId) {
        if (currentRoom.gameState === 'WORD_SELECTION') {
          const currentIndex = currentRoom.currentDrawerIndex;

          if (currentIndex >= newDrawOrder.length - 1) {
            if (currentRoom.currentRound < currentRoom.totalRounds) {
              updates.gameState = 'ROUND_END';
              updates.turnStartTime = Date.now();

              const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
              await set(msgRef, {
                id: msgRef.key,
                playerId: 'system',
                playerName: 'Sistem',
                text: `Pelukis keluar semasa memilih perkataan - melompat ke akhir pusingan`,
                isCorrect: false,
                isNearMatch: false,
                timestamp: Date.now(),
                icon: 'skip-forward',
              });
            } else {
              updates.gameState = 'GAME_ENDED';

              const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
              await set(msgRef, {
                id: msgRef.key,
                playerId: 'system',
                playerName: 'Sistem',
                text: `Pelukis keluar - permainan tamat`,
                isCorrect: false,
                isNearMatch: false,
                timestamp: Date.now(),
                icon: 'skip-forward',
              });
            }
          } else {
            const nextDrawerId = newDrawOrder[currentIndex < newDrawOrder.length ? currentIndex : 0];
            updates.currentDrawerId = nextDrawerId;
            updates.currentDrawerIndex = currentIndex;
            updates.gameState = 'WORD_SELECTION';
            updates.turnStartTime = Date.now();

            const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
            await set(msgRef, {
              id: msgRef.key,
              playerId: 'system',
              playerName: 'Sistem',
              text: `Pelukis keluar semasa memilih perkataan - giliran seterusnya`,
              isCorrect: false,
              isNearMatch: false,
              timestamp: Date.now(),
              icon: 'skip-forward',
            });
          }
        } else if (currentRoom.gameState === 'DRAWING') {
          updates.gameState = 'REVEAL';
          updates.turnStartTime = Date.now();

          const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
          await set(msgRef, {
            id: msgRef.key,
            playerId: 'system',
            playerName: 'Sistem',
            text: `Pelukis keluar semasa melukis - jawapannya ialah: ${currentRoom.currentWord || '(tiada)'}`,
            isCorrect: false,
            isNearMatch: false,
            timestamp: Date.now(),
            icon: 'skip-forward',
          });
        }
      }

      await update(ref(database, `rooms/${roomCode}`), updates);

      toast.info('Anda telah keluar dari bilik');
      router.push('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Gagal keluar dari bilik');
    }
  }, [playerId, room, roomCode, router]);

  const startGame = useCallback(async () => {
    if (!room || !playerId || room.adminId !== playerId) return;

    const playerCount = Object.keys(room.players).length;
    if (playerCount < 3) {
      toast.error('Minimum 3 pemain diperlukan untuk memulakan permainan!');
      return;
    }

    const playerIds = Object.keys(room.players);
    const shuffledOrder = GameLogic.shuffleArray(playerIds);
    const firstDrawerId = shuffledOrder[0];

    await update(ref(database, `rooms/${roomCode}`), {
      gameState: 'WORD_SELECTION',
      currentDrawerId: firstDrawerId,
      currentDrawerIndex: 0,
      currentRound: 1,
      drawOrder: shuffledOrder,
      turnStartTime: Date.now(),
      lastActivity: Date.now(),
    });

    toast.success('Permainan bermula!');
  }, [room, playerId, roomCode]);

  const selectWord = useCallback(async (word: string) => {
    if (!room || room.currentDrawerId !== playerId) return;

    const updates: any = {
      [`rooms/${roomCode}/gameState`]: 'DRAWING',
      [`rooms/${roomCode}/currentWord`]: word,
      [`rooms/${roomCode}/turnStartTime`]: Date.now(),
      [`rooms/${roomCode}/revealedLetters`]: [],
      [`rooms/${roomCode}/usedWords`]: [...(room.usedWords || []), word],
      [`rooms/${roomCode}/canvas`]: { strokes: {}, cleared: true },
      [`rooms/${roomCode}/lastActivity`]: Date.now(),
    };

    Object.keys(room.players).forEach(pid => {
      updates[`rooms/${roomCode}/players/${pid}/hasGuessed`] = false;
      updates[`rooms/${roomCode}/players/${pid}/lastRoundPoints`] = 0;
    });

    await update(ref(database), updates);
  }, [room, playerId, roomCode]);

  const handleStrokeComplete = useCallback(async (stroke: Stroke) => {
    if (!room || room.currentDrawerId !== playerId) return;

    const strokeRef = push(ref(database, `rooms/${roomCode}/canvas/strokes`));
    await set(strokeRef, stroke);
  }, [room, playerId, roomCode]);

  const handleClearCanvas = useCallback(async () => {
    if (!room || room.currentDrawerId !== playerId) return;

    await update(ref(database, `rooms/${roomCode}/canvas`), {
      strokes: {},
      cleared: true,
    });
  }, [room, playerId, roomCode]);

  const handleUndo = useCallback(async () => {
    if (!room || room.currentDrawerId !== playerId) return;

    const currentStrokes = room.canvas?.strokes ? Object.values(room.canvas.strokes) : [];
    if (currentStrokes.length === 0) return;

    const strokeKeys = Object.keys(room.canvas?.strokes || {});
    if (strokeKeys.length === 0) return;

    const lastStrokeKey = strokeKeys[strokeKeys.length - 1];

    await remove(ref(database, `rooms/${roomCode}/canvas/strokes/${lastStrokeKey}`));
  }, [room, playerId, roomCode]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!room || !playerId) return;

    const player = room.players[playerId];
    if (!player) return;

    const isDrawer = room.currentDrawerId === playerId;
    const isGuess = !isDrawer && room.gameState === 'DRAWING' && room.currentWord;

    if (isGuess) {
      const guessResult = GameLogic.checkGuess(text, room.currentWord!);

      if (guessResult.isCorrect && !player.hasGuessed) {
        const timeElapsed = Math.floor((Date.now() - (room.turnStartTime || 0)) / 1000);
        const timeRemaining = Math.max(0, room.turnDuration - timeElapsed);
        const points = GameLogic.calculateGuessScore(timeRemaining, room.turnDuration);

        await update(ref(database, `rooms/${roomCode}/players/${playerId}`), {
          score: player.score + points,
          correctGuesses: player.correctGuesses + 1,
          hasGuessed: true,
          lastRoundPoints: points,
        });

        const messageRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(messageRef, {
          id: messageRef.key,
          playerId,
          playerName: player.name,
          text: 'meneka dengan betul!',
          isCorrect: true,
          isNearMatch: false,
          timestamp: Date.now(),
        });

        toast.success(`Betul! +${points} mata`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
        if (roomSnapshot.exists()) {
          const latestRoom = roomSnapshot.val();
          const allPlayers = Object.values(latestRoom.players) as Player[];

          const guessers = allPlayers.filter(p => p.playerId !== latestRoom.currentDrawerId);
          const correctGuessers = guessers.filter(p => p.hasGuessed);
          const allGuessed = correctGuessers.length === guessers.length && guessers.length > 0;

          if (allGuessed) {
            const systemMessageRef = push(ref(database, `rooms/${roomCode}/messages`));
            await set(systemMessageRef, {
              id: systemMessageRef.key,
              playerId: 'system',
              playerName: 'Sistem',
              text: `Semua pemain meneka dengan betul! Jawapannya: ${latestRoom.currentWord}`,
              isCorrect: false,
              isNearMatch: false,
              timestamp: Date.now(),
              icon: 'party-popper',
            });

            const drawerPoints = GameLogic.calculateDrawerScore(guessers.length);

            if (latestRoom.currentDrawerId && drawerPoints > 0) {
              const drawer = latestRoom.players[latestRoom.currentDrawerId];
              await update(ref(database, `rooms/${roomCode}/players/${latestRoom.currentDrawerId}`), {
                score: drawer.score + drawerPoints,
              });
            }

            await update(ref(database, `rooms/${roomCode}`), {
              gameState: 'REVEAL',
              turnStartTime: Date.now(),
            });
          }
        }

        return;
      } else if (guessResult.isNearMatch) {
        const messageRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(messageRef, {
          id: messageRef.key,
          playerId,
          playerName: player.name,
          text: text,
          isCorrect: false,
          isNearMatch: true,
          timestamp: Date.now(),
        });
        return;
      }
    }

    const messageRef = push(ref(database, `rooms/${roomCode}/messages`));
    await set(messageRef, {
      id: messageRef.key,
      playerId,
      playerName: player.name,
      text: text,
      isCorrect: false,
      isNearMatch: false,
      timestamp: Date.now(),
    });
    await update(ref(database, `rooms/${roomCode}`), { lastActivity: Date.now() });
  }, [room, playerId, roomCode]);

  const handleTurnComplete = useCallback(async () => {
    if (!room) return;
    if (room.currentDrawerId !== playerId) return;

    try {
      const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
      if (!roomSnapshot.exists()) return;

      const currentRoom = roomSnapshot.val();
      if (currentRoom.gameState !== 'DRAWING') return;

      const correctGuessCount = (Object.values(currentRoom.players) as Player[]).filter(p => p.hasGuessed).length;
      const drawerPoints = GameLogic.calculateDrawerScore(correctGuessCount);

      if (drawerPoints > 0) {
        const drawer = currentRoom.players[currentRoom.currentDrawerId];
        await update(ref(database, `rooms/${roomCode}/players/${currentRoom.currentDrawerId}`), {
          score: drawer.score + drawerPoints,
        });
      }

      const systemMessageRef = push(ref(database, `rooms/${roomCode}/messages`));
      await set(systemMessageRef, {
        id: systemMessageRef.key,
        playerId: 'system',
        playerName: 'Sistem',
        text: `Masa tamat! Jawapannya ialah: ${currentRoom.currentWord}`,
        isCorrect: false,
        isNearMatch: false,
        timestamp: Date.now(),
        icon: 'timer',
      });

      await update(ref(database, `rooms/${roomCode}`), {
        gameState: 'REVEAL',
        turnStartTime: Date.now(),
      });
    } catch (error) {
      console.error('[DRAWER] Error:', error);
    }
  }, [room, playerId, roomCode]);

  const handlePlayAgain = useCallback(async () => {
    if (!room || room.adminId !== playerId) return;

    const updates: any = {
      [`rooms/${roomCode}/gameState`]: 'WAITING',
      [`rooms/${roomCode}/currentRound`]: 0,
      [`rooms/${roomCode}/currentDrawerId`]: null,
      [`rooms/${roomCode}/currentDrawerIndex`]: 0,
      [`rooms/${roomCode}/usedWords`]: [],
      [`rooms/${roomCode}/revealedLetters`]: [],
      [`rooms/${roomCode}/currentWord`]: null,
      [`rooms/${roomCode}/messages`]: {},
    };

    Object.keys(room.players).forEach(pid => {
      updates[`rooms/${roomCode}/players/${pid}/score`] = 0;
      updates[`rooms/${roomCode}/players/${pid}/correctGuesses`] = 0;
      updates[`rooms/${roomCode}/players/${pid}/hasGuessed`] = false;
    });

    await update(ref(database), updates);
    toast.success('Permainan direset!');
  }, [room, playerId, roomCode]);

  const handleVoteToKick = useCallback(async (targetPlayerId: string) => {
    if (!room || !playerId) return;

    // Prevent voting for yourself
    if (targetPlayerId === playerId) {
      toast.error('Anda tidak boleh mengundi diri sendiri!');
      return;
    }

    try {
      const currentPlayer = room.players[playerId];
      const targetPlayer = room.players[targetPlayerId];

      if (!currentPlayer || !targetPlayer) return;

      // Check if player has already voted
      const hasAlreadyVoted = currentPlayer.votedToKick?.[targetPlayerId] === true;

      if (hasAlreadyVoted) {
        // Cancel vote (undo)
        await update(ref(database, `rooms/${roomCode}/players/${playerId}/votedToKick`), {
          [targetPlayerId]: null,
        });

        // Send chat message about vote cancellation
        const cancelMsgRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(cancelMsgRef, {
          id: cancelMsgRef.key,
          playerId: 'system',
          playerName: 'Sistem',
          text: `${currentPlayer.name} membatalkan undi untuk tendang ${targetPlayer.name}`,
          isCorrect: false,
          isNearMatch: false,
          timestamp: Date.now(),
          icon: 'shield-check', // Icon for cancellation
        });

        toast.info(`Undi dibatalkan untuk ${targetPlayer.name}`);
      } else {
        // Cast vote
        await update(ref(database, `rooms/${roomCode}/players/${playerId}/votedToKick`), {
          [targetPlayerId]: true,
        });

        // Send chat message about the vote
        const voteMsgRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(voteMsgRef, {
          id: voteMsgRef.key,
          playerId: 'system',
          playerName: 'Sistem',
          text: `${currentPlayer.name} mengundi untuk tendang ${targetPlayer.name}`,
          isCorrect: false,
          isNearMatch: false,
          timestamp: Date.now(),
          icon: 'user-x', // Icon for vote to kick
        });

        toast.success(`Anda mengundi untuk tendang ${targetPlayer.name}`);
      }

      // Check if vote threshold is met
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to ensure Firebase updates

      const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
      if (!roomSnapshot.exists()) return;

      const updatedRoom = roomSnapshot.val();
      const allPlayers = Object.values(updatedRoom.players) as Player[];

      // Count votes for target player
      const voteCount = allPlayers.filter(p => p.votedToKick?.[targetPlayerId] === true).length;

      // Calculate threshold (50% of players excluding target)
      const totalVoters = allPlayers.filter(p => p.playerId !== targetPlayerId).length;
      const threshold = Math.ceil(totalVoters / 2);

      // Kick player if threshold met
      if (voteCount >= threshold) {
        const kickedPlayerName = targetPlayer.name;
        const wasDrawer = targetPlayerId === updatedRoom.currentDrawerId;
        const wasAdmin = targetPlayerId === updatedRoom.adminId;

        // Get list of voters for the final kick message
        const voters = allPlayers
          .filter(p => p.votedToKick?.[targetPlayerId] === true)
          .map(p => p.name)
          .join(', ');

        // Remove player
        await remove(ref(database, `rooms/${roomCode}/players/${targetPlayerId}`));

        // Update draw order
        const newDrawOrder = updatedRoom.drawOrder.filter((id: string) => id !== targetPlayerId);

        const updates: any = {
          drawOrder: newDrawOrder,
          [`kickedPlayers/${targetPlayerId}`]: true,
        };

        // Clear all votes for this player from other players
        allPlayers.forEach(p => {
          if (p.votedToKick?.[targetPlayerId]) {
            updates[`players/${p.playerId}/votedToKick/${targetPlayerId}`] = null;
          }
        });

        // Reassign admin if kicked player was admin
        if (wasAdmin) {
          const remainingPlayers = allPlayers.filter(p => p.playerId !== targetPlayerId);
          if (remainingPlayers.length > 0) {
            updates.adminId = remainingPlayers[0].playerId;
          }
        }

        // Handle if kicked player was the current drawer
        if (wasDrawer) {
          if (updatedRoom.gameState === 'WORD_SELECTION' || updatedRoom.gameState === 'DRAWING') {
            const currentIndex = updatedRoom.currentDrawerIndex;

            if (currentIndex >= newDrawOrder.length - 1) {
              // Last turn of the round
              if (updatedRoom.currentRound < updatedRoom.totalRounds) {
                updates.gameState = 'ROUND_END';
                updates.turnStartTime = Date.now();
              } else {
                updates.gameState = 'GAME_ENDED';
              }
            } else {
              // Move to next drawer
              const nextDrawerId = newDrawOrder[currentIndex < newDrawOrder.length ? currentIndex : 0];
              updates.currentDrawerId = nextDrawerId;
              updates.currentDrawerIndex = currentIndex;
              updates.gameState = 'WORD_SELECTION';
              updates.turnStartTime = Date.now();
            }
          }
        }

        // Check if remaining players < 3
        const remainingPlayerCount = allPlayers.filter(p => p.playerId !== targetPlayerId).length;
        if (remainingPlayerCount < 3 && updatedRoom.gameState !== 'WAITING') {
          updates.gameState = 'GAME_ENDED';

          const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
          await set(msgRef, {
            id: msgRef.key,
            playerId: 'system',
            playerName: 'Sistem',
            text: `${kickedPlayerName} telah ditendang. Pemain tidak mencukupi - permainan tamat`,
            isCorrect: false,
            isNearMatch: false,
            timestamp: Date.now(),
            icon: 'alert-triangle',
          });
        } else {
          // Send kick message with voter names
          let kickMessage = `${kickedPlayerName} telah ditendang! (${voteCount}/${threshold} undi)\nDiundi oleh: ${voters}`;

          if (wasDrawer && wasAdmin) {
            kickMessage += '\n[Pelukis & Admin ditendang - giliran dilompat]';
          } else if (wasDrawer) {
            kickMessage += '\n[Pelukis ditendang - giliran dilompat]';
          } else if (wasAdmin) {
            kickMessage += '\n[Admin ditendang - admin baru dilantik]';
          }

          const msgRef = push(ref(database, `rooms/${roomCode}/messages`));
          await set(msgRef, {
            id: msgRef.key,
            playerId: 'system',
            playerName: 'Sistem',
            text: kickMessage,
            isCorrect: false,
            isNearMatch: false,
            timestamp: Date.now(),
            icon: 'ban', // Icon for successful kick
          });
        }

        await update(ref(database, `rooms/${roomCode}`), updates);

        toast.success(`${kickedPlayerName} telah ditendang!`);
      }
    } catch (error) {
      console.error('Error voting to kick:', error);
      toast.error('Gagal mengundi');
    }
  }, [room, playerId, roomCode]);

  const handleUpdatePassword = useCallback(async (password: string | null) => {
    try {
      await update(ref(database, `rooms/${roomCode}`), {
        hasPassword: !!password,
        password: password || null,
      });
      toast.success(password ? 'Kata laluan ditetapkan' : 'Kata laluan dibuang');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Gagal kemaskini kata laluan');
    }
  }, [roomCode]);

  const handleUpdateCapacity = useCallback(async (maxPlayers: number) => {
    if (!room) return;
    const currentCount = Object.keys(room.players || {}).length;
    const minCapacity = Math.max(3, currentCount);
    if (maxPlayers < minCapacity) {
      toast.error(`Kapasiti minimum ialah ${minCapacity}`);
      return;
    }
    try {
      await update(ref(database, `rooms/${roomCode}`), { maxPlayers });
      toast.success(`Kapasiti dikemaskini kepada ${maxPlayers}`);
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error('Gagal kemaskini kapasiti');
    }
  }, [room, roomCode]);

  return {
    copyRoomCode,
    handleJoinRoom,
    leaveRoom,
    startGame,
    selectWord,
    handleStrokeComplete,
    handleClearCanvas,
    handleUndo,
    handleSendMessage,
    handleTurnComplete,
    handlePlayAgain,
    handleVoteToKick,
    handleUpdatePassword,
    handleUpdateCapacity,
  };
}