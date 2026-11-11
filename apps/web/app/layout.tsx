import type { Metadata } from 'next';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { SessionProvider, AccountNav } from '../components/session';
import { NotificationIndicator } from '../components/notification-indicator';
import { MobileNavigation } from '../components/mobile-navigation';
import { ReveloLogo } from '../components/revelo-logo';
import { DesktopNavigation } from '../components/desktop-navigation';

export const metadata: Metadata = {
  title: 'Revelo Transporte',
  description: 'Marketplace de transporte de cargas terrestres en Colombia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <header className="site-header sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="site-brand-link" aria-label="Revelo Transporte, inicio">
                <ReveloLogo />
              </Link>
              <DesktopNavigation />
              <div className="flex items-center gap-2">
                <MobileNavigation />
                <NotificationIndicator />
                <AccountNav />
              </div>
            </nav>
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
