'use client';

import { Crown, Pencil } from 'lucide-react';
import { Player } from '@/types/game';
import { Button } from '@/components/ui/button';

interface PlayerListProps {
  players: Player[];
  currentDrawerId: string | null;
  currentPlayerId: string;
  adminId: string;
  onVoteToKick?: (targetPlayerId: string) => void;
}

export function PlayerList({
  players,
  currentDrawerId,
  currentPlayerId,
  adminId,
  onVoteToKick
}: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getVoteCount = (targetPlayerId: string) => {
    return players.filter(p => p.votedToKick?.[targetPlayerId] === true).length;
  };

  const getTotalVoters = (targetPlayerId: string) => {
    const otherPlayers = players.filter(p => p.playerId !== targetPlayerId).length;
    return Math.ceil(otherPlayers / 2);
  };

  const hasVoted = (targetPlayerId: string) => {
    const currentPlayer = players.find(p => p.playerId === currentPlayerId);
    return currentPlayer?.votedToKick?.[targetPlayerId] === true;
  };

  const canVote = (targetPlayer: Player) => {
    return targetPlayer.playerId !== currentPlayerId;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-amber-400 text-white';
    if (index === 1) return 'bg-zinc-400 text-white';
    if (index === 2) return 'bg-orange-400 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pemain ({players.length})
      </p>
      <div className="space-y-1.5">
        {sortedPlayers.map((player, index) => {
          const isDrawing = player.playerId === currentDrawerId;
          const isYou = player.playerId === currentPlayerId;
          const isAdmin = player.playerId === adminId;
          const voteCount = getVoteCount(player.playerId);
          const totalVoters = getTotalVoters(player.playerId);
          const hasVotedForThisPlayer = hasVoted(player.playerId);
          const showVoteButton = canVote(player);

          return (
            <div
              key={player.playerId}
              className={`p-2.5 rounded-lg transition-all ${
                isDrawing
                  ? 'bg-primary/8 border border-primary/25'
                  : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Rank */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${getRankStyle(index)}`}>
                  {index + 1}
                </div>

                {/* Name & Score */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium truncate ${isYou ? 'text-primary' : ''}`}>
                      {player.name}
                      {isYou && <span className="text-xs text-muted-foreground"> (Anda)</span>}
                    </span>
                    {isAdmin && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    {isDrawing && <Pencil className="w-3 h-3 text-primary flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{player.score} mata</div>
                </div>

                {/* Vote Button */}
                {showVoteButton && onVoteToKick && (
                  <Button
                    variant={hasVotedForThisPlayer ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => onVoteToKick(player.playerId)}
                    className="flex-shrink-0 h-7 px-2 text-xs"
                  >
                    {hasVotedForThisPlayer ? 'Batal' : 'Tendang'}
                  </Button>
                )}
              </div>

              {/* Vote count */}
              {voteCount > 0 && (
                <div className="text-xs font-medium text-destructive mt-1 text-center">
                  {totalVoters - voteCount} lagi undi untuk ditendang
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
