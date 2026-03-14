'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { database, ref, set, get, initializeAuth, push, update } from '@/lib/firebase';
import { GameLogic } from '@/lib/gameLogic';
import { Room, Player } from '@/types/game';
import { Plus, Shuffle, LogIn, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { Slider } from '@/components/ui/slider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { toast } from 'sonner';
import { APP_VERSION } from '@/lib/version';
import { hashPassword } from '@/lib/hash';
import FeedbackButton from '@/components/common/FeedbackButton';
import SupportButton from '@/components/common/SupportButton';
import { Spinner } from '@/components/ui/spinner';
import { useLiveStats } from '@/hooks/useLiveStats';


export default function HomePage() {
  const router = useRouter();
  const liveStats = useLiveStats();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loadingJoinRandomRoom, setLoadingJoinRandomRoom] = useState(false);
  const [loadingJoinRoom, setLoadingJoinRoom] = useState(false);
  const [loadingCreateRoom, setLoadingCreateRoom] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [createMaxPlayers, setCreateMaxPlayers] = useState(8);
  const [createPasswordEnabled, setCreatePasswordEnabled] = useState(false);
  const [createPassword, setCreatePassword] = useState('');


  const getPlayerId = async () => {
    try {
      const uid = await initializeAuth();
      return uid;
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Gagal memulakan sesi');
      throw error;
    }
  };

  const createRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Sila masukkan nama anda');
      return;
    }

    setLoadingCreateRoom(true);

    try {
      const playerId = await getPlayerId();
      const newRoomCode = GameLogic.generateRoomCode();
      const roomRef = ref(database, `rooms/${newRoomCode}`);

      const hasRoomPassword = createPasswordEnabled && !!createPassword.trim();
      const hashedPassword = hasRoomPassword ? await hashPassword(createPassword.trim()) : undefined;
      const initialRoom: Room = {
        roomCode: newRoomCode,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        adminId: playerId,
        hasPassword: hasRoomPassword,
        ...(hasRoomPassword ? { password: hashedPassword } : {}),
        maxPlayers: createMaxPlayers,
        gameState: 'WAITING',
        currentDrawerId: null,
        currentWord: null,
        currentRound: 0,
        totalRounds: 3,
        turnStartTime: null,
        turnDuration: 80,
        wordSelectionTime: 15,
        revealedLetters: [],
        usedWords: [],
        players: {},
        drawOrder: [playerId],
        currentDrawerIndex: 0,
      };

      await set(roomRef, initialRoom);

      const playerRef = ref(database, `rooms/${newRoomCode}/players/${playerId}`);
      const newPlayer: Player = {
        playerId,
        name: GameLogic.sanitizePlayerName(playerName),
        score: 0,
        correctGuesses: 0,
        isDrawing: false,
        hasGuessed: false,
        lastActive: Date.now(),
        joinedAt: Date.now(),
        votedToKick: {},
      };

      await set(playerRef, newPlayer);

      setShowCreateOptions(false);
      setCreatePasswordEnabled(false);
      setCreatePassword('');
      setCreateMaxPlayers(8);
      toast.success('Bilik berjaya dicipta!');
      router.push(`/bilik/${newRoomCode}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencipta bilik. Sila cuba lagi.');
    } finally {
      setLoadingCreateRoom(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Sila masukkan nama anda');
      return;
    }

    if (!roomCode.trim()) {
      toast.error('Sila masukkan kod bilik');
      return;
    }

    setLoadingJoinRoom(true);

    try {
      const playerId = await getPlayerId();
      const upperRoomCode = roomCode.toUpperCase().trim();
      const roomRef = ref(database, `rooms/${upperRoomCode}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        toast.error('Bilik tidak wujud');
        setLoadingJoinRoom(false);
        return;
      }

      const room: Room = snapshot.val();

      if (room.kickedPlayers?.[playerId]) {
        toast.error('Anda telah ditendang dari bilik ini');
        setLoadingJoinRoom(false);
        return;
      }

      // Prompt for password if room is protected and not yet provided
      if (room.hasPassword && !passwordRequired) {
        setPasswordRequired(true);
        setLoadingJoinRoom(false);
        return;
      }

      // Validate password (stored as SHA-256 hash)
      if (room.hasPassword && room.password) {
        const inputHash = await hashPassword(roomPasswordInput.trim());
        if (inputHash !== room.password) {
          toast.error('Kata laluan salah');
          setLoadingJoinRoom(false);
          return;
        }
      }
      const playerCount = Object.keys(room.players || {}).length;
      if (playerCount >= room.maxPlayers) {
        toast.error('Bilik penuh');
        setLoadingJoinRoom(false);
        return;
      }

      const uniqueName = GameLogic.ensureUniqueName(playerName, room.players || {});
      const playerRef = ref(database, `rooms/${upperRoomCode}/players/${playerId}`);
      const newPlayer: Player = {
        playerId,
        name: uniqueName,
        score: 0,
        correctGuesses: 0,
        isDrawing: false,
        hasGuessed: false,
        lastActive: Date.now(),
        joinedAt: Date.now(),
        votedToKick: {},
      };

      await set(playerRef, newPlayer);

      const updates: any = {};

      if (!room.drawOrder.includes(playerId)) {
        const newDrawOrder = [...room.drawOrder, playerId];
        updates.drawOrder = newDrawOrder;
      }

      const joinMessageRef = push(ref(database, `rooms/${upperRoomCode}/messages`));
      await set(joinMessageRef, {
        id: joinMessageRef.key,
        playerId: 'system',
        playerName: 'Sistem',
        text: `${uniqueName} telah menyertai bilik!`,
        isCorrect: false,
        isNearMatch: false,
        timestamp: Date.now(),
        icon: 'user-plus',
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database, `rooms/${upperRoomCode}`), updates);
      }

      setPasswordRequired(false);
      setRoomPasswordInput('');
      toast.success(`Anda menyertai bilik ${upperRoomCode}!`);
      router.push(`/bilik/${upperRoomCode}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyertai bilik. Sila cuba lagi.');
    } finally {
      setLoadingJoinRoom(false);
    }
  };

  const joinRandomRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Sila masukkan nama anda');
      return;
    }

    setLoadingJoinRandomRoom(true);

    try {
      const playerId = await getPlayerId();

      const roomsRef = ref(database, 'rooms');
      const snapshot = await get(roomsRef);

      if (!snapshot.exists()) {
        toast.error('Tiada bilik tersedia. Cuba cipta bilik baru!');
        setLoadingJoinRandomRoom(false);
        return;
      }

      const allRooms = snapshot.val();

      const availableRooms = Object.values(allRooms as Record<string, Room>).filter((room: Room) => {
        const playerCount = Object.keys(room.players || {}).length;
        const isKicked = room.kickedPlayers?.[playerId];
        return playerCount < room.maxPlayers && !room.hasPassword && !isKicked;
      });

      if (availableRooms.length === 0) {
        toast.error('Tiada bilik tersedia. Cuba cipta bilik baru!');
        setLoadingJoinRandomRoom(false);
        return;
      }

      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      const selectedRoomCode = randomRoom.roomCode;

      const uniqueName = GameLogic.ensureUniqueName(playerName, randomRoom.players || {});
      const playerRef = ref(database, `rooms/${selectedRoomCode}/players/${playerId}`);
      const newPlayer: Player = {
        playerId,
        name: uniqueName,
        score: 0,
        correctGuesses: 0,
        isDrawing: false,
        hasGuessed: false,
        lastActive: Date.now(),
        joinedAt: Date.now(),
        votedToKick: {},
      };

      await set(playerRef, newPlayer);

      const updates: any = {};

      if (!randomRoom.drawOrder.includes(playerId)) {
        const newDrawOrder = [...randomRoom.drawOrder, playerId];
        updates.drawOrder = newDrawOrder;
      }

      const joinMessageRef = push(ref(database, `rooms/${selectedRoomCode}/messages`));
      await set(joinMessageRef, {
        id: joinMessageRef.key,
        playerId: 'system',
        playerName: 'Sistem',
        text: `${uniqueName} telah menyertai bilik!`,
        isCorrect: false,
        isNearMatch: false,
        timestamp: Date.now(),
        icon: 'user-plus',
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database, `rooms/${selectedRoomCode}`), updates);
      }

      toast.success(`Anda menyertai bilik ${selectedRoomCode}!`);
      router.push(`/bilik/${selectedRoomCode}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencari bilik. Sila cuba lagi.');
    } finally {
      setLoadingJoinRandomRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-4 animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2.5 rounded-xl bg-white shadow-lg flex-shrink-0">
              <Image src="/logo.png" alt="LukisLukis" width={48} height={48} priority />
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-black tracking-tight">LukisLukis</h1>
              <p className="text-sm text-muted-foreground">Lukis, teka, dan menang</p>
            </div>
          </div>
          {liveStats !== null && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>{liveStats.activePlayers} pemain dalam talian · {liveStats.activeRooms} bilik aktif</span>
            </div>
          )}
        </div>

        {/* Main Card */}
        <Card className="shadow-sm border">
          <CardContent className="p-5 space-y-4">
            {/* Name Input */}
            <Input
              placeholder="Nama anda..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (showJoinInput && roomCode.trim()) joinRoom();
                  else joinRandomRoom();
                }
              }}
              className="h-11 text-center text-base"
              autoFocus
            />

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Random Room */}
              <Button
                onClick={joinRandomRoom}
                disabled={loadingJoinRandomRoom || !playerName.trim()}
                className="w-full h-11 text-base font-semibold"
              >
                {loadingJoinRandomRoom ? <Spinner /> : <><Shuffle className="w-4 h-4 mr-2" /> Sertai Bilik Rawak</>}
              </Button>

              {/* Create Room */}
              {!showCreateOptions ? (
                <Button
                  onClick={() => setShowCreateOptions(true)}
                  disabled={!playerName.trim()}
                  variant="outline"
                  className="w-full h-11 text-base font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Cipta Bilik Baru
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4 animate-slide-up bg-muted/30">
                  {/* Max Players Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Kapasiti Pemain</label>
                      <span className="text-sm font-bold text-primary tabular-nums">{createMaxPlayers} pemain</span>
                    </div>
                    <Slider
                      min={3}
                      max={20}
                      step={1}
                      value={[createMaxPlayers]}
                      onValueChange={(vals) => setCreateMaxPlayers(vals[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>3</span>
                      <span>20</span>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Kata Laluan</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="create-password-toggle"
                        checked={createPasswordEnabled}
                        onChange={e => setCreatePasswordEnabled(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <label htmlFor="create-password-toggle" className="text-sm text-muted-foreground cursor-pointer">
                        Aktifkan kata laluan
                      </label>
                    </div>
                    {createPasswordEnabled && (
                      <Input
                        placeholder="Kata laluan bilik"
                        value={createPassword}
                        onChange={e => setCreatePassword(e.target.value)}
                        type="password"
                        className="h-9"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        setShowCreateOptions(false);
                        setCreatePasswordEnabled(false);
                        setCreatePassword('');
                        setCreateMaxPlayers(8);
                      }}
                      variant="outline"
                      className="h-10"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={createRoom}
                      disabled={loadingCreateRoom || (createPasswordEnabled && !createPassword.trim())}
                      className="h-10 font-semibold"
                    >
                      {loadingCreateRoom ? <Spinner /> : 'Cipta'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">ATAU</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Join with Code */}
              {!showJoinInput ? (
                <Button
                  onClick={() => setShowJoinInput(true)}
                  variant="ghost"
                  className="w-full h-10 text-sm font-semibold border border-dashed"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sertai dengan Kod Bilik
                </Button>
              ) : (
                <div className="space-y-2 animate-slide-up">
                  <Input
                    placeholder="Contoh: ABC123"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setPasswordRequired(false);
                      setRoomPasswordInput('');
                    }}
                    maxLength={6}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                    className="h-11 font-mono tracking-widest text-center text-lg"
                    autoFocus
                    disabled={passwordRequired}
                  />
                  {passwordRequired && (
                    <Input
                      placeholder="Kata laluan bilik"
                      value={roomPasswordInput}
                      onChange={(e) => setRoomPasswordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                      className="h-11"
                      type="password"
                      autoFocus
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        setShowJoinInput(false);
                        setRoomCode('');
                        setPasswordRequired(false);
                        setRoomPasswordInput('');
                      }}
                      variant="outline"
                      className="h-10"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={joinRoom}
                      disabled={loadingJoinRoom || !playerName.trim() || !roomCode.trim() || (passwordRequired && !roomPasswordInput.trim())}
                      className="h-10 font-semibold"
                    >
                      {loadingJoinRoom ? <Spinner /> : passwordRequired ? 'Masuk' : 'Sertai'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* How to Play */}
        <Card className="shadow-sm border">
          <CardTitle>
            <div className="flex items-center gap-2 justify-center">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Cara Bermain</span>
            </div>
          </CardTitle>
          <CardContent className="px-5 pb-5 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">LukisLukis</span> adalah permainan teka gambar dalam Bahasa Melayu.
            </p>
            <div className="space-y-2 text-sm">
              {[
                'Seorang pemain melukis perkataan yang diberikan',
                'Pemain lain meneka perkataan dalam chat',
                'Teka lebih cepat untuk dapatkan mata lebih tinggi',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="px-5 pb-5 pt-0">
            <div className="w-full bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Tip:</span> Huruf akan didedahkan secara perlahan untuk membantu anda meneka.
              </p>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground flex flex-col gap-1.5 pb-4">
          <p>Dibina untuk pembelajaran Bahasa Melayu</p>
          <p className="flex items-center justify-center gap-2">
            <a href="/perkataan" className="text-primary hover:underline font-medium">
              Cadangkan Perkataan
            </a>
            <span>·</span>
            <FeedbackButton />
            <span>·</span>
            <SupportButton />
          </p>
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}