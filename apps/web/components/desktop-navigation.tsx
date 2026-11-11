'use client';

import Link from 'next/link';
import { useSession } from './session';

export function DesktopNavigation() {
  const { user } = useSession();
  return (
    <div className="site-nav hidden items-center gap-4 text-sm font-medium text-slate-700 md:flex">
      <Link href="/cargas">Explorar cargas</Link>
      <Link href="/dashboard">Dashboard</Link>
      {user?.role === 'CLIENT' && (
        <Link className="site-publish-nav" href="/publicar-carga">
          Publicar carga
        </Link>
      )}
    </div>
  );
}
