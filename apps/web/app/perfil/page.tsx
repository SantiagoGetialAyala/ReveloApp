'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { Access, useSession } from '../../components/session';
import { Button } from '../../components/button';
import { ErrorMessage } from '../../components/form-fields';
import { apiFetch } from '../../lib/api';

type ProfileUser = {
  id: string;
  email: string;
  role: 'CLIENT' | 'TRANSPORTER' | 'ADMIN';
  profile?: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    city?: string | null;
    department?: string | null;
    photoData?: string | null;
  } | null;
  companyProfile?: { businessName: string; contactPhone?: string | null } | null;
  transporterProfile?: { displayName: string; baseCity?: string | null } | null;
};
type Review = {
  id: string;
  score: number;
  comment?: string | null;
  createdAt: string;
  trip: { cargo: { title: string; originCity: string; destinationCity: string } };
  author: {
    email: string;
    profile?: { firstName: string; lastName: string } | null;
    companyProfile?: { businessName: string } | null;
    transporterProfile?: { displayName: string } | null;
  };
};

export default function ProfilePage() {
  return (
    <Access>
      <Profile />
    </Access>
  );
}

function Profile() {
  const { token, user } = useSession();
  const [data, setData] = useState<ProfileUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [photoData, setPhotoData] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [profile, received, rating] = await Promise.all([
        apiFetch<ProfileUser>('/auth/me', { token }),
        apiFetch<Review[]>('/trips/reviews/received', { token }),
        apiFetch<{ average: number | null; count: number }>('/trips/reviews/me', { token }),
      ]);
      setData(profile);
      setReviews(received);
      setAverage(rating.average);
      setPhotoData(
        window.localStorage.getItem(`revelo-profile-photo:${profile.id}`) ??
          profile.profile?.photoData ??
          '',
      );
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 700_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('La foto debe ser JPG, PNG o WebP y pesar máximo 700 KB.');
      event.target.value = '';
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPhotoData(String(reader.result));
    reader.onerror = () => setError('No pudimos leer la foto. Intenta con otro archivo.');
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/profiles/me', {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify({
          firstName: String(form.get('firstName')).trim(),
          lastName: String(form.get('lastName')).trim(),
          phone: String(form.get('phone')).trim(),
          city: String(form.get('city')).trim(),
          department: String(form.get('department')).trim(),
          ...(data.role === 'CLIENT'
            ? {
                businessName: String(form.get('businessName')).trim(),
                contactPhone: String(form.get('phone')).trim(),
              }
            : {}),
          ...(data.role === 'TRANSPORTER'
            ? {
                displayName: String(form.get('displayName')).trim(),
                baseCity: String(form.get('city')).trim(),
                baseDepartment: String(form.get('department')).trim(),
              }
            : {}),
        }),
      });
      if (photoData) window.localStorage.setItem(`revelo-profile-photo:${data.id}`, photoData);
      setMessage('Tu perfil se guardó correctamente.');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const name =
    data?.companyProfile?.businessName ||
    data?.transporterProfile?.displayName ||
    [data?.profile?.firstName, data?.profile?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Mi perfil';
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Cuenta · perfil público
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Mi perfil</h1>
        <p className="mt-2 text-sm text-slate-600">
          Actualiza tus datos de contacto y consulta las calificaciones que has recibido.
        </p>
      </header>
      <ErrorMessage message={error} />
      {message && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
        >
          {message}
        </p>
      )}
      {loading && (
        <p role="status" className="panel">
          Cargando perfil…
        </p>
      )}
      {data && (
        <form className="panel" onSubmit={submit}>
          <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
            {photoData ? (
              <img
                src={photoData}
                alt="Foto de perfil"
                className="h-20 w-20 rounded-2xl object-cover"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-800">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-bold text-slate-900">{name}</p>
              <p className="text-sm text-slate-500">
                {data.email} ·{' '}
                {data.role === 'CLIENT'
                  ? 'Empresa'
                  : data.role === 'TRANSPORTER'
                    ? 'Conductor'
                    : 'Administrador'}
              </p>
              <label className="mt-2 inline-flex cursor-pointer text-sm font-semibold text-blue-700 underline">
                Cambiar foto de perfil
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectPhoto}
                />
              </label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              Nombre
              <input
                className="input"
                name="firstName"
                defaultValue={data.profile?.firstName ?? ''}
                required
              />
            </label>
            <label className="field">
              Apellido
              <input
                className="input"
                name="lastName"
                defaultValue={data.profile?.lastName ?? ''}
                required
              />
            </label>
            <label className="field">
              Teléfono
              <input
                className="input"
                name="phone"
                type="tel"
                defaultValue={data.profile?.phone ?? ''}
              />
            </label>
            <label className="field">
              Correo
              <input className="input" value={data.email} readOnly />
            </label>
            {data.role === 'CLIENT' && (
              <label className="field sm:col-span-2">
                Empresa
                <input
                  className="input"
                  name="businessName"
                  defaultValue={data.companyProfile?.businessName ?? ''}
                  required
                />
              </label>
            )}
            {data.role === 'TRANSPORTER' && (
              <label className="field sm:col-span-2">
                Nombre para mostrar
                <input
                  className="input"
                  name="displayName"
                  defaultValue={data.transporterProfile?.displayName ?? name}
                  required
                />
              </label>
            )}
            <label className="field">
              Ciudad
              <input
                className="input"
                name="city"
                defaultValue={data.profile?.city ?? data.transporterProfile?.baseCity ?? ''}
              />
            </label>
            <label className="field">
              Departamento
              <input
                className="input"
                name="department"
                defaultValue={data.profile?.department ?? ''}
              />
            </label>
          </div>
          <Button className="mt-5" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      )}
      <section className="mt-7" aria-labelledby="profile-reviews">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="profile-reviews" className="text-xl font-bold text-slate-950">
              Reseñas recibidas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Las calificaciones publicadas después de viajes completados.
            </p>
          </div>
          <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            Promedio: {average == null ? 'Aún sin calificaciones' : `★ ${average.toFixed(1)} / 5`}
          </p>
        </div>
        {reviews.length ? (
          <div className="grid gap-3">
            {reviews.map((review) => {
              const reviewer =
                review.author.companyProfile?.businessName ||
                review.author.transporterProfile?.displayName ||
                [review.author.profile?.firstName, review.author.profile?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                review.author.email;
              return (
                <article key={review.id} className="panel">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{review.trip.cargo.title}</h3>
                    <span className="font-bold text-amber-600">
                      {'★'.repeat(review.score)}
                      {'☆'.repeat(5 - review.score)}{' '}
                      <span className="text-slate-700">{review.score}/5</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {reviewer} · {review.trip.cargo.originCity} →{' '}
                    {review.trip.cargo.destinationCity} ·{' '}
                    {new Date(review.createdAt).toLocaleDateString('es-CO')}
                  </p>
                  {review.comment && (
                    <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          !loading && (
            <p className="panel text-sm text-slate-500">
              Todavía no tienes reseñas. Aparecerán aquí después de completar viajes.
            </p>
          )
        )}
      </section>
    </main>
  );
}
