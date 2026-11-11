'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Truck } from 'lucide-react';
import { CargoCard, CargoCardData } from './cargo-card';
import { Button } from './button';
import { ErrorMessage } from './form-fields';
import { useSession } from './session';
import { apiFetch } from '../lib/api';

type Response = { items: CargoCardData[]; total: number; reason?: string };
export function CompatibleCargos() {
  const { user, token } = useSession();
  const [items, setItems] = useState<CargoCardData[] | null>(null);
  const [total, setTotal] = useState(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (user?.role !== 'TRANSPORTER') return null;
  async function load() {
    if (!token || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<Response>('/cargos/compatible?limit=12', { token });
      setItems(result.items);
      setTotal(result.total);
      setReason(result.reason ?? '');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Cargas para tus vehículos</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Compatibilidad verificable por capacidad, tipo y carrocería; solo considera vehículos
              activos y disponibles.
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
          {loading ? 'Buscando…' : items ? 'Actualizar compatibilidad' : 'Ver compatibles'}
        </Button>
      </div>
      <ErrorMessage message={error} />
      {items && (
        <>
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {total} cargas compatibles; no incluye cargas donde ya postulaste.
          </p>
          {items.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((cargo) => (
                <div key={cargo.id} className="relative">
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                    Compatible con tu vehículo
                  </span>
                  <CargoCard cargo={cargo} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {reason === 'NO_AVAILABLE_VEHICLES'
                ? 'Registra un vehículo y márcalo activo y disponible para consultar oportunidades compatibles.'
                : 'No hay cargas disponibles que coincidan con tus vehículos activos.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
