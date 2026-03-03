'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag } from 'lucide-react';
import { Player } from '@/types/game';

interface RoundEndCountdownProps {
  sortedPlayers: Player[];
  currentRound: number;
  isLastRound: boolean;
}

const rankBadgeStyle = (index: number) => {
  if (index === 0) return 'bg-amber-400 text-white';
  if (index === 1) return 'bg-zinc-400 text-white';
  if (index === 2) return 'bg-orange-400 text-white';
  return 'bg-muted text-muted-foreground';
};

const rankRowStyle = (index: number) => {
  if (index === 0) return 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800';
  if (index === 1) return 'bg-muted/50 border border-border';
  if (index === 2) return 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800';
  return 'bg-muted/30';
};

export function RoundEndCountdown({ sortedPlayers, currentRound, isLastRound }: RoundEndCountdownProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Round end header */}
        <Card className="shadow-sm border">
          <CardContent className="pt-5 pb-5 text-center space-y-2">
            <Flag className="w-10 h-10 mx-auto text-primary animate-bounce-soft" />
            <h1 className="text-2xl md:text-3xl font-bold">Pusingan {currentRound} Tamat</h1>
            {isLastRound ? (
              <p className="text-muted-foreground text-sm">Ini adalah pusingan terakhir</p>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Pusingan {currentRound + 1} bermula dalam</p>
                <span className={`block font-bold text-4xl tabular-nums mt-1 ${countdown <= 2 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                  {countdown}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Standings */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-center">Kedudukan Semasa</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div key={player.playerId} className={`flex items-center gap-3 p-3 rounded-lg ${rankRowStyle(index)}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rankBadgeStyle(index)}`}>
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {player.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{player.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{player.correctGuesses} tekaan betul</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold">{player.score}</div>
                    <div className="text-xs text-muted-foreground">mata</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="h-4" />
      </div>
    </div>
  );
}
