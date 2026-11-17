'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, MapPinned, Package, Truck } from 'lucide-react';
import { Access, useSession } from '../../../components/session';
import { ProposalForm } from '../../../components/proposal-form';
import { RouteMap } from '../../../components/route-map';
import { apiFetch } from '../../../lib/api';
import { vehicleTypes, units } from '../../../lib/catalogs';
import { moneyCop } from '../../../lib/utils';
import type { Cargo } from '../../../lib/models';

type CargoDetail = Cargo & {
  negotiable: boolean;
  routeDistanceKm?: string | number | null;
  routeDurationMinutes?: number | null;
};

export default function CargoDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Access>
      <CargoDetailView id={id} />
    </Access>
  );
}

function CargoDetailView({ id }: { id: string }) {
  const { user, token } = useSession();
  const [cargo, setCargo] = useState<CargoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    void apiFetch<CargoDetail>(`/cargos/${id}`, { token, signal: controller.signal })
      .then(setCargo)
      .catch((reason) => {
        if (!controller.signal.aborted) setError((reason as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, token]);

  if (loading) {
    return (
      <main
        className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-slate-600"
        role="status"
      >
        Cargando detalles de la carga…
      </main>
    );
  }
  if (!cargo) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <section className="trip-surface p-6">
          <h1 className="text-xl font-bold text-slate-950">No puedes abrir esta carga</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">
            {error || 'La carga no existe o no tienes acceso a ella.'}
          </p>
          <Link href="/cargas" className="mt-4 inline-flex font-semibold text-blue-700">
            Volver a cargas
          </Link>
        </section>
      </main>
    );
  }

  const client = user?.role === 'CLIENT';
  return (
    <main className="cargo-detail-page mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="cargo-detail-main panel min-w-0">
        {cargo.images?.[0] && (
          <div
            role="img"
            aria-label={cargo.images[0].alt || `Foto de ${cargo.title}`}
            className="mb-5 h-52 rounded-2xl border border-slate-100 bg-cover bg-center sm:h-64"
            style={{ backgroundImage: `url("${cargo.images[0].url}")` }}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-slate-950">{cargo.title}</h1>
          {client && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              Tu publicación
            </span>
          )}
        </div>
        <p className="mt-3 leading-7 text-slate-600">{cargo.description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            [
              MapPinned,
              'Ruta',
              `${cargo.originCity}, ${cargo.originDepartment} → ${cargo.destinationCity}, ${cargo.destinationDepartment}`,
            ],
            [CalendarDays, 'Recogida', new Date(cargo.pickupWindowStart).toLocaleString('es-CO')],
            [
              Package,
              'Mercancía',
              `${cargo.category ?? 'Carga'} · ${cargo.quantity && cargo.quantityUnit ? `${Number(cargo.quantity).toLocaleString('es-CO')} ${units[cargo.quantityUnit] ?? cargo.quantityUnit} · ` : ''}${Number(cargo.weightKg).toLocaleString('es-CO')} kg`,
            ],
            [
              Truck,
              'Vehículo',
              vehicleTypes[cargo.requiredVehicleType ?? ''] ??
                cargo.requiredVehicleType ??
                'Por definir',
            ],
          ].map(([Icon, label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
              {typeof Icon !== 'string' && <Icon className="h-5 w-5 text-blue-700" />}
              <p className="mt-3 text-xs font-medium text-slate-500">{String(label)}</p>
              <p className="mt-1 font-semibold text-slate-900">{String(value)}</p>
            </div>
          ))}
        </div>
        <RouteMap
          origin={{
            lat: Number(cargo.pickupLat),
            lng: Number(cargo.pickupLng),
            label: `${cargo.pickupAddress}, ${cargo.originCity}`,
          }}
          destination={{
            lat: Number(cargo.deliveryLat),
            lng: Number(cargo.deliveryLng),
            label: `${cargo.deliveryAddress}, ${cargo.destinationCity}`,
          }}
        />
      </section>
      <aside className="cargo-detail-aside panel h-fit">
        <p className="text-sm text-slate-600">Presupuesto estimado</p>
        <strong className="mt-2 block text-3xl text-primary">
          {moneyCop(cargo.estimatedBudgetCop)}
        </strong>
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Negociable</dt>
            <dd className="font-semibold">{cargo.negotiable ? 'Sí' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Distancia</dt>
            <dd className="font-semibold">{cargo.routeDistanceKm ?? 'Pendiente'} km</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tiempo de ruta</dt>
            <dd className="font-semibold">{cargo.routeDurationMinutes ?? 'Pendiente'} min</dd>
          </div>
        </dl>
        {client ? (
          <Link
            href="/dashboard#mis-cargas"
            className="dashboard-trip-follow focus-ring mt-6 w-full"
          >
            Volver a mis cargas
          </Link>
        ) : (
          <ProposalForm
            cargoId={cargo.id}
            status={cargo.status}
            weightKg={Number(cargo.weightKg)}
            pickup={{ lat: Number(cargo.pickupLat), lng: Number(cargo.pickupLng) }}
          />
        )}
      </aside>
    </main>
  );
}
