'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from './session';

import { apiFetch } from '../lib/api';

export function NotificationIndicator() {
  const { token } = useSession();
  const [count, setCount] = useState(0);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        setCount(0);
        return;
      }
      try {
        const result = await apiFetch<{ count: number }>('/notifications/unread-count', {
          token,
          signal,
        });
        if (!signal?.aborted) setCount(result.count);
      } catch {
        /* The page still provides the full error state if its API is unavailable. */
      }
    },
    [token],
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);
  return (
    <Link
      href="/notificaciones"
      aria-label={`Notificaciones${count ? `, ${count} sin leer` : ''}`}
      className="focus-ring relative inline-grid h-10 w-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-primary"
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
      {count > 0 && (
        <span aria-hidden="true" className="notification-count">
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="sr-only">
        {count ? `${count} notificaciones sin leer` : 'No hay notificaciones sin leer'}
      </span>
    </Link>
  );
}
