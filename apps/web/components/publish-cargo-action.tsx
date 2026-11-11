'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from './session';

export function PublishCargoAction({ className }: { className: string }) {
  const { user } = useSession();
  if (user && user.role !== 'CLIENT') return null;
  const href = user ? '/publicar-carga' : '/registro?rol=CLIENT';
  return (
    <Link href={href} className={className}>
      <Plus className="h-5 w-5" /> {user ? 'Publicar carga' : 'Crear cuenta de empresa'}
    </Link>
  );
}
