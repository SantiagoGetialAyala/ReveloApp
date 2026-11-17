'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Search, SlidersHorizontal } from 'lucide-react';
import { Access, useSession } from '../../components/session';
import { CargoCard, CargoCardData } from '../../components/cargo-card';
import { CargoBoardMap } from '../../components/cargo-board-map';
import { CompatibleCargos } from '../../components/compatible-cargos';
import { Button } from '../../components/button';
import { bodyTypes, categories, vehicleTypes } from '../../lib/catalogs';
import { apiFetch } from '../../lib/api';
import type { Cargo } from '../../lib/models';

type SearchResult = { items: CargoCardData[]; total: number; page: number; limit: number };
const filterNames = [
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

export default function CargasPage() {
  return (
    <Access>
      <CargoWorkspace />
    </Access>
  );
}

function CargoWorkspace() {
  const { user, token, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult>({ items: [], total: 0, page: 1, limit: 12 });
  const [ownCargos, setOwnCargos] = useState<Cargo[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearch(window.location.search);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || sessionLoading || !user) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    if (user.role === 'CLIENT') {
      void apiFetch<Cargo[]>('/cargos/me', { token: token!, signal: controller.signal })
        .then(setOwnCargos)
        .catch((reason) => {
          if (!controller.signal.aborted) setError((reason as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    } else if (user.role === 'TRANSPORTER') {
      const params = new URLSearchParams(search);
      const query = new URLSearchParams();
      for (const name of filterNames) {
        const value = params.get(name)?.trim();
        if (value) query.set(name, value.slice(0, 90));
      }
      const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
      if (page > 1) query.set('page', String(page));
      void apiFetch<SearchResult>(`/cargos?${query.toString()}`, {
        token: token!,
        signal: controller.signal,
      })
        .then(setResults)
        .catch((reason) => {
          if (!controller.signal.aborted) setError((reason as Error).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    } else {
      setBusy(false);
      router.replace('/dashboard');
    }
    return () => controller.abort();
  }, [ready, search, sessionLoading, user, token, router]);

  if (user?.role === 'ADMIN') {
    return (
      <main className="cargo-search-page mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="trip-surface p-8 text-center text-sm text-slate-600" role="status">
          Abriendo el panel de administración…
        </div>
      </main>
    );
  }

  if (sessionLoading || !ready || !user || busy) {
    return (
      <main className="cargo-search-page mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="trip-surface p-8 text-center text-sm text-slate-600" role="status">
          {sessionLoading || !ready ? 'Cargando tu cuenta…' : 'Cargando cargas…'}
        </div>
      </main>
    );
  }

  if (user.role === 'CLIENT') {
    return (
      <main className="cargo-search-page mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="cargo-board-title-row">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-700">
              Panel de empresa
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Mis cargas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Aquí solo aparecen las cargas que publicaste.
            </p>
          </div>
          <Link href="/publicar-carga" className="dashboard-trip-follow focus-ring">
            + Publicar carga
          </Link>
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {ownCargos.length ? (
          <section className="grid gap-3" aria-label="Mis cargas publicadas">
            {ownCargos.map((cargo) => (
              <CargoCard
                key={cargo.id}
                cargo={{
                  ...cargo,
                  pickupWindowStart: cargo.pickupWindowStart,
                  weightKg: cargo.weightKg,
                  estimatedBudgetCop: cargo.estimatedBudgetCop,
                  requiredVehicleType: cargo.requiredVehicleType ?? '',
                  category: cargo.category ?? 'Otros',
                }}
              />
            ))}
          </section>
        ) : (
          <section className="cargo-board-empty">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Package />
            </span>
            <h2 className="mt-4 font-bold text-slate-900">Aún no publicas una carga</h2>
            <p className="mt-1 text-sm text-slate-500">
              Publica la primera y recibe ofertas de transportadores.
            </p>
            <Link href="/publicar-carga" className="dashboard-trip-follow focus-ring mt-4">
              Publicar mi carga
            </Link>
          </section>
        )}
      </main>
    );
  }

  const params = new URLSearchParams(search);
  const value = (key: string) => params.get(key) ?? '';
  const activeFilterCount = filterNames.filter((key) => Boolean(value(key))).length;
  const pages = Math.max(1, Math.ceil(results.total / Math.max(results.limit, 1)));
  const pageHref = (page: number) => {
    const next = new URLSearchParams(search);
    next.set('page', String(page));
    return `/cargas?${next.toString()}`;
  };

  return (
    <main className="cargo-search-page mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
      <div className="cargo-board-title-row">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-700">
            Oportunidades para tu ruta
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Explorar cargas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Encuentra la carga ideal para tus vehículos.
          </p>
        </div>
        <span className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
          {results.total} {results.total === 1 ? 'carga disponible' : 'cargas disponibles'}
        </span>
      </div>
      <CompatibleCargos />
      <details
        className="cargo-filter-panel mb-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,47,79,0.045)]"
        open={activeFilterCount > 0}
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">Filtros de búsqueda</span>
            <span className="text-xs text-slate-500">Ruta, mercancía, vehículo y fecha</span>
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
          className="grid gap-3 border-t border-slate-100 bg-[#fbfcfe] p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="field">
            Origen
            <input
              className="input"
              name="originCity"
              defaultValue={value('originCity')}
              placeholder="Cualquier ciudad"
            />
          </label>
          <label className="field">
            Destino
            <input
              className="input"
              name="destinationCity"
              defaultValue={value('destinationCity')}
              placeholder="Cualquier ciudad"
            />
          </label>
          <label className="field">
            Tipo de mercancía
            <select className="input" name="category" defaultValue={value('category')}>
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Vehículo
            <select className="input" name="vehicleType" defaultValue={value('vehicleType')}>
              <option value="">Todos</option>
              {Object.entries(vehicleTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Carrocería
            <select className="input" name="bodyType" defaultValue={value('bodyType')}>
              <option value="">Todas</option>
              {Object.entries(bodyTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Presupuesto máximo
            <input
              className="input"
              name="maxBudgetCop"
              type="number"
              min="0"
              defaultValue={value('maxBudgetCop')}
              placeholder="Sin límite"
            />
          </label>
          <label className="field">
            Recogida desde
            <input
              className="input"
              name="pickupAfter"
              type="date"
              defaultValue={value('pickupAfter')}
            />
          </label>
          <label className="field">
            Ordenar por
            <select className="input" name="sort" defaultValue={value('sort') || 'recent'}>
              <option value="recent">Más recientes</option>
              <option value="pickupDate">Recogida próxima</option>
              <option value="budgetDesc">Mayor presupuesto</option>
              <option value="budgetAsc">Menor presupuesto</option>
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button>
              <Search className="h-4 w-4" />
              Aplicar filtros
            </Button>
            <Link
              className="inline-flex min-h-11 items-center px-3 text-sm text-slate-600"
              href="/cargas"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </details>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="cargo-board-layout" id="resultados">
        <div className="cargo-board-map-column">
          <CargoBoardMap
            cargos={results.items.map((cargo) => ({
              id: cargo.id,
              title: cargo.title,
              originCity: cargo.originCity,
              destinationCity: cargo.destinationCity,
              pickupLat: cargo.pickupLat,
              pickupLng: cargo.pickupLng,
              deliveryLat: cargo.deliveryLat,
              deliveryLng: cargo.deliveryLng,
            }))}
          />
        </div>
        <section className="cargo-board-list-column" aria-label="Resultados de cargas">
          <div className="cargo-board-list-heading">
            <div>
              <h2>Cargas disponibles</h2>
              <p>
                Mostrando {results.items.length} de {results.total}
              </p>
            </div>
            <form action="/cargas" className="cargo-sort-form">
              {filterNames
                .filter((key) => key !== 'sort')
                .map((key) =>
                  value(key) ? (
                    <input key={key} type="hidden" name={key} value={value(key)} />
                  ) : null,
                )}
              <input type="hidden" name="page" value="1" />
              <label className="sr-only" htmlFor="cargo-sort">
                Ordenar cargas
              </label>
              <select
                id="cargo-sort"
                name="sort"
                className="cargo-sort-select"
                defaultValue={value('sort') || 'recent'}
              >
                <option value="recent">Más recientes</option>
                <option value="pickupDate">Recogida próxima</option>
                <option value="budgetDesc">Mayor presupuesto</option>
                <option value="budgetAsc">Menor presupuesto</option>
              </select>
              <button type="submit" className="cargo-sort-apply">
                Aplicar
              </button>
            </form>
          </div>
          {!results.items.length && (
            <div className="cargo-board-empty">
              <p className="font-semibold text-slate-900">
                No encontramos cargas con esos filtros.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Prueba con otra ciudad, vehículo o fecha.
              </p>
              <Link
                className="mt-4 inline-block text-sm font-semibold text-blue-700 underline"
                href="/cargas"
              >
                Quitar filtros
              </Link>
            </div>
          )}
          <div className="grid gap-3">
            {results.items.map((cargo) => (
              <CargoCard key={cargo.id} cargo={cargo} />
            ))}
          </div>
          {results.total > results.limit && (
            <nav
              aria-label="Páginas de resultados"
              className="mt-5 flex items-center justify-center gap-2"
            >
              <a
                aria-disabled={results.page <= 1}
                className="rounded-lg border bg-white px-4 py-2 text-sm"
                href={pageHref(Math.max(1, results.page - 1))}
              >
                Anterior
              </a>
              <span className="px-2 text-sm text-slate-600">
                Página {results.page} de {pages}
              </span>
              <a
                aria-disabled={results.page >= pages}
                className="rounded-lg border bg-white px-4 py-2 text-sm"
                href={pageHref(Math.min(pages, results.page + 1))}
              >
                Siguiente
              </a>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
