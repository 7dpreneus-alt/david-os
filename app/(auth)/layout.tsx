export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <main id="main" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Mission Control
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Personal Mission Control OS
          </h1>
        </div>
        {children}
      </main>
    </div>
  );
}
