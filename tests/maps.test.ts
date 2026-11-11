import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { matchMunicipality } from '../apps/web/lib/location';
import catalog from '../apps/api/src/catalog/colombia.json';
import sharedCatalog from '../packages/shared/src/colombia.json';

const require = createRequire(import.meta.url);
const { MapsService } = require('../apps/api/dist/maps/maps.service.js');
const { MapsController } = require('../apps/api/dist/maps/maps.controller.js');
const service = () => new MapsService({ get: () => undefined });

// These are isolated contract checks; no database or external provider is contacted.
test('The web and API use the same municipality catalog snapshot', () => {
  assert.deepEqual(sharedCatalog, catalog);
});

test('Municipalities round-trip through the official catalog without guessing', () => {
  for (const [department, municipalities] of Object.entries(catalog)) {
    for (const municipality of municipalities) {
      assert.deepEqual(matchMunicipality(catalog, { department, city: municipality.name }), {
        department,
        city: municipality.name,
      });
    }
  }
});

test('Names with accents and Bogotá aliases match the catalog', () => {
  assert.deepEqual(
    matchMunicipality(catalog, { department: 'Departamento de Antioquia', city: 'Medellin' }),
    { department: 'Antioquia', city: 'Medellín' },
  );
  assert.deepEqual(matchMunicipality(catalog, { city: 'Bogotá' }), {
    department: 'Bogotá, D.C.',
    city: 'Bogotá, D.C.',
  });
});

test('Unknown or conflicting municipalities never produce a guessed match', () => {
  assert.equal(matchMunicipality(catalog, { department: 'Antioquia', city: 'Cali' }), null);
  assert.equal(matchMunicipality(catalog, { city: 'Medellín' }), null);
  assert.equal(matchMunicipality(catalog, { department: 'Desconocido', city: 'Medellín' }), null);
});

test('Reverse lookup preserves the exact pin instead of snapping to a nearby building', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: URL) => {
    assert.equal(url.pathname, '/reverse');
    assert.equal(url.searchParams.get('lat'), '4.65');
    return Response.json({
      lat: '4.651',
      lon: '-74.081',
      display_name: 'Calle de prueba, Bogotá, Colombia',
      address: { city: 'Bogotá', country_code: 'co' },
    });
  });
  const result = await service().reverse({ lat: 4.65, lng: -74.08 });
  assert.equal(result.lat, 4.65);
  assert.equal(result.lng, -74.08);
  assert.equal(result.countryCode, 'co');
});

test('Reverse lookup retains country information for rejecting foreign points', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ display_name: 'Lugar fuera de Colombia', address: { country_code: 'ec' } }),
  );
  assert.equal((await service().reverse({ lat: -1, lng: -78 })).countryCode, 'ec');
});

test('Unavailable reverse lookup leaves a usable manual selection', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Provider offline');
  });
  assert.equal(await service().reverse({ lat: 4.65, lng: -74.08 }), null);
});

test('Empty geocoding results do not invent an address', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unable to geocode' }));
  assert.equal(await service().reverse({ lat: 4.65, lng: -74.08 }), null);
});

test('Search results are restricted to Colombia and include municipality metadata', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: URL) => {
    assert.equal(url.searchParams.get('countrycodes'), 'co');
    return Response.json([
      {
        display_name: 'Lugar de prueba',
        lat: '6.24',
        lon: '-75.58',
        address: { city: 'Medellín', state: 'Antioquia' },
      },
    ]);
  });
  const result = await service().geocode('Lugar de prueba');
  assert.deepEqual(result[0], {
    lat: 6.24,
    lng: -75.58,
    label: 'Lugar de prueba',
    city: 'Medellín',
    department: 'Antioquia',
    countryCode: 'co',
  });
});

test('Repeated and concurrent identical lookups share the cache', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ display_name: 'Lugar de prueba' });
  });
  const maps = service();
  await Promise.all([maps.reverse({ lat: 4, lng: -74 }), maps.reverse({ lat: 4, lng: -74 })]);
  await maps.reverse({ lat: 4, lng: -74 });
  assert.equal(calls, 1);
});

test('Search and reverse requests share a provider rate limit', async (t) => {
  const starts: number[] = [];
  t.mock.method(globalThis, 'fetch', async (url: URL) => {
    starts.push(Date.now());
    return Response.json(url.pathname === '/search' ? [] : { display_name: 'Lugar de prueba' });
  });
  const maps = service();
  await Promise.all([maps.geocode('Bogotá'), maps.reverse({ lat: 4, lng: -74 })]);
  assert.equal(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 1000);
});

test('Controller rejects coordinates outside valid geographic ranges', () => {
  const controller = new MapsController(service());
  for (const [lat, lng] of [
    [91, 0],
    [0, -181],
    [NaN, 0],
    [Infinity, 0],
  ]) {
    assert.throws(() => controller.reverse(lat, lng), /coordenadas/);
  }
});
