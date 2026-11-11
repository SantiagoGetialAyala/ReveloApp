'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Search, ShieldAlert, Truck, UserRound } from 'lucide-react';
import { Access, useSession } from '../../../components/session';
import { Button } from '../../../components/button';
import { ErrorMessage } from '../../../components/form-fields';
import { apiFetch } from '../../../lib/api';

type AdminUser = {
  id: string;
  email: string;
  role: 'CLIENT' | 'TRANSPORTER' | 'ADMIN';
  status: string;
  createdAt: string;
  profile?: { firstName: string; lastName: string; phone?: string | null } | null;
  companyProfile?: { businessName: string; taxId?: string | null } | null;
  transporterProfile?: {
    displayName: string;
    baseCity?: string | null;
    baseDepartment?: string | null;
  } | null;
  receivedReviews: { score: number }[];
  _count: {
    vehicles: number;
    cargos: number;
    proposals: number;
    clientTrips: number;
    transporterTrips: number;
    receivedReviews: number;
  };
};

const roleLabels: Record<AdminUser['role'], string> = {
  CLIENT: 'Empresa',
  TRANSPORTER: 'Conductor',
  ADMIN: 'Administrador',
};

export default function AdminUsersPage() {
  return (
    <Access role="ADMIN">
      <AdminUsers />
    </Access>
  );
}

function AdminUsers() {
  const { token, user } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<'ALL' | AdminUser['role']>('ALL');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setUsers(await apiFetch<AdminUser[]>('/admin/users', { token }));
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
    else if (user) router.replace('/dashboard');
  }, [load, user, router]);

  useEffect(() => {
    const selectedRole = window.location.hash.slice(1);
    if (selectedRole === 'conductores') setRole('TRANSPORTER');
    else if (selectedRole === 'empresas') setRole('CLIENT');
    else if (selectedRole === 'administradores') setRole('ADMIN');
    else if (selectedRole === 'todos') setRole('ALL');
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return users.filter((item) => {
      if (role !== 'ALL' && item.role !== role) return false;
      const searchable = [
        item.email,
        item.profile?.firstName,
        item.profile?.lastName,
        item.profile?.phone,
        item.companyProfile?.businessName,
        item.companyProfile?.taxId,
        item.transporterProfile?.displayName,
        item.transporterProfile?.baseCity,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return !query || searchable.includes(query);
    });
  }, [users, role, search]);

  async function setAccountStatus(item: AdminUser) {
    const nextStatus = item.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setBusy(item.id);
    setError('');
    try {
      await apiFetch(`/admin/users/${item.id}/verification`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          ...(nextStatus === 'SUSPENDED' && notes[item.id]?.trim()
            ? { note: notes[item.id].trim() }
            : {}),
        }),
      });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy('');
    }
  }

  const counts = {
    all: users.length,
    clients: users.filter((item) => item.role === 'CLIENT').length,
    drivers: users.filter((item) => item.role === 'TRANSPORTER').length,
    admins: users.filter((item) => item.role === 'ADMIN').length,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Administración · cuentas
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Usuarios registrados</h1>
          <p className="mt-2 text-sm text-slate-600">
            Consulta perfiles, actividad y calificaciones. Puedes suspender o reactivar cuentas.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </header>
      <ErrorMessage message={error} />
      <section
        className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Usuarios por rol"
      >
        {[
          ['Todos', counts.all, 'ALL'],
          ['Empresas', counts.clients, 'CLIENT'],
          ['Conductores', counts.drivers, 'TRANSPORTER'],
          ['Administradores', counts.admins, 'ADMIN'],
        ].map(([label, count, value]) => (
          <button
            key={String(value)}
            id={
              value === 'TRANSPORTER'
                ? 'conductores'
                : value === 'CLIENT'
                  ? 'empresas'
                  : value === 'ADMIN'
                    ? 'administradores'
                    : 'todos'
            }
            type="button"
            onClick={() => setRole(value as 'ALL' | AdminUser['role'])}
            className={`panel text-left transition hover:border-blue-300 ${role === value ? 'border-blue-400 ring-2 ring-blue-100' : ''}`}
          >
            <span className="block text-sm text-slate-500">{String(label)}</span>
            <strong className="mt-1 block text-2xl text-primary">
              {Number(count).toLocaleString('es-CO')}
            </strong>
          </button>
        ))}
      </section>
      <label className="field mb-5 block max-w-xl">
        <span className="sr-only">Buscar usuarios</span>
        <span className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, correo, NIT o teléfono"
          />
        </span>
      </label>
      {loading && (
        <p role="status" className="panel">
          Cargando usuarios…
        </p>
      )}
      {!loading && !filteredUsers.length && (
        <p className="panel text-sm text-slate-500">
          No hay cuentas que coincidan con la búsqueda.
        </p>
      )}
      <section className="grid gap-4" aria-label="Cuentas">
        {filteredUsers.map((item) => {
          const average = item.receivedReviews.length
            ? item.receivedReviews.reduce((sum, review) => sum + review.score, 0) /
              item.receivedReviews.length
            : null;
          const displayName =
            (item.companyProfile?.businessName ??
              item.transporterProfile?.displayName ??
              [item.profile?.firstName, item.profile?.lastName].filter(Boolean).join(' ')) ||
            item.email;
          return (
            <article key={item.id} className="panel grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.role === 'CLIENT' ? (
                    <Building2 size={19} className="text-emerald-700" />
                  ) : item.role === 'TRANSPORTER' ? (
                    <Truck size={19} className="text-blue-700" />
                  ) : (
                    <UserRound size={19} className="text-slate-700" />
                  )}
                  <h2 className="font-bold text-slate-950">{displayName}</h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                    {roleLabels[item.role]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : item.status === 'SUSPENDED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}
                  >
                    {item.status === 'ACTIVE'
                      ? 'Activa'
                      : item.status === 'SUSPENDED'
                        ? 'Suspendida'
                        : 'Pendiente de validación'}
                  </span>
                </div>
                <p className="mt-2 break-all text-sm text-slate-600">{item.email}</p>
                {item.profile?.phone && (
                  <p className="text-sm text-slate-600">{item.profile.phone}</p>
                )}
                {item.companyProfile?.taxId && (
                  <p className="text-sm text-slate-600">NIT {item.companyProfile.taxId}</p>
                )}
                {item.transporterProfile?.baseCity && (
                  <p className="text-sm text-slate-600">
                    Base: {item.transporterProfile.baseCity}
                    {item.transporterProfile.baseDepartment
                      ? `, ${item.transporterProfile.baseDepartment}`
                      : ''}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Registrada el {new Date(item.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="grid content-start gap-3">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <p className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs text-slate-500">Calificación</span>
                    <strong>
                      {average == null
                        ? 'Sin reseñas'
                        : `${average.toLocaleString('es-CO', { maximumFractionDigits: 1 })} / 5`}
                    </strong>
                    {average != null && (
                      <span className="block text-xs text-slate-500">
                        {item._count.receivedReviews} reseñas
                      </span>
                    )}
                  </p>
                  <p className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs text-slate-500">Viajes</span>
                    <strong>
                      {(item._count.clientTrips + item._count.transporterTrips).toLocaleString(
                        'es-CO',
                      )}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs text-slate-500">Cargas</span>
                    <strong>{item._count.cargos.toLocaleString('es-CO')}</strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs text-slate-500">Vehículos</span>
                    <strong>{item._count.vehicles.toLocaleString('es-CO')}</strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs text-slate-500">Ofertas</span>
                    <strong>{item._count.proposals.toLocaleString('es-CO')}</strong>
                  </p>
                </div>
                {item.role !== 'ADMIN' && (
                  <>
                    {item.status !== 'SUSPENDED' && (
                      <label className="field text-xs">
                        Motivo de suspensión (opcional)
                        <input
                          className="input"
                          value={notes[item.id] ?? ''}
                          onChange={(event) =>
                            setNotes((previous) => ({ ...previous, [item.id]: event.target.value }))
                          }
                          placeholder="Motivo para dejar en el registro"
                        />
                      </label>
                    )}
                    <Button
                      variant={item.status === 'SUSPENDED' ? 'secondary' : 'ghost'}
                      disabled={!!busy}
                      onClick={() => void setAccountStatus(item)}
                    >
                      <ShieldAlert size={16} />
                      {busy === item.id
                        ? 'Guardando…'
                        : item.status === 'SUSPENDED'
                          ? 'Reactivar cuenta'
                          : 'Suspender cuenta'}
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
