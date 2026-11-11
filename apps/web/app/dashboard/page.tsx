'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Access, useSession } from '../../components/session';
import { ErrorMessage } from '../../components/form-fields';
import { Button } from '../../components/button';
import { apiFetch } from '../../lib/api';
import { moneyCop } from '../../lib/utils';
import { statuses, units as quantityUnits } from '../../lib/catalogs';
import { Cargo, Contact, Proposal, Trip, Vehicle } from '../../lib/models';
import { ProposalNegotiation } from '../../components/proposal-negotiation';
import { RouteMap } from '../../components/route-map';
import { TripReviews } from '../../components/trip-reviews';
import { bodyTypes, vehicleTypes } from '../../lib/catalogs';

type AdminStats = {
  users: number;
  transportersPendingVerification: number;
  clientsPendingVerification: number;
  vehiclesPendingVerification: number;
  vehicles: number;
  allCargos: number;
  openCargos: number;
  proposals: number;
  pendingProposals: number;
  allTrips: number;
  activeTrips: number;
  completedTrips: number;
  completedTripValueCop: number;
  platformCommissionCop: number;
  openIncidents: number;
  latestIncidents: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    trip: { id: string; cargo: { id: string; title: string } };
  }[];
};
export default function DashboardPage() {
  return (
    <Access>
      <Dashboard />
    </Access>
  );
}
function AdminDashboard({ stats }: { stats: AdminStats | null }) {
  const cards = stats
    ? [
        ['Usuarios registrados', stats.users, 'Cuentas de todos los roles', '/admin/usuarios'],
        [
          'Revisión pendiente',
          stats.transportersPendingVerification + stats.clientsPendingVerification,
          `${stats.transportersPendingVerification} conductores · ${stats.clientsPendingVerification} empresas · ${stats.vehiclesPendingVerification} vehículos`,
          '/admin/verificaciones',
        ],
        [
          'Vehículos activos',
          stats.vehicles,
          'Vehículos registrados y activos',
          '/admin/usuarios#conductores',
        ],
        [
          'Cargas abiertas',
          stats.openCargos,
          `De ${stats.allCargos} publicadas`,
          '/admin/operacion#cargas',
        ],
        [
          'Ofertas pendientes',
          stats.pendingProposals,
          `De ${stats.proposals} enviadas`,
          '/admin/operacion#cargas',
        ],
        [
          'Viajes en curso',
          stats.activeTrips,
          `De ${stats.allTrips} acordados`,
          '/admin/operacion#viajes-activos',
        ],
        [
          'Viajes completados',
          stats.completedTrips,
          'Entrega confirmada por la empresa',
          '/admin/operacion#viajes-completados',
        ],
        [
          'Comisión estimada de Revelo · 5%',
          stats.platformCommissionCop,
          `5% de ${moneyCop(stats.completedTripValueCop)} en viajes completados · estimada, no cobrada`,
          '/admin/operacion#viajes-completados',
        ],
        [
          'Incidencias abiertas',
          stats.openIncidents,
          'Abiertas, en revisión o esperando información',
          '/admin/incidencias',
        ],
      ]
    : [];
  return (
    <>
      <section
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Herramientas de administración"
      >
        {[
          [
            '/admin/usuarios',
            'Usuarios y cuentas',
            `${stats?.users ?? 0} cuentas registradas por rol`,
          ],
          [
            '/admin/verificaciones',
            'Validar perfiles y camiones',
            `${stats?.transportersPendingVerification ?? 0} conductores · ${stats?.clientsPendingVerification ?? 0} empresas · ${stats?.vehiclesPendingVerification ?? 0} vehículos`,
          ],
          [
            '/admin/operacion',
            'Cargas y viajes',
            'Revisar actividad y retirar operaciones anómalas',
          ],
          [
            '/admin/incidencias',
            'Quejas e incidencias',
            `${stats?.openIncidents ?? 0} casos abiertos`,
          ],
        ].map(([href, title, caption]) => (
          <Link
            key={href}
            href={href}
            className="panel group transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <p className="font-bold text-slate-950 group-hover:text-blue-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{caption}</p>
          </Link>
        ))}
      </section>
      <section
        aria-label="Indicadores de administración"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map(([label, value, caption, href]) => (
          <Link
            href={String(href)}
            className="dashboard-stat-card panel block transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-ring"
            key={String(label)}
          >
            <p className="text-sm text-slate-500">{String(label)}</p>
            <strong className="mt-3 block text-3xl font-bold tabular-nums text-primary">
              {String(label).includes('Comisión estimada')
                ? moneyCop(Number(value))
                : Number(value).toLocaleString('es-CO')}
            </strong>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{String(caption)}</p>
          </Link>
        ))}
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel">
          <h2 className="font-bold text-slate-900">Actividad operativa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resumen operativo y comisión estimada. La plataforma aún no procesa pagos.
          </p>
          {stats && (
            <div className="mt-6 space-y-5">
              {[
                ['Cargas abiertas', stats.openCargos, stats.allCargos],
                ['Ofertas pendientes', stats.pendingProposals, stats.proposals],
                ['Viajes en curso', stats.activeTrips, stats.allTrips],
                ['Viajes completados', stats.completedTrips, stats.allTrips],
              ].map(([label, value, total]) => {
                const count = Number(value),
                  denominator = Number(total);
                const percent = denominator ? Math.round((100 * count) / denominator) : 0;
                return (
                  <div key={String(label)}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{String(label)}</span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {count.toLocaleString('es-CO')}{' '}
                        <span className="font-normal text-slate-400">
                          / {denominator.toLocaleString('es-CO')}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="dashboard-stat-bar h-full rounded-full bg-blue-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="font-bold text-slate-900">Quejas recientes</h2>
          {!stats?.latestIncidents.length && (
            <p className="mt-4 text-sm text-slate-500">No hay quejas abiertas.</p>
          )}
          <ul className="mt-3 divide-y divide-slate-100">
            {stats?.latestIncidents.map((incident) => (
              <li key={incident.id} className="py-3 first:pt-0">
                <p className="text-sm font-semibold text-slate-800">{incident.trip.cargo.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {incident.description}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(incident.createdAt).toLocaleString('es-CO')}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/incidencias"
            className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-blue-700 underline"
          >
            Abrir bandeja de quejas
          </Link>
        </section>
      </div>
    </>
  );
}

function ContactInfo({ contact }: { contact?: Contact }) {
  return contact ? (
    <div className="mt-2 text-sm">
      <p className="font-semibold">
        {contact.companyProfile?.businessName ??
          contact.transporterProfile?.displayName ??
          contact.profile?.firstName}
      </p>
      <p>{contact.email}</p>
      <p>{contact.profile?.phone ?? contact.companyProfile?.contactPhone}</p>
    </div>
  ) : null;
}
function DashboardTripCard({
  trip,
  client,
  busy,
  onStatusChange,
}: {
  trip: Trip;
  client: boolean;
  busy: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const nextStatus: Record<string, string> = {
    PENDING_PICKUP: 'AT_PICKUP',
    AT_PICKUP: 'IN_TRANSIT',
    IN_TRANSIT: 'DELIVERED',
  };
  const nextLabel: Record<string, string> = {
    PENDING_PICKUP: 'Confirmar llegada a recogida',
    AT_PICKUP: 'Iniciar transporte',
    IN_TRANSIT: 'Marcar entrega',
  };
  return (
    <article className="dashboard-trip-card panel" key={trip.id}>
      <h4 className="font-semibold">{trip.cargo.title}</h4>
      <p>
        {trip.cargo.originCity} → {trip.cargo.destinationCity} · {moneyCop(trip.agreedPriceCop)}
      </p>
      <p className="mt-2">
        {statuses[trip.status]} · {trip.vehicle.plate}
      </p>
      <ContactInfo contact={client ? trip.transporter : trip.client} />
      <Link
        href={`/viajes/${trip.id}`}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-ring"
      >
        Ver seguimiento y mapa <span aria-hidden="true">→</span>
      </Link>
      {!client && nextStatus[trip.status] && (
        <Button
          className="mt-3"
          disabled={busy}
          onClick={() => onStatusChange(trip.id, nextStatus[trip.status])}
        >
          {nextLabel[trip.status]}
        </Button>
      )}
      {client && trip.status === 'DELIVERED' && (
        <Button
          className="mt-3"
          disabled={busy}
          onClick={() => onStatusChange(trip.id, 'COMPLETED')}
        >
          Confirmar recepción de mercancía
        </Button>
      )}
      {!['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(trip.status) && (
        <Button
          variant="ghost"
          className="mt-3 text-red-700 hover:bg-red-50"
          disabled={busy}
          onClick={() => {
            if (window.confirm('¿Quieres cancelar este viaje? Se notificará a la otra parte.'))
              onStatusChange(trip.id, 'CANCELLED');
          }}
        >
          Cancelar viaje
        </Button>
      )}
    </article>
  );
}
function dashboardMetricHref(label: string, client: boolean) {
  const metric = label.toLocaleLowerCase('es');
  if (metric.includes('vehículos')) return '/vehiculos';
  if (metric.includes('cargas')) return '#mis-cargas';
  if (metric.includes('oferta') || metric.includes('ofertas') || metric.includes('postulacion'))
    return '#mis-postulaciones';
  if (metric.includes('ganancia')) return '#viajes-completados';
  if (
    metric.includes('completadas') ||
    metric.includes('calificaciones') ||
    metric.includes('reseñas')
  )
    return '#viajes-completados';
  if (metric.includes('viajes activos')) return '#viajes-activos';
  if (metric.includes('valor acordado')) return '#viajes-acordados';
  return client ? '#mis-cargas' : '#mis-postulaciones';
}
function Dashboard() {
  const { user, token } = useSession();
  const router = useRouter();
  const client = user?.role === 'CLIENT';
  const admin = user?.role === 'ADMIN';
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [received, setReceived] = useState<Record<string, Proposal[]>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [proposalFilter, setProposalFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'CLOSED'>(
    'ALL',
  );
  const [expandedCargoId, setExpandedCargoId] = useState<string | null>(null);
  const [editingCargoId, setEditingCargoId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [work, tripData] = await Promise.all([
        admin
          ? apiFetch<AdminStats>('/admin/dashboard', { token: token! })
          : client
            ? apiFetch<Cargo[]>('/cargos/me', { token: token! })
            : apiFetch<Proposal[]>('/proposals/me', { token: token! }),
        admin ? Promise.resolve([] as Trip[]) : apiFetch<Trip[]>('/trips/me', { token: token! }),
      ]);
      if (admin) {
        setAdminStats(work as AdminStats);
        setCargos([]);
        setProposals([]);
        setVehicles([]);
        setTrips([]);
      } else if (client) {
        const items = work as Cargo[];
        const offers = await Promise.all(
          items.map(
            async (c) =>
              [
                c.id,
                await apiFetch<Proposal[]>(`/cargos/${c.id}/proposals`, { token: token! }),
              ] as const,
          ),
        );
        const incomingByCargo = Object.fromEntries(offers);
        const newestPendingTime = (cargoId: string) =>
          (incomingByCargo[cargoId] ?? [])
            .filter((proposal) => proposal.status === 'PENDING')
            .reduce((newest, proposal) => Math.max(newest, new Date(proposal.createdAt).getTime()), 0);
        setCargos(
          [...items].sort((a, b) => newestPendingTime(b.id) - newestPendingTime(a.id)),
        );
        setReceived(incomingByCargo);
      } else {
        setProposals(work as Proposal[]);
        const ownVehicles = await apiFetch<Vehicle[]>('/vehicles/me', { token: token! });
        setVehicles(ownVehicles);
      }
      setTrips(tripData);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [admin, client, token]);
  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 15000);
    return () => window.clearInterval(id);
  }, [load]);
  async function action(id: string, verb: string) {
    setBusy(id);
    setError('');
    try {
      const result = await apiFetch<{ id: string }>(`/proposals/${id}/${verb}`, {
        token: token!,
        method: 'PATCH',
      });
      if (verb === 'accept') {
        router.push(`/viajes/${result.id}`);
        return;
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function tripAction(id: string, status: string) {
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/trips/${id}/status`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function editCargo(id: string, form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/cargos/${id}`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          title: data.get('title'),
          description: data.get('description'),
          estimatedBudgetCop: Number(data.get('estimatedBudgetCop')),
          requiredVehicleType: data.get('requiredVehicleType'),
          requiredBodyType: data.get('requiredBodyType') || null,
        }),
      });
      setEditingCargoId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function deleteCargo(id: string) {
    if (!window.confirm('¿Eliminar esta publicación? Se cerrará y ya no recibirá ofertas.')) return;
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/cargos/${id}`, { token: token!, method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  const pending = admin
    ? (adminStats?.pendingProposals ?? 0)
    : client
      ? Object.values(received)
          .flat()
          .filter((p) => p.status === 'PENDING').length
      : proposals.filter((p) => p.status === 'PENDING').length;
  const completedTrips = trips.filter((trip) => trip.status === 'COMPLETED');
  const completedTripGrossCop = completedTrips.reduce(
    (sum, trip) => sum + Number(trip.agreedPriceCop),
    0,
  );
  const driverCommissionCop = Math.round(completedTripGrossCop * 0.05);
  const orderedTrips = [
    ...trips.filter((trip) => !['COMPLETED', 'CANCELLED'].includes(trip.status)),
    ...completedTrips,
    ...trips.filter((trip) => trip.status === 'CANCELLED'),
  ];
  const visibleProposals = proposals.filter((proposal) =>
    proposalFilter === 'ALL'
      ? true
      : proposalFilter === 'CLOSED'
        ? ['REJECTED', 'WITHDRAWN'].includes(proposal.status)
        : proposal.status === proposalFilter,
  );
  const proposalFilters = [
    ['ALL', 'Todas', proposals.length],
    ['PENDING', 'Pendientes', proposals.filter((proposal) => proposal.status === 'PENDING').length],
    [
      'ACCEPTED',
      'Aceptadas',
      proposals.filter((proposal) => proposal.status === 'ACCEPTED').length,
    ],
    [
      'CLOSED',
      'Historial',
      proposals.filter((proposal) => ['REJECTED', 'WITHDRAWN'].includes(proposal.status)).length,
    ],
  ] as const;
  if (admin)
    return (
      <main className="dashboard-page mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Operación · administración
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Resumen de Revelo</h1>
            <p className="mt-1 text-sm text-slate-500">
              Indicadores calculados desde las cuentas, cargas, ofertas y viajes registrados.
            </p>
          </div>
          <Button variant="ghost" onClick={() => void load()}>
            Actualizar panel
          </Button>
        </div>
        <ErrorMessage message={error} />
        {loading && (
          <p role="status" className="py-5 text-sm text-slate-500">
            Cargando indicadores…
          </p>
        )}
        <AdminDashboard stats={adminStats} />
      </main>
    );
  return (
    <main className="dashboard-page mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {client ? 'Tu operación, siempre en curso.' : 'Tus rutas, al día.'}
          </h1>
          <p className="mt-1 font-medium text-slate-800">
            {client ? 'Panel de tu empresa' : 'Panel del transportador'}
          </p>
          <p className="mt-2 text-slate-600">{user?.email} · Se actualiza cada 15 segundos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="dashboard-action-primary rounded-xl px-4 py-3 font-semibold"
            href={client ? '/publicar-carga' : '/cargas'}
          >
            {client ? 'Publicar mercancía' : 'Buscar cargas'}
          </Link>
          {!client && (
            <Link
              className="dashboard-action-secondary rounded-xl border px-4 py-3 font-semibold"
              href="/vehiculos"
            >
              Mis camiones
            </Link>
          )}
          <Link
            className="dashboard-action-secondary rounded-xl border px-4 py-3 font-semibold"
            href="/perfil"
          >
            Mi perfil
          </Link>
          <Button variant="ghost" onClick={() => void load()}>
            Actualizar
          </Button>
        </div>
      </div>
      <ErrorMessage message={error} />
      {loading && (
        <p role="status" className="mt-6">
          Cargando tu información…
        </p>
      )}
      <section className="my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(client
          ? [
              ['Cargas abiertas', cargos.filter((cargo) => cargo.status === 'OPEN').length],
              ['Ofertas por revisar', pending],
              [
                'Viajes activos',
                trips.filter((trip) => trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED')
                  .length,
              ],
              ['Entregas completadas', trips.filter((trip) => trip.status === 'COMPLETED').length],
              [
                'Valor acordado en viajes',
                trips
                  .filter((trip) => trip.status !== 'CANCELLED')
                  .reduce((sum, trip) => sum + Number(trip.agreedPriceCop), 0),
              ],
            ]
          : [
              ['Vehículos disponibles', vehicles.filter((vehicle) => vehicle.isAvailable).length],
              ['Postulaciones realizadas', proposals.length],
              ['Ofertas pendientes', pending],
              [
                'Viajes activos',
                trips.filter((trip) => trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED')
                  .length,
              ],
              ['Ganancias netas estimadas', Math.round(completedTripGrossCop * 0.95)],
            ]
        ).map(([label, value]) => (
          <Link
            key={String(label)}
            href={dashboardMetricHref(String(label), client)}
            className="panel dashboard-stat-card block transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-ring"
          >
            <p className="text-sm leading-snug text-slate-600">{String(label)}</p>
            <strong className="mt-3 block text-2xl font-bold tabular-nums text-primary">
              {String(label).includes('Valor acordado') || String(label).includes('Ganancias')
                ? moneyCop(Number(value))
                : Number(value).toLocaleString('es-CO')}
            </strong>
            {String(label).includes('Valor acordado') && (
              <p className="mt-1 text-[11px] text-slate-500">
                Montos acordados; no representan pagos confirmados.
              </p>
            )}
            {String(label).includes('Ganancias') && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                En viajes completados: {moneyCop(completedTripGrossCop)} · comisión estimada de
                Revelo (5%): {moneyCop(driverCommissionCop)}. Neto estimado; no representa un pago
                procesado.
              </p>
            )}
          </Link>
        ))}
      </section>
      <h2
        id={client ? 'mis-cargas' : 'mis-postulaciones'}
        className="mb-4 scroll-mt-24 text-xl font-bold"
      >
        {client ? 'Mis cargas y ofertas recibidas' : 'Mis postulaciones'}
      </h2>
      {!client && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar postulaciones">
          {proposalFilters.map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={proposalFilter === value}
              onClick={() => setProposalFilter(value)}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${proposalFilter === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800'}`}
            >
              {label} <span className="ml-1 opacity-75">{count}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4">
        {client
          ? cargos.map((c) => (
              <details
                key={c.id}
                open={expandedCargoId === c.id}
                onToggle={(event) => {
                  // React clears currentTarget after the event callback. Read `open`
                  // before scheduling a state updater, which may run later.
                  const isOpen = event.currentTarget.open;
                  setExpandedCargoId((current) => (isOpen ? c.id : current === c.id ? null : current));
                }}
                className="dashboard-cargo-card panel group"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-xl focus-ring">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-950">{c.title}</span>
                      <span className="dashboard-status-pill">{statuses[c.status]}</span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {c.originCity} → {c.destinationCity} · {moneyCop(c.estimatedBudgetCop)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {received[c.id]?.length ?? 0}{' '}
                      {(received[c.id]?.length ?? 0) === 1
                        ? 'oferta recibida'
                        : 'ofertas recibidas'}
                    </span>
                  </span>
                  <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 group-open:bg-blue-700 group-open:text-white">
                    {expandedCargoId === c.id ? 'Cerrar detalles' : 'Ver detalles'}
                  </span>
                </summary>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm leading-6 text-slate-600">{c.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <p className="rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="block text-xs text-slate-500">Recogida</span>
                      <strong>
                        {c.pickupAddress}, {c.originCity}
                      </strong>
                      <span className="mt-1 block text-slate-600">
                        {new Date(c.pickupWindowStart).toLocaleString('es-CO')}
                      </span>
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="block text-xs text-slate-500">Entrega</span>
                      <strong>
                        {c.deliveryAddress}, {c.destinationCity}
                      </strong>
                      <span className="mt-1 block text-slate-600">
                        Antes del {new Date(c.deliveryDeadline).toLocaleString('es-CO')}
                      </span>
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="block text-xs text-slate-500">Mercancía y peso</span>
                      <strong>
                        {c.quantity
                          ? `${Number(c.quantity).toLocaleString('es-CO')} ${quantityUnits[c.quantityUnit ?? ''] ?? c.quantityUnit ?? ''} · `
                          : ''}
                        {Number(c.weightKg).toLocaleString('es-CO')} kg
                      </strong>
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="block text-xs text-slate-500">Presupuesto publicado</span>
                      <strong>{moneyCop(c.estimatedBudgetCop)}</strong>
                    </p>
                  </div>
                  <Link
                    href={`/cargas/${c.id}`}
                    className="mt-3 inline-flex text-sm font-semibold text-blue-700 underline"
                  >
                    Abrir ficha completa de la carga
                  </Link>
                  {c.status === 'OPEN' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() => setEditingCargoId(editingCargoId === c.id ? null : c.id)}
                      >
                        {editingCargoId === c.id ? 'Cerrar edición' : 'Editar carga'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                        disabled={!!busy}
                        onClick={() => void deleteCargo(c.id)}
                      >
                        Eliminar publicación
                      </Button>
                    </div>
                  )}
                  {editingCargoId === c.id && c.status === 'OPEN' && (
                    <form
                      className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void editCargo(c.id, event.currentTarget);
                      }}
                    >
                      <label className="field">
                        Título
                        <input className="input" name="title" defaultValue={c.title} required />
                      </label>
                      <label className="field">
                        Descripción
                        <textarea
                          className="input min-h-24"
                          name="description"
                          defaultValue={c.description}
                          required
                        />
                      </label>
                      <label className="field">
                        Presupuesto (COP)
                        <input
                          className="input"
                          name="estimatedBudgetCop"
                          type="number"
                          min="0"
                          step="1000"
                          defaultValue={Number(c.estimatedBudgetCop)}
                          required
                        />
                      </label>
                      <label className="field">
                        Tipo de vehículo
                        <select
                          className="input"
                          name="requiredVehicleType"
                          defaultValue={c.requiredVehicleType ?? 'VAN'}
                        >
                          {Object.entries(vehicleTypes).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Carrocería
                        <select className="input" name="requiredBodyType" defaultValue={c.requiredBodyType ?? ''}>
                          <option value="">Cualquiera</option>
                          {Object.entries(bodyTypes).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <Button disabled={busy === c.id}>Guardar cambios</Button>
                    </form>
                  )}
                  {expandedCargoId === c.id && (
                    <RouteMap
                      origin={{
                        lat: Number(c.pickupLat),
                        lng: Number(c.pickupLng),
                        label: `Origen · ${c.pickupAddress}`,
                      }}
                      destination={{
                        lat: Number(c.deliveryLat),
                        lng: Number(c.deliveryLng),
                        label: `Destino · ${c.deliveryAddress}`,
                      }}
                    />
                  )}
                  {c.status === 'COMPLETED' &&
                    trips.find((trip) => trip.cargo.id === c.id) &&
                    user && (
                      <div className="mt-4">
                        <TripReviews
                          tripId={trips.find((trip) => trip.cargo.id === c.id)!.id}
                          token={token}
                          userId={user.id}
                        />
                      </div>
                    )}
                  {!received[c.id]?.length && (
                    <p className="mt-5 text-sm text-slate-500">Todavía no tienes postulaciones.</p>
                  )}
                  {[...(received[c.id] ?? [])]
                    .sort((a, b) => {
                      const pendingOrder = Number(b.status === 'PENDING') - Number(a.status === 'PENDING');
                      return pendingOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map((p) => (
                    <div key={p.id} className="dashboard-proposal-card mt-4 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-lg text-primary">
                          {moneyCop(p.proposedPriceCop)}
                        </strong>
                        <span className="dashboard-status-pill">{statuses[p.status]}</span>
                      </div>
                      <ContactInfo contact={p.transporter} />
                      <div className="my-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                          <span className="block text-xs text-slate-500">Vehículo</span>
                          <strong>
                            {p.vehicle.plate} · {p.vehicle.brand} {p.vehicle.model}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                          <span className="block text-xs text-slate-500">Recogida disponible</span>
                          <strong>
                            {new Date(p.availablePickupDate).toLocaleDateString('es-CO')}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                          <span className="block text-xs text-slate-500">Duración estimada</span>
                          <strong>{p.estimatedTransportHours} horas</strong>
                        </div>
                      </div>
                      <p className="my-2 text-sm">
                        {p.vehicle.plate} · {p.vehicle.brand} {p.vehicle.model} ·{' '}
                        {Number(p.vehicle.maxWeightKg) / 1000} t
                      </p>
                      {p.vehicle.photos[0] && (
                        <img
                          src={p.vehicle.photos[0]}
                          alt={`Vehículo ${p.vehicle.plate}`}
                          className="my-2 h-24 rounded"
                        />
                      )}
                      <p className="text-sm">
                        Recogida: {new Date(p.availablePickupDate).toLocaleString('es-CO')} ·{' '}
                        {p.estimatedTransportHours} horas
                      </p>
                      <p className="mt-2 text-sm">{p.message}</p>
                      <ProposalNegotiation
                        proposalId={p.id}
                        publishedPriceCop={c.estimatedBudgetCop}
                      />
                      {p.status === 'PENDING' && c.status === 'OPEN' && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            disabled={!!busy}
                            onClick={() => void action(p.id, 'accept')}
                            variant="secondary"
                          >
                            {busy === p.id ? 'Procesando…' : 'Aceptar oferta'}
                          </Button>
                          <Button
                            disabled={!!busy}
                            variant="ghost"
                            onClick={() => void action(p.id, 'reject')}
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                    ))}
                </div>
              </details>
            ))
          : visibleProposals.map((p) => (
              <article className="dashboard-proposal-list-card panel" key={p.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <Link
                    href={`/cargas/${p.cargo.id}`}
                    className="font-semibold text-slate-950 hover:text-blue-700"
                  >
                    {p.cargo.title}
                  </Link>
                  <span className="dashboard-status-pill">{statuses[p.status]}</span>
                </div>
                <div className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50/70 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Tu precio actual
                    </p>
                    <strong className="mt-1 block text-2xl font-bold text-slate-950">
                      {moneyCop(p.proposedPriceCop)}
                    </strong>
                  </div>
                  <p className="text-sm text-slate-600">
                    Presupuesto de la carga:{' '}
                    <strong className="text-slate-900">
                      {moneyCop(p.cargo.estimatedBudgetCop)}
                    </strong>
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="block text-xs text-slate-500">Ruta</span>
                    <strong>
                      {p.cargo.originCity} → {p.cargo.destinationCity}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="block text-xs text-slate-500">Vehículo</span>
                    <strong>
                      {p.vehicle.plate} · {p.vehicle.brand} {p.vehicle.model}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="block text-xs text-slate-500">Recogida</span>
                    <strong>{new Date(p.availablePickupDate).toLocaleString('es-CO')}</strong>
                  </div>
                </div>
                <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Mercancía:{' '}
                  {p.cargo.quantity && p.cargo.quantityUnit
                    ? `${Number(p.cargo.quantity).toLocaleString('es-CO')} ${quantityUnits[p.cargo.quantityUnit] ?? p.cargo.quantityUnit} · `
                    : ''}
                  {Number(p.cargo.weightKg).toLocaleString('es-CO')} kg · entrega antes del{' '}
                  {new Date(p.cargo.deliveryDeadline).toLocaleDateString('es-CO')}
                </p>
                {p.vehicle.photos[0] && (
                  <img
                    src={p.vehicle.photos[0]}
                    alt={`Foto del camión ${p.vehicle.plate}`}
                    className="mt-3 h-40 w-full rounded-xl bg-slate-100 object-cover sm:w-64"
                  />
                )}
                <ContactInfo contact={p.cargo.client} />
                <div className="mt-3">
                  <ProposalNegotiation
                    proposalId={p.id}
                    publishedPriceCop={p.cargo.estimatedBudgetCop}
                    onAccept={() => void action(p.id, 'accept')}
                  />
                </div>
                {p.status === 'ACCEPTED' && trips.find((trip) => trip.proposalId === p.id) && (
                  <Link
                    href={`/viajes/${trips.find((trip) => trip.proposalId === p.id)!.id}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-ring"
                  >
                    Ver seguimiento del camión <span aria-hidden="true">→</span>
                  </Link>
                )}
                {p.status === 'PENDING' && (
                  <Button
                    className="mt-3"
                    disabled={!!busy}
                    variant="ghost"
                    onClick={() => void action(p.id, 'withdraw')}
                  >
                    Retirar postulación
                  </Button>
                )}
              </article>
            ))}
      </div>
      {!loading && (client ? !cargos.length : !proposals.length) && (
        <p className="panel">
          {client
            ? 'Publica tu primera carga para recibir ofertas.'
            : 'Explora cargas y envía tu primera oferta.'}
        </p>
      )}
      {!client && !loading && proposals.length > 0 && visibleProposals.length === 0 && (
        <p className="panel text-sm text-slate-500">No hay postulaciones en este filtro.</p>
      )}
      <h2 id="viajes-acordados" className="mb-4 mt-8 scroll-mt-24 text-xl font-bold">
        <span id="mis-viajes" className="scroll-mt-24" />
        Mis viajes
      </h2>
      {[
        {
          id: 'viajes-activos',
          title: 'En curso',
          rows: orderedTrips.filter((trip) => !['COMPLETED', 'CANCELLED'].includes(trip.status)),
        },
        { id: 'viajes-completados', title: 'Completados', rows: completedTrips },
        {
          id: 'viajes-cancelados',
          title: 'Cancelados',
          rows: orderedTrips.filter((trip) => trip.status === 'CANCELLED'),
        },
      ].map((group) => (
        <section id={group.id} key={group.id} className="mt-5 scroll-mt-24">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
            {group.title}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {group.rows.length}
            </span>
          </h3>
          {group.rows.length ? (
            <div className="grid gap-4">
              {group.rows.map((trip) => (
                <DashboardTripCard
                  key={trip.id}
                  trip={trip}
                  client={client}
                  busy={!!busy}
                  onStatusChange={(id, status) => void tripAction(id, status)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
              {group.id === 'viajes-activos'
                ? 'No tienes viajes en curso.'
                : group.id === 'viajes-completados'
                  ? 'Los viajes completados aparecerán aquí.'
                  : 'No tienes viajes cancelados.'}
            </p>
          )}
        </section>
      ))}
      {!loading && !trips.length && (
        <p className="text-sm text-slate-500">
          Al aceptar una oferta, el viaje aparecerá en ambos paneles.
        </p>
      )}
    </main>
  );
}
