'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from './session';

export function MobileNavigation() {
  const { user, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/cargas', label: user?.role === 'CLIENT' ? 'Explorar cargas' : 'Buscar cargas' },
    ...(user?.role === 'CLIENT' ? [{ href: '/publicar-carga', label: 'Publicar una carga' }] : []),
    ...(user?.role === 'TRANSPORTER' ? [{ href: '/vehiculos', label: 'Mis vehículos' }] : []),
    ...(user?.role === 'ADMIN' ? [{ href: '/admin/incidencias', label: 'Incidencias' }] : []),
    ...(user
      ? [{ href: '/dashboard', label: 'Mi panel' }]
      : [{ href: '/login', label: 'Iniciar sesión' }]),
    ...(user ? [] : [{ href: '/registro', label: 'Crear cuenta' }]),
  ];
  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? 'Cerrar navegación' : 'Abrir navegación'}
        aria-expanded={open}
        aria-controls="mobile-primary-navigation"
        className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav
          id="mobile-primary-navigation"
          aria-label="Navegación principal móvil"
          className="mobile-nav-popover absolute right-0 top-12 z-30 grid w-64 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="focus-ring rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
                router.replace('/login');
              }}
              className="focus-ring rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Salir
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
