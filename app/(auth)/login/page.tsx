import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '../auth-form';
import { signInAction } from '../actions';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if ((await getCurrentUser()) !== null) redirect('/today');

  return (
    <>
      <AuthForm
        mode="signin"
        action={signInAction}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
      />
      <p className="mt-4 text-center text-sm text-text-muted">
        No account yet?{' '}
        <Link href="/signup" className="font-medium text-accent underline underline-offset-2">
          Create one
        </Link>
      </p>
    </>
  );
}
