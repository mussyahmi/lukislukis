'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Lightbulb } from 'lucide-react';

interface WordSelectionScreenProps {
  isDrawer: boolean;
  drawerName?: string;
  timeRemaining: number;
  wordOptions: string[];
  onSelectWord: (word: string) => void;
}

export function WordSelectionScreen({
  isDrawer,
  drawerName,
  timeRemaining,
  wordOptions,
  onSelectWord,
}: WordSelectionScreenProps) {
  const [localTimeRemaining, setLocalTimeRemaining] = useState(timeRemaining);

  useEffect(() => {
    setLocalTimeRemaining(timeRemaining);
    const interval = setInterval(() => {
      setLocalTimeRemaining((prev) => {
        if (prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const isUrgent = localTimeRemaining <= 5;

  if (!isDrawer) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full shadow-sm border">
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Timer className={`w-8 h-8 ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                <span className={`text-5xl font-bold tabular-nums ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                  {localTimeRemaining}s
                </span>
              </div>
              <div>
                <p className="text-lg font-bold">{drawerName}</p>
                <p className="text-muted-foreground text-sm">sedang memilih perkataan...</p>
              </div>
              <Alert className="flex items-center justify-center gap-2">
                <Lightbulb className="h-4 w-4 flex-shrink-0 static" />
                <AlertDescription>Sediakan diri anda untuk meneka!</AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-sm border">
        <CardContent className="pt-5 space-y-5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className={`w-6 h-6 ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <span className={`text-4xl font-bold tabular-nums ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                {localTimeRemaining}s
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Pilih perkataan untuk dilukis</p>
          </div>

          <div className="grid gap-3">
            {wordOptions.map((word, index) => (
              <Button
                key={`${word}-${index}`}
                onClick={() => onSelectWord(word)}
                variant="outline"
                className="w-full h-20 text-2xl font-bold transition-all hover:scale-[1.01]"
              >
                {word}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
