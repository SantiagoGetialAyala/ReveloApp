'use client';
import { useCallback, useEffect, useState } from 'react';
import { Access, useSession } from '../../components/session';
import { ErrorMessage } from '../../components/form-fields';
import { Button } from '../../components/button';
import Link from 'next/link';
import { ExternalLink, MailOpen } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Notice } from '../../lib/models';
export default function NotificationsPage() {
  return (
    <Access>
      <Notifications />
    </Access>
  );
}
function Notifications() {
  const { token } = useSession();
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Notice[]>('/notifications', { token: token! }));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [load]);
  return (
    <main className="notifications-page mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
            Centro de actividad
          </p>
          <h1 className="mt-1 text-3xl font-bold">Notificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.filter((item) => !item.readAt).length} sin leer
          </p>
        </div>
        {items.some((item) => !item.readAt) && (
          <Button
            type="button"
            variant="ghost"
            disabled={markingAll}
            onClick={async () => {
              setMarkingAll(true);
              setError('');
              try {
                await apiFetch('/notifications/read-all', { token: token!, method: 'PATCH' });
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setMarkingAll(false);
              }
            }}
          >
            <MailOpen className="h-4 w-4" />
            {markingAll ? 'Actualizando…' : 'Marcar todas como leídas'}
          </Button>
        )}
      </div>
      <ErrorMessage message={error} />
      {loading && <p>Cargando…</p>}
      {!loading && !items.length && <p className="panel">No tienes notificaciones todavía.</p>}
      <div className="grid gap-3">
        {items.map((n) => (
          <article className={`panel ${n.readAt ? '' : 'border-l-4 border-l-action'}`} key={n.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{n.title}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${n.readAt ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}
              >
                {n.readAt ? 'Leída' : 'Nueva'}
              </span>
            </div>
            <p className="mt-2">{n.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(n.createdAt).toLocaleString('es-CO')}
            </p>
            {noticeHref(n) && (
              <Link
                className="focus-ring mt-3 inline-flex min-h-10 items-center gap-1.5 rounded text-sm font-semibold text-blue-700"
                href={noticeHref(n)!}
              >
                Abrir{' '}
                {n.metadata &&
                typeof n.metadata === 'object' &&
                !Array.isArray(n.metadata) &&
                typeof (n.metadata as Record<string, unknown>).tripId === 'string'
                  ? 'seguimiento del viaje'
                  : 'carga'}{' '}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            {!n.readAt && (
              <button
                className="mt-3 text-sm underline"
                disabled={busyId === n.id}
                onClick={async () => {
                  setBusyId(n.id);
                  setError('');
                  try {
                    await apiFetch(`/notifications/${n.id}/read`, {
                      token: token!,
                      method: 'PATCH',
                    });
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusyId('');
                  }
                }}
              >
                Marcar como leída
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

function noticeHref(notice: Notice) {
  const metadata = notice.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const fields = metadata as Record<string, unknown>;
  const tripId = typeof fields.tripId === 'string' ? fields.tripId : '';
  const cargoId = typeof fields.cargoId === 'string' ? fields.cargoId : '';
  if (
    tripId &&
    [
      'TRIP_CREATED',
      'TRIP_STATUS_CHANGED',
      'PROPOSAL_ACCEPTED',
      'TRIP_MESSAGE',
      'TRIP_INCIDENT',
      'TRIP_INCIDENT_UPDATED',
      'TRIP_REVIEW',
    ].includes(notice.type)
  )
    return `/viajes/${encodeURIComponent(tripId)}`;
  if (
    cargoId &&
    ['PROPOSAL_RECEIVED', 'PROPOSAL_SENT', 'PROPOSAL_REJECTED', 'PROPOSAL_ACCEPTED'].includes(
      notice.type,
    )
  )
    return `/cargas/${encodeURIComponent(cargoId)}`;
  return null;
}
