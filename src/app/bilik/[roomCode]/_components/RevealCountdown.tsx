'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Frown } from 'lucide-react';
import { Player } from '@/types/game';

interface RevealCountdownProps {
  currentWord: string | null;
  players: Player[];
  allGuessed: boolean;
  isLastTurn: boolean;
  isLastRound: boolean;
  isGameEnding: boolean;
  currentRound: number;
}

export function RevealCountdown({
  currentWord,
  players,
  allGuessed,
  isLastTurn,
  isLastRound,
  isGameEnding,
  currentRound,
}: RevealCountdownProps) {
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

  const isUrgent = countdown <= 2;

  const countdownLabel = isGameEnding
    ? 'Permainan akan tamat dalam'
    : isLastTurn
      ? `Pusingan ${currentRound + 1} akan bermula dalam`
      : 'Giliran seterusnya bermula dalam';

  return (
    <div className="flex-1 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <Card className="max-w-xl w-full shadow-sm border">
        <CardContent className="pt-5 pb-5 px-5 space-y-5">
          {/* Answer */}
          <div className="text-center space-y-2">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Jawapannya ialah</h2>
            <div className="text-4xl md:text-5xl font-bold text-primary break-words px-2">
              {currentWord}
            </div>
            {allGuessed && (
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">Semua pemain meneka dengan betul!</span>
              </div>
            )}
          </div>

          {/* Correct guessers */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Teka dengan betul</p>
            {players.filter(p => p.hasGuessed).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players
                  .filter(p => p.hasGuessed)
                  .sort((a, b) => (b.lastRoundPoints || 0) - (a.lastRoundPoints || 0))
                  .map((player) => (
                    <div
                      key={player.playerId}
                      className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg text-center"
                    >
                      <div className="font-medium text-sm truncate">{player.name}</div>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                        +{player.lastRoundPoints || 0} mata
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-3 flex items-center justify-center gap-2">
                <Frown className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">Tiada siapa yang meneka dengan betul</span>
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{countdownLabel}</p>
            <span className={`block font-bold text-4xl tabular-nums ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`}>
              {countdown}s
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
