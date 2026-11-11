'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from './button';
import { apiFetch } from '../lib/api';

type Review = {
  id: string;
  authorId: string;
  recipientId: string;
  score: number;
  comment?: string | null;
  createdAt: string;
};
export function TripReviews({
  tripId,
  token,
  userId,
}: {
  tripId: string;
  token: string | null;
  userId: string;
}) {
  const [items, setItems] = useState<Review[]>([]);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await apiFetch<Review[]>(`/trips/${tripId}/reviews`, { token }));
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, [token, tripId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/trips/${tripId}/reviews`, {
        token,
        method: 'POST',
        body: JSON.stringify({ score, ...(comment.trim() ? { comment: comment.trim() } : {}) }),
      });
      setComment('');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ownReview = items.find((review) => review.authorId === userId);
  const partnerReview = items.find((review) => review.recipientId === userId);
  return (
    <section className="trip-surface p-5 sm:p-6" aria-label="Calificaciones del viaje">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
        <h2 className="font-bold text-slate-900">Califica la operación</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Solo puedes calificar este viaje una vez, después de que se completó.
      </p>
      {ownReview ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="font-semibold">
            Tu calificación: {'★'.repeat(ownReview.score)}
            {'☆'.repeat(5 - ownReview.score)}
          </p>
          {ownReview.comment && <p className="mt-2 text-sm text-slate-600">{ownReview.comment}</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Puntuación</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  aria-label={`${value} de 5 estrellas`}
                  aria-pressed={score === value}
                  className="focus-ring rounded p-1 text-2xl text-amber-500"
                >
                  {value <= score ? '★' : '☆'}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Comentario opcional
            <textarea
              className="input min-h-16 resize-y"
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Cuéntale a la otra parte cómo fue la operación…"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button disabled={busy}>{busy ? 'Guardando…' : 'Enviar calificación'}</Button>
        </form>
      )}
      {partnerReview && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold">
            Calificación que recibiste: {'★'.repeat(partnerReview.score)}
            {'☆'.repeat(5 - partnerReview.score)}
          </p>
          {partnerReview.comment && (
            <p className="mt-2 text-sm text-slate-600">{partnerReview.comment}</p>
          )}
        </div>
      )}
    </section>
  );
}
