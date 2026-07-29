import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Personal Mission Control OS',
    template: '%s · Mission Control',
  },
  description:
    'A personal operations system for daily priorities, calendar-aware planning, and missed-task recovery.',
  applicationName: 'Personal Mission Control OS',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
