'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { HelpCircle } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import FeedbackButton from '@/components/common/FeedbackButton';

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

      <div className="w-full max-w-sm space-y-3">
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
        </div>

      <Card className="shadow-sm border">
        <CardTitle>
          <div className="flex items-center gap-2 justify-center">
            <span className="font-bold text-xl">Sertai Bilik</span>
          </div>
        </CardTitle>
        <CardContent className="px-5 pb-5 space-y-5">
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
            <FeedbackButton />
            <span>·</span>
            <a
              href="https://buymeacoffee.com/mustafasyahmi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Belanja Kopi
            </a>
          </p>
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
