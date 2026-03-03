'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Play, AlertCircle } from 'lucide-react';
import { Player } from '@/types/game';

interface WaitingLobbyProps {
  players: Player[];
  maxPlayers: number;
  adminId: string;
  playerId: string;
  canStart: boolean;
  onStartGame: () => void;
}

export function WaitingLobby({
  players,
  maxPlayers,
  adminId,
  playerId,
  canStart,
  onStartGame,
}: WaitingLobbyProps) {
  const isAdmin = adminId === playerId;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-center">Bilik Permainan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Player List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Pemain ({players.length}/{maxPlayers})</span>
              </div>
              <Badge variant="secondary" className="text-xs">Menunggu...</Badge>
            </div>
            <div className="space-y-1.5">
              {players.map((player) => (
                <div key={player.playerId} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {player.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium">{player.name || 'Unknown'}</span>
                  </div>
                  {player.playerId === adminId && <Crown className="w-4 h-4 text-amber-500" />}
                </div>
              ))}
            </div>
          </div>

          {/* Not enough players warning */}
          {!canStart && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-2.5 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Minimum 3 pemain diperlukan</span>
            </div>
          )}

          {isAdmin ? (
            <Button onClick={onStartGame} disabled={!canStart} className="w-full h-11 text-base font-semibold">
              <Play className="w-4 h-4 mr-2" />
              Mulakan Permainan
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-2">
              Menunggu admin memulakan permainan...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
