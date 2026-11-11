'use client';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/button';
import { Access, useSession } from '../../components/session';
import { ErrorMessage, MoneyInput, PlaceFields, useColombia } from '../../components/form-fields';
import { LocationPicker, LocationPoint } from '../../components/location-picker';
import { categories, vehicleTypes, bodyTypes, units } from '../../lib/catalogs';
import { apiFetch } from '../../lib/api';
import { matchMunicipality } from '../../lib/location';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
export default function PublishCargoPage() {
  return (
    <Access role="CLIENT">
      <CargoForm />
    </Access>
  );
}
function CargoForm() {
  const { token } = useSession();
  const { data: catalog } = useColombia();
  const [addresses, setAddresses] = useState({ origin: '', destination: '' });
  const router = useRouter();
  const [origin, setOrigin] = useState({ department: '', city: '' });
  const [destination, setDestination] = useState({ department: '', city: '' });
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [delivery, setDelivery] = useState<LocationPoint | null>(null);
  const [unit, setUnit] = useState('KG');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locationWarning, setLocationWarning] = useState('');
  const [step, setStep] = useState(1);
  const [review, setReview] = useState<Record<string, string>>({});
  const usesFractionalQuantity = ['KG', 'LB'].includes(unit);
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  function nextStep() {
    const form = formRef.current;
    if (!form) return;
    const fieldset = form.querySelector<HTMLElement>(`#cargo-0${step}`);
    const fields = fieldset?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input, select, textarea');
    const invalid = Array.from(fields ?? []).find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    if (step === 1) {
      const data = new FormData(form);
      const quantity = Number(data.get('quantity'));
      const factor: Record<string, number> = { KG: 1, LB: 0.45359237, TON: 1000 };
      const weight = factor[unit] ? quantity * factor[unit] : Number(data.get('weightKg'));
      if (!Number.isFinite(weight) || weight < 1) {
        setError('El peso total debe ser de al menos 1 kg.');
        return;
      }
    }
    if (step === 2 && (!pickup?.confirmed || !delivery?.confirmed)) {
      setError('Confirma el origen y destino exactos en el mapa para continuar.');
      return;
    }
    if (step === 3) {
      const data = new FormData(form);
      const factors: Record<string, number> = { KG: 1, LB: 0.45359237, TON: 1000 };
      const reviewWeight = factors[unit]
        ? Number(data.get('quantity')) * factors[unit]
        : Number(data.get('weightKg'));
      const start = new Date(String(data.get('pickupWindowStart')));
      const end = new Date(String(data.get('deliveryDeadline')));
      if (end <= start) {
        setError('La fecha de entrega debe ser posterior a la recogida.');
        return;
      }
      setReview({
        title: String(data.get('title')),
        category: String(data.get('category')),
        quantity: `${String(data.get('quantity'))} ${units[unit]}`,
        weight: `${Math.round(reviewWeight * 100) / 100} kg`,
        origin: `${origin.city}, ${origin.department} · ${addresses.origin}`,
        destination: `${destination.city}, ${destination.department} · ${addresses.destination}`,
        pickup: start.toLocaleString('es-CO'),
        deadline: end.toLocaleString('es-CO'),
        vehicle: vehicleTypes[String(data.get('requiredVehicleType'))] ?? '',
        budget: `${Number(budget).toLocaleString('es-CO')} COP`,
      });
    }
    setError('');
    setStep((current) => Math.min(current + 1, 4));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setError('');
    const f = new FormData(e.currentTarget);
    if (!pickup?.confirmed || !delivery?.confirmed) {
      setError('Confirma la dirección exacta de origen y de destino en el mapa antes de publicar.');
      submitLock.current = false;
      return;
    }
    const quantity = Number(f.get('quantity'));
    const factor: Record<string, number> = { KG: 1, LB: 0.45359237, TON: 1000 };
    const weightKg =
      Math.round((factor[unit] ? quantity * factor[unit] : Number(f.get('weightKg'))) * 100) / 100;
    const start = new Date(String(f.get('pickupWindowStart')));
    const end = new Date(String(f.get('deliveryDeadline')));
    if (end <= start) {
      setError('La fecha de entrega debe ser posterior a la recogida.');
      submitLock.current = false;
      return;
    }
    if (weightKg < 1) {
      setError('El peso total debe ser de al menos 1 kg.');
      submitLock.current = false;
      return;
    }
    setBusy(true);
    try {
      const cargo = await apiFetch<{ id: string }>('/cargos', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          title: f.get('title'),
          description: f.get('description'),
          category: f.get('category'),
          quantity,
          quantityUnit: unit,
          weightKg,
          units: factor[unit] ? 1 : quantity,
          estimatedBudgetCop: Number(budget),
          originDepartment: origin.department,
          originCity: origin.city,
          destinationDepartment: destination.department,
          destinationCity: destination.city,
          pickupAddress: f.get('pickupAddress'),
          deliveryAddress: f.get('deliveryAddress'),
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          deliveryLat: delivery.lat,
          deliveryLng: delivery.lng,
          pickupWindowStart: start.toISOString(),
          deliveryDeadline: end.toISOString(),
          requiredVehicleType: f.get('requiredVehicleType'),
          requiredBodyType: f.get('requiredBodyType'),
          requiredCapacityKg: weightKg,
          negotiable: f.get('negotiable') === 'on',
        }),
      });
      router.push(`/cargas/${cargo.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="publish-page mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
        Revelo · Un nuevo recorrido
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Tu carga, en buenas manos.
      </h1>
      <p className="mt-2 mb-6 text-slate-600">
        Describe tu mercancía y recibe ofertas de transportadores.
      </p>
      <div className="mb-6 grid grid-cols-4 gap-2" aria-label="Pasos del formulario">
        {[
          { number: 1, label: 'Mercancía', Icon: Package },
          { number: 2, label: 'Ruta', Icon: MapPin },
          { number: 3, label: 'Condiciones', Icon: Truck },
          { number: 4, label: 'Revisión', Icon: ClipboardCheck },
        ].map(({ number, label, Icon: StepIcon }) => {
          return (
            <button
              key={number}
              type="button"
              disabled={number > step}
              onClick={() => setStep(number)}
              aria-current={step === number ? 'step' : undefined}
              aria-label={`Paso ${number}: ${label}`}
              className={`focus-ring flex min-h-12 items-center gap-2 rounded-xl border p-2 text-left text-sm font-semibold transition sm:p-3 ${step === number ? 'border-blue-600 bg-blue-50 text-blue-800' : number < step ? 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50' : 'border-slate-200 bg-white text-slate-400'}`}
            >
              <StepIcon className="hidden h-4 w-4 sm:block" />
              <span className="text-xs">0{number}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      <form ref={formRef} noValidate className="panel space-y-8" onSubmit={submit}>
        <fieldset hidden={step !== 1} id="cargo-01" className="publish-step-enter scroll-mt-24">
          <legend className="mb-4 text-xl font-semibold">Mercancía</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              Título
              <input className="input" name="title" required />
            </label>
            <label className="field">
              Categoría
              <select className="input" name="category" required>
                <option value="">Selecciona una categoría</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Cantidad
              <input
                className="input"
                name="quantity"
                type="number"
                min={usesFractionalQuantity ? '0.01' : '1'}
                step={usesFractionalQuantity ? '0.01' : '1'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Unidad
              <select
                className="input"
                value={unit}
                onChange={(e) => {
                  const nextUnit = e.target.value;
                  setUnit(nextUnit);
                  if (!['KG', 'LB'].includes(nextUnit) && quantity) {
                    setQuantity(String(Math.max(1, Math.round(Number(quantity)))));
                  }
                }}
              >
                {Object.entries(units).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {!['KG', 'LB', 'TON'].includes(unit) && (
              <label className="field">
                Peso total de la mercancía (kg)
                <input
                  className="input"
                  name="weightKg"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
                <span className="text-xs text-slate-500">
                  Necesario para elegir un camión con capacidad suficiente.
                </span>
              </label>
            )}
            <label className="field">
              Presupuesto en pesos colombianos (COP)
              <MoneyInput
                name="budget"
                value={budget}
                onChange={setBudget}
                required
                placeholder="500.000"
              />
            </label>
            <label className="field md:col-span-2">
              Descripción
              <textarea className="input min-h-24" name="description" required />
            </label>
          </div>
        </fieldset>
        <fieldset
          hidden={step !== 2}
          id="cargo-02"
          className="publish-step-enter scroll-mt-24 border-t border-slate-100 pt-8"
        >
          <legend className="mb-2 text-xl font-semibold">Define tu recorrido</legend>
          <p className="mb-5 text-sm text-slate-500">
            Elige el municipio como referencia y confirma cada dirección en el mapa.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <PlaceFields
              prefix="origin"
              label="de origen"
              department={origin.department}
              city={origin.city}
              onChange={(d, c, p) => {
                setOrigin({ department: d, city: c });
                setPickup(p ? { lat: p.lat, lng: p.lng, label: `${c}, ${d}` } : null);
              }}
            />
            <PlaceFields
              prefix="destination"
              label="de destino"
              department={destination.department}
              city={destination.city}
              onChange={(d, c, p) => {
                setDestination({ department: d, city: c });
                setDelivery(p ? { lat: p.lat, lng: p.lng, label: `${c}, ${d}` } : null);
              }}
            />
          </div>
          <div className="mt-5">
            <LocationPicker
              origin={pickup}
              destination={delivery}
              addresses={addresses}
              contexts={{
                origin: [origin.city, origin.department].filter(Boolean).join(', '),
                destination: [destination.city, destination.department].filter(Boolean).join(', '),
              }}
              onAddressChange={(kind, value) => {
                setAddresses((current) => ({ ...current, [kind]: value }));
                const setter = kind === 'origin' ? setPickup : setDelivery;
                setter((point) => (point?.confirmed ? { ...point, confirmed: false } : point));
              }}
              onChange={(kind, point) => {
                const place = matchMunicipality(catalog, point);
                if (place) (kind === 'origin' ? setOrigin : setDestination)(place);
                setLocationWarning(
                  place
                    ? ''
                    : 'El mapa no pudo asociar este punto al catálogo de municipios. Verifica manualmente el departamento y municipio antes de publicar.',
                );
                (kind === 'origin' ? setPickup : setDelivery)(point);
              }}
            />
          </div>
          {locationWarning && (
            <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {locationWarning}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Verifica que el departamento y municipio coincidan con cada punto. Si el mapa no
            reconoce el municipio, selecciónalo arriba.
          </p>
        </fieldset>
        <fieldset
          hidden={step !== 3}
          id="cargo-03"
          className="publish-step-enter scroll-mt-24 border-t border-slate-100 pt-8"
        >
          <legend className="mb-4 text-xl font-semibold">Condiciones del viaje</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              Fecha y hora de recogida
              <input className="input" name="pickupWindowStart" type="datetime-local" required />
            </label>
            <label className="field">
              Fecha y hora límite de entrega
              <input className="input" name="deliveryDeadline" type="datetime-local" required />
            </label>
            <label className="field">
              Tipo de vehículo
              <select className="input" name="requiredVehicleType" defaultValue="" required>
                <option value="" disabled>Selecciona el tipo de vehículo</option>
                {Object.entries(vehicleTypes).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Carrocería
              <select className="input" name="requiredBodyType">
                {Object.entries(bodyTypes).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="negotiable" defaultChecked />
              Presupuesto negociable
            </label>
          </div>
        </fieldset>
        <section
          hidden={step !== 4}
          id="cargo-04"
          className="publish-step-enter border-t border-slate-100 pt-8"
        >
          <div className="mb-5 flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold">Revisa los datos antes de publicar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Confirma que mercancía, ruta y condiciones estén correctas.
              </p>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries({
              Mercancía: review.title,
              Categoría: review.category,
              Cantidad: review.quantity,
              Peso: review.weight,
              Origen: review.origin,
              Destino: review.destination,
              Recogida: review.pickup,
              Entrega: review.deadline,
              Vehículo: review.vehicle,
              Presupuesto: review.budget,
            }).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-900">
                  {value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <ErrorMessage message={error} />
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 1 || busy}
            onClick={() => {
              setError('');
              setStep((current) => Math.max(current - 1, 1));
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>
          {step < 4 ? (
            <Button type="button" variant="secondary" onClick={nextStep}>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={busy} variant="secondary">
              {busy ? 'Publicando…' : 'Confirmar y publicar'}
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
