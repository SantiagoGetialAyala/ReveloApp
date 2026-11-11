'use client';
import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Route, Truck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { TruckFix } from '../lib/tracking';
import { locationAge, tripDate } from '../lib/tracking';

type Point = { lat: number; lng: number; label: string };
type RoadRoute = {
  geometry: GeoJSON.LineString | null;
  distanceKm: number | null;
  durationMinutes: number | null;
};
export function TripMap({
  origin,
  destination,
  truck,
  closed,
}: {
  origin: Point;
  destination: Point;
  truck: TruckFix | null;
  closed: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const truckMarker = useRef<import('leaflet').Marker | null>(null);
  const routeLayer = useRef<import('leaflet').GeoJSON | null>(null);
  const endpoints = useRef<import('leaflet').LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [road, setRoad] = useState<RoadRoute | null>(null);
  const [routeBusy, setRouteBusy] = useState(true);
  const [follow, setFollow] = useState(false);
  const followRef = useRef(false);
  followRef.current = follow;
  const truckRef = useRef(truck);
  truckRef.current = truck;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fitRoute() {
    const instance = map.current;
    if (!instance) return;
    const bounds: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
    if (truckRef.current) bounds.push([truckRef.current.lat, truckRef.current.lng]);
    instance.fitBounds(bounds, { padding: [45, 45], maxZoom: 14, animate: !reduce() });
  }
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import('leaflet')
      .then((L) => {
        if (disposed || !container.current) return;
        const instance = L.map(container.current, { scrollWheelZoom: false }).setView(
          [4.57, -74.29],
          5,
        );
        map.current = instance;
        let failures = 0;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
          .on('tileerror', () => {
            if (++failures > 2 && !disposed)
              setMapError('Algunos detalles del mapa no cargaron. Comprueba tu conexión.');
          })
          .on('tileload', () => {
            if (!disposed) setMapError('');
          })
          .addTo(instance);
        endpoints.current = L.layerGroup().addTo(instance);
        instance.on('dragstart', () => {
          followRef.current = false;
          setFollow(false);
        });
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
        setReady(true);
      })
      .catch(() =>
        setMapError('No se pudo iniciar el mapa. Los estados e historial siguen disponibles.'),
      );
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      truckMarker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    const controller = new AbortController();
    setRouteBusy(true);
    setRoad(null);
    void import('leaflet').then(async (L) => {
      if (disposed || !map.current || !endpoints.current) return;
      endpoints.current.clearLayers();
      routeLayer.current?.remove();
      routeLayer.current = null;
      [origin, destination].forEach((point, index) => {
        const tooltip = document.createElement('span');
        tooltip.textContent = point.label;
        L.marker([point.lat, point.lng], {
          title: point.label,
          icon: L.divIcon({
            className: '',
            iconSize: [36, 44],
            iconAnchor: [18, 44],
            html: `<span class="location-marker ${index ? 'location-marker-destination' : ''}">${index ? 'D' : 'O'}</span>`,
          }),
        })
          .bindTooltip(tooltip)
          .addTo(endpoints.current!);
      });
      fitRoute();
      try {
        const result = await apiFetch<RoadRoute>(
          `/maps/route?originLat=${origin.lat}&originLng=${origin.lng}&destinationLat=${destination.lat}&destinationLng=${destination.lng}`,
          { signal: controller.signal },
        );
        if (disposed || !map.current) return;
        setRoad(result);
        if (result.geometry)
          routeLayer.current = L.geoJSON(result.geometry, {
            style: { color: '#2563eb', weight: 5, opacity: 0.8, lineCap: 'round' },
          }).addTo(map.current);
      } catch {
        /* Keep exact endpoints when no road route is available. */
      } finally {
        if (!disposed) setRouteBusy(false);
      }
    });
    return () => {
      disposed = true;
      controller.abort();
    };
    // Coordinates, not polling objects, determine when to fetch the road geometry.
  }, [ready, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !map.current) return;
      if (!truck || closed) {
        truckMarker.current?.remove();
        truckMarker.current = null;
        return;
      }
      const icon = L.divIcon({
        className: `trip-truck-marker ${truck.recent ? '' : 'trip-truck-stale'}`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        html: '<span class="trip-truck-halo"></span><span class="trip-truck-body"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h14v13H1zM15 8h4l3 3v5h-7"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/></svg></span>',
      });
      if (!truckMarker.current)
        truckMarker.current = L.marker([truck.lat, truck.lng], {
          icon,
          zIndexOffset: 800,
          title: 'Última ubicación GPS del camión',
        }).addTo(map.current);
      else {
        truckMarker.current.setIcon(icon);
        truckMarker.current.setLatLng([truck.lat, truck.lng]);
      }
      const label = document.createElement('span');
      label.textContent = `Última ubicación GPS · ${tripDate(truck.updatedAt)}`;
      truckMarker.current.unbindTooltip().bindTooltip(label);
      if (followRef.current)
        map.current.panTo([truck.lat, truck.lng], { animate: !reduce(), duration: 0.8 });
    });
    return () => {
      disposed = true;
    };
  }, [ready, truck?.lat, truck?.lng, truck?.updatedAt, truck?.recent, closed]);

  return (
    <section className="trip-surface overflow-hidden" aria-label="Mapa del viaje">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <MapPin className="h-4 w-4 text-blue-600" />
          Tu recorrido
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="trip-map-control focus-ring"
            disabled={!ready}
            onClick={() => {
              setFollow(false);
              followRef.current = false;
              fitRoute();
            }}
          >
            <Route className="h-3.5 w-3.5" />
            Ver recorrido
          </button>
          <button
            type="button"
            className={`trip-map-control focus-ring ${follow ? 'bg-blue-50 text-blue-700' : ''}`}
            disabled={!ready || !truck || closed}
            aria-pressed={follow}
            onClick={() => {
              if (!truck) return;
              setFollow(!follow);
              followRef.current = !follow;
              if (!follow)
                map.current?.flyTo([truck.lat, truck.lng], 14, {
                  animate: !reduce(),
                  duration: 0.7,
                });
            }}
          >
            <Crosshair className="h-3.5 w-3.5" />
            {follow ? 'Siguiendo camión' : 'Centrar camión'}
          </button>
        </div>
      </div>
      <div className="relative isolate">
        <div
          ref={container}
          className="relative z-0 h-[350px] bg-slate-100 sm:h-[460px]"
          aria-label="Mapa de origen, destino y última ubicación del vehículo"
        />
        {!ready && !mapError && (
          <div
            role="status"
            className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-slate-100 text-sm text-slate-500"
          >
            <span>
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Preparando tu recorrido…
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-7 left-3 right-3 z-[400] flex items-center gap-3 rounded-xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur sm:left-5 sm:right-auto sm:max-w-sm">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${truck?.recent ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
          >
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900">
              {closed
                ? 'Recorrido finalizado'
                : truck
                  ? truck.recent
                    ? 'Ubicación GPS reciente'
                    : 'Sin señal GPS reciente'
                  : 'Esperando ubicación del camión'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {closed
                ? 'El mapa conserva origen y destino.'
                : truck
                  ? `Último dato ${locationAge(truck.ageSeconds)}.`
                  : 'Aparecerá cuando el transportador comparta GPS.'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-blue-700" />
            Origen
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-emerald-600" />
            Destino
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-blue-500" />
            Ruta estimada
          </span>
        </div>
        <span>
          {routeBusy
            ? 'Consultando ruta…'
            : road?.distanceKm != null
              ? `${road.distanceKm.toLocaleString('es-CO')} km por carretera`
              : 'Ruta por carretera no disponible'}
        </span>
      </div>
      {mapError && (
        <p role="alert" className="px-5 pb-4 text-sm text-amber-800">
          {mapError}
        </p>
      )}
    </section>
  );
}
