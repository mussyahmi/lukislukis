'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Copy, Users, LogOut, Settings, Volume2, VolumeX, Sun, Moon, Bell, BellOff } from 'lucide-react';
import { Player } from '@/types/game';
import { ChatBox } from '@/components/game/ChatBox';
import { PlayerList } from '@/components/game/PlayerList';
import { toggleMute, isMuted } from '@/lib/sounds';
import { useTheme } from 'next-themes';
import Image from 'next/image';

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

interface GameLayoutProps {
  roomCode: string;
  players: Player[];
  currentDrawerId: string | null;
  adminId: string;
  playerId: string;
  messages: Message[];
  isDrawer: boolean;
  hasGuessed: boolean;
  hasPassword: boolean;
  maxPlayers: number;
  onSendMessage: (text: string) => void;
  onLeaveRoom: () => void;
  onCopyCode: () => void;
  onVoteToKick: (targetPlayerId: string) => void;
  onUpdatePassword: (password: string | null) => void;
  onUpdateCapacity: (maxPlayers: number) => void;
  children: ReactNode;
}

export function GameLayout({
  roomCode,
  players,
  currentDrawerId,
  adminId,
  playerId,
  messages,
  isDrawer,
  hasGuessed,
  hasPassword,
  maxPlayers,
  onSendMessage,
  onLeaveRoom,
  onCopyCode,
  onVoteToKick,
  onUpdatePassword,
  onUpdateCapacity,
  children,
}: GameLayoutProps) {
  const [mobileTab, setMobileTab] = useState<'canvas' | 'chat' | 'players'>('canvas');
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState(() => isMuted());
  const { resolvedTheme, setTheme } = useTheme();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(hasPassword);
  const [capacityInput, setCapacityInput] = useState(maxPlayers);

  const isAdmin = playerId === adminId;
  const minCapacity = Math.max(3, players.length);


  useEffect(() => {
    const stored = localStorage.getItem(`lastRead_${roomCode}`);
    if (stored) {
      setLastReadTimestamp(parseInt(stored, 10));
    } else {
      const now = Date.now();
      setLastReadTimestamp(now);
      localStorage.setItem(`lastRead_${roomCode}`, now.toString());
    }
  }, [roomCode]);

  useEffect(() => {
    if (mobileTab === 'chat' && messages.length > 0) {
      const latestMessageTime = Math.max(...messages.map(m => m.timestamp));
      if (latestMessageTime > lastReadTimestamp) {
        setLastReadTimestamp(latestMessageTime);
        localStorage.setItem(`lastRead_${roomCode}`, latestMessageTime.toString());
      }
    }
  }, [messages, mobileTab, roomCode, lastReadTimestamp]);

  const unreadCount = messages.filter(msg => {
    if (msg.playerId === playerId) return false;
    return msg.timestamp > lastReadTimestamp;
  }).length;

  const handleTabChange = (tab: 'canvas' | 'chat' | 'players') => {
    setMobileTab(tab);
    if (tab === 'chat' && messages.length > 0) {
      const latestMessageTime = Math.max(...messages.map(m => m.timestamp));
      setLastReadTimestamp(latestMessageTime);
      localStorage.setItem(`lastRead_${roomCode}`, latestMessageTime.toString());
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(`lastRead_${roomCode}`);
    onLeaveRoom();
  };

  const handleRequestNotification = async () => {
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const handleSaveSettings = () => {
    if (!passwordEnabled) {
      onUpdatePassword(null);
    } else if (passwordInput.trim()) {
      onUpdatePassword(passwordInput.trim());
    }
    // If passwordEnabled but input is empty, keep existing password (no change)
    onUpdateCapacity(capacityInput);
  };

  const settingsPopoverContent = (
    <div className="space-y-3 text-sm">
      {/* Theme */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Tema</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Bunyi</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => setSoundMuted(toggleMute())}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Notifikasi</label>
        {notifPermission === 'default' && (
          <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={handleRequestNotification}>
            Aktifkan
          </Button>
        )}
        {notifPermission === 'granted' && (
          <div className="h-8 w-8 flex items-center justify-center">
            <Bell className="w-4 h-4 text-emerald-500" />
          </div>
        )}
        {notifPermission === 'denied' && (
          <div className="h-8 w-8 flex items-center justify-center">
            <BellOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Admin-only room settings */}
      {isAdmin && (
        <div className="border-t pt-3 space-y-3">
          {/* Capacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Kapasiti Pemain</label>
              <span className="text-sm font-bold text-primary tabular-nums">{capacityInput} pemain</span>
            </div>
            <Slider
              min={minCapacity}
              max={20}
              step={1}
              value={[capacityInput]}
              onValueChange={(vals) => setCapacityInput(vals[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minCapacity}</span>
              <span>20</span>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Kata Laluan</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="settings-password-toggle"
                checked={passwordEnabled}
                onChange={e => setPasswordEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="settings-password-toggle" className="text-sm text-muted-foreground cursor-pointer">
                Aktifkan kata laluan
              </label>
            </div>
            {passwordEnabled && (
              <Input
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Kata laluan bilik"
                type="password"
                className="h-9"
              />
            )}
          </div>

          <Button size="sm" className="w-full h-9 font-semibold" onClick={handleSaveSettings}>
            Simpan Tetapan
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b">
        <div className="px-3 py-2 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-white shadow-sm flex-shrink-0">
              <Image src="/logo.png" alt="LukisLukis" width={20} height={20} />
            </div>
            <span className="font-black text-sm tracking-tight">LukisLukis</span>
          </div>
          {/* Right controls: room code, settings, exit */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCopyCode}
              className="flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-md hover:bg-muted/80 active:scale-95 transition-all"
            >
              <code className="text-sm font-mono font-bold tracking-widest">{roomCode}</code>
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="p-4">
                {settingsPopoverContent}
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={handleLeaveRoom} className="h-8 w-8 p-0 text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area — unified desktop/mobile layout */}
      <div className="flex-1 flex gap-3 overflow-hidden md:p-3">
        {/* Left: Players — desktop only */}
        <div className="hidden md:flex flex-col w-60 bg-card rounded-lg border overflow-hidden shadow-sm">
          {/* Brand */}
          <div className="px-3 pt-2 pb-1 flex items-center justify-center gap-2">
            <div className="p-1 rounded-md bg-white shadow-sm flex-shrink-0">
              <Image src="/logo.png" alt="LukisLukis" width={22} height={22} />
            </div>
            <span className="font-black text-base tracking-tight">LukisLukis</span>
          </div>
          <div className="p-3 border-b flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCopyCode} className="flex-1 gap-2 font-mono tracking-widest text-sm h-8">
              {roomCode}
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <PlayerList
              players={players}
              currentDrawerId={currentDrawerId}
              currentPlayerId={playerId}
              adminId={adminId}
              onVoteToKick={onVoteToKick}
            />
          </div>

          <div className="p-3 border-t space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  Tetapan
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="p-4">
                {settingsPopoverContent}
              </PopoverContent>
            </Popover>
            <Button variant="destructive" size="sm" onClick={handleLeaveRoom} className="w-full gap-2">
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </Button>
          </div>
        </div>

        {/* Center: Main Content — rendered ONCE, CSS-hidden on mobile when not canvas tab */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden ${mobileTab !== 'canvas' ? 'hidden md:flex' : ''}`}>
          {children}
        </div>

        {/* Right: Chat — desktop only */}
        <div className="hidden md:flex flex-col w-80 h-full">
          <ChatBox
            messages={messages}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            onSendMessage={onSendMessage}
            playerId={playerId}

          />
        </div>

        {/* Mobile: chat tab */}
        {mobileTab === 'chat' && (
          <div className="md:hidden flex-1 h-full">
            <ChatBox
              messages={messages}
              isDrawer={isDrawer}
              hasGuessed={hasGuessed}
              onSendMessage={onSendMessage}
              playerId={playerId}
              compact={true}
  
            />
          </div>
        )}

        {/* Mobile: players tab */}
        {mobileTab === 'players' && (
          <div className="md:hidden flex-1 h-full overflow-y-auto p-4 bg-card">
            <PlayerList
              players={players}
              currentDrawerId={currentDrawerId}
              currentPlayerId={playerId}
              adminId={adminId}
              onVoteToKick={onVoteToKick}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden bg-card border-t">
        <div className="flex">
          <button
            onClick={() => handleTabChange('canvas')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'canvas'
                ? 'text-primary border-t-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Canvas
          </button>

          <button
            onClick={() => handleTabChange('chat')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'chat'
                ? 'text-primary border-t-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              Chat
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('players')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'players'
                ? 'text-primary border-t-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{players.length}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
