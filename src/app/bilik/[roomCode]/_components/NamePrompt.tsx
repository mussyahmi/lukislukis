'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface NamePromptProps {
  onSubmit: (name: string) => Promise<boolean>;
  roomCode: string;
}

export function NamePrompt({ onSubmit, roomCode }: NamePromptProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await onSubmit(name);
    if (!success) setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-sm shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-center">Sertai Bilik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Anda dijemput untuk menyertai bilik</p>
            <div className="inline-flex items-center bg-muted border rounded-md px-4 py-2">
              <code className="text-xl font-mono font-bold tracking-widest">{roomCode}</code>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold">Nama Anda</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama..."
                maxLength={20}
                disabled={loading}
                autoFocus
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Maksimum 20 aksara</p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading} className="flex-1 h-10">
                Batal
              </Button>
              <Button type="submit" disabled={loading || !name.trim()} className="flex-1 h-10 font-semibold">
                {loading ? 'Menyertai...' : 'Sertai Bilik'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
