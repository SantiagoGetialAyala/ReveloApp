'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { Button } from './button';
import { apiFetch } from '../lib/api';

type TripMessage = {
  id: string;
  tripId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function TripChat({
  tripId,
  token,
  userId,
  readOnly = false,
}: {
  tripId: string;
  token: string | null;
  userId: string;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const items = await apiFetch<TripMessage[]>(`/trips/${tripId}/messages`, { token, signal });
        if (!signal?.aborted) {
          setMessages(items);
          setError('');
        }
      } catch (reason) {
        if (!signal?.aborted) setError((reason as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [token, tripId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 8000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message || sending || !token) return;
    setSending(true);
    setError('');
    try {
      await apiFetch(`/trips/${tripId}/messages`, {
        token,
        method: 'POST',
        body: JSON.stringify({ body: message }),
      });
      setBody('');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="trip-surface print-hidden overflow-hidden" aria-label="Chat del viaje">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">Chat del viaje</h2>
          <p className="text-xs text-slate-500">
            {readOnly
              ? 'Vista administrativa de solo lectura'
              : 'Mensajes privados entre las dos partes'}
          </p>
        </div>
      </div>
      <div className="max-h-96 min-h-32 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando mensajes…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Todavía no hay mensajes. Coordina aquí los detalles del viaje.
          </p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === userId;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <article
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${mine ? 'rounded-br-sm bg-blue-700 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'}`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                <time
                  className={`mt-1 block text-right text-[10px] ${mine ? 'text-blue-100' : 'text-slate-500'}`}
                  dateTime={message.createdAt}
                >
                  {new Date(message.createdAt).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </time>
              </article>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {error && (
        <p role="alert" className="px-5 text-sm text-red-700">
          {error}
        </p>
      )}
      {!readOnly && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4">
          <label className="sr-only" htmlFor={`trip-message-${tripId}`}>
            Escribe un mensaje
          </label>
          <textarea
            id={`trip-message-${tripId}`}
            className="input min-h-11 max-h-28 flex-1 resize-y"
            maxLength={2000}
            rows={1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe un mensaje…"
          />
          <Button
            type="submit"
            className="h-11 shrink-0 px-3"
            disabled={sending || !body.trim()}
            aria-label="Enviar mensaje"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      )}
      {!readOnly && (
        <p className="px-4 pb-3 text-[11px] text-slate-400">
          Hasta 2.000 caracteres · 10 mensajes por minuto
        </p>
      )}
    </section>
  );
}
