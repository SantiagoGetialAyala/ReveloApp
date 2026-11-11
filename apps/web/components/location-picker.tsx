'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Search,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button } from './button';

export type LocationPoint = {
  lat: number;
  lng: number;
  label: string;
  city?: string;
  department?: string;
  countryCode?: string;
  confirmed?: boolean;
};
type Kind = 'origin' | 'destination';
type RouteResult = {
  distanceKm: number | null;
  durationMinutes: number | null;
  geometry: GeoJSON.LineString | null;
};
const names = { origin: 'origen', destination: 'destino' };
const coordinateLabel = (p: { lat: number; lng: number }) =>
  `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

export function LocationPicker({
  origin,
  destination,
  addresses,
  contexts,
  onAddressChange,
  onChange,
}: {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  addresses: Record<Kind, string>;
  contexts: Record<Kind, string>;
  onAddressChange: (kind: Kind, value: string) => void;
  onChange: (kind: Kind, point: LocationPoint) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const markerLayer = useRef<import('leaflet').LayerGroup | null>(null);
  const routeLayer = useRef<import('leaflet').GeoJSON | null>(null);
  const draftMarker = useRef<import('leaflet').Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [active, setActive] = useState<Kind>('origin');
  const activeRef = useRef(active);
  activeRef.current = active;
  const [draft, setDraft] = useState<LocationPoint | null>(null);
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState(
    'Busca una dirección o mueve el mapa para elegir un punto exacto.',
  );
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const requestId = useRef(0);
  const gpsId = useRef(0);
  const draftAddress = useRef('');
  const replaceAddress = useRef(false);
  const pointsRef = useRef({ origin, destination });
  pointsRef.current = { origin, destination };
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function focusPoint(point: LocationPoint, zoom = 16) {
    map.current?.flyTo([point.lat, point.lng], zoom, { animate: !reducedMotion(), duration: 0.7 });
  }
  function resetPreview() {
    requestId.current++;
    gpsId.current++;
    setBusy(false);
    setLocating(false);
    setDraft(null);
    setResults([]);
  }
  function chooseKind(kind: Kind) {
    resetPreview();
    activeRef.current = kind;
    setActive(kind);
    setStatus(`Selecciona el ${names[kind]}: busca una dirección o elige un punto en el mapa.`);
    const p = pointsRef.current[kind];
    if (p) focusPoint(p, p.confirmed ? 16 : 12);
  }
  const identifyRef = useRef<(point: { lat: number; lng: number }) => void>(() => {});
  identifyRef.current = (point) => {
    void identify(point);
  };

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
        let tileFailures = 0;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
          .on('tileerror', () => {
            if (++tileFailures >= 3 && !disposed)
              setMapError(
                'No se pudieron cargar algunos detalles del mapa. Comprueba tu conexión.',
              );
          })
          .on('tileload', () => {
            if (!disposed) setMapError('');
          })
          .addTo(instance);
        markerLayer.current = L.layerGroup().addTo(instance);
        instance.on('click', (event: import('leaflet').LeafletMouseEvent) =>
          identifyRef.current(event.latlng),
        );
        // Moving the map cancels an obsolete preview; the center pin is the next candidate.
        instance.on('movestart', () => {
          requestId.current++;
          gpsId.current++;
          setLocating(false);
          setResults([]);
          setStatus('Mueve el mapa y elige el punto del centro, o toca el lugar exacto.');
          setBusy(false);
          setDraft(null);
        });
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
        setReady(true);
      })
      .catch(() =>
        setMapError('No se pudo iniciar el mapa. Recarga la página para volver a intentarlo.'),
      );
    return () => {
      disposed = true;
      requestId.current++;
      gpsId.current++;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      markerLayer.current = null;
    };
  }, []);

  // Selecting a municipality recenters the map; it never counts as an exact address.
  const previousPoints = useRef({ origin, destination });
  useEffect(() => {
    if (!ready) return;
    const changed: Kind | undefined =
      origin !== previousPoints.current.origin
        ? 'origin'
        : destination !== previousPoints.current.destination
          ? 'destination'
          : undefined;
    previousPoints.current = { origin, destination };
    if (changed) {
      const p = changed === 'origin' ? origin : destination;
      if (!p?.confirmed) {
        resetPreview();
        activeRef.current = changed;
        setActive(changed);
        if (p) focusPoint(p, 12);
        setStatus('El municipio es una referencia. Selecciona y confirma la dirección exacta.');
      }
    }
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !markerLayer.current) return;
      markerLayer.current.clearLayers();
      (
        [
          ['origin', origin],
          ['destination', destination],
        ] as const
      ).forEach(([kind, p]) => {
        if (!p) return;
        const marker = L.marker([p.lat, p.lng], {
          title: `${kind === 'origin' ? 'Origen' : 'Destino'}: ${p.label}`,
          draggable: true,
          icon: L.divIcon({
            className: '',
            iconSize: [36, 44],
            iconAnchor: [18, 44],
            html: `<span class="location-marker ${kind === 'destination' ? 'location-marker-destination' : ''} ${!p.confirmed ? 'location-marker-reference' : ''}">${kind === 'origin' ? 'O' : 'D'}</span>`,
          }),
        }).addTo(markerLayer.current!);
        const tooltip = document.createElement('span');
        tooltip.textContent = p.label;
        marker.bindTooltip(tooltip);
        marker.on('dragstart', () => {
          requestId.current++;
          gpsId.current++;
          setLocating(false);
          setResults([]);
          setDraft(null);
          setActive(kind);
          activeRef.current = kind;
        });
        marker.on('dragend', () => {
          const next = marker.getLatLng();
          marker.setLatLng([p.lat, p.lng]);
          identifyRef.current(next);
        });
      });
    });
    return () => {
      disposed = true;
    };
  }, [ready, origin, destination]);

  useEffect(() => {
    draftMarker.current?.remove();
    draftMarker.current = null;
    if (!draft || !ready) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !map.current) return;
      draftMarker.current = L.marker([draft.lat, draft.lng], {
        title: 'Punto por confirmar',
        icon: L.divIcon({
          className: '',
          iconSize: [36, 44],
          iconAnchor: [18, 44],
          html: '<span class="location-marker">•</span>',
        }),
      }).addTo(map.current);
    });
    return () => {
      disposed = true;
      draftMarker.current?.remove();
    };
  }, [draft, ready]);

  useEffect(() => {
    routeLayer.current?.remove();
    routeLayer.current = null;
    setRoute(null);
    setRouteBusy(false);
    if (!ready || !origin?.confirmed || !destination?.confirmed) return;
    const controller = new AbortController();
    setRouteBusy(true);
    void apiFetch<RouteResult>(
      `/maps/route?originLat=${origin.lat}&originLng=${origin.lng}&destinationLat=${destination.lat}&destinationLng=${destination.lng}`,
      { signal: controller.signal },
    )
      .then(async (result) => {
        const L = await import('leaflet');
        if (controller.signal.aborted || !map.current) return;
        setRoute(result);
        if (result.geometry)
          routeLayer.current = L.geoJSON(result.geometry, {
            style: { color: '#2563eb', weight: 5, opacity: 0.8 },
          }).addTo(map.current);
      })
      .catch(() => {
        /* A route outage must not prevent choosing an address. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouteBusy(false);
      });
    return () => {
      controller.abort();
    };
  }, [ready, origin, destination]);

  async function identify(point: { lat: number; lng: number }) {
    gpsId.current++;
    setLocating(false);
    draftAddress.current = addresses[activeRef.current];
    replaceAddress.current =
      !draftAddress.current.trim() ||
      draftAddress.current === pointsRef.current[activeRef.current]?.label;
    const id = ++requestId.current;
    const fallback = { lat: point.lat, lng: point.lng, label: coordinateLabel(point) };
    setResults([]);
    setDraft(fallback);
    setBusy(true);
    setStatus('Identificando el lugar seleccionado…');
    try {
      const result = await apiFetch<LocationPoint | null>(
        `/maps/reverse?lat=${point.lat}&lng=${point.lng}`,
      );
      if (id !== requestId.current) return;
      if (result?.countryCode && result.countryCode !== 'co') {
        setDraft(null);
        setStatus('Selecciona una ubicación dentro de Colombia.');
        return;
      }
      // Preserve the chosen coordinate: reverse geocoding describes a nearby address.
      setDraft(result ? { ...result, lat: point.lat, lng: point.lng } : fallback);
      setStatus(
        result
          ? 'Comprueba la referencia y confirma el punto. Puedes precisar la dirección por escrito.'
          : 'No encontramos el nombre del lugar. Conservamos el punto; escribe la dirección y confirma.',
      );
    } catch {
      if (id === requestId.current)
        setStatus(
          'La consulta no está disponible. Puedes confirmar el punto y escribir la dirección manualmente.',
        );
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function search(kind: Kind) {
    const query = addresses[kind].trim();
    chooseKind(kind);
    if (query.length < 3) {
      setStatus('Escribe al menos 3 caracteres para buscar la dirección.');
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    setStatus(`Buscando ${names[kind]}…`);
    try {
      const found = await apiFetch<LocationPoint[]>(
        `/maps/geocode?q=${encodeURIComponent(`${query}, ${contexts[kind]}`)}`,
      );
      if (id !== requestId.current) return;
      setResults(found);
      setStatus(
        found.length
          ? 'Selecciona un resultado para revisarlo en el mapa.'
          : 'No encontramos esa dirección. Prueba con un lugar cercano o selecciona manualmente en el mapa.',
      );
    } catch {
      if (id === requestId.current)
        setStatus('No pudimos buscar la dirección. Puedes elegir el punto manualmente en el mapa.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setStatus('Tu navegador no dispone de GPS. Elige el punto en el mapa.');
      return;
    }
    resetPreview();
    const id = ++gpsId.current;
    setLocating(true);
    setStatus('Obteniendo tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (id !== gpsId.current) return;
        setLocating(false);
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Mi ubicación',
        };
        // setView is immediate so its movestart cannot invalidate the reverse request.
        map.current?.setView([point.lat, point.lng], 17, { animate: false });
        void identify(point);
      },
      () => {
        if (id !== gpsId.current) return;
        setLocating(false);
        setStatus(
          'No pudimos acceder al GPS. Revisa los permisos o selecciona el lugar en el mapa.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  function confirm() {
    if (!draft || busy) return;
    const useResolvedAddress =
      replaceAddress.current &&
      draft.countryCode === 'co' &&
      addresses[active] === draftAddress.current;
    const point = {
      ...draft,
      label: useResolvedAddress ? draft.label : addresses[active].trim() || draft.label,
      confirmed: true,
    };
    if (useResolvedAddress) onAddressChange(active, draft.label);
    onChange(active, point);
    setDraft(null);
    setStatus(
      `${active === 'origin' ? 'Origen' : 'Destino'} confirmado. Puedes cambiarlo en cualquier momento.`,
    );
    if (active === 'origin' && !destination?.confirmed) chooseKind('destination');
  }
  function showRoute() {
    if (!map.current || !origin || !destination) return;
    map.current.fitBounds(
      [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      { padding: [55, 55], maxZoom: 15, animate: !reducedMotion() },
    );
  }

  return (
    <section className="location-picker" aria-label="Seleccionar puntos de recogida y entrega">
      <div className="border-b border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">¿Dónde recogemos y entregamos?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Dos puntos claros. Un viaje bien planeado.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['origin', 'destination'] as const).map((kind) => {
            const point = kind === 'origin' ? origin : destination;
            return (
              <div
                key={kind}
                className={`location-card ${active === kind ? 'location-card-active' : ''}`}
              >
                <button
                  type="button"
                  className="focus-ring mb-3 flex w-full items-center justify-between gap-2 rounded text-left"
                  aria-pressed={active === kind}
                  onClick={() => chooseKind(kind)}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span
                      className={`location-dot ${kind === 'destination' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    />
                    {kind === 'origin' ? '01 · Origen' : '02 · Destino'}
                  </span>
                  {point?.confirmed ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmado
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Por confirmar</span>
                  )}
                </button>
                <label
                  htmlFor={`address-${kind}`}
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Dirección de {kind === 'origin' ? 'recogida' : 'entrega'}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`address-${kind}`}
                    name={kind === 'origin' ? 'pickupAddress' : 'deliveryAddress'}
                    className="input min-w-0 text-sm"
                    required
                    value={addresses[kind]}
                    placeholder="Dirección, barrio o lugar de referencia"
                    onFocus={() => {
                      if (active !== kind) chooseKind(kind);
                    }}
                    onChange={(e) => {
                      requestId.current++;
                      gpsId.current++;
                      setLocating(false);
                      setBusy(false);
                      setResults([]);
                      onAddressChange(kind, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void search(kind);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="focus-ring rounded-lg bg-slate-900 px-3 text-white transition hover:bg-blue-700 disabled:opacity-50"
                    disabled={busy && active === kind}
                    aria-label={`Buscar ${names[kind]} en el mapa`}
                    onClick={() => void search(kind)}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 min-h-4 text-xs text-slate-500">
                  {point?.confirmed
                    ? `Punto guardado · ${coordinateLabel(point)}`
                    : contexts[kind] || 'Selecciona un municipio o busca una dirección'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <MapPin className="h-3.5 w-3.5" />
            Eligiendo {names[active]}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 text-xs"
              disabled={!ready || locating}
              onClick={locate}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Mi ubicación
            </Button>
            {origin && destination && (
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-2 text-xs"
                disabled={!ready}
                onClick={showRoute}
              >
                <Route className="h-4 w-4" />
                Ver ambos puntos
              </Button>
            )}
          </div>
        </div>
        <p className="mb-3 text-sm text-slate-600" role="status" aria-live="polite">
          {busy && (
            <Loader2
              aria-hidden="true"
              className="mr-2 inline h-4 w-4 animate-spin text-blue-600"
            />
          )}
          {status}
        </p>
        {results.length > 0 && (
          <ul
            className="location-results mb-4 max-h-64 overflow-auto rounded-xl border border-slate-200"
            aria-label={`Resultados de ${names[active]}`}
          >
            {results.map((result) => (
              <li key={`${result.lat}-${result.lng}-${result.label}`}>
                <button
                  type="button"
                  className="focus-ring flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left text-sm transition last:border-0 hover:bg-blue-50"
                  onClick={() => {
                    requestId.current++;
                    setResults([]);
                    map.current?.setView([result.lat, result.lng], 17, { animate: false });
                    draftAddress.current = addresses[activeRef.current];
                    replaceAddress.current = true;
                    setDraft(result);
                    setStatus(
                      'Revisa el lugar en el mapa y confirma. Si hace falta, ajusta el punto.',
                    );
                  }}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>{result.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="relative isolate overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <div
            ref={container}
            className="relative z-0 h-[340px] w-full sm:h-[420px]"
            aria-label="Mapa interactivo: haz clic para seleccionar un punto; también puedes moverlo con las flechas del teclado"
          />
          {!ready && !mapError && (
            <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-slate-100 text-sm text-slate-500">
              <span>
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                Preparando el mapa…
              </span>
            </div>
          )}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full"
            aria-hidden="true"
          >
            <span className="map-center-pin">
              <MapPin className="h-9 w-9 fill-blue-600 text-white" />
            </span>
            <span className="map-center-shadow" />
          </div>
          <div className="absolute bottom-7 left-1/2 z-[400] w-max max-w-[calc(100%-24px)] -translate-x-1/2">
            <Button
              type="button"
              className="rounded-full bg-white text-slate-900 shadow-lg hover:bg-blue-50"
              disabled={!ready || busy || locating}
              onClick={() => {
                const center = map.current?.getCenter();
                if (center) void identify(center);
              }}
            >
              <Crosshair className="h-4 w-4" />
              Elegir el punto del centro
            </Button>
          </div>
        </div>
        {mapError && (
          <p role="alert" className="mt-2 text-sm text-amber-800">
            {mapError}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Mueve el mapa, toca un lugar o arrastra los marcadores O y D. El punto azul señala el
          centro.
        </p>
        {draft && (
          <div className="location-preview mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Vista previa del {names[active]}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-slate-900">{draft.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {coordinateLabel(draft)} · Comprueba el acceso para el vehículo
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={busy}
                onClick={confirm}
              >
                <Check className="h-4 w-4" />
                Confirmar {names[active]}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  requestId.current++;
                  setBusy(false);
                  setDraft(null);
                }}
              >
                Seguir ajustando
              </Button>
            </div>
          </div>
        )}
        {origin?.confirmed && destination?.confirmed && (
          <div className="location-preview mt-4 flex items-start gap-3 rounded-xl bg-slate-900 p-4 text-white">
            <Route className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
            <div>
              <p className="text-sm font-semibold">Tu recorrido está listo</p>
              <p className="mt-1 text-xs text-slate-300">
                {routeBusy
                  ? 'Calculando ruta por carretera…'
                  : route?.distanceKm != null && route.durationMinutes != null
                    ? `${route.distanceKm.toLocaleString('es-CO')} km · ${route.durationMinutes} min estimados por carretera`
                    : 'Ruta por carretera no disponible. Los puntos seleccionados se conservan.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
