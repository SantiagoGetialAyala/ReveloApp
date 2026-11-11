'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Access, useSession } from '../../../components/session';
import { Button } from '../../../components/button';
import { ErrorMessage } from '../../../components/form-fields';
import { apiFetch } from '../../../lib/api';

type Incident = {
  id: string;
  tripId: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  trip: { id: string; cargo: { title: string } };
  history: { id: string; status: string; note?: string | null; createdAt: string }[];
};
const statusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  IN_REVIEW: 'En revisión',
  WAITING_INFO: 'Esperando información',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};
const typeLabels: Record<string, string> = {
  PICKUP_DELAY: 'Retraso en recogida',
  DELIVERY_DELAY: 'Retraso en entrega',
  VEHICLE_BREAKDOWN: 'Avería del vehículo',
  CARGO_DAMAGE: 'Daño de mercancía',
  MISSING_CARGO: 'Mercancía incompleta',
  LOCATION_ISSUE: 'Problema de ubicación',
  NON_COMPLIANCE: 'Incumplimiento',
  COMMUNICATION: 'Problema de comunicación',
  OTHER: 'Otro',
};

export default function AdminIncidentsPage() {
  return (
    <Access>
      <IncidentQueue />
    </Access>
  );
}

function IncidentQueue() {
  const { token, user } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Incident[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Incident[]>('/admin/incidents', { token: token! });
      setItems(result);
      setDrafts((previous) =>
        Object.fromEntries(
          result.map((item) => [item.id, previous[item.id] ?? { status: item.status, note: '' }]),
        ),
      );
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);
  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [load, user]);
  async function update(item: Incident) {
    const draft = drafts[item.id];
    if (!draft || draft.status === item.status || busy) return;
    setBusy(item.id);
    setError('');
    try {
      await apiFetch(`/admin/incidents/${item.id}/status`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          status: draft.status,
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        }),
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <main className="incidents-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
        Administración · operación
      </p>
      <div className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Incidencias de viajes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cada cambio queda registrado con responsable, hora y nota.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </div>
      <ErrorMessage message={error} />
      {loading && (
        <p role="status" className="py-5 text-sm text-slate-500">
          Cargando incidencias…
        </p>
      )}
      {!loading && items.length === 0 && <p className="panel">No hay incidencias registradas.</p>}
      <div className="grid gap-4">
        {items.map((item) => {
          const draft = drafts[item.id] ?? { status: item.status, note: '' };
          return (
            <article className="panel" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {typeLabels[item.type] ?? item.type}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">{item.trip.cargo.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Viaje #{item.tripId.slice(0, 8)} · reportada{' '}
                    {new Date(item.createdAt).toLocaleString('es-CO')}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>
              <ol className="mt-5 space-y-2 border-l border-slate-200 pl-4">
                {item.history.map((event) => (
                  <li key={event.id} className="text-xs text-slate-600">
                    <strong>{statusLabels[event.status] ?? event.status}</strong> ·{' '}
                    {new Date(event.createdAt).toLocaleString('es-CO')}
                    {event.note ? ` · ${event.note}` : ''}
                  </li>
                ))}
              </ol>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                <label className="field">
                  Estado
                  <select
                    className="input"
                    value={draft.status}
                    onChange={(event) =>
                      setDrafts((old) => ({
                        ...old,
                        [item.id]: { ...draft, status: event.target.value },
                      }))
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Nota de revisión{' '}
                  <input
                    className="input"
                    maxLength={1000}
                    value={draft.note}
                    onChange={(event) =>
                      setDrafts((old) => ({
                        ...old,
                        [item.id]: { ...draft, note: event.target.value },
                      }))
                    }
                    placeholder="Opcional; queda en el historial"
                  />
                </label>
                <Button
                  disabled={busy === item.id || draft.status === item.status}
                  onClick={() => void update(item)}
                >
                  {busy === item.id ? 'Guardando…' : 'Guardar cambio'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
