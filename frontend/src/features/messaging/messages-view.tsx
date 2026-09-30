'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { formatDate, formatTime, fullName, timeAgo } from '@/lib/format';
import type { Conversation, Message, UserSummary } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { humanize } from '@/lib/format';

export function MessagesView() {
  const params = useSearchParams();
  const initial = params.get('to');
  const [activeId, setActiveId] = useState<string | null>(initial);
  const list = useApi<Conversation[]>('/messages/conversations', undefined, { pollMs: 15000 });
  // When a conversation is opened via ?to= for someone with no history yet, we still need their name.
  const target = useApi<UserSummary>(activeId && !list.data?.some((c) => c.user.id === activeId) ? `/users/${activeId}/summary` : null);

  const activeConv = list.data?.find((c) => c.user.id === activeId);
  const activeUser = activeConv?.user ?? target.data ?? null;

  return (
    <>
      <PageHeader title="Messages" description="Direct conversations with the talents and promoters you work with." />
      <div className="grid h-[calc(100vh-14rem)] min-h-[30rem] overflow-hidden rounded-card border border-slate-200 bg-white md:grid-cols-[320px_1fr]">
        <aside className={cn('flex min-h-0 flex-col border-slate-200 md:border-r', activeId && 'hidden md:flex')}>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Conversations</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.loading ? (
              <SkeletonRows rows={5} className="p-3" />
            ) : list.error && !list.data ? (
              <ErrorState error={list.error} onRetry={() => void list.reload()} className="m-3 border-0" />
            ) : list.data && list.data.length === 0 && !activeId ? (
              <div className="p-6 text-center text-sm text-slate-500">No conversations yet. Start one from a talent profile, event or contract.</div>
            ) : (
              <ul>
                {(activeId && !activeConv && activeUser
                  ? [{ user: activeUser, lastMessage: null, unread: 0 } as unknown as Conversation]
                  : []
                ).concat(list.data ?? []).map((c) => (
                  <li key={c.user.id}>
                    <button onClick={() => setActiveId(c.user.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50', activeId === c.user.id && 'bg-accent-50')}>
                      <Avatar firstName={c.user.firstName} lastName={c.user.lastName} src={c.user.avatarUrl} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{fullName(c.user)}</p>
                          {c.lastMessage && <span className="shrink-0 text-xs text-slate-500">{timeAgo(c.lastMessage.sentAt)}</span>}
                        </div>
                        <p className="truncate text-xs text-slate-500">{c.user.headline ?? humanize(c.user.role)}</p>
                        <p className={cn('mt-0.5 truncate text-[13px]', c.unread ? 'font-semibold text-slate-900' : 'text-slate-500')}>{c.lastMessage ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.content}` : 'New conversation'}</p>
                      </div>
                      {c.unread > 0 && <span className="rounded-full bg-accent-600 px-1.5 text-[11px] font-semibold leading-5 text-white">{c.unread}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className={cn('min-h-0 min-w-0 flex-col', activeId ? 'flex' : 'hidden md:flex')}>
          {activeId ? (
            target.error && !activeConv ? (
              <ErrorState error={target.error} className="m-6" />
            ) : (
              <Thread key={activeId} userId={activeId} user={activeUser} onBack={() => setActiveId(null)} onChanged={() => void list.reload()} />
            )
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState className="border-0" icon={<MessageSquare className="size-6" />} title="Select a conversation" description="Choose someone from the list to read and reply to messages." />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Thread({ userId, user, onBack, onChanged }: { userId: string; user: Pick<UserSummary, 'firstName' | 'lastName' | 'avatarUrl' | 'role' | 'headline'> | null; onBack: () => void; onChanged: () => void }) {
  const toast = useToast();
  const state = useApi<Message[]>(`/messages/conversations/${userId}`, undefined, { pollMs: 8000 });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const count = state.data?.length ?? 0;

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  useEffect(() => {
    if (state.data?.some((m) => m.senderId === userId && !m.isRead)) {
      api.patch(`/messages/conversations/${userId}/read`).then(onChanged).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const msg = await api.post<Message>('/messages', { recipientId: userId, content });
      state.setData((prev) => [...(prev ?? []), msg]);
      setText('');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  let lastDay = '';
  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={onBack} aria-label="Back to conversations" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"><ArrowLeft className="size-5" /></button>
        {user ? (
          <>
            <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName(user)}</p>
              <p className="truncate text-xs text-slate-500">{user.headline ?? humanize(user.role)}</p>
            </div>
            <Badge tone="slate" className="ml-auto hidden sm:inline-flex">{humanize(user.role)}</Badge>
          </>
        ) : <Skeleton className="h-9 w-48" />}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-4 py-4" aria-live="polite">
        {state.loading ? (
          <SkeletonRows rows={3} />
        ) : state.error && !state.data ? (
          <ErrorState error={state.error} onRetry={() => void state.reload()} />
        ) : count === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No messages yet — say hello{user ? ` to ${user.firstName}` : ''}.</p>
        ) : (
          state.data!.map((m) => {
            const mine = m.senderId !== userId;
            const day = formatDate(m.sentAt, { weekday: 'short', day: 'numeric', month: 'short' });
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && <p className="my-3 text-center text-xs font-medium text-slate-400">{day}</p>}
                <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs', mine ? 'rounded-br-md bg-accent-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800')}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn('mt-1 text-right text-[11px]', mine ? 'text-white/70' : 'text-slate-400')}>{formatTime(m.sentAt)}{mine && m.isRead ? ' · Read' : ''}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <label htmlFor="message-input" className="sr-only">Message</label>
        <textarea
          id="message-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-200"
        />
        <Button type="submit" loading={sending} disabled={!text.trim()} aria-label="Send message"><Send className="size-4" /></Button>
      </form>
    </>
  );
}
