import { CalendarDays, MapPinned, Package, Truck } from 'lucide-react';
import { ProposalForm } from '../../../components/proposal-form';
import { notFound } from 'next/navigation';
import { vehicleTypes, units } from '../../../lib/catalogs';
import { RouteMap } from '../../../components/route-map';
import { apiFetch } from '../../../lib/api';
import { moneyCop } from '../../../lib/utils';

type CargoDetail = {
  id: string;
  title: string;
  description: string;
  originCity: string;
  originDepartment: string;
  destinationCity: string;
  destinationDepartment: string;
  pickupAddress: string;
  pickupLat: string | number;
  pickupLng: string | number;
  deliveryAddress: string;
  deliveryLat: string | number;
  deliveryLng: string | number;
  pickupWindowStart: string;
  deliveryDeadline: string;
  category: string;
  weightKg: string | number;
  requiredVehicleType: string;
  estimatedBudgetCop: string | number;
  negotiable: boolean;
  status: string;
  quantity?: string;
  quantityUnit?: string;
  routeDistanceKm?: string | number | null;
  routeDurationMinutes?: number | null;
};

export default async function CargoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let cargo: CargoDetail;
  try {
    cargo = await apiFetch<CargoDetail>(`/cargos/${id}`);
  } catch {
    notFound();
  }

  return (
    <main className="cargo-detail-page mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="cargo-detail-main panel min-w-0">
        <h1 className="text-3xl font-bold text-slate-950">{cargo.title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{cargo.description}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            [
              MapPinned,
              'Ruta',
              `${cargo.originCity}, ${cargo.originDepartment} -> ${cargo.destinationCity}, ${cargo.destinationDepartment}`,
            ],
            [CalendarDays, 'Recogida', new Date(cargo.pickupWindowStart).toLocaleString('es-CO')],
            [
              Package,
              'Mercancia',
              `${cargo.category} · ${cargo.quantity && cargo.quantityUnit ? `${Number(cargo.quantity).toLocaleString('es-CO')} ${units[cargo.quantityUnit]} · ` : ''}${Number(cargo.weightKg).toLocaleString('es-CO')} kg totales`,
            ],
            [
              Truck,
              'Vehículo',
              vehicleTypes[cargo.requiredVehicleType] ?? cargo.requiredVehicleType,
            ],
          ].map(([Icon, label, value]) => (
            <div key={String(label)} className="rounded-md border border-slate-200 p-4">
              {typeof Icon !== 'string' && <Icon className="h-5 w-5 text-action" />}
              <p className="mt-3 text-sm text-slate-500">{String(label)}</p>
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
            <dd className="font-semibold">{cargo.negotiable ? 'Si' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Distancia</dt>
            <dd className="font-semibold">{cargo.routeDistanceKm ?? 'Pendiente'} km</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tiempo ruta</dt>
            <dd className="font-semibold">{cargo.routeDurationMinutes ?? 'Pendiente'} min</dd>
          </div>
        </dl>
        <ProposalForm
          cargoId={cargo.id}
          status={cargo.status}
          weightKg={Number(cargo.weightKg)}
          pickup={{ lat: Number(cargo.pickupLat), lng: Number(cargo.pickupLng) }}
        />
      </aside>
    </main>
  );
}
