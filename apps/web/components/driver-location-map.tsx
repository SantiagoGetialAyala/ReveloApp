'use client';

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Route, Truck } from 'lucide-react';
import { Button } from './button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Position = { lat: number; lng: number };
type RouteResponse = {
  geometry?: GeoJSON.LineString | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
};

function straightLineKm(from: Position, to: Position) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLng = radians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DriverLocationMap({
  pickup,
  destination,
}: {
  pickup: Position;
  destination: Position;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [distance, setDistance] = useState<{ km: number; method: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    async function render() {
      const L = await import('leaflet');
      if (!mapRef.current || disposed) return;

      map = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const originIcon = L.divIcon({
        className: '',
        html: '<span class="driver-map-pin driver-map-pin-origin">O</span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const destinationIcon = L.divIcon({
        className: '',
        html: '<span class="driver-map-pin driver-map-pin-destination">D</span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const currentIcon = L.divIcon({
        className: '',
        html: '<span class="driver-location-dot"><i></i></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const points: [number, number][] = [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ];
      let routeBounds: import('leaflet').LatLngBounds | null = null;
      L.marker([pickup.lat, pickup.lng], { icon: originIcon })
        .addTo(map!)
        .bindPopup('Origen de recogida');
      L.marker([destination.lat, destination.lng], { icon: destinationIcon })
        .addTo(map!)
        .bindPopup('Destino de la carga');
      if (position) {
        L.marker([position.lat, position.lng], { icon: currentIcon })
          .addTo(map!)
          .bindPopup('Tu ubicación actual');
        points.push([position.lat, position.lng]);
      }

      try {
        const query = new URLSearchParams({
          originLat: String(pickup.lat),
          originLng: String(pickup.lng),
          destinationLat: String(destination.lat),
          destinationLng: String(destination.lng),
        });
        const response = await fetch(`${API_URL}/api/maps/route?${query}`);
        if (!response.ok) throw new Error('No se pudo cargar el trazado por carretera.');
        const route = (await response.json()) as RouteResponse;
        if (disposed || !map) return;
        if (route.geometry) {
          const line = L.geoJSON(route.geometry, {
            style: { color: '#1762f5', weight: 6, opacity: 0.9, lineCap: 'round' },
          }).addTo(map);
          routeBounds = line.getBounds();
          setRouteReady(true);
        } else {
          L.polyline(
            [
              [pickup.lat, pickup.lng],
              [destination.lat, destination.lng],
            ],
            { color: '#1762f5', weight: 5, opacity: 0.75, dashArray: '8 8' },
          ).addTo(map);
          setRouteReady(false);
        }
      } catch {
        if (disposed || !map) return;
        L.polyline(
          [
            [pickup.lat, pickup.lng],
            [destination.lat, destination.lng],
          ],
          { color: '#1762f5', weight: 5, opacity: 0.75, dashArray: '8 8' },
        ).addTo(map);
        setRouteReady(false);
      }

      if (!disposed && map) {
        const bounds = routeBounds ?? L.latLngBounds(points);
        if (position) bounds.extend([position.lat, position.lng]);
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
        resizeTimer = setTimeout(() => map?.invalidateSize(), 120);
      }
    }

    void render();
    return () => {
      disposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng, position]);

  function shareLocation() {
    setError('');
    setDistance(null);
    if (!navigator.geolocation) {
      setError('Este navegador no permite compartir la ubicación.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (result) => {
        const current = { lat: result.coords.latitude, lng: result.coords.longitude };
        setPosition(current);
        try {
          const params = new URLSearchParams({
            originLat: String(current.lat),
            originLng: String(current.lng),
            destinationLat: String(pickup.lat),
            destinationLng: String(pickup.lng),
          });
          const response = await fetch(`${API_URL}/api/maps/route?${params}`);
          if (!response.ok) throw new Error('route');
          const route = (await response.json()) as RouteResponse;
          setDistance({
            km: route.distanceKm ?? straightLineKm(current, pickup),
            method: route.distanceKm ? 'estimada por carretera' : 'en línea recta',
          });
        } catch {
          setDistance({ km: straightLineKm(current, pickup), method: 'en línea recta' });
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setError('No pudimos acceder al GPS. Revisa el permiso de ubicación del navegador.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={17} className="text-blue-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ruta y punto de recogida</h3>
            <p className="text-xs text-slate-500">
              {routeReady ? 'Recorrido por carretera' : 'Recorrido aproximado'} · OpenStreetMap
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="border border-blue-200 bg-white text-blue-900"
          onClick={shareLocation}
          disabled={busy}
        >
          <LocateFixed size={16} />
          {busy ? 'Buscando…' : position ? 'Actualizar ubicación' : 'Mostrar mi ubicación'}
        </Button>
      </header>
      <div
        ref={mapRef}
        className="h-64 w-full bg-slate-100 sm:h-72"
        aria-label="Mapa con el recorrido, la recogida y tu ubicación"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Route size={15} className="text-blue-700" />
          O: recogida · D: destino · <Truck size={15} className="text-emerald-700" />: tú
        </p>
        {distance && (
          <p className="font-semibold text-slate-900">
            A {distance.km.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km del origen{' '}
            <span className="font-normal text-slate-500">· {distance.method}</span>
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
