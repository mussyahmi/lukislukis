'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, update, push, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { GameLogic } from '@/lib/gameLogic';
import { getValidPlayers } from '@/lib/utils';
import { useRoomData } from '@/hooks/useRoomData';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useDisconnectCleanup } from '@/hooks/useDisconnectCleanup';
import { useGameHandlers } from '@/hooks/useGameHandlers';
import { NamePrompt } from './_components/NamePrompt';
import { GameLayout } from './_components/GameLayout';
import { WaitingLobby } from './_components/WaitingLobby';
import { WordSelectionScreen } from './_components/WordSelectionScreen';
import { DrawingScreen } from './_components/DrawingScreen';
import { RevealCountdown } from './_components/RevealCountdown';
import { RoundEndCountdown } from './_components/RoundEndCountdown';
import { GameEndScreen } from './_components/GameEndScreen';
import { playSound } from '@/lib/sounds';
import { useNotifications } from '@/hooks/useNotifications';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [cachedWordOptions, setCachedWordOptions] = useState<string[]>([]);

  const lastWordSelectionTime = useRef<number>(0);
  const isProcessingTurnComplete = useRef(false);

  // Custom hooks
  const { room, strokes, messages, updateRoomData } = useRoomData();

  const letterRevealTimers = useRoomPresence({
    roomCode,
    needsName,
    onRoomData: updateRoomData,
    onPlayerId: setPlayerId,
    onLoading: setLoading,
    onNeedsName: setNeedsName,
  });

  useDisconnectCleanup(room, playerId, roomCode);
  useNotifications(room, playerId);

  const {
    copyRoomCode,
    handleJoinRoom: joinRoom,
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
  } = useGameHandlers(room, playerId, roomCode);

  // Wrapper to handle join and update needsName state
  const handleJoinRoom = useCallback(async (name: string) => {
    const success = await joinRoom(name);
    if (success) {
      setNeedsName(false); // This is the critical line!
    }
    return success;
  }, [joinRoom]);

  // Cache word options for word selection
  useEffect(() => {
    if (!room || room.gameState !== 'WORD_SELECTION') return;

    if (room.turnStartTime && room.turnStartTime !== lastWordSelectionTime.current) {
      lastWordSelectionTime.current = room.turnStartTime;
      const options = GameLogic.getWordOptions(room.usedWords || []);
      setCachedWordOptions(options);
    }
  }, [room?.gameState, room?.turnStartTime, room?.usedWords]);

  // Letter reveal effect
  useEffect(() => {
    if (!room || room.gameState !== 'DRAWING' || !room.currentWord || !room.turnStartTime) return;
    if (room.currentDrawerId !== playerId) return;

    letterRevealTimers.current.forEach(timer => clearTimeout(timer));
    letterRevealTimers.current = [];

    const word = room.currentWord;
    const letterIndices = word
      .split('')
      .map((char, i) => (char !== ' ' ? i : -1))
      .filter(i => i !== -1);
    const revealCount = Math.floor(letterIndices.length / 2);

    if (revealCount === 0) return;

    const interval = Math.floor(room.turnDuration / (revealCount + 1));

    for (let i = 0; i < revealCount; i++) {
      const timer = setTimeout(async () => {
        try {
          const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
          if (!roomSnapshot.exists()) return;

          const latestRoom = roomSnapshot.val();

          if (latestRoom.gameState !== 'DRAWING' || latestRoom.turnStartTime !== room.turnStartTime)
            return;
          if (latestRoom.currentDrawerId !== playerId) return;

          const currentRevealed = latestRoom.revealedLetters || [];
          if (currentRevealed.length >= revealCount) return;

          const newIndex = GameLogic.getRandomLetterIndex(word, currentRevealed);
          if (newIndex !== -1) {
            const newRevealed = [...currentRevealed, newIndex];
            await update(ref(database, `rooms/${roomCode}`), {
              revealedLetters: newRevealed,
            });
          }
        } catch (error) {
          console.error('[DRAWER] Error revealing letter:', error);
        }
      }, (i + 1) * interval * 1000);

      letterRevealTimers.current.push(timer);
    }

    return () => {
      letterRevealTimers.current.forEach(timer => clearTimeout(timer));
      letterRevealTimers.current = [];
    };
  }, [room?.gameState, room?.turnStartTime, room?.currentWord, room?.currentDrawerId, playerId, roomCode, letterRevealTimers]);

  // Auto-select word if time runs out
  useEffect(() => {
    if (!room || room.gameState !== 'WORD_SELECTION' || room.currentDrawerId !== playerId) return;
    if (cachedWordOptions.length === 0) return;

    const timeElapsed = Math.floor((Date.now() - (room.turnStartTime || 0)) / 1000);
    const timeRemaining = Math.max(0, room.wordSelectionTime - timeElapsed);

    if (timeRemaining === 0) {
      const randomIndex = Math.floor(Math.random() * cachedWordOptions.length);
      selectWord(cachedWordOptions[randomIndex]);
    }
  }, [room?.gameState, room?.turnStartTime, room?.currentDrawerId, playerId, cachedWordOptions, selectWord]);

  // Auto-advance REVEAL phase
  useEffect(() => {
    if (room?.gameState !== 'REVEAL' || !room.turnStartTime) return;

    const elapsed = Date.now() - room.turnStartTime;
    const remaining = Math.max(0, 5000 - elapsed);

    const timer = setTimeout(async () => {
      if (room.adminId !== playerId && room.currentDrawerId !== playerId) return;

      const playerCount = Object.keys(room.players || {}).length;
      if (playerCount < 3) {
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

        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'GAME_ENDED',
        });
        return;
      }

      const nextDrawerIndex = room.currentDrawerIndex + 1;

      if (nextDrawerIndex >= room.drawOrder.length) {
        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'ROUND_END',
          turnStartTime: Date.now(),
        });
      } else {
        const nextDrawerId = room.drawOrder[nextDrawerIndex];
        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'WORD_SELECTION',
          currentDrawerId: nextDrawerId,
          currentDrawerIndex: nextDrawerIndex,
          turnStartTime: Date.now(),
          currentWord: null,
          revealedLetters: [],
        });
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [
    room?.gameState,
    room?.turnStartTime,
    room?.currentDrawerIndex,
    room?.drawOrder,
    room?.players,
    roomCode,
    playerId,
    room?.adminId,
    room?.currentDrawerId,
  ]);

  // Auto-advance ROUND_END phase
  useEffect(() => {
    if (room?.gameState !== 'ROUND_END' || !room.turnStartTime) return;

    const elapsed = Date.now() - room.turnStartTime;
    const remaining = Math.max(0, 5000 - elapsed);

    const timer = setTimeout(async () => {
      if (room.adminId !== playerId) return;

      const playerCount = Object.keys(room.players || {}).length;
      if (playerCount < 3) {
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

        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'GAME_ENDED',
        });
        return;
      }

      if (room.currentRound < room.totalRounds) {
        const playerIds = Object.keys(room.players);
        const shuffledOrder = GameLogic.shuffleArray(playerIds);
        const firstDrawerId = shuffledOrder[0];

        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'WORD_SELECTION',
          currentDrawerId: firstDrawerId,
          currentDrawerIndex: 0,
          currentRound: room.currentRound + 1,
          drawOrder: shuffledOrder,
          turnStartTime: Date.now(),
          currentWord: null,
          revealedLetters: [],
        });

        const roundMessageRef = push(ref(database, `rooms/${roomCode}/messages`));
        await set(roundMessageRef, {
          id: roundMessageRef.key,
          playerId: 'system',
          playerName: 'Sistem',
          text: `Pusingan ${room.currentRound + 1} bermula!`,
          isCorrect: false,
          isNearMatch: false,
          timestamp: Date.now(),
          icon: 'gamepad2',
        });
      } else {
        await update(ref(database, `rooms/${roomCode}`), {
          gameState: 'GAME_ENDED',
        });
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [
    room?.gameState,
    room?.turnStartTime,
    room?.currentRound,
    room?.totalRounds,
    room?.players,
    roomCode,
    playerId,
    room?.adminId,
  ]);

  // Reset turn complete flag
  useEffect(() => {
    if (room?.gameState !== 'DRAWING') {
      isProcessingTurnComplete.current = false;
    }
  }, [room?.gameState]);

  // Game end sound
  useEffect(() => {
    if (room?.gameState === 'GAME_ENDED') {
      playSound('gameEnd');
    }
  }, [room?.gameState]);

  // Loading state (must check before needsName to ensure playerId is set)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg font-semibold text-muted-foreground">Memuatkan...</div>
      </div>
    );
  }

  // Show name prompt if needed
  if (needsName) {
    return <NamePrompt onSubmit={handleJoinRoom} roomCode={roomCode} />;
  }

  // Room not found
  if (!room) {
    return null;
  }

  // Get valid players
  const players = getValidPlayers(room.players);

  // Empty room
  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-base font-semibold">Bilik kosong</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Kembali ke Menu Utama
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = room.adminId === playerId;
  const canStart = players.length >= 3;
  const isDrawer = room.currentDrawerId === playerId;
  const currentPlayer = room.players[playerId];

  // WAITING lobby
  if (room.gameState === 'WAITING') {
    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={false}
        hasGuessed={false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <WaitingLobby
          players={players}
          maxPlayers={room.maxPlayers}
          adminId={room.adminId}
          playerId={playerId}
          canStart={canStart}
          onStartGame={startGame}
        />
      </GameLayout>
    );
  }

  // WORD_SELECTION phase
  if (room.gameState === 'WORD_SELECTION') {
    const timeElapsed = Math.floor((Date.now() - (room.turnStartTime || 0)) / 1000);
    const timeRemaining = Math.max(0, room.wordSelectionTime - timeElapsed);
    const drawerName = room.currentDrawerId ? room.players[room.currentDrawerId]?.name : '';

    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={isDrawer}
        hasGuessed={currentPlayer?.hasGuessed || false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <WordSelectionScreen
          isDrawer={isDrawer}
          drawerName={drawerName}
          timeRemaining={timeRemaining}
          wordOptions={cachedWordOptions}
          onSelectWord={selectWord}
        />
      </GameLayout>
    );
  }

  // DRAWING phase
  if (room.gameState === 'DRAWING') {
    const displayWord = isDrawer
      ? room.currentWord || ''
      : GameLogic.getRevealedWord(room.currentWord || '', room.revealedLetters || []);

    const letterCount = (room.currentWord || '').replace(/ /g, '').length;
    const drawerName = room.currentDrawerId ? room.players[room.currentDrawerId]?.name || '' : '';

    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={isDrawer}
        hasGuessed={currentPlayer?.hasGuessed || false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <DrawingScreen
          isDrawer={isDrawer}
          currentWord={displayWord}
          letterCount={letterCount}
          drawerName={drawerName}
          currentRound={room.currentRound}
          totalRounds={room.totalRounds}
          currentDrawerIndex={room.currentDrawerIndex}
          drawOrderLength={room.drawOrder.length}
          turnStartTime={room.turnStartTime || Date.now()}
          turnDuration={room.turnDuration}
          strokes={strokes}
          onStrokeComplete={handleStrokeComplete}
          onClear={handleClearCanvas}
          onUndo={handleUndo}
          onTurnComplete={handleTurnComplete}
        />
      </GameLayout>
    );
  }

  // REVEAL phase
  if (room.gameState === 'REVEAL') {
    const guessers = players.filter(p => p.playerId !== room.currentDrawerId);
    const allGuessed = guessers.length > 0 && guessers.every(p => p.hasGuessed);
    const isLastTurn = room.currentDrawerIndex + 1 >= room.drawOrder.length;
    const isLastRound = room.currentRound >= room.totalRounds;
    const isGameEnding = isLastTurn && isLastRound;

    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={false}
        hasGuessed={false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <RevealCountdown
          currentWord={room.currentWord}
          players={players}
          allGuessed={allGuessed}
          isLastTurn={isLastTurn}
          isLastRound={isLastRound}
          isGameEnding={isGameEnding}
          currentRound={room.currentRound}
        />
      </GameLayout>
    );
  }

  // ROUND_END phase
  if (room.gameState === 'ROUND_END') {
    const sortedPlayers = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctGuesses - a.correctGuesses;
    });
    const isLastRound = room.currentRound >= room.totalRounds;

    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={false}
        hasGuessed={false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <RoundEndCountdown
          sortedPlayers={sortedPlayers}
          currentRound={room.currentRound}
          isLastRound={isLastRound}
        />
      </GameLayout>
    );
  }

  // GAME_ENDED phase
  if (room.gameState === 'GAME_ENDED') {
    const sortedPlayers = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctGuesses - a.correctGuesses;
    });

    return (
      <GameLayout
        roomCode={roomCode}
        players={players}
        currentDrawerId={room.currentDrawerId}
        adminId={room.adminId}
        playerId={playerId}
        messages={messages}
        isDrawer={false}
        hasGuessed={false}
        onSendMessage={handleSendMessage}
        onLeaveRoom={leaveRoom}
        onCopyCode={copyRoomCode}
        onVoteToKick={handleVoteToKick}
        hasPassword={room.hasPassword}

        maxPlayers={room.maxPlayers}
        onUpdatePassword={handleUpdatePassword}
        onUpdateCapacity={handleUpdateCapacity}
      >
        <GameEndScreen
          sortedPlayers={sortedPlayers}
          isAdmin={isAdmin}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={leaveRoom}
        />
      </GameLayout>
    );
  }

  return null;
}