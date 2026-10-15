"use client"

import React, { useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-300">
        <div className="animate-pulse text-sm">Checking authentication…</div>
      </div>
    )
  }

  if (!user) {
    // Redirect to dedicated auth route
    try {
      router.replace('/auth')
    } catch {}
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-300">
        <div className="animate-pulse text-sm">Redirecting to sign in…</div>
      </div>
    )
  }

  return <>{children}</>
}
