'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

export function useVehicleGps({
  vehicleId,
  token,
  allowed,
  onSaved,
}: {
  vehicleId: string;
  token: string | null;
  allowed: boolean;
  onSaved: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  useEffect(() => {
    if (!sharing || !allowed || !token) return;
    if (!navigator.geolocation) {
      setMessage(
        'Este navegador no dispone de GPS. Puedes seguir actualizando los estados del viaje.',
      );
      setError(true);
      setSharing(false);
      return;
    }
    let disposed = false,
      sending = false,
      lastSent = 0;
    const controller = new AbortController();
    setError(false);
    setMessage('Buscando la ubicación de este dispositivo…');
    const watch = navigator.geolocation.watchPosition(
      async (position) => {
        if (disposed || sending || Date.now() - lastSent < 30000) return;
        sending = true;
        try {
          await apiFetch(`/vehicles/${vehicleId}`, {
            token,
            method: 'PATCH',
            signal: controller.signal,
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (disposed) return;
          lastSent = Date.now();
          setError(false);
          setMessage(
            `Ubicación enviada a las ${new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}.`,
          );
          onSavedRef.current();
        } catch {
          if (!disposed) {
            setError(true);
            setMessage(
              'No se pudo enviar la ubicación. Reintentaremos con la próxima lectura del GPS.',
            );
          }
        } finally {
          sending = false;
        }
      },
      (failure) => {
        if (disposed) return;
        setError(true);
        setMessage(
          failure.code === 1
            ? 'Permiso de ubicación denegado. Habilítalo en el navegador para compartir GPS.'
            : 'No hay señal GPS disponible. Puedes detener y volver a activar la ubicación.',
        );
        if (failure.code === 1) setSharing(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
    return () => {
      disposed = true;
      controller.abort();
      navigator.geolocation.clearWatch(watch);
    };
  }, [sharing, allowed, token, vehicleId]);
  useEffect(() => {
    if (!allowed) {
      setSharing(false);
      setMessage('');
      setError(false);
    }
  }, [allowed]);
  return {
    sharing: sharing && allowed,
    message,
    error,
    toggle: () => {
      setError(false);
      setSharing((value) => !value);
    },
  };
}
