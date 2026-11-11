'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/button';
import { ErrorMessage } from '../../components/form-fields';
import { VehicleFields, vehiclePayload } from '../../components/vehicle-fields';
import { apiFetch } from '../../lib/api';

type VerificationFile = { type: string; fileName: string; mimeType: string; dataUrl: string };
const documentTypes = [
  ['ID_CARD', 'Cédula de ciudadanía', 'Documento de identidad por ambas caras, si aplica.'],
  ['CRIMINAL_RECORD', 'Antecedentes judiciales', 'Certificado reciente en PDF o imagen.'],
] as const;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RegisterPage() {
  const [role, setRole] = useState('CLIENT');
  const [accountType, setAccountType] = useState('BUSINESS');
  const [documents, setDocuments] = useState<Record<string, VerificationFile>>({});
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('rol') === 'TRANSPORTER')
      setRole('TRANSPORTER');
  }, []);

  async function chooseDocument(event: ChangeEvent<HTMLInputElement>, type: string) {
    const file = event.target.files?.[0];
    setFileError('');
    if (!file) return;
    if (
      file.size > 2_000_000 ||
      !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setFileError('Cada documento debe ser PDF o imagen de máximo 2 MB.');
      event.target.value = '';
      return;
    }
    try {
      const dataUrl = await readFile(file);
      setDocuments((old) => ({
        ...old,
        [type]: { type, fileName: file.name, mimeType: file.type, dataUrl },
      }));
    } catch {
      setFileError('No pudimos leer el documento. Prueba con otro archivo.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    if (role === 'TRANSPORTER') {
      if (Object.keys(documents).length !== documentTypes.length) {
        setError('Adjunta la cédula y el certificado de antecedentes judiciales.');
        setBusy(false);
        return;
      }
      if (!form.get('photo') || !form.get('ownershipDocumentData')) {
        setError('Adjunta la foto del vehículo y su tarjeta de propiedad.');
        setBusy(false);
        return;
      }
    }
    if (
      role === 'CLIENT' &&
      accountType === 'BUSINESS' &&
      !String(form.get('taxId') ?? '').trim()
    ) {
      setError('Ingresa el NIT para que podamos validar la empresa.');
      setBusy(false);
      return;
    }
    try {
      await apiFetch<{ status: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          ...(String(form.get('phone') ?? '').trim()
            ? { phone: String(form.get('phone')).replace(/[\s()-]/g, '') }
            : {}),
          displayName: form.get('displayName'),
          role,
          accountType,
          ...(role === 'CLIENT' && accountType === 'BUSINESS' ? { taxId: form.get('taxId') } : {}),
          ...(role === 'TRANSPORTER'
            ? { vehicle: vehiclePayload(form), documents: Object.values(documents) }
            : {}),
        }),
      });
      setSubmitted(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <main className="auth-page mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <section className="auth-panel panel text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={30} />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Solicitud recibida
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Estamos validando tu cuenta</h1>
          <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
            Revisaremos la información y los documentos enviados. Podrás iniciar sesión cuando el
            equipo de Revelo apruebe tu perfil.
          </p>
          <Link
            className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-3 font-semibold text-white"
            href="/login"
          >
            Volver al inicio de sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <form className="auth-panel panel" onSubmit={submit}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Revelo Transporte
        </p>
        <h1 className="mt-2 text-3xl font-bold">Crea tu cuenta</h1>
        <p className="mt-2 text-slate-600">
          Validamos cada perfil antes de habilitar la plataforma.
        </p>
        <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ['CLIENT', 'Publico mercancía'],
            ['TRANSPORTER', 'Transporto mercancía'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={`rounded-xl border-2 p-4 text-left font-semibold transition ${role === value ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {role === 'CLIENT' && (
            <label className="field">
              Tipo de cuenta
              <select
                className="input"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
              >
                <option value="BUSINESS">Empresa</option>
                <option value="PERSON">Persona natural</option>
              </select>
            </label>
          )}
          <label className="field">
            {role === 'CLIENT' && accountType === 'BUSINESS' ? 'Razón social' : 'Nombre completo'}
            <input className="input" name="displayName" required />
          </label>
          {role === 'CLIENT' && accountType === 'BUSINESS' && (
            <label className="field">
              NIT de la empresa
              <input className="input" name="taxId" required inputMode="numeric" />
            </label>
          )}
          <label className="field">
            Correo de contacto
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <label className="field">
            Teléfono de contacto
            <input
              className="input"
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="+57 300 123 4567 (opcional)"
            />
            <span className="text-xs text-slate-500">
              Opcional: escribe 3001234567 o +57 300 123 4567.
            </span>
          </label>
          <label className="field">
            Contraseña (mínimo 8 caracteres)
            <input
              className="input"
              type="password"
              name="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </label>
        </div>
        {role === 'TRANSPORTER' && (
          <>
            <VehicleFields />
            <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 text-blue-700" />
                <div>
                  <h2 className="font-bold text-slate-900">Documentos para validar tu perfil</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Solo el equipo administrador puede consultar estos archivos.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {documentTypes.map(([type, label, hint]) => (
                  <label
                    key={type}
                    className="field rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <FileCheck2 size={17} className="text-blue-700" />
                      {label}
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      {hint} · PDF o imagen hasta 2 MB
                    </span>
                    <input
                      className="input mt-2"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) => void chooseDocument(event, type)}
                      required={!documents[type]}
                    />
                    {documents[type] && (
                      <span className="text-xs font-medium text-emerald-700">
                        Adjunto: {documents[type].fileName}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {fileError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {fileError}
                </p>
              )}
            </section>
          </>
        )}
        <ErrorMessage message={error} />
        <Button className="mt-6" disabled={busy}>
          {busy ? 'Enviando para revisión…' : 'Enviar cuenta para revisión'}
        </Button>
        <p className="mt-4 text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-blue-700 underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
