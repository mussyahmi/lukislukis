'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, UserMinus, UserPlus, SkipForward, AlertTriangle, Timer, PartyPopper, Gamepad2, Ban, ShieldCheck, UserX } from 'lucide-react';

export interface Message {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  isNearMatch: boolean;
  timestamp: number;
  icon?: string;
}

interface ChatBoxProps {
  messages: Message[];
  isDrawer: boolean;
  hasGuessed: boolean;
  onSendMessage: (text: string) => void;
  playerId: string;
  compact?: boolean;
}

export function ChatBox({ messages, isDrawer, hasGuessed, onSendMessage, playerId, compact = false }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    const now = Date.now();
    if (now - lastMessageTime < 1000) return;
    onSendMessage(trimmedInput);
    setInput('');
    setLastMessageTime(now);
  };

  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  const isInputDisabled = isDrawer || hasGuessed;
  const placeholderText = isDrawer
    ? 'Anda sedang melukis...'
    : hasGuessed
      ? 'Anda sudah meneka dengan betul!'
      : 'Taip tekaan anda...';

  const getSystemIcon = (iconName?: string) => {
    const iconProps = { className: "w-3.5 h-3.5" };
    switch (iconName) {
      case 'user-minus': return <UserMinus {...iconProps} />;
      case 'user-plus': return <UserPlus {...iconProps} />;
      case 'skip-forward': return <SkipForward {...iconProps} />;
      case 'alert-triangle': return <AlertTriangle {...iconProps} />;
      case 'timer': return <Timer {...iconProps} />;
      case 'party-popper': return <PartyPopper {...iconProps} />;
      case 'gamepad2': return <Gamepad2 {...iconProps} />;
      case 'user-x': return <UserX {...iconProps} />;
      case 'shield-check': return <ShieldCheck {...iconProps} />;
      case 'ban': return <Ban {...iconProps} />;
      default: return null;
    }
  };

  const renderMessage = (msg: Message) => {
    const isOwn = msg.playerId === playerId;
    const isSystem = msg.playerId === 'system';

    return (
      <div
        key={msg.id}
        className={`flex flex-col ${isSystem ? 'items-center' : isOwn ? 'items-end' : 'items-start'} animate-slide-up`}
      >
        {isSystem ? (
          <div className="max-w-[90%] my-0.5">
            <div className="bg-muted border border-border rounded-md px-2.5 py-1.5 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {msg.icon && (
                  <span className="text-muted-foreground flex-shrink-0">
                    {getSystemIcon(msg.icon)}
                  </span>
                )}
                <p className="text-xs font-medium text-muted-foreground break-words">{msg.text}</p>
              </div>
            </div>
          </div>
        ) : msg.isCorrect ? (
          <div className="max-w-[85%] my-0.5">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-2.5 py-1.5 flex items-center gap-2 animate-bounce-soft">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{msg.playerName}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{msg.text}</p>
              </div>
            </div>
          </div>
        ) : msg.isNearMatch ? (
          <div className="max-w-[85%] my-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-medium text-foreground">{msg.playerName}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400">· hampir betul</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5">
              <p className="text-xs break-words">{msg.text}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[85%] my-0.5">
            {!isOwn && (
              <span className="text-xs font-medium text-muted-foreground mb-0.5 block">{msg.playerName}</span>
            )}
            <div className={`rounded-md px-2.5 py-1.5 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="text-xs break-words">{msg.text}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="h-full flex flex-col bg-card">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {sortedMessages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t bg-card p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholderText}
              disabled={isInputDisabled}
              maxLength={50}
              className="flex-1 text-sm h-10"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={isInputDisabled || !input.trim()} className="h-10 w-10 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm border gap-0">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 px-3 pt-0 pb-3">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden mb-3 space-y-0.5 pr-1"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {sortedMessages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isInputDisabled}
            maxLength={50}
            className="flex-1 text-sm h-9"
          />
          <Button type="submit" size="icon" disabled={isInputDisabled || !input.trim()} className="h-9 w-9 flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
