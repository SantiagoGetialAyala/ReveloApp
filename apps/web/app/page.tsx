import {
  ArrowRight,
  Building2,
  Handshake,
  MapPinned,
  PackageCheck,
  Search,
  Timer,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PublishCargoAction } from '../components/publish-cargo-action';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-stage">
          <div className="home-landscape" aria-hidden="true" />
          <svg
            className="home-route-overlay"
            viewBox="0 0 1200 650"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="home-route-glow"
              d="M435 410 C515 367 556 340 601 326 S661 277 703 261 776 232 829 213 906 153 963 133 1026 95 1085 86"
            />
            <path
              className="home-map-route"
              d="M435 410 C515 367 556 340 601 326 S661 277 703 261 776 232 829 213 906 153 963 133 1026 95 1085 86"
            />
          </svg>
          <div className="home-city-label home-city-pasto">
            <span />
            Pasto
          </div>
          <div className="home-city-label home-city-cali">
            <span />
            Cali
          </div>
          <div className="home-copy">
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot" /> Logística terrestre en Colombia
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.5rem]">
              Tu carga.
              <br />
              Tu ruta.
              <br />
              <span className="text-blue-600">Tu mejor trato.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              Publica tu carga, recibe ofertas y elige con quién viajar.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PublishCargoAction className="focus-ring home-primary-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white" />
              <Link
                href="/cargas"
                className="focus-ring home-secondary-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-5 font-semibold text-primary"
              >
                <Search className="h-5 w-5" /> Buscar cargas
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm">
              <span className="mr-1 text-slate-600">Soy:</span>
              <Link className="home-role-pill home-role-pill-company" href="/registro?rol=CLIENT">
                <Building2 size={16} /> Empresa
              </Link>
              <Link className="home-role-pill" href="/registro?rol=TRANSPORTER">
                <Truck size={17} /> Transportador
              </Link>
            </div>
          </div>
          <div className="home-truck-scene" aria-hidden="true">
            <Image
              src="/images/revelo-truck-cutout.webp"
              alt=""
              width={1665}
              height={945}
              priority
              className="home-hero-truck"
            />
          </div>
          <article className="home-cargo-preview" aria-label="Ejemplo ilustrativo de carga">
            <span className="home-preview-icon">☕</span>
            <div className="min-w-0 flex-1">
              <span className="home-preview-label">EJEMPLO ILUSTRATIVO</span>
              <h2>
                Pasto <ArrowRight size={16} /> Cali
              </h2>
              <p>Café en sacos · 5 t</p>
            </div>
            <strong>$1.200.000</strong>
          </article>
        </div>
      </section>
      <section className="home-benefits border-t border-slate-200/80 py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {[
            [
              Timer,
              'Publica en minutos',
              'Registra el origen, destino y los detalles de tu mercancía.',
            ],
            [
              Handshake,
              'Negocia el precio',
              'Recibe propuestas y acuerda la tarifa con el transportador.',
            ],
            [
              MapPinned,
              'Sigue tu viaje',
              'Consulta el estado y recorrido del viaje durante el transporte.',
            ],
          ].map(([Icon, title, text]) => (
            <div key={String(title)} className="home-benefit-card">
              <span className="home-benefit-icon">
                <Icon className="h-5 w-5 text-blue-700" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">{String(title)}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{String(text)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="como-funciona" className="home-how scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <p className="home-how-eyebrow">Un proceso claro para cada lado</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Dos caminos. Un viaje acordado.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Revelo conecta la publicación de mercancía con las propuestas de transportadores.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="home-how-card">
              <div className="home-how-icon">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-700">
                  Para empresas y personas
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">Publica una carga</h3>
                <ol className="home-how-steps">
                  <li>
                    <span>01</span> Describe la mercancía y sus condiciones.
                  </li>
                  <li>
                    <span>02</span> Define origen, destino y recogida.
                  </li>
                  <li>
                    <span>03</span> Revisa las propuestas y acuerda el viaje.
                  </li>
                </ol>
                <Link href="/registro?rol=CLIENT" className="home-how-link">
                  Crear cuenta para publicar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
            <article className="home-how-card home-how-card-transporter">
              <div className="home-how-icon">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-emerald-700">
                  Para transportadores
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">Encuentra tu próxima ruta</h3>
                <ol className="home-how-steps">
                  <li>
                    <span>01</span> Registra tu vehículo y capacidad.
                  </li>
                  <li>
                    <span>02</span> Explora cargas por ruta y vehículo.
                  </li>
                  <li>
                    <span>03</span> Envía una propuesta desde el detalle.
                  </li>
                </ol>
                <Link
                  href="/registro?rol=TRANSPORTER"
                  className="home-how-link home-how-link-green"
                >
                  Crear cuenta de transportador <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
