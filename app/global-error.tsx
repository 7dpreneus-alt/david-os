'use client';

import { useEffect } from 'react';

/**
 * Root error boundary. Shows a truthful failure state and a real retry; it
 * never renders a partial page as if it had succeeded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the class and digest only; the message may contain user content.
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'unhandled_client_error',
        errorClass: error.name,
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Mission Control could not load this page
          </h1>
          <p style={{ marginTop: '0.5rem', lineHeight: 1.5 }}>
            The error was recorded. Your data was not changed by this failure.
          </p>
          {error.digest !== undefined && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.25rem',
              minHeight: '2.75rem',
              padding: '0 1rem',
              borderRadius: '0.375rem',
              border: '1px solid currentColor',
              background: 'transparent',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
