'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Canvas } from '@/components/game/Canvas';
import { ProgressTimer } from '@/components/game/ProgressTimer';
import { Pencil } from 'lucide-react';
import type { Stroke } from '@/components/game/Canvas';

interface DrawingScreenProps {
  isDrawer: boolean;
  currentWord: string;
  letterCount: number;
  drawerName: string;
  currentRound: number;
  totalRounds: number;
  currentDrawerIndex: number;
  drawOrderLength: number;
  turnStartTime: number;
  turnDuration: number;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
  onClear: () => void;
  onUndo: () => void;
  onTurnComplete: () => void;
}

export function DrawingScreen({
  isDrawer,
  currentWord,
  letterCount,
  drawerName,
  currentRound,
  totalRounds,
  currentDrawerIndex,
  drawOrderLength,
  turnStartTime,
  turnDuration,
  strokes,
  onStrokeComplete,
  onClear,
  onUndo,
  onTurnComplete,
}: DrawingScreenProps) {
  return (
    <div className="flex flex-col gap-2 md:gap-3 flex-1 min-h-0 p-2 md:p-0">
      <Card className="shadow-sm border">
        <CardContent className="pt-2 px-3 pb-2 md:pt-3 md:px-5 md:pb-3">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full max-w-sm">
              <ProgressTimer startTime={turnStartTime} duration={turnDuration} onComplete={onTurnComplete} />
            </div>
            <div className="text-center py-0.5 md:py-1">
              <div className="font-bold font-mono tracking-wider text-primary whitespace-pre text-3xl md:text-5xl">
                {currentWord}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-2 mt-1">
                <span>({letterCount} huruf)</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  <span>{isDrawer ? 'Anda melukis' : `${drawerName} melukis`}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Pusingan {currentRound}/{totalRounds}</Badge>
              <Badge variant="outline" className="text-xs">Giliran {currentDrawerIndex + 1}/{drawOrderLength}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex-1 min-h-0">
        <Canvas isDrawer={isDrawer} onStrokeComplete={onStrokeComplete} onClear={onClear} onUndo={onUndo} strokes={strokes} />
      </div>
    </div>
  );
}
