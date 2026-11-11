import type { Trip, TripStatus } from './models';

export const tripSteps = [
  {
    status: 'PENDING_PICKUP',
    label: 'Viaje confirmado',
    description: 'La empresa aceptó la oferta y reservó el vehículo.',
  },
  {
    status: 'AT_PICKUP',
    label: 'En recogida',
    description: 'El transportador llegó al punto de origen.',
  },
  {
    status: 'IN_TRANSIT',
    label: 'En camino',
    description: 'La mercancía está en tránsito hacia el destino.',
  },
  {
    status: 'DELIVERED',
    label: 'Entregado · en revisión',
    description: 'El transportador registró la entrega. La empresa debe verificar la recepción.',
  },
  {
    status: 'COMPLETED',
    label: 'Recepción confirmada',
    description: 'La empresa confirmó que recibió la mercancía.',
  },
] as const;

export function isClosedTrip(status: TripStatus) {
  return status === 'COMPLETED' || status === 'CANCELLED';
}
export function canShareTripLocation(status: TripStatus) {
  return status === 'PENDING_PICKUP' || status === 'AT_PICKUP' || status === 'IN_TRANSIT';
}
export function tripStatusLabel(status: TripStatus) {
  return status === 'CANCELLED'
    ? 'Viaje cancelado'
    : (tripSteps.find((step) => step.status === status)?.label ?? status);
}
export function getTripAction(status: TripStatus, role: string) {
  if (role === 'CLIENT')
    return status === 'DELIVERED'
      ? { status: 'COMPLETED' as TripStatus, label: 'Confirmar recepción de mercancía' }
      : null;
  if (role !== 'TRANSPORTER') return null;
  const actions: Partial<Record<TripStatus, { status: TripStatus; label: string }>> = {
    PENDING_PICKUP: { status: 'AT_PICKUP', label: 'Confirmar llegada a recogida' },
    AT_PICKUP: { status: 'IN_TRANSIT', label: 'Iniciar transporte' },
    IN_TRANSIT: { status: 'DELIVERED', label: 'Marcar entrega realizada' },
  };
  return actions[status] ?? null;
}
export function getTripProgress(trip: Pick<Trip, 'status' | 'history'>) {
  const index = tripSteps.findIndex((step) => step.status === trip.status);
  const events = new Set(trip.history.map((event) => event.status));
  return tripSteps.map((step, position) => ({
    ...step,
    reached: trip.status === 'CANCELLED' ? events.has(step.status) : position <= index,
    current: trip.status !== 'CANCELLED' && position === index,
    event: trip.history
      .filter((event) => event.status === step.status)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0],
  }));
}
export function validCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  if (!['string', 'number'].includes(typeof lat) || !['string', 'number'].includes(typeof lng))
    return null;
  const latitude = Number(lat),
    longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return { lat: latitude, lng: longitude };
}
export type TruckFix = {
  lat: number;
  lng: number;
  updatedAt: string;
  ageSeconds: number;
  recent: boolean;
};
export function getTruckFix(
  trip: Pick<Trip, 'status' | 'createdAt' | 'vehicle'>,
  now = Date.now(),
): TruckFix | null {
  // Vehicle positions change across assignments. Never show today's truck on an old trip.
  if (isClosedTrip(trip.status)) return null;
  const point = validCoordinates(trip.vehicle.latitude, trip.vehicle.longitude);
  const updatedAt = trip.vehicle.locationUpdatedAt;
  if (!point || !updatedAt) return null;
  const timestamp = Date.parse(updatedAt),
    started = Date.parse(trip.createdAt);
  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(started) ||
    timestamp < started ||
    timestamp > now + 60000
  )
    return null;
  const ageSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  return { ...point, updatedAt, ageSeconds, recent: ageSeconds <= 120 };
}
export function locationAge(seconds: number) {
  if (seconds < 60) return 'hace menos de un minuto';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} días`;
}
export function tripDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Sin fecha registrada';
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  });
}
