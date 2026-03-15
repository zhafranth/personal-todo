export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-8">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personal Todo</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          Organize your tasks, set reminders,<br />and stay on top of your day.
        </p>
      </div>

      <a
        href="/api/v1/auth/google/login"
        className="flex w-full max-w-xs items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-700 shadow-sm transition-all active:scale-[0.98] active:shadow-none"
      >
        <svg viewBox="0 0 24 24" className="size-5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign in with Google
      </a>

      <p className="mt-8 text-xs text-slate-400">
        Your data stays private and secure.
      </p>
    </div>
  )
}
