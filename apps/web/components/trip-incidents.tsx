'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { apiFetch } from '../lib/api';

type Incident = {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  history: { id: string; status: string; note?: string | null; createdAt: string }[];
};
const types = [
  ['PICKUP_DELAY', 'Retraso en recogida'],
  ['DELIVERY_DELAY', 'Retraso en entrega'],
  ['VEHICLE_BREAKDOWN', 'Avería del vehículo'],
  ['CARGO_DAMAGE', 'Daño de mercancía'],
  ['MISSING_CARGO', 'Mercancía incompleta'],
  ['LOCATION_ISSUE', 'Problema de ubicación'],
  ['NON_COMPLIANCE', 'Incumplimiento'],
  ['COMMUNICATION', 'Problema de comunicación'],
  ['OTHER', 'Otro'],
];
const labels: Record<string, string> = {
  OPEN: 'Abierta',
  IN_REVIEW: 'En revisión',
  WAITING_INFO: 'Esperando información',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

export function TripIncidents({ tripId, token }: { tripId: string; token: string | null }) {
  const [items, setItems] = useState<Incident[]>([]);
  const [type, setType] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await apiFetch<Incident[]>(`/trips/${tripId}/incidents`, { token }));
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, tripId]);
  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || saving || description.trim().length < 5) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/trips/${tripId}/incidents`, {
        token,
        method: 'POST',
        body: JSON.stringify({ type, description: description.trim() }),
      });
      setDescription('');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="trip-surface overflow-hidden" aria-label="Incidencias">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">Incidencias</h2>
          <p className="text-xs text-slate-500">
            Reporta novedades para dejar registro de la operación.
          </p>
        </div>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando incidencias…
          </p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">No hay incidencias en este viaje.</p>
        )}
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <strong className="text-sm">
                {types.find(([value]) => value === item.type)?.[1] ?? item.type}
              </strong>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                {labels[item.status] ?? item.status}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
            <p className="mt-2 text-xs text-slate-500">
              Reportada {new Date(item.createdAt).toLocaleString('es-CO')}
            </p>
            {item.history.length > 1 && (
              <ol className="mt-3 space-y-1 border-l border-slate-200 pl-3">
                {item.history.map((event) => (
                  <li key={event.id} className="text-xs text-slate-500">
                    {labels[event.status] ?? event.status} ·{' '}
                    {new Date(event.createdAt).toLocaleString('es-CO')}
                    {event.note ? ` · ${event.note}` : ''}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-3 border-t border-slate-100 p-4 sm:p-5">
        <label className="field">
          Tipo de incidencia
          <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
            {types.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Descripción
          <textarea
            className="input min-h-20 resize-y"
            value={description}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe qué ocurrió y cuándo…"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving || description.trim().length < 5}>
          {saving ? 'Registrando…' : 'Registrar incidencia'}
        </Button>
        <p className="text-xs text-slate-400">
          Las incidencias se revisan en el panel administrativo. No adjuntes documentos sensibles;
          la carga privada de evidencias aún no está disponible.
        </p>
      </form>
    </section>
  );
}
