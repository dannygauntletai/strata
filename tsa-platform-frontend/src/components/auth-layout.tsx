import type React from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex grow items-center justify-center">
        {children}
      </div>
    </main>
  )
}
