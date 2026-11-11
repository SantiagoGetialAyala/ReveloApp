'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useSession } from './session';
import { Button } from './button';
import { ErrorMessage, MoneyInput } from './form-fields';
import { apiFetch } from '../lib/api';
import { moneyCop } from '../lib/utils';

type Actor = {
  id: string;
  role: string;
  profile?: { firstName: string; lastName: string } | null;
  companyProfile?: { businessName: string } | null;
  transporterProfile?: { displayName: string } | null;
};
type Negotiation = {
  status: string;
  negotiable: boolean;
  currentPriceCop: string | number;
  messages: { id: string; body: string; senderId: string; sender: Actor; createdAt: string }[];
  offers: {
    id: string;
    priceCop: string | number;
    senderId: string;
    sender: Actor;
    createdAt: string;
  }[];
};

export function ProposalNegotiation({
  proposalId,
  publishedPriceCop,
  onAccept,
  readOnly = false,
}: {
  proposalId: string;
  publishedPriceCop: string | number;
  onAccept?: () => void;
  readOnly?: boolean;
}) {
  const { token, user } = useSession();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Negotiation | null>(null);
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await apiFetch<Negotiation>(`/proposals/${proposalId}/negotiation`, { token });
      setData(result);
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, [proposalId, token]);
  useEffect(() => {
    if (!open) return;
    void load();
    const interval = window.setInterval(() => void load(), 7000);
    return () => window.clearInterval(interval);
  }, [open, load]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/proposals/${proposalId}/messages`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ body: message.trim() }),
      });
      setMessage('');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function counterOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/proposals/${proposalId}/counteroffers`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ priceCop: Number(price) }),
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const closed = data?.status !== 'PENDING';
  const latestOffer = data?.offers[data.offers.length - 1];
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="border border-blue-100 bg-blue-50 text-blue-900 hover:bg-blue-100"
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={16} /> {readOnly ? 'Ver conversación' : 'Abrir chat y negociar'}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`negotiation-title-${proposalId}`}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                  Propuesta · negociación
                </p>
                <h2
                  id={`negotiation-title-${proposalId}`}
                  className="mt-1 text-xl font-bold text-slate-950"
                >
                  Precio y conversación
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-white"
                aria-label="Cerrar negociación"
              >
                <X />
              </button>
            </header>
            <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:px-6">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Presupuesto publicado</p>
                <strong className="mt-1 block text-lg">{moneyCop(publishedPriceCop)}</strong>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Precio actual acordable</p>
                <strong className="mt-1 block text-lg text-blue-950">
                  {moneyCop(data?.currentPriceCop ?? publishedPriceCop)}
                </strong>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
              <ErrorMessage message={error} />
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Historial de precios
              </h3>
              <ol className="mb-5 space-y-2">
                {!data?.offers.length && (
                  <li className="text-sm text-slate-500">
                    La postulación aún no tiene cambios de precio.
                  </li>
                )}
                {data?.offers.map((offer, index) => (
                  <li
                    key={offer.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${index === data.offers.length - 1 ? 'bg-blue-50 text-blue-950' : 'bg-slate-50 text-slate-600'}`}
                  >
                    <span>
                      {offer.senderId === user?.id
                        ? 'Tu propuesta'
                        : offer.sender.role === 'CLIENT'
                          ? 'Precio de la empresa'
                          : 'Precio del transportador'}
                    </span>
                    <strong>{moneyCop(offer.priceCop)}</strong>
                    <time className="hidden text-xs text-slate-400 sm:block">
                      {new Date(offer.createdAt).toLocaleString('es-CO')}
                    </time>
                  </li>
                ))}
              </ol>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Mensajes
              </h3>
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3 sm:p-4">
                {!data?.messages.length && (
                  <p className="py-3 text-center text-sm text-slate-500">
                    Aún no hay mensajes. Coordina aquí los detalles antes de confirmar.
                  </p>
                )}
                {data?.messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex ${item.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${item.senderId === user?.id ? 'rounded-br-sm bg-blue-700 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}
                    >
                      <p className="mb-1 text-[11px] font-semibold opacity-70">
                        {item.senderId === user?.id
                          ? 'Tú'
                          : item.sender.role === 'CLIENT'
                            ? (item.sender.companyProfile?.businessName ?? 'Empresa')
                            : (item.sender.transporterProfile?.displayName ?? 'Transportador')}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
                      <time className="mt-1 block text-right text-[10px] opacity-60">
                        {new Date(item.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {!closed && !readOnly && (
              <footer className="grid gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
                {data?.negotiable && (
                  <form
                    onSubmit={counterOffer}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                  >
                    <label className="field text-xs">
                      Tu contraoferta (COP)
                      <MoneyInput
                        inputMode="numeric"
                        min="1"
                        value={price}
                        onChange={setPrice}
                        required
                        placeholder="Escribe el valor que propones"
                      />
                      <span className="text-xs font-normal text-slate-500">
                        Puedes proponer un valor distinto al que envió el conductor.
                      </span>
                    </label>
                    <Button className="self-end" disabled={busy}>
                      Enviar contraoferta
                    </Button>
                  </form>
                )}
                {!data?.negotiable && (
                  <p className="text-xs text-slate-500">
                    Esta carga no permite modificar el precio publicado.
                  </p>
                )}
                <form onSubmit={sendMessage} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <label className="sr-only" htmlFor={`message-${proposalId}`}>
                    Escribe un mensaje
                  </label>
                  <textarea
                    id={`message-${proposalId}`}
                    className="input min-h-11 resize-y"
                    maxLength={2000}
                    rows={2}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Escribe un mensaje para coordinar…"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={busy || !message.trim()}
                    aria-label="Enviar mensaje"
                  >
                    <Send size={17} />
                    Enviar
                  </Button>
                </form>
                {user?.role === 'TRANSPORTER' &&
                  latestOffer?.sender.role === 'CLIENT' &&
                  onAccept && (
                    <Button type="button" variant="secondary" disabled={busy} onClick={onAccept}>
                      Aceptar el precio actual y confirmar el viaje
                    </Button>
                  )}
              </footer>
            )}
            {(closed || readOnly) && (
              <div className="border-t border-slate-100 px-5 py-4 text-sm font-medium text-slate-500 sm:px-6">
                {readOnly
                  ? 'Vista de solo lectura para revisión administrativa.'
                  : 'Esta conversación está cerrada porque la propuesta ya cambió de estado.'}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
