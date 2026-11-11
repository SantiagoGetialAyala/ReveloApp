import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canShareTripLocation,
  getTripAction,
  getTripProgress,
  getTruckFix,
  isClosedTrip,
  locationAge,
  tripStatusLabel,
  validCoordinates,
} from '../apps/web/lib/tracking';
import type { Trip, TripHistory, TripStatus } from '../apps/web/lib/models';

const epoch = '2026-11-03T15:00:00.000Z';
function makeTrip(status: TripStatus = 'IN_TRANSIT', history: TripHistory[] = []): Trip {
  return {
    id: 'trip-123',
    proposalId: 'proposal-123',
    clientId: 'client-1',
    transporterId: 'driver-1',
    createdAt: epoch,
    updatedAt: epoch,
    pickupDate: epoch,
    estimatedDeliveryDate: epoch,
    status,
    history,
    agreedPriceCop: '1000000',
    cargo: {
      id: 'cargo-1',
      clientId: 'client-1',
      title: 'Carga',
      description: 'Carga de prueba',
      status: 'ASSIGNED',
      estimatedBudgetCop: '1000000',
      weightKg: '100',
      originCity: 'Bogotá',
      destinationCity: 'Cali',
      originDepartment: 'Bogotá, D.C.',
      destinationDepartment: 'Valle del Cauca',
      pickupWindowStart: epoch,
      deliveryDeadline: epoch,
      pickupAddress: 'Origen',
      deliveryAddress: 'Destino',
      pickupLat: 4.7,
      pickupLng: -74.1,
      deliveryLat: 3.45,
      deliveryLng: -76.53,
    },
    vehicle: {
      id: 'vehicle-1',
      plate: 'ABC123',
      brand: 'Marca',
      model: 'Camión',
      year: 2024,
      vehicleType: 'SMALL_TRUCK',
      bodyType: 'BOX',
      maxWeightKg: '10000',
      operatingCity: 'Bogotá',
      photos: [],
      isAvailable: false,
    },
  };
}
test('Shipment timeline follows persisted stages with the correct current step', () => {
  const trip = makeTrip('IN_TRANSIT', [
    { id: '1', status: 'PENDING_PICKUP', createdAt: epoch, note: 'Oferta aceptada' },
    { id: '2', status: 'AT_PICKUP', createdAt: epoch },
    { id: '3', status: 'IN_TRANSIT', createdAt: epoch },
  ]);
  const steps = getTripProgress(trip);
  assert.deepEqual(
    steps.map((step) => step.reached),
    [true, true, true, false, false],
  );
  assert.equal(steps.find((step) => step.current)?.label, 'En camino');
  assert.equal(steps[0].event?.note, 'Oferta aceptada');
});
test('Delivery remains in company review until the client confirms receipt', () => {
  assert.equal(tripStatusLabel('DELIVERED'), 'Entregado · en revisión');
  assert.equal(getTripAction('DELIVERED', 'CLIENT')?.status, 'COMPLETED');
  assert.equal(getTripAction('DELIVERED', 'TRANSPORTER'), null);
  assert.equal(getTripProgress(makeTrip('DELIVERED')).filter((step) => step.reached).length, 4);
});
test('only the assigned carrier can advance the operational milestones', () => {
  assert.deepEqual(getTripAction('PENDING_PICKUP', 'TRANSPORTER'), {
    status: 'AT_PICKUP',
    label: 'Confirmar llegada a recogida',
  });
  assert.deepEqual(getTripAction('AT_PICKUP', 'TRANSPORTER'), {
    status: 'IN_TRANSIT',
    label: 'Iniciar transporte',
  });
  assert.deepEqual(getTripAction('IN_TRANSIT', 'TRANSPORTER'), {
    status: 'DELIVERED',
    label: 'Marcar entrega realizada',
  });
  assert.equal(getTripAction('IN_TRANSIT', 'CLIENT'), null);
  assert.equal(getTripAction('DELIVERED', 'ADMIN'), null);
  assert.equal(getTripAction('COMPLETED', 'TRANSPORTER'), null);
});
test('cancellation only marks the real prior milestones as reached', () => {
  const trip = makeTrip('CANCELLED', [
    { id: '1', status: 'PENDING_PICKUP', createdAt: epoch },
    { id: '2', status: 'CANCELLED', createdAt: epoch },
  ]);
  assert.deepEqual(
    getTripProgress(trip).map((step) => step.reached),
    [true, false, false, false, false],
  );
  assert.equal(isClosedTrip('CANCELLED'), true);
  assert.equal(getTripAction('CANCELLED', 'CLIENT'), null);
});
test('GPS display rejects invalid, missing, future and pre-trip fixes', () => {
  assert.equal(validCoordinates('', -74), null);
  assert.equal(validCoordinates(95, -74), null);
  assert.equal(validCoordinates(4.7, Infinity), null);
  assert.equal(getTruckFix(makeTrip()), null);
  const oldLocation = makeTrip('IN_TRANSIT');
  oldLocation.vehicle.latitude = 4.7;
  oldLocation.vehicle.longitude = -74.1;
  oldLocation.vehicle.locationUpdatedAt = '2026-11-03T14:59:59.999Z';
  assert.equal(getTruckFix(oldLocation), null);
});
test('GPS positions are actual saved points, never extrapolated or falsely marked fresh', () => {
  const trip = makeTrip('IN_TRANSIT');
  trip.createdAt = '2026-11-03T14:00:00.000Z';
  trip.vehicle.latitude = '4.711';
  trip.vehicle.longitude = '-74.0721';
  trip.vehicle.locationUpdatedAt = '2026-11-03T14:58:00.000Z';
  const fix = getTruckFix(trip, Date.parse(epoch));
  assert.deepEqual(fix, {
    lat: 4.711,
    lng: -74.0721,
    updatedAt: trip.vehicle.locationUpdatedAt,
    ageSeconds: 120,
    recent: true,
  });
  const stale = getTruckFix(trip, Date.parse(epoch) + 180_000);
  assert.equal(stale?.recent, false);
  assert.equal(stale?.lat, 4.711);
});
test('completed trips stop GPS and never reveal the vehicle’s later live location', () => {
  for (const status of ['COMPLETED', 'CANCELLED'] as const) {
    const trip = makeTrip(status);
    trip.vehicle.latitude = 4.711;
    trip.vehicle.longitude = -74.0721;
    trip.vehicle.locationUpdatedAt = epoch;
    assert.equal(getTruckFix(trip), null);
    assert.equal(canShareTripLocation(trip.status), false);
    assert.equal(isClosedTrip(trip.status), true);
  }
});
test('only an active transport shares device GPS', () => {
  for (const status of ['PENDING_PICKUP', 'AT_PICKUP', 'IN_TRANSIT'] as const)
    assert.equal(canShareTripLocation(status), true);
  assert.equal(canShareTripLocation('DELIVERED'), false);
});
test('location freshness labels are comprehensible', () => {
  assert.equal(locationAge(0), 'hace menos de un minuto');
  assert.equal(locationAge(125), 'hace 2 min');
  assert.equal(locationAge(7200), 'hace 2 h');
  assert.equal(locationAge(172800), 'hace 2 días');
});
