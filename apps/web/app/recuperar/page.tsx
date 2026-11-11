import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';

export default function RecoverPage() {
  return (
    <main className="auth-page mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl place-items-center px-4 py-10 sm:px-6">
      <section className="auth-panel panel w-full max-w-md">
        <span className="auth-icon-mark">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-5">Recuperar cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          La recuperación automática todavía no está habilitada. Comunícate con el equipo de Revelo
          para restablecer tu contraseña.
        </p>
        <Link
          href="/login"
          className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:bg-[#123b63]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
        </Link>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/registro" className="font-semibold text-blue-700 underline">
            Crear cuenta
          </Link>
        </p>
      </section>
    </main>
  );
}
