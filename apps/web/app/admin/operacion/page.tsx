'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Package, Truck } from 'lucide-react';
import { Access, useSession } from '../../../components/session';
import { Button } from '../../../components/button';
import { ErrorMessage } from '../../../components/form-fields';
import { apiFetch } from '../../../lib/api';
import { moneyCop } from '../../../lib/utils';

type CargoRow = {
  id: string;
  title: string;
  status: string;
  originCity: string;
  destinationCity: string;
  estimatedBudgetCop: string | number;
  client: { email: string; companyProfile?: { businessName: string } | null };
  _count: { proposals: number };
  trip?: { status: string } | null;
};
type TripRow = {
  id: string;
  status: string;
  agreedPriceCop: string | number;
  createdAt: string;
  pickupDate: string;
  cargo: { title: string; status: string };
  client: { email: string };
  transporter: { email: string };
  vehicle: { plate: string; brand: string; model: string };
  incidents: { id: string; status: string; type: string }[];
};

export default function AdminOperationsPage() {
  return (
    <Access>
      <Operations />
    </Access>
  );
}

function Operations() {
  const { token, user } = useSession();
  const router = useRouter();
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [cargoRows, tripRows] = await Promise.all([
        apiFetch<CargoRow[]>('/admin/cargos', { token }),
        apiFetch<TripRow[]>('/admin/trips', { token }),
      ]);
      setCargos(cargoRows);
      setTrips(tripRows);
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

  const activeTrips = trips.filter((trip) => !['COMPLETED', 'CANCELLED'].includes(trip.status));
  const completedTrips = trips.filter((trip) => trip.status === 'COMPLETED');
  const orderedTrips = [
    ...activeTrips,
    ...completedTrips,
    ...trips.filter((trip) => trip.status === 'CANCELLED'),
  ];
  const cargoSections = [
    {
      id: 'cargas-borrador',
      title: 'Borradores',
      rows: cargos.filter((cargo) => cargo.status === 'DRAFT'),
    },
    {
      id: 'cargas-abiertas',
      title: 'Publicadas y abiertas',
      rows: cargos.filter((cargo) => cargo.status === 'OPEN'),
    },
    {
      id: 'cargas-en-curso',
      title: 'En curso',
      rows: cargos.filter((cargo) => cargo.status === 'ASSIGNED'),
    },
    {
      id: 'cargas-completadas',
      title: 'Completadas',
      rows: cargos.filter((cargo) => cargo.status === 'COMPLETED'),
    },
    {
      id: 'cargas-canceladas',
      title: 'Canceladas',
      rows: cargos.filter((cargo) => cargo.status === 'CANCELLED'),
    },
  ];

  async function cancel(kind: 'cargos' | 'trips', id: string) {
    const reason = reasons[id]?.trim();
    if (!reason) {
      setError('Escribe el motivo para dejar registro de la moderación.');
      return;
    }
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/admin/${kind}/${id}/cancel`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Revelo · seguridad operativa
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Cargas y viajes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Revisa la actividad reportada y cierra operaciones con anomalías. Cada cancelación queda
            auditada con el motivo indicado.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </div>
      <ErrorMessage message={error} />
      {loading && (
        <p role="status" className="panel">
          Cargando actividad…
        </p>
      )}
      <div id="cargas" className="mt-6 scroll-mt-24 space-y-7">
        {cargoSections.map((section, index) => (
          <section
            id={index === 0 ? undefined : section.id}
            key={section.id}
            className="scroll-mt-24"
          >
            <div className="mb-4 flex items-center gap-2">
              {index === 0 ? <Package className="text-blue-700" /> : <span className="h-5 w-5" />}
              <h2 id={index === 0 ? section.id : undefined} className="text-xl font-bold">
                {section.title}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                {section.rows.length}
              </span>
            </div>
            {!loading && !section.rows.length && (
              <p className="panel text-sm text-slate-500">No hay cargas en esta sección.</p>
            )}
            <div className="grid gap-3">
              {section.rows.map((cargo) => (
                <article
                  key={cargo.id}
                  className="panel grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">{cargo.title}</h3>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                        {cargo.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {cargo.originCity} → {cargo.destinationCity} ·{' '}
                      {moneyCop(cargo.estimatedBudgetCop)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {cargo.client.companyProfile?.businessName ?? cargo.client.email} ·{' '}
                      {cargo._count.proposals} propuestas · {cargo.id.slice(0, 8)}
                    </p>
                  </div>
                  {cargo.status !== 'CANCELLED' && cargo.status !== 'COMPLETED' && (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="field min-w-44 flex-1 text-xs">
                        Motivo
                        <input
                          className="input"
                          value={reasons[cargo.id] ?? ''}
                          onChange={(event) =>
                            setReasons((old) => ({ ...old, [cargo.id]: event.target.value }))
                          }
                          placeholder="Anomalía observada"
                        />
                      </label>
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => void cancel('cargos', cargo.id)}
                      >
                        <AlertTriangle size={16} />
                        {busy === cargo.id ? 'Guardando…' : 'Retirar carga'}
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section id="viajes-activos" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="text-blue-700" />
          <h2 className="text-xl font-bold">Viajes acordados · activos primero</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
            {trips.length}
          </span>
        </div>
        {!loading && !trips.length && (
          <p className="panel text-sm text-slate-500">Todavía no hay viajes acordados.</p>
        )}
        <div className="grid gap-3">
          {!completedTrips.length && <span id="viajes-completados" />}
          {orderedTrips.map((trip) => (
            <article
              key={trip.id}
              id={trip.id === completedTrips[0]?.id ? 'viajes-completados' : undefined}
              className="panel grid scroll-mt-24 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-950">{trip.cargo.title}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                    {trip.status}
                  </span>
                  {trip.incidents.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      {trip.incidents.length} queja(s)
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm">
                  {trip.vehicle.plate} · {trip.vehicle.brand} {trip.vehicle.model} ·{' '}
                  {moneyCop(trip.agreedPriceCop)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Empresa {trip.client.email} · Conductor {trip.transporter.email} · recogida{' '}
                  {new Date(trip.pickupDate).toLocaleString('es-CO')}
                </p>
                <Link
                  href={`/viajes/${trip.id}`}
                  className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-ring"
                >
                  Ver mapa, seguimiento y conversaciones →
                </Link>
                {trip.incidents.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-800">
                    Hay una incidencia asociada.{' '}
                    <a className="underline" href="/admin/incidencias">
                      Revisar quejas
                    </a>
                  </p>
                )}
              </div>
              {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="field min-w-44 flex-1 text-xs">
                    Motivo
                    <input
                      className="input"
                      value={reasons[trip.id] ?? ''}
                      onChange={(event) =>
                        setReasons((old) => ({ ...old, [trip.id]: event.target.value }))
                      }
                      placeholder="Anomalía observada"
                    />
                  </label>
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => void cancel('trips', trip.id)}
                  >
                    <AlertTriangle size={16} />
                    {busy === trip.id ? 'Guardando…' : 'Cancelar viaje'}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
