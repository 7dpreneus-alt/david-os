import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { AuthForm } from '../auth-form';
import { signUpAction } from '../actions';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignUpPage() {
  if ((await getCurrentUser()) !== null) redirect('/today');

  return (
    <>
      <AuthForm
        mode="signup"
        action={signUpAction}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        starterDataAvailable={serverEnv().FEATURE_STARTER_DATA}
      />
      <p className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}
