// Ejecutar con API local activa: node apps/api/test/marketplace.e2e.cjs
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const envPath = require('node:path').join(__dirname, '../.env');
if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  process.env.DATABASE_URL = fs
    .readFileSync(envPath, 'utf8')
    .match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
}
const prisma = new PrismaClient();
const base = process.env.TEST_API_URL || 'http://localhost:4000/api';
const prefix = `e2e-${Date.now()}`;
const emails = [];
async function request(path, method = 'GET', token, body, expected = 200) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
function vehicle(plate, maxWeightKg = 10000) {
  return {
    plate,
    brand: 'Prueba',
    model: 'Camión',
    year: 2024,
    vehicleType: 'MEDIUM_TRUCK',
    bodyType: 'BOX',
    maxWeightKg,
    operatingCity: 'Pasto, Nariño',
    photos: [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN3sAAAAASUVORK5CYII=',
    ],
    latitude: 1.2136,
    longitude: -77.2811,
  };
}
async function register(role, name, extra = {}) {
  const email = `${prefix}-${name}@example.test`;
  emails.push(email);
  return request(
    '/auth/register',
    'POST',
    null,
    { email, password: 'Testing123!', displayName: name, phone: '3001234567', role, ...extra },
    201,
  );
}
async function main() {
  try {
    const places = await request('/maps/municipalities');
    assert.equal(Object.keys(places).length, 33); // 32 departamentos + Bogotá D.C.
    assert.equal(Object.values(places).flat().length, 1122);
    assert(places['Nariño'].some((c) => c.name === 'Pasto'));
    assert(!places['Nariño'].some((c) => c.name === 'Cali'));
    const client = await register('CLIENT', 'cliente', { accountType: 'PERSON' });
    const other = await register('CLIENT', 'empresa', { accountType: 'BUSINESS' });
    const driver = await register('TRANSPORTER', 'conductor', {
      vehicle: vehicle(`T${String(Date.now()).slice(-6)}`),
    });
    const second = await register('TRANSPORTER', 'segundo', {
      vehicle: vehicle(`S${String(Date.now()).slice(-6)}`),
    });
    const small = await register('TRANSPORTER', 'pequeno', {
      vehicle: vehicle(`P${String(Date.now()).slice(-6)}`, 100),
    });
    const login = await request(
      '/auth/login',
      'POST',
      null,
      { email: client.user.email, password: 'Testing123!' },
      201,
    );
    assert(login.accessToken);
    await request(
      '/auth/login',
      'POST',
      null,
      { email: client.user.email, password: 'incorrecta' },
      401,
    );
    const me = await request('/auth/me', 'GET', client.accessToken);
    assert.equal(me.companyProfile, null);
    assert.equal(
      (await request('/auth/me', 'GET', other.accessToken)).companyProfile.businessName,
      'empresa',
    );
    const truck = (await request('/vehicles/me', 'GET', driver.accessToken))[0];
    assert.equal(truck.photos.length, 1);
    assert.equal(truck.latitude, 1.2136);
    const gps = await request(`/vehicles/${truck.id}`, 'PATCH', driver.accessToken, {
      latitude: 3.4516,
      longitude: -76.532,
      operatingCity: 'Cali, Valle Del Cauca',
    });
    assert.equal(gps.latitude, 3.4516);
    assert(gps.locationUpdatedAt);
    await request(
      `/vehicles/${truck.id}`,
      'PATCH',
      second.accessToken,
      { operatingCity: 'Otra' },
      403,
    );
    const data = {
      title: `${prefix} Cemento`,
      description: 'Carga de prueba',
      category: 'Cemento',
      quantity: 3,
      quantityUnit: 'TON',
      weightKg: 3000,
      units: 1,
      originDepartment: 'Nariño',
      originCity: 'Pasto',
      pickupAddress: 'Origen',
      pickupLat: 1.2136,
      pickupLng: -77.2811,
      destinationDepartment: 'Valle Del Cauca',
      destinationCity: 'Santiago De Cali',
      deliveryAddress: 'Destino',
      deliveryLat: 3.4516,
      deliveryLng: -76.532,
      pickupWindowStart: '2030-01-02T12:00:00Z',
      deliveryDeadline: '2030-01-04T12:00:00Z',
      requiredVehicleType: 'MEDIUM_TRUCK',
      requiredBodyType: 'BOX',
      requiredCapacityKg: 3000,
      estimatedBudgetCop: 500000,
      negotiable: true,
    };
    await request('/cargos', 'POST', driver.accessToken, data, 403);
    await request(
      '/cargos',
      'POST',
      client.accessToken,
      { ...data, destinationCity: 'Pasto' },
      400,
    );
    await request('/cargos', 'POST', client.accessToken, { ...data, weightKg: 500 }, 400);
    const cargo = await request('/cargos', 'POST', client.accessToken, data, 201);
    assert.equal(Number(cargo.estimatedBudgetCop), 500000);
    assert.equal(cargo.quantityUnit, 'TON');
    const filtered = await request(
      '/cargos?originCity=Pasto&destinationCity=Santiago%20De%20Cali&category=Cemento&vehicleType=MEDIUM_TRUCK&bodyType=BOX&maxBudgetCop=500000&minWeightKg=3000&maxWeightKg=3000&sort=budgetAsc&page=1&limit=10',
    );
    assert(filtered.total >= 1);
    assert(filtered.items.some((item) => item.id === cargo.id));
    assert.equal(filtered.page, 1);
    assert.equal(filtered.limit, 10);
    await request('/cargos?minWeightKg=3001&maxWeightKg=3000', 'GET', null, null, 400);
    await request('/cargos?limit=51', 'GET', null, null, 400);
    const compatible = await request('/cargos/compatible?limit=10', 'GET', driver.accessToken);
    assert(compatible.items.some((item) => item.id === cargo.id));
    await request('/cargos/compatible', 'GET', client.accessToken, null, 403);
    const offer = {
      vehicleId: truck.id,
      proposedPriceCop: 450000,
      availablePickupDate: '2030-01-02T13:00:00Z',
      estimatedTransportHours: 8,
      message: 'Disponible',
    };
    await request(`/cargos/${cargo.id}/proposals`, 'POST', null, offer, 401);
    const smallTruck = (await request('/vehicles/me', 'GET', small.accessToken))[0];
    await request(
      `/cargos/${cargo.id}/proposals`,
      'POST',
      small.accessToken,
      { ...offer, vehicleId: smallTruck.id },
      400,
    );
    const proposal = await request(
      `/cargos/${cargo.id}/proposals`,
      'POST',
      driver.accessToken,
      offer,
      201,
    );
    await request(`/cargos/${cargo.id}/proposals`, 'POST', driver.accessToken, offer, 400);
    assert.equal(
      (await request(`/cargos/${cargo.id}/proposals`, 'GET', other.accessToken)).length,
      0,
    );
    assert.equal(
      (await request(`/cargos/${cargo.id}/proposals`, 'GET', client.accessToken))[0].transporter
        .profile.phone,
      '3001234567',
    );
    const publicDetail = await request(`/cargos/${cargo.id}`);
    assert.equal(publicDetail.proposals, undefined);
    assert(
      (await request('/notifications', 'GET', client.accessToken)).some(
        (n) => n.type === 'PROPOSAL_RECEIVED',
      ),
    );
    assert((await request('/notifications/unread-count', 'GET', client.accessToken)).count > 0);
    await request('/notifications/read-all', 'PATCH', client.accessToken);
    assert.equal(
      (await request('/notifications/unread-count', 'GET', client.accessToken)).count,
      0,
    );
    await request(`/proposals/${proposal.id}/reject`, 'PATCH', client.accessToken);
    assert(
      (await request('/notifications', 'GET', driver.accessToken)).some(
        (n) => n.type === 'PROPOSAL_REJECTED',
      ),
    );
    const again = await request(
      `/cargos/${cargo.id}/proposals`,
      'POST',
      driver.accessToken,
      offer,
      201,
    );
    assert.equal(again.id, proposal.id);
    await request(`/proposals/${proposal.id}/withdraw`, 'PATCH', driver.accessToken);
    await request(`/cargos/${cargo.id}/proposals`, 'POST', driver.accessToken, offer, 201);
    const secondTruck = (await request('/vehicles/me', 'GET', second.accessToken))[0];
    const otherOffer = await request(
      `/cargos/${cargo.id}/proposals`,
      'POST',
      second.accessToken,
      { ...offer, vehicleId: secondTruck.id },
      201,
    );
    await request(`/proposals/${proposal.id}/accept`, 'PATCH', other.accessToken, null, 403);
    const trip = await request(`/proposals/${proposal.id}/accept`, 'PATCH', client.accessToken);
    const clientTrips = await request('/trips/me', 'GET', client.accessToken);
    const driverTrips = await request('/trips/me', 'GET', driver.accessToken);
    assert.equal(clientTrips[0].id, trip.id);
    assert.equal(driverTrips[0].id, trip.id);
    await request(`/trips/${trip.id}/history`, 'GET', other.accessToken, null, 403);
    await request(`/trips/${trip.id}/history`, 'GET', null, null, 401);
    assert.equal(
      (await request(`/trips/${trip.id}/history`, 'GET', client.accessToken))[0].status,
      'PENDING_PICKUP',
    );
    const previousGps = (await request('/vehicles/me', 'GET', driver.accessToken))[0];
    await request(`/vehicles/${previousGps.id}`, 'PATCH', driver.accessToken, {
      latitude: 4.711,
      longitude: -74.0721,
    });
    assert.equal(
      (await request(`/trips/${trip.id}`, 'GET', client.accessToken)).vehicle.latitude,
      4.711,
    );
    await request(`/trips/${trip.id}`, 'GET', second.accessToken, null, 403);
    assert.equal(clientTrips[0].transporter.email, driver.user.email);
    assert.equal(driverTrips[0].client.email, client.user.email);
    const ownOffers = await request('/proposals/me', 'GET', second.accessToken);
    assert.equal(ownOffers.find((p) => p.id === otherOffer.id).status, 'REJECTED');
    assert.equal((await request('/vehicles/me', 'GET', driver.accessToken))[0].isAvailable, false);
    await request(`/proposals/${proposal.id}/accept`, 'PATCH', client.accessToken, null, 400);
    assert(
      (await request('/notifications', 'GET', driver.accessToken)).some(
        (n) => n.type === 'PROPOSAL_ACCEPTED',
      ),
    );
    const acceptedNotice = (await request('/notifications', 'GET', driver.accessToken)).find(
      (n) => n.type === 'PROPOSAL_ACCEPTED',
    );
    assert.equal(acceptedNotice.metadata.tripId, trip.id);
    await request(`/trips/${trip.id}/messages`, 'GET', second.accessToken, null, 403);
    const message = await request(
      `/trips/${trip.id}/messages`,
      'POST',
      client.accessToken,
      {
        body: 'Confirmo la dirección de entrega.',
      },
      201,
    );
    assert.equal(message.senderId, client.user.id);
    assert.equal(message.body, 'Confirmo la dirección de entrega.');
    assert.equal(
      (await request(`/trips/${trip.id}/messages`, 'GET', driver.accessToken))[0].id,
      message.id,
    );
    assert(
      (await request('/notifications', 'GET', driver.accessToken)).some(
        (n) => n.type === 'TRIP_MESSAGE' && n.metadata.tripId === trip.id,
      ),
    );
    await request(
      `/trips/${trip.id}/messages`,
      'POST',
      second.accessToken,
      { body: 'Intruso' },
      403,
    );
    const incident = await request(
      `/trips/${trip.id}/incidents`,
      'POST',
      client.accessToken,
      {
        type: 'DELIVERY_DELAY',
        description: 'El vehículo está detenido por cierre vial.',
      },
      201,
    );
    assert.equal(incident.status, 'OPEN');
    assert.equal(
      (await request(`/trips/${trip.id}/incidents`, 'GET', driver.accessToken))[0].id,
      incident.id,
    );
    await request(`/trips/${trip.id}/incidents`, 'GET', second.accessToken, null, 403);
    await request(
      `/trips/${trip.id}/incidents`,
      'POST',
      client.accessToken,
      {
        type: 'UNKNOWN',
        description: 'Tipo inválido de prueba.',
      },
      400,
    );
    assert(
      (await request('/notifications', 'GET', driver.accessToken)).some(
        (n) => n.type === 'TRIP_INCIDENT' && n.metadata.incidentId === incident.id,
      ),
    );
    for (const status of ['AT_PICKUP', 'IN_TRANSIT', 'DELIVERED']) {
      await request(`/trips/${trip.id}/status`, 'PATCH', driver.accessToken, { status });
    }
    await request(
      `/trips/${trip.id}/status`,
      'PATCH',
      driver.accessToken,
      { status: 'COMPLETED' },
      403,
    );
    await request(`/trips/${trip.id}/status`, 'PATCH', client.accessToken, { status: 'COMPLETED' });
    const clientReview = await request(
      `/trips/${trip.id}/reviews`,
      'POST',
      client.accessToken,
      {
        score: 5,
        comment: 'Buena comunicación durante el recorrido.',
      },
      201,
    );
    assert.equal(clientReview.recipientId, driver.user.id);
    assert.deepEqual(await request('/trips/reviews/me', 'GET', driver.accessToken), {
      average: 5,
      count: 1,
    });
    assert.equal(
      (await request(`/trips/${trip.id}/reviews`, 'GET', driver.accessToken))[0].id,
      clientReview.id,
    );
    await request(`/trips/${trip.id}/reviews`, 'POST', client.accessToken, { score: 4 }, 400);
    await request(`/trips/${trip.id}/reviews`, 'POST', second.accessToken, { score: 5 }, 403);
    await request(`/trips/${trip.id}/reviews`, 'POST', driver.accessToken, { score: 0 }, 400);
    assert.equal((await request('/vehicles/me', 'GET', driver.accessToken))[0].isAvailable, true);
    assert.equal((await request(`/cargos/${cargo.id}`)).status, 'COMPLETED');
    const closedTrips = await request('/trips/me', 'GET', client.accessToken);
    assert.equal(closedTrips[0].vehicle.latitude, null);
    assert.equal(closedTrips[0].vehicle.longitude, null);
    assert.equal(closedTrips[0].vehicle.locationUpdatedAt, null);
    await request(`/vehicles/${truck.id}`, 'GET', client.accessToken, null, 403);
    assert.deepEqual(
      (await request(`/trips/${trip.id}/history`, 'GET', client.accessToken)).map(
        (event) => event.status,
      ),
      ['PENDING_PICKUP', 'AT_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'],
    );
    console.log(
      'OK: catálogo, cuentas, roles, GPS, foto, carga, oferta, disponibilidad, permisos del historial, seguimiento y privacidad de ubicación finalizada.',
    );
  } finally {
    const ids = (
      await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } })
    ).map((u) => u.id);
    const trips = await prisma.trip.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    await prisma.tripStatusHistory.deleteMany({
      where: { tripId: { in: trips.map((t) => t.id) } },
    });
    await prisma.trip.deleteMany({ where: { id: { in: trips.map((t) => t.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
