import { ArrowUpRight, CalendarDays, Check, CircleDot, MapPin, Package, Truck } from 'lucide-react';
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
  negotiable?: boolean;
};

export function CargoCard({ cargo }: { cargo: CargoCardData }) {
  const pickupDate = new Date(cargo.pickupWindowStart);
  const dateLabel = Number.isNaN(pickupDate.getTime())
    ? 'Fecha por confirmar'
    : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        pickupDate,
      );

  return (
    <article className="cargo-card group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-[0_5px_18px_rgba(15,47,79,0.045)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <Check className="h-3.5 w-3.5" /> {statuses[cargo.status] ?? cargo.status}
        </span>
        {cargo.negotiable && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
            Negociable
          </span>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        <h3
          className="line-clamp-1 text-[15px] font-semibold tracking-[-0.01em] text-slate-950"
          title={cargo.title}
        >
          {cargo.title}
        </h3>
        <div className="cargo-route mt-4 grid grid-cols-[18px_1fr] gap-x-2.5">
          <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
            <CircleDot className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            <span className="my-1.5 h-7 border-l border-dashed border-slate-300" />
            <MapPin className="h-4 w-4 fill-emerald-500 text-emerald-700" />
          </div>
          <div className="grid gap-y-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Origen
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                {cargo.originCity}
              </p>
              <p className="truncate text-xs text-slate-500">{cargo.originDepartment}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Destino
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                {cargo.destinationCity}
              </p>
              <p className="truncate text-xs text-slate-500">{cargo.destinationDepartment}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-slate-100" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 py-4">
        <div className="flex min-w-0 items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Recogida
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{dateLabel}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Mercancía · peso
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
              {cargo.category} · {Number(cargo.weightKg).toLocaleString('es-CO')} kg
            </p>
          </div>
        </div>
        <div className="col-span-2 flex min-w-0 items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Vehículo requerido
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
              {vehicleTypes[cargo.requiredVehicleType] ?? cargo.requiredVehicleType}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            Presupuesto publicado
          </p>
          <strong className="mt-0.5 block truncate text-xl font-bold tracking-tight text-[#0b2545]">
            {moneyCop(cargo.estimatedBudgetCop)}
          </strong>
        </div>
        <Link
          href={`/cargas/${cargo.id}`}
          aria-label={`Ver detalles de ${cargo.title}`}
          className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#0b2545] px-3.5 text-xs font-bold text-white transition group-hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver carga <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
