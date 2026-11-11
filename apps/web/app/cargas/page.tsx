import {
  ArrowDown,
  CalendarDays,
  MapPin,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { CargoCard, CargoCardData } from '../../components/cargo-card';
import { Button } from '../../components/button';
import { bodyTypes, categories, vehicleTypes } from '../../lib/catalogs';
import { apiFetch } from '../../lib/api';
import { CompatibleCargos } from '../../components/compatible-cargos';
import { PublishCargoAction } from '../../components/publish-cargo-action';

type CargosResponse = { items: CargoCardData[]; total: number; page: number; limit: number };
type SearchParams = Record<string, string | string[] | undefined>;
const getSingle = (params: SearchParams, key: string) =>
  typeof params[key] === 'string' ? (params[key] as string) : '';

export default async function CargasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const fields = [
    'originDepartment',
    'originCity',
    'destinationDepartment',
    'destinationCity',
    'category',
    'vehicleType',
    'bodyType',
    'maxBudgetCop',
    'minWeightKg',
    'maxWeightKg',
    'pickupAfter',
    'pickupBefore',
    'sort',
  ] as const;
  const query = new URLSearchParams();
  for (const key of fields) {
    const value = getSingle(params, key).trim();
    if (value) query.set(key, value.slice(0, 90));
  }
  const pageNumber = Math.max(1, Math.floor(Number(getSingle(params, 'page')) || 1));
  const safePage = Math.min(100_000, pageNumber);
  if (safePage > 1) query.set('page', String(safePage));
  let response: CargosResponse = { items: [], total: 0, page: safePage, limit: 12 };
  let error = '';
  try {
    response = await apiFetch<CargosResponse>(`/cargos?${query.toString()}`);
  } catch (reason) {
    error =
      reason instanceof Error
        ? `No fue posible cargar las cargas: ${reason.message}`
        : 'No fue posible cargar las cargas por un error inesperado.';
  }
  const pages = Math.max(1, Math.ceil(response.total / Math.max(response.limit, 1)));
  const activeFilterCount = fields.filter((key) => Boolean(getSingle(params, key))).length;
  function pageHref(page: number) {
    const next = new URLSearchParams(query);
    next.set('page', String(page));
    return `/cargas?${next.toString()}`;
  }

  return (
    <main className="cargo-search-page mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
      <CompatibleCargos />
      <details
        className="cargo-filter-panel mb-7 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,47,79,0.045)]"
        open={fields.some((key) => Boolean(getSingle(params, key)))}
      >
        <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">Afina tu búsqueda</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Ruta, mercancía, vehículo, presupuesto y fechas
            </span>
          </span>
          {activeFilterCount > 0 && (
            <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
              {activeFilterCount} filtros
            </span>
          )}
        </summary>
        <form
          action="/cargas"
          method="GET"
          className="grid gap-x-4 gap-y-4 border-t border-slate-100 bg-[#fbfcfe] p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
        >
          <div className="cargo-filter-group sm:col-span-2 lg:col-span-4">
            <MapPin className="h-4 w-4" />
            <span>Ruta</span>
            <i />
          </div>
          {[
            ['originDepartment', 'Departamento de origen', 'text'],
            ['originCity', 'Municipio de origen', 'text'],
            ['destinationDepartment', 'Departamento de destino', 'text'],
            ['destinationCity', 'Municipio de destino', 'text'],
          ].map(([name, label, type]) => (
            <label key={name} className="field">
              {label}
              <input
                className="input"
                name={name}
                type={type}
                maxLength={90}
                defaultValue={getSingle(params, name)}
                placeholder="Cualquier ubicación"
              />
            </label>
          ))}
          <div className="cargo-filter-group mt-1 sm:col-span-2 lg:col-span-4">
            <Package className="h-4 w-4" />
            <span>Detalles de la carga</span>
            <i />
          </div>
          <label className="field">
            Tipo de mercancía
            <select className="input" name="category" defaultValue={getSingle(params, 'category')}>
              <option value="">Cualquier categoría</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo de vehículo
            <select
              className="input"
              name="vehicleType"
              defaultValue={getSingle(params, 'vehicleType')}
            >
              <option value="">Cualquier tipo</option>
              {Object.entries(vehicleTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Carrocería requerida
            <select className="input" name="bodyType" defaultValue={getSingle(params, 'bodyType')}>
              <option value="">Cualquier carrocería</option>
              {Object.entries(bodyTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Presupuesto máximo (COP)
            <input
              className="input"
              name="maxBudgetCop"
              inputMode="numeric"
              type="number"
              min="0"
              step="10000"
              defaultValue={getSingle(params, 'maxBudgetCop')}
              placeholder="Sin límite"
            />
          </label>
          <label className="field">
            Peso mínimo (kg)
            <input
              className="input"
              name="minWeightKg"
              type="number"
              min="1"
              step="1"
              defaultValue={getSingle(params, 'minWeightKg')}
              placeholder="Sin mínimo"
            />
          </label>
          <label className="field">
            Peso máximo (kg)
            <input
              className="input"
              name="maxWeightKg"
              type="number"
              min="1"
              step="1"
              defaultValue={getSingle(params, 'maxWeightKg')}
              placeholder="Sin máximo"
            />
          </label>
          <div className="cargo-filter-group mt-1 sm:col-span-2 lg:col-span-4">
            <CalendarDays className="h-4 w-4" />
            <span>Programación</span>
            <i />
          </div>
          <label className="field">
            Recogida desde
            <input
              className="input"
              name="pickupAfter"
              type="date"
              defaultValue={getSingle(params, 'pickupAfter')}
            />
          </label>
          <label className="field">
            Recogida hasta
            <input
              className="input"
              name="pickupBefore"
              type="date"
              defaultValue={getSingle(params, 'pickupBefore')}
            />
          </label>
          <label className="field">
            Ordenar por
            <select
              className="input"
              name="sort"
              defaultValue={getSingle(params, 'sort') || 'recent'}
            >
              <option value="recent">Más recientes</option>
              <option value="pickupDate">Recogida más cercana</option>
              <option value="budgetDesc">Mayor presupuesto</option>
              <option value="budgetAsc">Menor presupuesto</option>
            </select>
          </label>
          <input type="hidden" name="page" value="1" />
          <div className="flex flex-wrap items-end gap-2 pt-1 sm:col-span-2 lg:col-span-4">
            <Button className="h-11 rounded-xl px-5 shadow-[0_5px_12px_rgba(15,47,79,0.16)]">
              <Search className="h-4 w-4" />
              Aplicar filtros
            </Button>
            <Link
              href="/cargas"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-white"
            >
              Limpiar filtros
            </Link>
          </div>
        </form>
      </details>
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      <div
        id="resultados"
        className="mb-4 flex flex-wrap items-end justify-between gap-3 scroll-mt-24"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-700">
            Tablero de oportunidades
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Cargas disponibles
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Mostrando{' '}
          <strong className="font-semibold text-slate-800">{response.items.length}</strong> de{' '}
          <strong className="font-semibold text-slate-800">{response.total}</strong>
        </p>
      </div>
      {!error && response.items.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <p className="font-semibold text-slate-900">No encontramos cargas con esos filtros.</p>
          <p className="mt-2 text-sm text-slate-500">
            Prueba con otra ciudad, otro vehículo o más fechas.
          </p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-blue-700 underline"
            href="/cargas"
          >
            Quitar todos los filtros
          </Link>
        </section>
      )}
      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {response.items.map((cargo) => (
          <CargoCard key={cargo.id} cargo={cargo} />
        ))}
      </section>
      {response.total > response.limit && (
        <nav
          aria-label="Páginas de resultados"
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <a
            aria-disabled={response.page <= 1}
            className={`focus-ring rounded-lg border px-4 py-2 text-sm ${response.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-white'}`}
            href={pageHref(Math.max(1, response.page - 1))}
          >
            Anterior
          </a>
          <span className="px-3 text-sm text-slate-600">
            Página {response.page} de {pages}
          </span>
          <a
            aria-disabled={response.page >= pages}
            className={`focus-ring rounded-lg border px-4 py-2 text-sm ${response.page >= pages ? 'pointer-events-none opacity-40' : 'hover:bg-white'}`}
            href={pageHref(Math.min(pages, response.page + 1))}
          >
            Siguiente
          </a>
        </nav>
      )}
      <section className="cargo-search-hero relative mb-7 overflow-hidden rounded-[1.75rem] px-6 py-8 text-white sm:px-9 sm:py-10 lg:px-12">
        <div className="cargo-hero-route" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
        <div className="relative z-[1] max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Marketplace de carga en Colombia
          </p>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[2.75rem]">
            Una buena ruta empieza con la carga correcta.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
            Explora oportunidades y encuentra el próximo trayecto para tu vehículo.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#resultados"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#0b2545] transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              Explorar cargas <ArrowDown className="h-4 w-4" />
            </a>
            <PublishCargoAction className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10" />
          </div>
        </div>
        <div className="relative z-[1] mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-5 text-sm text-blue-100 sm:absolute sm:bottom-8 sm:right-9 sm:mt-0 sm:border-0 sm:pt-0 lg:right-12">
          <span>
            <strong className="mr-1.5 text-xl font-semibold text-white">{response.total}</strong>
            {response.total === 1 ? 'carga' : 'cargas'} encontradas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-300" /> Oportunidades actualizadas
          </span>
        </div>
      </section>
    </main>
  );
}
