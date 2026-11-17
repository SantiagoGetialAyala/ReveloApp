import { ArrowRight, CalendarDays, MapPin, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { vehicleTypes, statuses } from '../lib/catalogs';
import { moneyCop } from '../lib/utils';

export type CargoCardData = {
  id: string;
  title: string;
  originCity: string;
  originDepartment: string;
  destinationCity: string;
  destinationDepartment: string;
  pickupWindowStart: string;
  category: string;
  weightKg: string | number;
  requiredVehicleType: string;
  estimatedBudgetCop: string | number;
  status: string;
  images?: { url: string; alt?: string | null }[];
  pickupLat?: string | number;
  pickupLng?: string | number;
  deliveryLat?: string | number;
  deliveryLng?: string | number;
  negotiable?: boolean;
};

export function CargoCard({ cargo }: { cargo: CargoCardData }) {
  const pickupDate = new Date(cargo.pickupWindowStart);
  const dateLabel = Number.isNaN(pickupDate.getTime())
    ? 'Por confirmar'
    : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        pickupDate,
      );
  const image = cargo.images?.[0];

  return (
    <article className="cargo-card group overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid min-h-40 grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[148px_minmax(0,1fr)]">
        <div
          role="img"
          aria-label={image ? image.alt || `Foto de ${cargo.title}` : 'Sin foto de la mercancía'}
          className={`cargo-card-photo grid min-h-full place-items-center bg-cover bg-center ${image ? '' : 'bg-gradient-to-br from-blue-50 to-slate-100 text-blue-300'}`}
          style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
        >
          {!image && <Package className="h-8 w-8" aria-hidden="true" />}
        </div>

        <div className="flex min-w-0 flex-col p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
              {cargo.category}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
              {statuses[cargo.status] ?? cargo.status}
            </span>
            {cargo.negotiable && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-800">
                Negociable
              </span>
            )}
          </div>

          <h3
            className="mt-2 line-clamp-1 text-sm font-bold tracking-tight text-slate-950 sm:text-base"
            title={cargo.title}
          >
            {cargo.title}
          </h3>

          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-700">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-700" />
            <span className="truncate">{cargo.originCity}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{cargo.destinationCity}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              {Number(cargo.weightKg).toLocaleString('es-CO')} kg
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              {vehicleTypes[cargo.requiredVehicleType] ?? cargo.requiredVehicleType}
            </span>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-2.5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-400">
                Presupuesto
              </p>
              <strong className="block text-base font-bold tracking-tight text-[#0b2545] sm:text-lg">
                {moneyCop(cargo.estimatedBudgetCop)}
              </strong>
            </div>
            <Link
              href={`/cargas/${cargo.id}`}
              aria-label={`Ver detalles de ${cargo.title}`}
              className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-[#0b2545] px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Ver carga <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
