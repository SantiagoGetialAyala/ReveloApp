import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Coordinate = { lat: number; lng: number };
type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  department?: string;
  countryCode?: string;
};

@Injectable()
export class MapsService {
  constructor(private readonly config: ConfigService) {}

  // Shared by forward/reverse lookups: public Nominatim allows one request/second.
  private geocodingQueue: Promise<unknown> = Promise.resolve();
  private lastGeocodingRequest = 0;
  private pendingLookups = 0;
  private readonly geocodingCache = new Map<string, { expires: number; value: unknown }>();

  private async lookup<T>(url: URL): Promise<T> {
    const key = url.toString();
    const cached = this.geocodingCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    if (this.pendingLookups >= 8) throw new Error('Geocoding is busy');
    this.pendingLookups++;
    const task = this.geocodingQueue
      .catch(() => undefined)
      .then(async () => {
        const existing = this.geocodingCache.get(key);
        if (existing && existing.expires > Date.now()) return existing.value as T;
        const delay = Math.max(0, 1100 - (Date.now() - this.lastGeocodingRequest));
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        this.lastGeocodingRequest = Date.now();
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              this.config.get<string>('GEOCODING_USER_AGENT') ?? 'revelo-transporte-platform/0.1',
            'Accept-Language': 'es',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`Geocoding ${response.status}`);
        const value = (await response.json()) as T;
        if (this.geocodingCache.size >= 200)
          this.geocodingCache.delete(this.geocodingCache.keys().next().value!);
        this.geocodingCache.set(key, { expires: Date.now() + 86400000, value });
        return value;
      });
    this.geocodingQueue = task;
    try {
      return await task;
    } finally {
      this.pendingLookups--;
    }
  }

  private geocodingUrl(path: string) {
    const base =
      this.config.get<string>('GEOCODING_BASE_URL') ?? 'https://nominatim.openstreetmap.org';
    return new URL(`${base.replace(/\/$/, '')}/${path}`);
  }

  async reverse(point: Coordinate): Promise<GeocodeResult | null> {
    const url = this.geocodingUrl('reverse');
    url.searchParams.set('lat', String(point.lat));
    url.searchParams.set('lon', String(point.lng));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    try {
      const item = await this.lookup<{
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          municipality?: string;
          village?: string;
          state?: string;
          country_code?: string;
        };
      }>(url);
      if (!item.display_name) return null;
      return {
        // Nominatim may return the nearest building: never replace the user's pin.
        lat: point.lat,
        lng: point.lng,
        label: item.display_name,
        city:
          item.address?.city ??
          item.address?.town ??
          item.address?.municipality ??
          item.address?.village,
        department: item.address?.state,
        countryCode: item.address?.country_code,
      };
    } catch {
      return null;
    }
  }

  async route(origin: Coordinate, destination: Coordinate) {
    const baseUrl = this.config.get<string>('OSRM_BASE_URL') ?? 'https://router.project-osrm.org';
    const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`OSRM ${response.status}`);
      const data = (await response.json()) as {
        routes?: Array<{ distance: number; duration: number; geometry: unknown }>;
      };
      const route = data.routes?.[0];
      if (!route) throw new Error('No route');

      return {
        provider: 'osrm',
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.round(route.duration / 60),
        geometry: route.geometry,
      };
    } catch {
      return {
        provider: 'unavailable',
        distanceKm: null,
        durationMinutes: null,
        geometry: null,
        message: 'No fue posible calcular la ruta por carretera en este momento.',
      };
    }
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    const search = query.trim().slice(0, 250);
    if (!search) return [];

    const url = this.geocodingUrl('search');
    url.searchParams.set('q', `${search}, Colombia`);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '6');
    url.searchParams.set('countrycodes', 'co');

    try {
      const data = await this.lookup<
        Array<{
          display_name: string;
          lat: string;
          lon: string;
          address?: {
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            state?: string;
          };
        }>
      >(url);

      return data.map((item) => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        city:
          item.address?.city ??
          item.address?.town ??
          item.address?.village ??
          item.address?.municipality,
        department: item.address?.state,
        countryCode: 'co',
      }));
    } catch {
      return [];
    }
  }
}
