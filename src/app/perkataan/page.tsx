'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { database, ref, onValue, push, set, update, initializeAuth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

const VOTE_THRESHOLD = 3;

interface Suggestion {
  id: string;
  word: string;
  suggestedAt: number;
  votes: number;
  voters: Record<string, boolean>;
}

export default function PerkataanPage() {
  const router = useRouter();
  const [existingWords, setExistingWords] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newWord, setNewWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cadangan' | 'sedia-ada'>('cadangan');
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    fetch('/words.json')
      .then(r => r.json())
      .then((words: string[]) => setExistingWords([...words].sort((a, b) => a.localeCompare(b, 'ms'))));
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'suggestions'), (snapshot) => {
      if (!snapshot.exists()) { setSuggestions([]); return; }
      const data = snapshot.val();
      const list: Suggestion[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        word: val.word,
        suggestedAt: val.suggestedAt,
        votes: val.votes || 0,
        voters: val.voters || {},
      }));
      setSuggestions(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    initializeAuth().then(setCurrentUid).catch(() => {});
  }, []);

  const handleSuggest = async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    setSubmitting(true);
    try {
      const uid = await initializeAuth();
      if (existingWords.some(w => w.toLowerCase() === word)) {
        toast.error('Perkataan ini sudah ada dalam senarai!');
        return;
      }
      if (suggestions.some(s => s.word.toLowerCase() === word)) {
        toast.error('Perkataan ini sudah dicadangkan!');
        return;
      }
      const newRef = push(ref(database, 'suggestions'));
      await set(newRef, {
        word,
        suggestedAt: Date.now(),
        votes: 1,
        voters: { [uid]: true },
      });
      setNewWord('');
      toast.success('Cadangan berjaya dihantar!');
    } catch {
      toast.error('Gagal menghantar cadangan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (suggestion: Suggestion) => {
    if (!currentUid) return;
    const hasVoted = !!suggestion.voters[currentUid];
    const newVotes = hasVoted ? suggestion.votes - 1 : suggestion.votes + 1;
    const newVoters = { ...suggestion.voters };
    if (hasVoted) {
      delete newVoters[currentUid];
    } else {
      newVoters[currentUid] = true;
    }
    await update(ref(database, `suggestions/${suggestion.id}`), {
      votes: newVotes,
      voters: newVoters,
    });
  };

  const popularSuggestions = useMemo(() =>
    suggestions.filter(s => s.votes >= VOTE_THRESHOLD).sort((a, b) => b.votes - a.votes),
    [suggestions]
  );

  const regularSuggestions = useMemo(() =>
    suggestions.filter(s => s.votes < VOTE_THRESHOLD).sort((a, b) => a.word.localeCompare(b.word, 'ms')),
    [suggestions]
  );

  const filteredWords = useMemo(() =>
    existingWords.filter(w => w.includes(search.toLowerCase())),
    [existingWords, search]
  );

  const groupedWords = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const word of filteredWords) {
      const letter = word[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(word);
    }
    return groups;
  }, [filteredWords]);

  const suggestionsPanel = (
    <div className="space-y-4">
      {/* Suggest form */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold">Cadangkan Perkataan Baru</p>
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan perkataan..."
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSuggest()}
              className="h-10"
              disabled={submitting}
            />
            <Button
              onClick={handleSuggest}
              disabled={submitting || !newWord.trim()}
              className="h-10 px-4 font-semibold shrink-0"
            >
              {submitting ? <Spinner /> : 'Hantar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Perkataan mestilah dalam Bahasa Melayu dan boleh dilukis.</p>
        </CardContent>
      </Card>

      {/* Popular suggestions */}
      {popularSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Popular · {popularSuggestions.length} cadangan
          </p>
          {popularSuggestions.map(s => (
            <SuggestionCard key={s.id} suggestion={s} currentUid={currentUid} onVote={handleVote} popular />
          ))}
        </div>
      )}

      {/* Regular suggestions */}
      {regularSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Semua Cadangan · {regularSuggestions.length}
          </p>
          {regularSuggestions.map(s => (
            <SuggestionCard key={s.id} suggestion={s} currentUid={currentUid} onVote={handleVote} />
          ))}
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Tiada cadangan lagi. Jadilah yang pertama!
        </div>
      )}
    </div>
  );

  const wordsPanel = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari perkataan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 pl-9"
        />
      </div>

      {/* Grouped words */}
      {Object.entries(groupedWords)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, words]) => (
          <div key={letter} className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{letter}</p>
            <div className="flex flex-wrap gap-1.5">
              {words.map(word => (
                <span key={word} className="inline-flex items-center bg-muted px-2.5 py-1 rounded-md text-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>
        ))}

      {filteredWords.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Tiada perkataan dijumpai.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-white shadow-sm flex-shrink-0">
                <Image src="/logo.png" alt="LukisLukis" width={20} height={20} />
              </div>
              <span className="font-bold text-sm">Perkataan</span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Tabs — mobile only */}
        <div className="md:hidden max-w-6xl mx-auto flex border-t">
          <button
            onClick={() => setActiveTab('cadangan')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'cadangan'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cadangan {suggestions.length > 0 && `(${suggestions.length})`}
          </button>
          <button
            onClick={() => setActiveTab('sedia-ada')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'sedia-ada'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sedia Ada ({existingWords.length})
          </button>
        </div>
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid md:grid-cols-2 gap-6 max-w-6xl mx-auto px-6 py-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cadangan {suggestions.length > 0 && `· ${suggestions.length}`}
          </p>
          {suggestionsPanel}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Sedia Ada · {existingWords.length} perkataan
          </p>
          {wordsPanel}
        </div>
      </div>

      {/* Mobile: tab layout */}
      <div className="md:hidden max-w-6xl mx-auto px-4 py-4">
        {activeTab === 'cadangan' && suggestionsPanel}
        {activeTab === 'sedia-ada' && wordsPanel}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  currentUid,
  onVote,
  popular = false,
}: {
  suggestion: Suggestion;
  currentUid: string | null;
  onVote: (s: Suggestion) => void;
  popular?: boolean;
}) {
  const hasVoted = currentUid ? !!suggestion.voters[currentUid] : false;
  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border ${
      popular ? 'bg-primary/5 border-primary/20' : 'bg-card'
    }`}>
      <span className={`text-sm font-medium capitalize ${popular ? 'text-primary font-semibold' : ''}`}>
        {suggestion.word}
      </span>
      <button
        onClick={() => onVote(suggestion)}
        disabled={!currentUid}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
          hasVoted
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <ThumbsUp className="w-3 h-3" />
        {suggestion.votes}
      </button>
    </div>
  );
}
