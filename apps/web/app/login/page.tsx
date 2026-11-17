'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/button';
import { ErrorMessage } from '../../components/form-fields';
import { useSession, User } from '../../components/session';
import { apiFetch } from '../../lib/api';
import { ReveloLogo } from '../../components/revelo-logo';
import { ArrowRight, CalendarCheck2, PackageCheck, Route } from 'lucide-react';

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useSession();
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const auth = await apiFetch<{ accessToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
      });
      signIn(auth);
      router.push('/dashboard');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-7xl items-center gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.8fr)] lg:gap-7 lg:py-10">
      <section className="auth-story-panel">
        <Link href="/" aria-label="Ir al inicio">
          <ReveloLogo />
        </Link>
        <div className="auth-story-copy">
          <span className="auth-story-eyebrow">Conecta · Transporta · Crece</span>
          <h2>La plataforma que conecta cargas con transportadores.</h2>
          <p>Publica, encuentra y gestiona cargas de forma segura, rápida y eficiente.</p>
          <ul>
            <li>
              <PackageCheck aria-hidden="true" /> Más oportunidades
            </li>
            <li>
              <Route aria-hidden="true" /> Rutas organizadas
            </li>
            <li>
              <CalendarCheck2 aria-hidden="true" /> Viajes bajo control
            </li>
          </ul>
        </div>
      </section>
      <form className="auth-panel panel w-full max-w-xl justify-self-center" onSubmit={submit}>
        <span className="auth-form-kicker">Bienvenido a Revelo</span>
        <h1 className="mt-2 text-2xl font-bold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Ingresa a tu cuenta para continuar.</p>
        <label className="field mt-6">
          Correo electrónico
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field mt-4">
          Contraseña
          <input
            className="input"
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        <div className="mt-2 text-right text-sm">
          <Link href="/recuperar" className="font-medium text-blue-700 hover:text-blue-900">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <ErrorMessage message={error} />
        <Button disabled={busy} className="mt-5 w-full">
          {busy ? 'Entrando…' : 'Iniciar sesión'} <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="auth-register-link mt-5 border-t border-slate-100 pt-4 text-center text-sm">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/registro" className="font-bold text-blue-700">
            Crear cuenta
          </Link>
        </div>
      </form>
    </main>
  );
}
