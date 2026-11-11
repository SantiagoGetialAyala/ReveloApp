'use client';
import { useEffect, useRef, useState } from 'react';
import { bodyTypes, vehicleTypes } from '../lib/catalogs';
import { Colombia, PlaceFields, useColombia } from './form-fields';
export type Coordinates = { latitude: number; longitude: number };
export function nearestPlace(data: Colombia, latitude: number, longitude: number) {
  return Object.entries(data)
    .flatMap(([department, cities]) => cities.map((city) => ({ department, city })))
    .sort(
      (a, b) =>
        (a.city.lat - latitude) ** 2 +
        ((a.city.lng - longitude) * Math.cos((latitude * Math.PI) / 180)) ** 2 -
        ((b.city.lat - latitude) ** 2 +
          ((b.city.lng - longitude) * Math.cos((latitude * Math.PI) / 180)) ** 2),
    )[0];
}
export function VehicleFields() {
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState(
    'Puedes usar tu ubicación actual o seleccionar tu municipio.',
  );
  const [photo, setPhoto] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [ownershipDocument, setOwnershipDocument] = useState('');
  const [ownershipDocumentName, setOwnershipDocumentName] = useState('');
  const [ownershipError, setOwnershipError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const ownershipInput = useRef<HTMLInputElement>(null);
  const { data } = useColombia();
  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) {
      setStatus('Tu navegador no permite geolocalización. Selecciona el municipio.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        const place = nearestPlace(data, p.coords.latitude, p.coords.longitude);
        if (place) {
          setDepartment(place.department);
          setCity(place.city.name);
        }
        setStatus('Ubicación actualizada. El municipio se aproxima a tu posición GPS.');
      },
      () => {
        setStatus(
          'No pudimos acceder al GPS. Revisa los permisos o elige el municipio manualmente.',
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking, data]);
  return (
    <fieldset className="mt-6 border-t pt-6">
      <legend className="text-xl font-bold">Tu vehículo</legend>
      <p className="mb-4 text-sm text-slate-600">
        Registra el camión con el que te postularás a las cargas.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field">
          Placa
          <input className="input uppercase" name="plate" required maxLength={8} />
        </label>
        <label className="field">
          Marca
          <input className="input" name="brand" required />
        </label>
        <label className="field">
          Modelo / línea
          <input className="input" name="model" required placeholder="Ej. NPR, NHR, FTR" />
        </label>
        <label className="field">
          Año
          <input
            className="input"
            name="year"
            type="number"
            min="1950"
            max={new Date().getFullYear() + 1}
            required
          />
        </label>
        <label className="field">
          Tipo de camión
          <select className="input" name="vehicleType">
            {Object.entries(vehicleTypes).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Carrocería
          <select className="input" name="bodyType">
            {Object.entries(bodyTypes).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Capacidad máxima (toneladas)
          <input
            className="input"
            name="capacityTon"
            type="number"
            min="0.001"
            step="0.001"
            required
            placeholder="Ej. 3.5"
          />
        </label>
        <div className="field" role="group" aria-labelledby="vehicle-photo-label">
          <span id="vehicle-photo-label">Foto del camión</span>
          <p id="vehicle-photo-help" className="text-xs font-normal text-slate-500">
            JPG, PNG o WebP · máximo 500 KB
          </p>
          <input
            ref={photoInput}
            className="sr-only"
            id="vehicle-photo"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            aria-labelledby="vehicle-photo-label"
            aria-describedby="vehicle-photo-help"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPhoto('');
              setPhotoName('');
              setPhotoError('');
              if (!file) return;
              if (
                file.size > 500000 ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
              ) {
                setPhotoError('Elige una imagen JPG, PNG o WebP de hasta 500 KB.');
                e.target.value = '';
                return;
              }
              setPhotoName(file.name);
              const reader = new FileReader();
              reader.onload = () => setPhoto(String(reader.result));
              reader.onerror = () => {
                setPhotoError('No pudimos leer el archivo. Prueba con otra imagen.');
                setPhotoName('');
                e.target.value = '';
              };
              reader.readAsDataURL(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-500 hover:bg-blue-50"
              type="button"
              aria-describedby="vehicle-photo-help"
              onClick={() => photoInput.current?.click()}
            >
              Seleccionar archivo
            </button>
            <span className="break-all text-sm font-normal text-slate-600" aria-live="polite">
              {photoName || 'Ningún archivo seleccionado'}
            </span>
          </div>
        </div>
        {photoError && (
          <p role="alert" className="text-red-700">
            {photoError}
          </p>
        )}
        <div className="field md:col-span-2" role="group" aria-labelledby="ownership-document-label">
          <span id="ownership-document-label">Tarjeta de propiedad</span>
          <p className="text-xs font-normal text-slate-500">PDF o imagen · máximo 2 MB</p>
          <input
            ref={ownershipInput}
            className="sr-only"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setOwnershipDocument('');
              setOwnershipDocumentName('');
              setOwnershipError('');
              if (!file) return;
              if (file.size > 2_000_000 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setOwnershipError('Elige un PDF o imagen de hasta 2 MB.');
                event.target.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setOwnershipDocument(String(reader.result));
                setOwnershipDocumentName(file.name);
              };
              reader.onerror = () => setOwnershipError('No pudimos leer el documento.');
              reader.readAsDataURL(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-500 hover:bg-blue-50" type="button" onClick={() => ownershipInput.current?.click()}>
              Adjuntar tarjeta
            </button>
            <span className="break-all text-sm font-normal text-slate-600" aria-live="polite">
              {ownershipDocumentName || 'Ningún archivo seleccionado'}
            </span>
          </div>
          {ownershipError && <p role="alert" className="text-sm text-red-700">{ownershipError}</p>}
        </div>
        {photo && (
          <img
            src={photo}
            alt="Vista previa del camión"
            className="h-36 rounded-md object-contain"
          />
        )}
        <PlaceFields
          prefix="operating"
          label="de ubicación"
          department={department}
          city={city}
          onChange={(d, c) => {
            setDepartment(d);
            setCity(c);
            setCoords(null);
            setTracking(false);
          }}
        />
        <div className="md:col-span-2">
          <button
            className="rounded-md border px-4 py-2 text-primary"
            type="button"
            onClick={() => setTracking(!tracking)}
          >
            {tracking ? 'Detener GPS' : 'Usar mi ubicación actual'}
          </button>
          <p className="mt-2 text-sm text-slate-600" role="status">
            {status}
          </p>
        </div>
      </div>
      <input type="hidden" name="photo" value={photo} />
      <input type="hidden" name="ownershipDocumentData" value={ownershipDocument} />
      <input type="hidden" name="ownershipDocumentName" value={ownershipDocumentName} />
      <input type="hidden" name="latitude" value={coords?.latitude ?? ''} />
      <input type="hidden" name="longitude" value={coords?.longitude ?? ''} />
    </fieldset>
  );
}
export function vehiclePayload(f: FormData) {
  return {
    plate: String(f.get('plate')).trim(),
    brand: String(f.get('brand')).trim(),
    model: String(f.get('model')).trim(),
    year: Number(f.get('year')),
    vehicleType: f.get('vehicleType'),
    bodyType: f.get('bodyType'),
    maxWeightKg: Number(f.get('capacityTon')) * 1000,
    operatingCity: `${f.get('operatingCity')}, ${f.get('operatingDepartment')}`,
    photos: f.get('photo') ? [f.get('photo')] : [],
    ownershipDocumentData: f.get('ownershipDocumentData') || undefined,
    ownershipDocumentName: f.get('ownershipDocumentName') || undefined,
    ...(f.get('latitude')
      ? { latitude: Number(f.get('latitude')), longitude: Number(f.get('longitude')) }
      : {}),
  };
}
