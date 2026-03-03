'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Clock } from 'lucide-react';
import { Player } from '@/types/game';

interface GameEndScreenProps {
  sortedPlayers: Player[];
  isAdmin: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
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

export function GameEndScreen({ sortedPlayers, isAdmin, onPlayAgain, onLeaveRoom }: GameEndScreenProps) {
  const winner = sortedPlayers[0];

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Winner */}
        <Card className="shadow-sm border">
          <CardContent className="pt-5 pb-5 text-center space-y-2">
            <Trophy className="w-12 h-12 mx-auto text-amber-400 animate-bounce-soft" />
            <h1 className="text-2xl md:text-3xl font-bold">Permainan Tamat</h1>
            <p className="text-lg md:text-xl">
              Pemenang: <span className="font-bold text-primary">{winner.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {winner.score} mata · {winner.correctGuesses} tekaan betul
            </p>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-center">Kedudukan Akhir</CardTitle>
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

        {/* Actions */}
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4 px-4 space-y-2">
            {isAdmin ? (
              <Button onClick={onPlayAgain} className="w-full h-11 font-semibold">
                Main Semula
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Menunggu admin memulakan permainan...</span>
              </div>
            )}
            <Button onClick={onLeaveRoom} variant="outline" className="w-full h-10 text-sm font-medium">
              Keluar ke Menu Utama
            </Button>
          </CardContent>
        </Card>

        <div className="h-4" />
      </div>
    </div>
  );
}
