'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, FileCheck2, ShieldAlert, Truck, X } from 'lucide-react';
import { Access, useSession } from '../../../components/session';
import { Button } from '../../../components/button';
import { ErrorMessage } from '../../../components/form-fields';
import { apiFetch } from '../../../lib/api';

type Verification = {
  id: string;
  email: string;
  role: 'CLIENT' | 'TRANSPORTER';
  status: string;
  createdAt: string;
  profile?: { firstName: string; lastName: string; phone?: string | null } | null;
  companyProfile?: {
    businessName: string;
    taxId?: string | null;
    contactPhone?: string | null;
    city?: string | null;
    department?: string | null;
  } | null;
  verificationDocuments: {
    id: string;
    type: string;
    fileName: string;
    mimeType: string;
    dataUrl: string;
  }[];
  vehicles: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    photos: string[];
    maxWeightKg: string | number;
    ownershipDocumentData?: string | null;
    ownershipDocumentName?: string | null;
  }[];
};
type VehicleChangeRequest = {
  id: string;
  createdAt: string;
  changes: Record<string, unknown>;
  vehicle: { id: string; plate: string; brand: string; model: string };
  requester: {
    email: string;
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  };
};

const documentLabels: Record<string, string> = {
  ID_CARD: 'Cédula de ciudadanía',
  CRIMINAL_RECORD: 'Antecedentes judiciales',
};

export default function AdminVerificationsPage() {
  return (
    <Access>
      <VerificationQueue />
    </Access>
  );
}

function VerificationQueue() {
  const { token, user } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Verification[]>([]);
  const [changeRequests, setChangeRequests] = useState<VehicleChangeRequest[]>([]);
  const [changeRequestLoadError, setChangeRequestLoadError] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const verificationItems = await apiFetch<Verification[]>('/admin/verifications', { token });
      let requestedChanges: VehicleChangeRequest[] = [];
      try {
        requestedChanges = await apiFetch<VehicleChangeRequest[]>(
          '/admin/vehicle-change-requests',
          { token },
        );
        setChangeRequestLoadError(false);
      } catch {
        setChangeRequestLoadError(true);
      }
      setItems(verificationItems);
      setChangeRequests(requestedChanges);
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);
  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [load, user]);

  async function reviewAccount(item: Verification, status: 'ACTIVE' | 'SUSPENDED') {
    setBusy(item.id);
    setError('');
    try {
      await apiFetch(`/admin/users/${item.id}/verification`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(notes[item.id]?.trim() ? { note: notes[item.id].trim() } : {}),
        }),
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function reviewVehicle(vehicleId: string, approved: boolean, key: string) {
    setBusy(key);
    setError('');
    try {
      await apiFetch(`/admin/vehicles/${vehicleId}/verification`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          approved,
          ...(notes[key]?.trim() ? { note: notes[key].trim() } : {}),
        }),
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function reviewChangeRequest(id: string, approved: boolean) {
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/admin/vehicle-change-requests/${id}`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          approved,
          ...(notes[id]?.trim() ? { note: notes[id].trim() } : {}),
        }),
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Revelo · control de acceso
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Validación de cuentas</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Revisa la identidad, los antecedentes y los datos de cada vehículo antes de habilitar su
            uso.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          Actualizar lista
        </Button>
      </div>
      <ErrorMessage message={error} />
      {changeRequestLoadError && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Las solicitudes de cambios de vehículos requieren aplicar las migraciones pendientes de la
          base local.
        </p>
      )}
      {loading && (
        <p role="status" className="panel">
          Cargando solicitudes de validación…
        </p>
      )}
      {!!changeRequests.length && (
        <section className="mb-7 space-y-4" aria-labelledby="vehicle-change-title">
          <div>
            <h2 id="vehicle-change-title" className="text-xl font-bold">
              Cambios de vehículos por aprobar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Los datos vigentes del camión se mantienen hasta que apruebes una solicitud.
            </p>
          </div>
          {changeRequests.map((request) => (
            <article key={request.id} className="panel">
              <h3 className="font-bold">
                {request.vehicle.plate} · {request.vehicle.brand} {request.vehicle.model}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {request.requester.profile?.firstName} {request.requester.profile?.lastName} ·{' '}
                {request.requester.email}
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(request.changes)
                  .filter(([key]) => !['photos', 'ownershipDocumentData'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-slate-50 p-3 text-sm">
                      <dt className="text-xs text-slate-500">{key}</dt>
                      <dd className="mt-1 break-all font-semibold">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
              {typeof request.changes.ownershipDocumentData === 'string' && (
                <a
                  className="mt-3 inline-flex text-sm font-semibold text-blue-700 underline"
                  href={request.changes.ownershipDocumentData}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver tarjeta de propiedad solicitada
                </a>
              )}
              {Array.isArray(request.changes.photos) &&
                typeof request.changes.photos[0] === 'string' && (
                  <img
                    className="mt-3 h-40 rounded-lg object-contain"
                    src={request.changes.photos[0]}
                    alt="Foto solicitada para el vehículo"
                  />
                )}
              <label className="field mt-4">
                Nota de revisión
                <textarea
                  className="input min-h-20"
                  value={notes[request.id] ?? ''}
                  onChange={(event) =>
                    setNotes((old) => ({ ...old, [request.id]: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!!busy}
                  onClick={() => void reviewChangeRequest(request.id, true)}
                >
                  <Check size={16} /> Aprobar cambios
                </Button>
                <Button
                  disabled={!!busy}
                  variant="ghost"
                  onClick={() => void reviewChangeRequest(request.id, false)}
                >
                  <X size={16} /> Rechazar cambios
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {!loading && !items.length && !changeRequests.length && (
        <section className="panel grid justify-items-center py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Check />
          </span>
          <h2 className="mt-4 text-lg font-bold">Todo al día</h2>
          <p className="mt-1 text-sm text-slate-500">
            No hay cuentas, vehículos ni cambios pendientes de revisión.
          </p>
        </section>
      )}
      <div className="grid gap-5">
        {items.map((item) => {
          const isPendingAccount = item.status === 'PENDING_VERIFICATION';
          return (
            <article
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              key={item.id}
            >
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl ${item.role === 'TRANSPORTER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}
                  >
                    {item.role === 'TRANSPORTER' ? <Truck size={20} /> : <Building2 size={20} />}
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-950">
                      {item.role === 'TRANSPORTER'
                        ? item.profile?.firstName
                          ? `${item.profile.firstName} ${item.profile.lastName ?? ''}`
                          : 'Transportador'
                        : (item.companyProfile?.businessName ??
                          item.profile?.firstName ??
                          'Persona natural')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.email} ·{' '}
                      {item.profile?.phone || item.companyProfile?.contactPhone || 'Sin teléfono'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Recibida {new Date(item.createdAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${isPendingAccount ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}
                >
                  {isPendingAccount ? 'Cuenta pendiente' : 'Vehículo nuevo pendiente'}
                </span>
              </header>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                {item.role === 'TRANSPORTER' ? (
                  <div className="grid content-start gap-4 sm:grid-cols-2">
                    {item.verificationDocuments.map((doc) => (
                      <DocumentPreview
                        key={doc.id}
                        title={documentLabels[doc.type] ?? doc.type}
                        name={doc.fileName}
                        mimeType={doc.mimeType}
                        src={doc.dataUrl}
                      />
                    ))}
                    {item.vehicles.map((vehicle) => (
                      <section
                        key={vehicle.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2"
                      >
                        <div className="flex items-start gap-3">
                          <Truck className="mt-1 shrink-0 text-blue-700" size={20} />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900">
                              {vehicle.plate} · {vehicle.brand} {vehicle.model}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              Modelo {vehicle.year} · {Number(vehicle.maxWeightKg) / 1000} toneladas
                            </p>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              {vehicle.photos[0] && (
                                <img
                                  src={vehicle.photos[0]}
                                  alt={`Foto de ${vehicle.plate}`}
                                  className="h-52 w-full rounded-lg bg-slate-100 object-contain"
                                />
                              )}
                              {vehicle.ownershipDocumentData && (
                                <DocumentPreview
                                  title="Tarjeta de propiedad"
                                  name={vehicle.ownershipDocumentName ?? 'Documento'}
                                  mimeType={
                                    vehicle.ownershipDocumentData.startsWith('data:application/pdf')
                                      ? 'application/pdf'
                                      : 'image/jpeg'
                                  }
                                  src={vehicle.ownershipDocumentData}
                                />
                              )}
                            </div>
                            {!isPendingAccount && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                  disabled={!!busy}
                                  onClick={() => void reviewVehicle(vehicle.id, true, vehicle.id)}
                                >
                                  <Check size={16} /> Aprobar vehículo
                                </Button>
                                <Button
                                  variant="ghost"
                                  disabled={!!busy}
                                  onClick={() => void reviewVehicle(vehicle.id, false, vehicle.id)}
                                >
                                  <X size={16} /> Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-2 font-semibold">
                      <Building2 size={18} className="text-emerald-700" />
                      Datos de la empresa
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Razón social</dt>
                        <dd className="mt-1 font-semibold">
                          {item.companyProfile?.businessName ?? 'Persona natural'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">NIT</dt>
                        <dd className="mt-1 font-semibold">
                          {item.companyProfile?.taxId ?? 'No informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Ubicación</dt>
                        <dd className="mt-1 font-semibold">
                          {[item.companyProfile?.city, item.companyProfile?.department]
                            .filter(Boolean)
                            .join(', ') || 'No informada'}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
                      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                      Contrasta el NIT y la razón social en las fuentes oficiales antes de aprobar.
                    </p>
                  </section>
                )}
                <aside className="flex flex-col gap-3">
                  {isPendingAccount && (
                    <>
                      <label className="field">
                        Nota para el registro
                        <textarea
                          className="input min-h-28 resize-y"
                          value={notes[item.id] ?? ''}
                          onChange={(event) =>
                            setNotes((old) => ({ ...old, [item.id]: event.target.value }))
                          }
                          placeholder="Observación para la persona (opcional)"
                        />
                      </label>
                      <Button disabled={!!busy} onClick={() => void reviewAccount(item, 'ACTIVE')}>
                        <Check size={17} />
                        {busy === item.id ? 'Guardando…' : 'Aprobar cuenta'}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => void reviewAccount(item, 'SUSPENDED')}
                      >
                        <X size={17} />
                        Rechazar y suspender
                      </Button>
                    </>
                  )}
                  {!isPendingAccount && item.vehicles.length > 0 && (
                    <label className="field">
                      Nota del vehículo
                      <textarea
                        className="input min-h-28 resize-y"
                        value={notes[item.vehicles[0].id] ?? ''}
                        onChange={(event) =>
                          setNotes((old) => ({ ...old, [item.vehicles[0].id]: event.target.value }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                  )}
                </aside>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function DocumentPreview({
  title,
  name,
  mimeType,
  src,
}: {
  title: string;
  name: string;
  mimeType: string;
  src: string;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck2 className="shrink-0 text-blue-700" size={17} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="truncate text-xs text-slate-500">{name}</p>
        </div>
      </div>
      {mimeType === 'application/pdf' ? (
        <iframe title={title} src={src} className="h-64 w-full rounded-lg bg-white" />
      ) : (
        <img src={src} alt={title} className="h-64 w-full rounded-lg bg-white object-contain" />
      )}
      <a
        href={src}
        download={name}
        className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-blue-700 underline"
      >
        Abrir / descargar archivo
      </a>
    </section>
  );
}
