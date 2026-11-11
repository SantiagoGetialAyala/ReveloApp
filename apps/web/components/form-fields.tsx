'use client';
import { InputHTMLAttributes } from 'react';
import { COLOMBIA_CATALOG } from '@revelo/shared';
export type Municipality = { code: string; name: string; lat: number; lng: number };
export type Colombia = Record<string, Municipality[]>;
export function useColombia() {
  return { data: COLOMBIA_CATALOG as Colombia, error: '' };
}
export function PlaceFields({
  prefix,
  label,
  department,
  city,
  onChange,
}: {
  prefix: string;
  label: string;
  department: string;
  city: string;
  onChange: (department: string, city: string, point?: Municipality) => void;
}) {
  const { data, error } = useColombia();
  return (
    <>
      <label className="field">
        Departamento {label}
        <select
          className="input"
          name={`${prefix}Department`}
          value={department}
          required
          onChange={(e) => onChange(e.target.value, '')}
        >
          <option value="">Selecciona un departamento</option>
          {Object.keys(data)
            .sort((a, b) => a.localeCompare(b, 'es'))
            .map((d) => (
              <option key={d}>{d}</option>
            ))}
        </select>
      </label>
      <label className="field">
        Municipio {label}
        <select
          className="input"
          name={`${prefix}City`}
          value={city}
          disabled={!department}
          required
          onChange={(e) =>
            onChange(
              department,
              e.target.value,
              data[department]?.find((p) => p.name === e.target.value),
            )
          }
        >
          <option value="">
            {department ? 'Selecciona un municipio' : 'Primero elige el departamento'}
          </option>
          {data[department]?.map((p) => (
            <option key={p.code}>{p.name}</option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-red-700 md:col-span-2">
          {error}
        </p>
      )}
    </>
  );
}
export function MoneyInput({
  value,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      {...props}
      className="input"
      inputMode="numeric"
      value={value ? Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 }) : ''}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
    />
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="my-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
      {message}
    </p>
  ) : null;
}
