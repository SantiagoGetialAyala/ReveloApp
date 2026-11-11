'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../lib/api-base';

type Point = {
  lat: number;
  lng: number;
  label: string;
};

type RouteResponse = {
  provider: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  geometry: GeoJSON.LineString | null;
  message?: string;
};

export function RouteMap({ origin, destination }: { origin: Point; destination: Point }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [summary, setSummary] = useState<RouteResponse | null>(null);

  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | null = null;

    async function renderMap() {
      const L = await import('leaflet');
      if (!mapRef.current || disposed) return;

      map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const originIcon = L.divIcon({
        className: '',
        html: '<span class="grid h-8 w-8 place-items-center rounded-full bg-[#0f2f4f] text-xs font-bold text-white shadow">O</span>',
      });
      const destinationIcon = L.divIcon({
        className: '',
        html: '<span class="grid h-8 w-8 place-items-center rounded-full bg-[#159947] text-xs font-bold text-white shadow">D</span>',
      });

      const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon }).bindPopup(
        origin.label,
      );
      const destinationMarker = L.marker([destination.lat, destination.lng], {
        icon: destinationIcon,
      }).bindPopup(destination.label);
      originMarker.addTo(map);
      destinationMarker.addTo(map);

      const bounds = L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ]);

      try {
        const response = await fetch(
          `${API_URL}/api/maps/route?originLat=${origin.lat}&originLng=${origin.lng}&destinationLat=${destination.lat}&destinationLng=${destination.lng}`,
        );
        if (!response.ok) throw new Error('route error');
        const route = (await response.json()) as RouteResponse;
        if (disposed) return;
        setSummary(route);

        if (route.geometry) {
          const line = L.geoJSON(route.geometry, {
            style: { color: '#0f2f4f', weight: 5, opacity: 0.88 },
          }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [28, 28] });
        } else {
          map.fitBounds(bounds, { padding: [42, 42] });
        }
      } catch {
        if (!disposed)
          setSummary({
            provider: 'unavailable',
            distanceKm: null,
            durationMinutes: null,
            geometry: null,
          });
        map.fitBounds(bounds, { padding: [42, 42] });
      }
    }

    void renderMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [origin.lat, origin.lng, origin.label, destination.lat, destination.lng, destination.label]);

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div ref={mapRef} className="h-80 w-full sm:h-96" />
      <div className="grid gap-3 border-t border-slate-200 p-4 text-sm text-slate-700 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-950">Origen</p>
          <p>{origin.label}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-950">Destino</p>
          <p>{destination.label}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-950">Ruta estimada</p>
          <p>
            {summary?.distanceKm ? `${summary.distanceKm} km` : 'Calculando'} ·{' '}
            {summary?.durationMinutes ? `${summary.durationMinutes} min` : 'OSRM'}
          </p>
        </div>
      </div>
    </div>
  );
}
