'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '../lib/api';
import { ArrowRight, ShieldCheck } from 'lucide-react';
export type User = {
  id: string;
  email: string;
  role: 'CLIENT' | 'TRANSPORTER' | 'ADMIN';
  profile?: { firstName: string; phone?: string };
};
type Auth = { accessToken: string; user: User };
const SessionContext = createContext<{
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (auth: Auth) => void;
  signOut: () => void;
}>({ user: null, token: null, loading: true, signIn: () => {}, signOut: () => {} });
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);
  function signOut() {
    localStorage.removeItem('revelo-session');
    setAuth(null);
  }
  useEffect(() => {
    let active = true;
    async function restore() {
      let saved: Auth | null = null;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        saved = JSON.parse(localStorage.getItem('revelo-session') ?? 'null') as Auth | null;
        if (saved?.accessToken) {
          // Use the cached account immediately; server validation runs in the background.
          if (active && saved.user) {
            setAuth(saved);
            setLoading(false);
          }
          const user = await apiFetch<User>('/auth/me', {
            token: saved.accessToken,
            signal: controller.signal,
          });
          if (active) setAuth({ accessToken: saved.accessToken, user });
        } else if (active) {
          setAuth(null);
        }
      } catch (error) {
        const unauthorized = error instanceof ApiError && [401, 403].includes(error.status);
        if (unauthorized) {
          localStorage.removeItem('revelo-session');
          if (active) setAuth(null);
        } else if (active && saved?.accessToken && saved.user) {
          // A temporary API/network issue must not leave protected screens loading forever.
          setAuth(saved);
        } else if (!saved?.accessToken) {
          localStorage.removeItem('revelo-session');
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void restore();
    const sync = () => {
      void restore();
    };
    window.addEventListener('storage', sync);
    return () => {
      active = false;
      window.removeEventListener('storage', sync);
    };
  }, []);
  function signIn(value: Auth) {
    localStorage.setItem('revelo-session', JSON.stringify(value));
    setAuth(value);
  }
  return (
    <SessionContext.Provider
      value={{
        user: auth?.user ?? null,
        token: auth?.accessToken ?? null,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
export function AccountNav() {
  const { user, signOut } = useSession();
  const router = useRouter();
  return user ? (
    <div className="site-account-nav flex items-center gap-3 text-sm">
      <Link className="site-account-link" href="/dashboard">
        Mi panel
      </Link>
      <button
        className="site-signout"
        type="button"
        onClick={() => {
          signOut();
          router.replace('/login');
        }}
      >
        Salir
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
    >
      Entrar
    </Link>
  );
}
export function Access({ role, children }: { role?: string; children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading)
    return (
      <p className="p-8" role="status">
        Cargando tu cuenta…
      </p>
    );
  if (!user)
    return (
      <main className="access-page mx-auto grid min-h-[60vh] max-w-5xl place-items-center px-4 py-10">
        <section className="panel w-full max-w-xl text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-800">
            <ShieldCheck />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Tu operación en Revelo
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Inicia sesión para continuar</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Accede a tus cargas, vehículos, ofertas y viajes desde tu panel.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white"
              href="/login"
            >
              Iniciar sesión <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              href="/registro"
            >
              Crear cuenta
            </Link>
          </div>
        </section>
      </main>
    );
  if (role && user.role !== role)
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>
          Esta opción está disponible para{' '}
          {role === 'CLIENT' ? 'quienes publican mercancía' : 'transportadores'}.
        </p>
        <Link href="/dashboard" className="underline">
          Ir a mi panel
        </Link>
      </main>
    );
  return <>{children}</>;
}
