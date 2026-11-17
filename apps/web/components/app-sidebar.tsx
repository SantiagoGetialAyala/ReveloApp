'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  Home,
  Map,
  Settings,
  Truck,
} from 'lucide-react';
import { useSession } from './session';

export function AppSidebar() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!user || pathname === '/') return null;

  const links = [
    { href: '/dashboard', label: 'Inicio', Icon: Home },
    { href: '/cargas', label: user.role === 'CLIENT' ? 'Mis cargas' : 'Cargas', Icon: Map },
    { href: '/dashboard#viajes-activos', label: 'Mis viajes', Icon: Truck },
    ...(user.role === 'TRANSPORTER'
      ? [{ href: '/dashboard#viajes-completados', label: 'Ganancias', Icon: ChartNoAxesColumn }]
      : []),
    { href: '/notificaciones', label: 'Mensajes y alertas', Icon: Bell },
    ...(user.role === 'CLIENT'
      ? [{ href: '/publicar-carga', label: 'Publicar carga', Icon: BriefcaseBusiness }]
      : []),
    { href: '/perfil', label: 'Configuración', Icon: Settings },
  ];

  return (
    <aside className="workspace-sidebar" aria-label="Navegación de Revelo">
      <p className="workspace-sidebar-label">MENÚ</p>
      <nav className="grid gap-1">
        {links.map(({ href, label, Icon }) => {
          const active = !href.includes('#') && pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`workspace-sidebar-link ${active ? 'is-active' : ''}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="workspace-sidebar-account">
        <span className="workspace-sidebar-avatar" aria-hidden="true">
          {(user.email?.[0] ?? 'R').toUpperCase()}
        </span>
        <span className="min-w-0">
          <strong className="block truncate">{user.email}</strong>
          <span className="block text-xs text-slate-500">
            {user.role === 'CLIENT'
              ? 'Empresa'
              : user.role === 'ADMIN'
                ? 'Administrador'
                : 'Transportador'}
          </span>
        </span>
      </div>
    </aside>
  );
}
