import { Check, Clock3, PackageCheck, Truck, XCircle } from 'lucide-react';
import type { Trip } from '../lib/models';
import { getTripProgress, tripDate, tripStatusLabel } from '../lib/tracking';

export function TripTimeline({ trip }: { trip: Trip }) {
  return (
    <section className="trip-surface p-5 sm:p-6" aria-label="Progreso de la entrega">
      <div className="mb-6 flex items-center gap-2">
        <PackageCheck className="h-5 w-5 text-blue-600" />
        <h2 className="font-bold text-slate-900">Cada etapa, a la vista</h2>
      </div>
      {trip.status === 'CANCELLED' && (
        <p className="mb-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="h-4 w-4 shrink-0" />
          El viaje fue cancelado. Se muestran únicamente las etapas registradas.
        </p>
      )}
      <ol className="trip-timeline">
        {getTripProgress(trip).map((step) => (
          <li
            key={step.status}
            className={`trip-timeline-step ${step.reached ? 'is-reached' : ''} ${step.current ? 'is-current' : ''}`}
            aria-current={step.current ? 'step' : undefined}
          >
            <span className="trip-timeline-dot" aria-hidden="true">
              {step.current && step.status === 'IN_TRANSIT' ? (
                <Truck className="h-4 w-4" />
              ) : step.reached ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              )}
            </span>
            <div className="min-w-0 pb-7">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-sm font-semibold ${step.reached ? 'text-slate-900' : 'text-slate-500'}`}
                >
                  {step.label}
                </h3>
                {step.current && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    {step.status === 'COMPLETED' ? 'Finalizado' : 'Ahora'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
              {step.reached && (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {step.event ? (
                    <time dateTime={step.event.createdAt}>{tripDate(step.event.createdAt)}</time>
                  ) : (
                    'Sin hora registrada'
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function TripHistory({ trip }: { trip: Trip }) {
  const events = [...trip.history].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  return (
    <section className="trip-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-blue-600" />
        <h2 className="font-bold text-slate-900">Actividad del viaje</h2>
      </div>
      {!events.length && (
        <p className="text-sm text-slate-500">Todavía no hay actualizaciones registradas.</p>
      )}
      <ol className="divide-y divide-slate-100">
        {events.map((event) => (
          <li key={event.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {tripStatusLabel(event.status)}
              </p>
              <time dateTime={event.createdAt} className="text-xs text-slate-500">
                {tripDate(event.createdAt)}
              </time>
            </div>
            {event.note && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                {event.note}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
