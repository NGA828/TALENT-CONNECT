'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Info, Send, Sparkles, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { AiMessage, AiReply, AiStatus, EventItem, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Alert, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';

const TASKS = [
  { id: 'IMPROVE_BIO', label: 'Improve my bio', prompt: 'Please rewrite my bio so it is clear, confident and specific to my specialization.' },
  { id: 'SKILLS_PRESENTATION', label: 'Present my skills', prompt: 'Help me present my skills and experience in a way that promoters will notice.' },
  { id: 'PORTFOLIO_DESCRIPTION', label: 'Describe a portfolio item', prompt: 'Help me write a short description for a portfolio item. It is a ' },
  { id: 'MESSAGE_DRAFT', label: 'Draft a message', prompt: 'Draft a polite, professional message to a promoter about ' },
  { id: 'EVENT_ADVICE', label: 'Event advice', prompt: 'Give me advice on how to prepare for this event.' },
] as const;

type TaskId = (typeof TASKS)[number]['id'] | 'GENERAL';

export function AiAssistantPage() {
  const toast = useToast();
  const status = useApi<AiStatus>('/ai/status');
  const history = useApi<AiMessage[]>('/ai/history');
  const events = useApi<Paginated<EventItem>>('/events', { pageSize: 50 });
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [task, setTask] = useState<TaskId>('GENERAL');
  const [eventId, setEventId] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, sending]);

  const send = async (content = text, chosen: TaskId = task) => {
    const message = content.trim();
    if (message.length < 2 || sending) return;
    const optimistic: AiMessage = { id: `tmp-${++seq.current}`, role: 'user', content: message, task: chosen, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText('');
    setSending(true);
    try {
      const res = await api.post<AiReply>('/ai/chat', { message, task: chosen === 'GENERAL' ? undefined : chosen, eventId: chosen === 'EVENT_ADVICE' && eventId ? eventId : undefined });
      setMessages((m) => [...m, { id: `ai-${++seq.current}`, role: 'assistant', content: res.reply, task: res.task, createdAt: new Date().toISOString() }]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setText(message);
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    try {
      await api.del('/ai/history');
      setMessages([]);
      toast.success('Conversation cleared.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setConfirmClear(false);
  };

  const copy = async (m: AiMessage) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(m.id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('Copying is not available in this browser.');
    }
  };

  return (
    <>
      <PageHeader
        title="AI assistant"
        description="A writing partner for your bio, portfolio descriptions and messages to promoters."
        actions={messages.length > 0 ? <Button variant="outline" onClick={() => setConfirmClear(true)}><Trash2 className="size-4" /> Clear conversation</Button> : undefined}
      />
      {status.data && (
        <Alert tone={status.data.live ? 'success' : 'info'} className="mb-4">
          <span className="flex items-start gap-2"><Info className="mt-0.5 size-4 shrink-0" />
            {status.data.live ? <span>Connected to a live AI model (<strong>{status.data.model}</strong>). The API key stays on the server and is never sent to your browser.</span> : <span><strong>Offline assistant.</strong> No external AI provider is configured, so replies come from the built-in template writer. It works with your profile details but is less flexible than a live model.</span>}
          </span>
        </Alert>
      )}

      <div className="flex h-[calc(100vh-17rem)] min-h-[28rem] flex-col overflow-hidden rounded-card border border-slate-200 bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {history.loading ? (
            <SkeletonRows rows={3} />
          ) : history.error && !history.data ? (
            <ErrorState error={history.error} onRetry={() => void history.reload()} />
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600"><Sparkles className="size-7" /></span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">What would you like help with?</h2>
              <p className="mt-1 text-sm text-slate-500">Pick a starting point or write your own request below.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {TASKS.map((t) => (
                  <button key={t.id} onClick={() => { setTask(t.id); if (t.id === 'IMPROVE_BIO' || t.id === 'SKILLS_PRESENTATION') void send(t.prompt, t.id); else setText(t.prompt); }} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700">{t.label}</button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <li key={m.id} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  {m.role === 'assistant' && <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white"><Sparkles className="size-4" /></span>}
                  <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed', m.role === 'user' ? 'rounded-tr-md bg-accent-600 text-white' : 'rounded-tl-md border border-slate-200 bg-slate-50 text-slate-800')}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <div className={cn('mt-2 flex items-center gap-2 text-[11px]', m.role === 'user' ? 'text-white/70' : 'text-slate-400')}>
                      {m.task && m.task !== 'GENERAL' && <Badge tone="slate" className={m.role === 'user' ? 'bg-white/15 text-white ring-white/20' : ''}>{TASKS.find((t) => t.id === m.task)?.label ?? m.task}</Badge>}
                      <span>{formatDate(m.createdAt, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      {m.role === 'assistant' && (
                        <button onClick={() => void copy(m)} className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-slate-500 hover:bg-slate-200">
                          {copied === m.id ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {sending && (
                <li className="flex gap-3" role="status">
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white"><Sparkles className="size-4" /></span>
                  <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3"><span className="inline-flex gap-1" aria-label="Assistant is writing">{[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />)}</span></div>
                </li>
              )}
            </ul>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-100 p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {TASKS.map((t) => (
                <button key={t.id} onClick={() => setTask(task === t.id ? 'GENERAL' : t.id)} aria-pressed={task === t.id} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', task === t.id ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{t.label}</button>
              ))}
              {task === 'EVENT_ADVICE' && (
                <Select aria-label="Event to get advice about" value={eventId} onChange={(e) => setEventId(e.target.value)} className="!h-8 max-w-56 text-xs">
                  <option value="">Choose an event (optional)</option>
                  {events.data?.items.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </Select>
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2">
              <label htmlFor="ai-input" className="sr-only">Your request</label>
              <textarea
                id="ai-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                rows={2}
                maxLength={2000}
                placeholder="Ask for help with your bio, a portfolio caption or a message…"
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-200"
              />
              <Button type="submit" size="lg" loading={sending} disabled={text.trim().length < 2} aria-label="Send"><Send className="size-4" /></Button>
            </form>
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clear} title="Clear this conversation?" description="Your saved assistant history will be permanently deleted." confirmLabel="Clear" />
    </>
  );
}
