'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/button';
import { ErrorMessage } from '../../components/form-fields';
import { useSession, User } from '../../components/session';
import { apiFetch } from '../../lib/api';

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
    <main className="auth-page mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl place-items-center px-4 py-10 sm:px-6">
      <form className="auth-panel panel w-full max-w-md" onSubmit={submit}>
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entra con el correo y la contraseña de tu cuenta.
        </p>
        <label className="field mt-6">
          Correo
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
        <ErrorMessage message={error} />
        <Button disabled={busy} className="mt-6 w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/registro" className="underline">
            Crear cuenta
          </Link>
          <Link href="/recuperar">Recuperar acceso</Link>
        </div>
      </form>
    </main>
  );
}
