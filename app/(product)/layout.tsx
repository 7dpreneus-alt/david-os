import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppNav, MobileNav } from '@/components/app-nav';
import { signOutAction } from '../(auth)/actions';

/**
 * Protected shell. Every product route renders inside it, and every one of them
 * is behind this single authentication check. Unauthenticated visitors are
 * redirected to /login before any data query runs.
 */
export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user === null) redirect('/login');

  return (
    <div className="min-h-dvh md:flex">
      <AppNav
        userEmail={user.email}
        displayName={user.displayName}
        signOutAction={signOutAction}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
