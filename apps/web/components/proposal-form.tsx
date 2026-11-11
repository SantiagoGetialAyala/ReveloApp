'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSession } from './session';
import { ErrorMessage, MoneyInput } from './form-fields';
import { Button } from './button';
import { apiFetch } from '../lib/api';
import { Vehicle } from '../lib/models';
export function ProposalForm({
  cargoId,
  status,
  weightKg,
  pickup,
}: {
  cargoId: string;
  status: string;
  weightKg: number;
  pickup: { lat: number; lng: number };
}) {
  const { user, token, loading } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [fetching, setFetching] = useState(true);
  const submitLock = useRef(false);
  useEffect(() => {
    if (token && user?.role === 'TRANSPORTER') {
      setFetching(true);
      void apiFetch<Vehicle[]>('/vehicles/me', { token })
        .then(setVehicles)
        .catch((e) => setError(e.message))
        .finally(() => setFetching(false));
    }
  }, [token, user?.role]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/cargos/${cargoId}/proposals`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          vehicleId: f.get('vehicleId'),
          proposedPriceCop: Number(price),
          availablePickupDate: new Date(String(f.get('availablePickupDate'))).toISOString(),
          estimatedTransportHours: Number(f.get('hours')),
          message: f.get('message'),
        }),
      });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  if (loading) return <p className="mt-6">Cargando…</p>;
  if (status !== 'OPEN') return <p className="mt-6">Esta carga ya no recibe postulaciones.</p>;
  if (!user)
    return (
      <p className="mt-6">
        <Link className="underline" href="/login">
          Inicia sesión
        </Link>{' '}
        o{' '}
        <Link className="underline" href="/registro">
          regístrate como transportador
        </Link>{' '}
        para postularte.
      </p>
    );
  if (user.role !== 'TRANSPORTER')
    return (
      <p className="mt-6">
        Revisa las postulaciones de tus cargas en{' '}
        <Link href="/dashboard" className="underline">
          tu panel
        </Link>
        .
      </p>
    );
  if (sent)
    return (
      <p role="status" className="mt-6 rounded bg-emerald-50 p-4 text-emerald-800">
        ¡Postulación enviada! El cliente recibió una notificación. Sigue el estado en{' '}
        <Link href="/dashboard" className="underline">
          tu panel
        </Link>
        .
      </p>
    );
  const eligible = vehicles.filter((v) => v.isAvailable && Number(v.maxWeightKg) >= weightKg);
  return (
    <form className="mt-6 space-y-4 border-t pt-4" onSubmit={submit}>
      <h2 className="font-bold">Postularme para transportar</h2>
      <ErrorMessage message={error} />
      <a
        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:border-blue-400 hover:bg-blue-100"
        href={`https://www.google.com/maps/dir/?api=1&destination=${pickup.lat},${pickup.lng}&travelmode=driving`}
        target="_blank"
        rel="noreferrer"
      >
        Ir al punto de origen
        <span aria-hidden="true">↗</span>
      </a>
      {fetching ? (
        <p>Cargando tus vehículos…</p>
      ) : !eligible.length ? (
        <p className="text-sm">
          {vehicles.some((vehicle) => vehicle.verificationStatus === 'PENDING')
            ? 'Tus vehículos están pendientes de aprobación. El administrador debe validar la documentación antes de que puedas postularte. '
            : 'No tienes un vehículo validado y disponible con capacidad suficiente. '}
          <Link href="/vehiculos" className="underline">
            Revisar mis vehículos
          </Link>
          .
        </p>
      ) : (
        <>
          <label className="field">
            Vehículo
            <select className="input" name="vehicleId" required>
              {eligible.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {Number(v.maxWeightKg) / 1000} t · {v.model}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tu oferta (COP)
            <MoneyInput value={price} onChange={setPrice} required placeholder="500.000" />
          </label>
          <label className="field">
            Disponible para recoger
            <input className="input" type="datetime-local" name="availablePickupDate" required />
          </label>
          <label className="field">
            Tiempo estimado de transporte (horas)
            <input className="input" name="hours" type="number" min="1" step="1" required />
          </label>
          <label className="field">
            Mensaje al cliente
            <textarea
              className="input"
              name="message"
              placeholder="Disponibilidad y detalles de tu servicio"
            />
          </label>
          <Button disabled={busy} className="w-full" variant="secondary">
            {busy ? 'Enviando…' : 'Enviar postulación'}
          </Button>
        </>
      )}
    </form>
  );
}
