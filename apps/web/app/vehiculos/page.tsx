'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Access, useSession } from '../../components/session';
import { VehicleFields, vehiclePayload, nearestPlace } from '../../components/vehicle-fields';
import { ErrorMessage, useColombia } from '../../components/form-fields';
import { Button } from '../../components/button';
import { apiFetch } from '../../lib/api';
import { Vehicle } from '../../lib/models';
import { bodyTypes, vehicleTypes } from '../../lib/catalogs';
export default function VehiclesPage() {
  return (
    <Access role="TRANSPORTER">
      <Vehicles />
    </Access>
  );
}
function Vehicles() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const load = useCallback(async () => {
    try {
      setVehicles(await apiFetch<Vehicle[]>('/vehicles/me', { token: token! }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get('photo') || !f.get('ownershipDocumentData')) {
      setError('Adjunta una foto del vehículo y su tarjeta de propiedad.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiFetch('/vehicles', {
        token: token!,
        method: 'POST',
        body: JSON.stringify(vehiclePayload(f)),
      });
      setVersion((v) => v + 1);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="vehicles-page mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Perfil de transportador
        </p>
        <h1 className="mt-2 text-3xl font-bold">Mis camiones y documentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Cada vehículo nuevo queda pendiente de validar. Podrás postularte con él cuando el
          administrador apruebe su tarjeta de propiedad y su foto.
        </p>
      </div>
      <ErrorMessage message={error} />
      <div className="grid gap-4">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} onUpdate={load} />
        ))}
      </div>
      <form className="panel mt-6" onSubmit={submit} key={version}>
        <VehicleFields />
        <Button className="mt-6" disabled={busy}>
          {busy ? 'Guardando…' : 'Registrar vehículo'}
        </Button>
      </form>
    </main>
  );
}
function VehicleCard({
  vehicle: v,
  onUpdate,
}: {
  vehicle: Vehicle;
  onUpdate: () => Promise<void>;
}) {
  const { token } = useSession();
  const { data } = useColombia();
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) {
      setStatus('Tu navegador no permite GPS.');
      setTracking(false);
      return;
    }
    let lastSent = 0;
    let disposed = false;
    let sending = false;
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        if (sending || Date.now() - lastSent < 30000) return;
        sending = true;
        try {
          const place = nearestPlace(data, p.coords.latitude, p.coords.longitude);
          await apiFetch(`/vehicles/${v.id}`, {
            token: token!,
            method: 'PATCH',
            body: JSON.stringify({
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              ...(place ? { operatingCity: `${place.city.name}, ${place.department}` } : {}),
            }),
          });
          lastSent = Date.now();
          if (!disposed) {
            setStatus(`Ubicación guardada a las ${new Date().toLocaleTimeString('es-CO')}`);
            await onUpdate();
          }
        } catch (e) {
          if (!disposed) setStatus((e as Error).message);
        } finally {
          sending = false;
        }
      },
      () => {
        setStatus('No se pudo acceder al GPS. Revisa los permisos de ubicación.');
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 },
    );
    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(id);
    };
  }, [tracking, token, v.id, data, onUpdate]);
  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No fue posible leer el archivo adjunto.'));
        reader.readAsDataURL(file);
      });
    setRequestBusy(true);
    setStatus('');
    try {
      const changes: Record<string, unknown> = {
        plate: String(values.get('plate')).trim().toUpperCase(),
        brand: String(values.get('brand')).trim(),
        model: String(values.get('model')).trim(),
        year: Number(values.get('year')),
        vehicleType: values.get('vehicleType'),
        bodyType: values.get('bodyType'),
        maxWeightKg: Number(values.get('capacityTon')) * 1000,
        operatingCity: String(values.get('operatingCity')).trim(),
        description: String(values.get('description')).trim(),
      };
      const photo = values.get('photo') as File | null;
      const document = values.get('ownershipDocument') as File | null;
      if (photo?.size) {
        if (photo.size > 500000 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type))
          throw new Error('La foto debe ser JPG, PNG o WebP y pesar hasta 500 KB.');
        changes.photos = [await toDataUrl(photo)];
      }
      if (document?.size) {
        if (
          document.size > 2_000_000 ||
          !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(document.type)
        )
          throw new Error('La tarjeta debe ser PDF o imagen y pesar hasta 2 MB.');
        changes.ownershipDocumentData = await toDataUrl(document);
        changes.ownershipDocumentName = document.name;
      }
      await apiFetch(`/vehicles/${v.id}/change-requests`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ changes }),
      });
      setRequestOpen(false);
      setStatus(
        'Solicitud enviada. Los datos actuales seguirán vigentes hasta que el administrador la apruebe.',
      );
      await onUpdate();
    } catch (reason) {
      setStatus((reason as Error).message);
    } finally {
      setRequestBusy(false);
    }
  }
  return (
    <article className="panel">
      <div className="flex flex-wrap gap-4">
        {v.photos[0] && (
          <img
            src={v.photos[0]}
            alt={`Camión ${v.plate}`}
            className="h-28 w-40 rounded object-cover"
          />
        )}
        <div>
          <h2 className="text-xl font-bold">
            {v.plate} · {v.brand} {v.model}
          </h2>
          <p>
            {vehicleTypes[v.vehicleType]} · {v.year} · {Number(v.maxWeightKg) / 1000} toneladas
          </p>
          <p className="mt-2 text-sm">Ubicación: {v.operatingCity}</p>
          <p
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${v.verificationStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : v.verificationStatus === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}
          >
            {v.verificationStatus === 'APPROVED'
              ? v.isAvailable
                ? 'Validado · disponible'
                : 'Validado · asignado'
              : v.verificationStatus === 'REJECTED'
                ? 'Requiere corrección'
                : 'En revisión del administrador'}
          </p>
          {v.ownershipDocumentName && (
            <p className="mt-2 text-xs text-slate-500">
              Tarjeta adjunta: {v.ownershipDocumentName}
            </p>
          )}
          {v.verificationStatus === 'APPROVED' && (
            <p className="mt-2 text-xs text-slate-500">
              {v.changeRequests?.length
                ? 'Tienes una solicitud de cambio en revisión.'
                : 'Los datos de este vehículo solo cambian cuando el administrador aprueba una solicitud.'}
            </p>
          )}
        </div>
      </div>
      {v.verificationStatus === 'APPROVED' && (
        <Button
          className="mt-4"
          type="button"
          variant="ghost"
          onClick={() => setTracking(!tracking)}
        >
          {tracking ? 'Detener actualización de ubicación' : 'Actualizar mi ubicación con GPS'}
        </Button>
      )}
      {v.verificationStatus === 'APPROVED' && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          {status ||
            'El GPS actualiza tu ubicación mientras esta página esté abierta y la opción esté activa.'}
        </p>
      )}
      {v.verificationStatus === 'APPROVED' && !v.changeRequests?.length && (
        <Button
          className="mt-3"
          type="button"
          variant="ghost"
          onClick={() => setRequestOpen((open) => !open)}
        >
          {requestOpen ? 'Cerrar solicitud' : 'Solicitar cambio de datos'}
        </Button>
      )}
      {requestOpen && (
        <form
          className="mt-5 grid gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2"
          onSubmit={submitChange}
        >
          <p className="text-sm text-slate-600 sm:col-span-2">
            Los datos actuales permanecen activos hasta la aprobación. Adjunta una nueva foto o
            tarjeta solo si quieres reemplazarla.
          </p>
          <label className="field">
            Placa
            <input className="input" name="plate" defaultValue={v.plate} required maxLength={8} />
          </label>
          <label className="field">
            Marca
            <input className="input" name="brand" defaultValue={v.brand} required />
          </label>
          <label className="field">
            Modelo
            <input className="input" name="model" defaultValue={v.model} required />
          </label>
          <label className="field">
            Año
            <input
              className="input"
              name="year"
              type="number"
              defaultValue={v.year}
              min="1950"
              max={new Date().getFullYear() + 1}
              required
            />
          </label>
          <label className="field">
            Tipo
            <select className="input" name="vehicleType" defaultValue={v.vehicleType}>
              {Object.entries(vehicleTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Carrocería
            <select className="input" name="bodyType" defaultValue={v.bodyType}>
              {Object.entries(bodyTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Capacidad (toneladas)
            <input
              className="input"
              name="capacityTon"
              type="number"
              step="0.001"
              min="0.001"
              defaultValue={Number(v.maxWeightKg) / 1000}
              required
            />
          </label>
          <label className="field">
            Ubicación habitual
            <input className="input" name="operatingCity" defaultValue={v.operatingCity} required />
          </label>
          <label className="field sm:col-span-2">
            Descripción
            <input className="input" name="description" defaultValue={v.description ?? ''} />
          </label>
          <label className="field">
            Nueva foto
            <input
              className="input"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <label className="field">
            Nueva tarjeta
            <input
              className="input"
              name="ownershipDocument"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
            />
          </label>
          <Button className="sm:col-span-2" disabled={requestBusy}>
            {requestBusy ? 'Enviando solicitud…' : 'Enviar para aprobación'}
          </Button>
        </form>
      )}
    </article>
  );
}
