'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { CargoCardData } from './cargo-card';

type MapCargo = Pick<CargoCardData, 'id' | 'title' | 'originCity' | 'destinationCity'> & {
  pickupLat?: string | number;
  pickupLng?: string | number;
  deliveryLat?: string | number;
  deliveryLng?: string | number;
};

export function CargoBoardMap({ cargos }: { cargos: MapCargo[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | null = null;
    let resizeObserver: ResizeObserver | undefined;
    void import('leaflet')
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false, zoomControl: true }).setView(
          [4.57, -74.29],
          5,
        );
        let tileLoaded = false;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .on('tileload', () => {
            tileLoaded = true;
            if (!disposed) setMapError(false);
          })
          .on('tileerror', () => {
            if (!tileLoaded && !disposed) setMapError(true);
          })
          .addTo(map);

        const points: [number, number][] = [];
        cargos.slice(0, 20).forEach((cargo) => {
          const pickup = [Number(cargo.pickupLat), Number(cargo.pickupLng)] as [number, number];
          const delivery = [Number(cargo.deliveryLat), Number(cargo.deliveryLng)] as [
            number,
            number,
          ];
          const valid = (point: [number, number]) =>
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1]) &&
            Math.abs(point[0]) <= 90 &&
            Math.abs(point[1]) <= 180 &&
            !(point[0] === 0 && point[1] === 0);
          if (!valid(pickup) || !valid(delivery)) return;
          points.push(pickup, delivery);
          L.polyline([pickup, delivery], {
            color: '#2563eb',
            weight: 3,
            opacity: 0.46,
            dashArray: '5 7',
          }).addTo(map!);
          const originMarker = L.circleMarker(pickup, {
            radius: 7,
            color: '#fff',
            weight: 3,
            fillColor: '#2563eb',
            fillOpacity: 1,
          }).addTo(map!);
          const destinationMarker = L.circleMarker(delivery, {
            radius: 7,
            color: '#fff',
            weight: 3,
            fillColor: '#159947',
            fillOpacity: 1,
          }).addTo(map!);
          const popup = () => {
            const content = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = cargo.title;
            const route = document.createElement('p');
            route.textContent = `${cargo.originCity} → ${cargo.destinationCity}`;
            content.append(title, route);
            return content;
          };
          const tooltip = (label: string) => {
            const content = document.createElement('span');
            content.textContent = label;
            return content;
          };
          originMarker.bindPopup(popup()).bindTooltip(tooltip(`Recogida · ${cargo.originCity}`));
          destinationMarker
            .bindPopup(popup())
            .bindTooltip(tooltip(`Entrega · ${cargo.destinationCity}`));
        });
        if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 7 });
        resizeObserver = new ResizeObserver(() => map?.invalidateSize());
        resizeObserver.observe(container.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setMapError(true);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map?.remove();
    };
  }, [cargos]);

  return (
    <section className="cargo-board-map-card" aria-label="Mapa de cargas disponibles">
      <div className="cargo-board-map-heading">
        <div>
          <h2>Encuentra cargas cerca de tu ruta</h2>
          <p>Explora recogidas y destinos en el mapa.</p>
        </div>
        <span className="cargo-map-compass" aria-hidden="true">
          <MapPin className="h-4 w-4" />
        </span>
      </div>
      <div ref={container} className="cargo-board-map" aria-label="Mapa de recogidas y destinos" />
      {!ready && (
        <span className="sr-only" role="status">
          Cargando mapa de cargas
        </span>
      )}
      {mapError && (
        <p className="cargo-board-map-notice" role="status">
          El mapa no cargó. Aún puedes explorar las cargas en la lista.
        </p>
      )}
      <div className="cargo-board-map-legend">
        <span>
          <i className="is-pickup" /> Recogida
        </span>
        <span>
          <i className="is-delivery" /> Entrega
        </span>
        <span className="ml-auto">{cargos.length} oportunidades</span>
      </div>
    </section>
  );
}
