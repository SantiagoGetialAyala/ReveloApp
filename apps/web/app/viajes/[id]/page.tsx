'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Loader2,
  Navigation,
  MapPin,
  Package,
  Printer,
  Radio,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import { Access, useSession } from '../../../components/session';
import { Button } from '../../../components/button';
import { TripMap } from '../../../components/trip-map';
import { TripChat } from '../../../components/trip-chat';
import { TripIncidents } from '../../../components/trip-incidents';
import { TripReviews } from '../../../components/trip-reviews';
import { ProposalNegotiation } from '../../../components/proposal-negotiation';
import { TripHistory, TripTimeline } from '../../../components/trip-timeline';
import { useVehicleGps } from '../../../hooks/use-vehicle-gps';
import { apiFetch } from '../../../lib/api';
import type { Contact, Trip } from '../../../lib/models';
import {
  canShareTripLocation,
  getTripAction,
  getTruckFix,
  isClosedTrip,
  locationAge,
  tripDate,
  tripStatusLabel,
  validCoordinates,
} from '../../../lib/tracking';
import { moneyCop } from '../../../lib/utils';

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Access>
      <TripDetail key={id} id={id} />
    </Access>
  );
}
function TripDetail({ id }: { id: string }) {
  const { user, token } = useSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [note, setNote] = useState('');
  const [navigationMessage, setNavigationMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const actionAbort = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (force = false) => {
      if (!token || (request.current && !force)) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setRefreshing(true);
      try {
        const result = await apiFetch<Trip>(`/trips/${id}`, { token, signal: controller.signal });
        if (controller.signal.aborted || !mounted.current) return;
        setTrip(result);
        setLoadError('');
        setLastChecked(new Date().toISOString());
        setNow(Date.now());
      } catch (error) {
        if (!controller.signal.aborted && mounted.current) setLoadError((error as Error).message);
      } finally {
        if (!controller.signal.aborted && mounted.current) {
          setLoading(false);
          setRefreshing(false);
          request.current = null;
        }
      }
    },
    [id, token],
  );
  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    const interval = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false;
      request.current?.abort();
      request.current = null;
      actionAbort.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const driver = user?.role === 'TRANSPORTER' && user.id === trip?.transporterId;
  const client = user?.role === 'CLIENT' && user.id === trip?.clientId;
  const admin = user?.role === 'ADMIN';
  const allowed = !!trip && driver && canShareTripLocation(trip.status);
  const gps = useVehicleGps({
    vehicleId: trip?.vehicle.id ?? '',
    token,
    allowed,
    onSaved: () => {
      void refresh(true);
    },
  });
  const next = trip && (driver || client) ? getTripAction(trip.status, user!.role) : null;
  function openMapsToNextStop() {
    if (!trip || !driver) return;
    setNavigationMessage('');
    const toPickup = trip.status === 'PENDING_PICKUP';
    const target = toPickup
      ? { lat: Number(trip.cargo.pickupLat), lng: Number(trip.cargo.pickupLng) }
      : { lat: Number(trip.cargo.deliveryLat), lng: Number(trip.cargo.deliveryLng) };
    const address = toPickup
      ? `${trip.cargo.pickupAddress}, ${trip.cargo.originCity}`
      : `${trip.cargo.deliveryAddress}, ${trip.cargo.destinationCity}`;
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setNavigationMessage('Permite las ventanas emergentes para abrir la navegación en Maps.');
      return;
    }
    const openDirections = (origin?: { lat: number; lng: number }) => {
      const from = origin ? `saddr=${encodeURIComponent(`${origin.lat},${origin.lng}`)}&` : '';
      const url = `https://maps.google.com/maps?${from}daddr=${encodeURIComponent(`${target.lat},${target.lng}`)}&dirflg=d`;
      tab.location.replace(url);
      setNavigationMessage(
        origin
          ? `Ruta abierta hacia ${address} desde tu ubicación actual.`
          : `Ruta abierta hacia ${address}. Maps usará la ubicación actual del dispositivo.`,
      );
    };
    if (!navigator.geolocation) {
      openDirections();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => openDirections({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => openDirections(),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }
  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip || !next || saving) return;
    setSaving(true);
    setActionError('');
    setSuccess('');
    const controller = new AbortController();
    actionAbort.current = controller;
    try {
      const updated = await apiFetch<Pick<Trip, 'status' | 'updatedAt'>>(`/trips/${id}/status`, {
        token: token!,
        method: 'PATCH',
        signal: controller.signal,
        body: JSON.stringify({
          status: next.status,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      if (controller.signal.aborted || !mounted.current) return;
      // Stop GPS immediately on delivery, including when a subsequent refresh fails.
      setTrip((current) =>
        current ? { ...current, status: updated.status, updatedAt: updated.updatedAt } : current,
      );
      setSuccess('Actualización guardada. La otra parte podrá verla en su seguimiento.');
      setNote('');
      await refresh(true);
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        setActionError((error as Error).message);
        await refresh(true);
      }
    } finally {
      if (!controller.signal.aborted && mounted.current) setSaving(false);
    }
  }
  if (loading)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="trip-surface p-10 text-center" role="status">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-blue-600" />
          Cargando el seguimiento de tu viaje…
        </div>
      </main>
    );
  if (!trip)
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="trip-surface p-6">
          <h1 className="text-xl font-bold">No pudimos abrir este viaje</h1>
          <p role="alert" className="my-4 text-sm text-slate-600">
            {loadError || 'Comprueba que el viaje exista y que participes en él.'}
          </p>
          <Button disabled={refreshing} onClick={() => void refresh(true)}>
            Volver a intentar
          </Button>
          <Link href="/dashboard" className="ml-4 text-sm underline">
            Volver a mi panel
          </Link>
        </div>
      </main>
    );
  const closed = isClosedTrip(trip.status);
  const truck = getTruckFix(trip, now);
  const origin = validCoordinates(trip.cargo.pickupLat, trip.cargo.pickupLng);
  const destination = validCoordinates(trip.cargo.deliveryLat, trip.cargo.deliveryLng);
  const headlines: Record<Trip['status'], string> = {
    PENDING_PICKUP: 'Todo listo para comenzar.',
    AT_PICKUP: 'La recogida está en marcha.',
    IN_TRANSIT: 'Tu mercancía está en camino.',
    DELIVERED: client
      ? 'Entregada. Es momento de revisarla.'
      : 'Entrega registrada. Falta la confirmación.',
    COMPLETED: 'Una entrega más, completada.',
    CANCELLED: 'Este viaje fue cancelado.',
  };
  return (
    <main className="tracking-page mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="print-hidden focus-ring inline-flex items-center gap-2 rounded text-sm font-medium text-slate-500 hover:text-blue-700"
          href="/dashboard#mis-viajes"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis viajes
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:block">
            {lastChecked
              ? `Consultado ${new Date(lastChecked).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}`
              : 'Sin actualizar'}
          </span>
          <Button className="print-hidden" variant="ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir ficha / Guardar PDF
          </Button>
          <Button
            className="print-hidden h-9 px-2 text-xs"
            variant="ghost"
            disabled={refreshing || saving}
            onClick={() => void refresh(true)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>
      <p className="hidden text-xs text-slate-500 print:block">
        Ficha informativa de Revelo Transporte; no reemplaza manifiestos, remesas ni documentos
        regulatorios.
      </p>
      <section
        className={`trip-hero trip-reveal mb-6 overflow-hidden rounded-3xl p-6 text-white sm:p-8 ${closed ? 'trip-hero-closed' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-blue-100">
            <Truck className="h-4 w-4" />
            Revelo · Seguimiento
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {tripStatusLabel(trip.status)}
          </span>
        </div>
        <h1 className="mt-6 max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">
          {headlines[trip.status]}
        </h1>
        <Link
          href={`/cargas/${trip.cargo.id}`}
          className="mt-3 inline-flex max-w-full items-center gap-2 text-sm text-blue-100 underline decoration-white/30 underline-offset-4"
        >
          {trip.cargo.title}
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
        <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-300" />
            {trip.cargo.originCity}
          </span>
          <span className="h-px w-8 bg-white/30" aria-hidden="true" />
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            {trip.cargo.destinationCity}
          </span>
          <span className="ml-auto rounded-lg bg-black/10 px-3 py-2 font-mono text-xs">
            Viaje #{trip.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </section>
      {loadError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          No pudimos actualizar: {loadError} Los datos visibles corresponden a la última consulta
          exitosa.
        </div>
      )}
      {success && (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5 trip-reveal trip-reveal-delay">
          {origin && destination ? (
            <TripMap
              origin={{ ...origin, label: `Origen · ${trip.cargo.pickupAddress}` }}
              destination={{ ...destination, label: `Destino · ${trip.cargo.deliveryAddress}` }}
              truck={truck}
              closed={closed}
            />
          ) : (
            <section className="trip-surface p-6">
              <h2 className="font-bold">Mapa no disponible</h2>
              <p className="mt-2 text-sm text-slate-500">
                Este viaje no tiene coordenadas válidas. Puedes consultar las direcciones y los
                estados.
              </p>
            </section>
          )}
          {driver && ['PENDING_PICKUP', 'AT_PICKUP', 'IN_TRANSIT'].includes(trip.status) && (
            <section className="trip-surface border-blue-200 bg-blue-50/40 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Próxima parada
                  </p>
                  <h2 className="mt-1 font-bold text-slate-950">
                    {trip.status === 'PENDING_PICKUP'
                      ? 'Dirígete al punto de recogida'
                      : 'Dirígete al destino de entrega'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {trip.status === 'PENDING_PICKUP'
                      ? `${trip.cargo.pickupAddress}, ${trip.cargo.originCity}`
                      : `${trip.cargo.deliveryAddress}, ${trip.cargo.destinationCity}`}
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-500">
                    {trip.status === 'PENDING_PICKUP'
                      ? `${trip.cargo.pickupLat}, ${trip.cargo.pickupLng}`
                      : `${trip.cargo.deliveryLat}, ${trip.cargo.deliveryLng}`}
                  </p>
                  <Button className="mt-4 w-full sm:w-auto" onClick={openMapsToNextStop}>
                    <Navigation className="h-4 w-4" />
                    {trip.status === 'PENDING_PICKUP'
                      ? 'Iniciar ruta a la recogida'
                      : 'Iniciar ruta al destino'}
                  </Button>
                  {navigationMessage && (
                    <p role="status" className="mt-2 text-xs text-slate-600">
                      {navigationMessage}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Abre Google Maps mediante un enlace. No requiere clave ni integración de API.
                  </p>
                </div>
              </div>
            </section>
          )}
          <section className="trip-surface p-5 sm:p-6" aria-label="Ubicación y conexión">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 rounded-xl p-2.5 ${truck?.recent ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
              >
                <Radio className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900">
                  {closed
                    ? 'Seguimiento de ubicación finalizado'
                    : truck?.recent
                      ? 'El camión tiene una ubicación reciente'
                      : truck
                        ? 'La ubicación necesita actualizarse'
                        : 'Aún no hay ubicación GPS para este viaje'}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {closed
                    ? 'Por privacidad, los viajes finalizados no muestran la ubicación actual del vehículo.'
                    : truck
                      ? `Última señal ${locationAge(truck.ageSeconds)} · ${tripDate(truck.updatedAt)}. La posición representa el último dato recibido.`
                      : driver
                        ? 'Activa el GPS desde el dispositivo que llevas en el camión para compartir tu posición con la empresa.'
                        : 'El transportador debe activar la ubicación desde el dispositivo que lleva en el camión.'}
                </p>
              </div>
            </div>
            {allowed && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <Button
                  type="button"
                  variant={gps.sharing ? 'ghost' : 'primary'}
                  onClick={gps.toggle}
                >
                  <Navigation className="h-4 w-4" />
                  {gps.sharing ? 'Detener ubicación compartida' : 'Compartir ubicación del camión'}
                </Button>
                <p
                  className={`mt-2 text-xs leading-relaxed ${gps.error ? 'text-amber-800' : 'text-slate-500'}`}
                  role="status"
                >
                  {gps.message ||
                    'Comparte la ubicación de este dispositivo. Requiere permiso del navegador y mantener esta página abierta; las actualizaciones se limitan a una cada 30 segundos.'}
                </p>
              </div>
            )}
            {!closed && (
              <p className="mt-4 text-xs text-slate-400">
                El panel consulta actualizaciones cada 15 segundos. El GPS depende de la señal, la
                conexión y los permisos del transportador.
              </p>
            )}
          </section>
          {next && (
            <section className="trip-surface border-blue-200 p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-900">
                    {client ? 'Revisa y confirma tu entrega' : 'La siguiente etapa depende de ti'}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {client
                      ? 'Verifica que la mercancía llegó correctamente. Al confirmar, el viaje se cierra y el vehículo queda disponible.'
                      : next.status === 'DELIVERED'
                        ? 'Registra la entrega cuando hayas llegado y entregado la mercancía. La empresa revisará y confirmará la recepción.'
                        : 'Actualiza el estado cuando completes esta etapa. La empresa verá el cambio en su seguimiento.'}
                  </p>
                </div>
              </div>
              <form onSubmit={updateStatus}>
                <label className="field">
                  Nota de la actualización{' '}
                  <span className="text-xs font-normal text-slate-400">
                    Opcional · visible para ambas partes
                  </span>
                  <textarea
                    className="input min-h-20 resize-y"
                    maxLength={1000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Información útil sobre la recogida o la entrega…"
                  />
                </label>
                {actionError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
                <Button
                  className="mt-4 w-full bg-blue-700 hover:bg-blue-800 sm:w-auto"
                  disabled={saving || refreshing}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {saving ? 'Guardando actualización…' : next.label}
                </Button>
              </form>
            </section>
          )}
          {trip.status === 'DELIVERED' && !client && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Entrega en revisión. La empresa debe confirmar la recepción para finalizar el viaje.
              </p>
            </div>
          )}
          {(client || driver) && <TripIncidents tripId={trip.id} token={token} />}
          {trip.status === 'COMPLETED' && user && (
            <TripReviews tripId={trip.id} token={token} userId={user.id} />
          )}
          <section className="trip-surface p-5 sm:p-6">
            <h2 className="mb-5 font-bold text-slate-900">Los puntos de tu viaje</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  label: 'Recogida',
                  city: trip.cargo.originCity,
                  address: trip.cargo.pickupAddress,
                  date: trip.pickupDate,
                  color: 'bg-blue-600',
                },
                {
                  label: 'Entrega estimada acordada',
                  city: trip.cargo.destinationCity,
                  address: trip.cargo.deliveryAddress,
                  date: trip.estimatedDeliveryDate,
                  color: 'bg-emerald-600',
                },
              ].map((point) => (
                <div key={point.label}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${point.color}`} />
                    {point.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{point.city}</p>
                  <p className="mt-1 break-words text-sm text-slate-500">{point.address}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {tripDate(point.date)}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <TripHistory trip={trip} />
          {(client || driver || admin) && user && (
            <TripChat tripId={trip.id} token={token} userId={user.id} readOnly={admin} />
          )}
          {admin && trip.proposalId && (
            <ProposalNegotiation
              proposalId={trip.proposalId}
              publishedPriceCop={trip.cargo.estimatedBudgetCop}
              readOnly
            />
          )}
        </div>
        <aside className="min-w-0 space-y-5 trip-reveal trip-reveal-delay-2">
          <TripTimeline trip={trip} />
          <section className="trip-surface p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Truck className="h-4 w-4 text-blue-600" />
              Vehículo asignado
            </h2>
            {trip.vehicle.photos[0] && (
              <img
                src={trip.vehicle.photos[0]}
                alt={`Vehículo ${trip.vehicle.plate}`}
                className="mb-4 h-36 w-full rounded-xl bg-slate-100 object-cover"
              />
            )}
            <p className="text-lg font-bold tracking-wide text-slate-900">{trip.vehicle.plate}</p>
            <p className="mt-1 text-sm text-slate-500">
              {trip.vehicle.brand} {trip.vehicle.model}
            </p>
            <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-500">Valor acordado</span>
              <strong className="text-slate-900">{moneyCop(trip.agreedPriceCop)}</strong>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Package className="h-3.5 w-3.5" />
              {Number(trip.cargo.weightKg).toLocaleString('es-CO')} kg de mercancía
            </p>
          </section>
          <ContactCard
            contact={client ? trip.transporter : trip.client}
            label={client ? 'Tu transportador' : 'Empresa o cliente'}
          />
          <div className="flex gap-2 px-1 text-xs leading-relaxed text-slate-500">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Los estados se registran por las personas que participan en el viaje. “En revisión”
              significa que la entrega espera la confirmación de la empresa.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
function ContactCard({ contact, label }: { contact?: Contact; label: string }) {
  if (!contact) return null;
  const phone = contact.companyProfile?.contactPhone ?? contact.profile?.phone;
  return (
    <section className="trip-surface p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <UserRound className="h-4 w-4 text-blue-600" />
        {label}
      </h2>
      <p className="text-sm font-semibold text-slate-800">
        {contact.companyProfile?.businessName ??
          contact.transporterProfile?.displayName ??
          contact.profile?.firstName ??
          'Contacto del viaje'}
      </p>
      <a
        href={`mailto:${contact.email}`}
        className="focus-ring mt-1 block break-all rounded text-sm text-slate-500 hover:text-blue-700"
      >
        {contact.email}
      </a>
      {phone && (
        <a
          href={`tel:${phone.replace(/[^+\d]/g, '')}`}
          className="focus-ring mt-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Llamar · {phone}
        </a>
      )}
    </section>
  );
}
