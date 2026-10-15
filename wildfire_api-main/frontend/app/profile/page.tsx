"use client"

import React from 'react'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  )
}

function ProfileContent() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) return null

  const displayName = user.displayName || 'Unnamed User'
  const email = user.email || 'No email'

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-10" style={{ background: 'radial-gradient(ellipse at center, var(--gradient-start) 0%, var(--gradient-25) 25%, var(--gradient-50) 50%, var(--gradient-75) 75%, var(--gradient-end) 100%)' }}>
      <div className="w-full max-w-xl">
        <div className="backdrop-blur-sm border border-teal-800 rounded-2xl shadow-lg p-6 sm:p-8 bg-[#164235]/80">
          {/* Header */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 rounded-md border border-teal-700 bg-teal-900/60 px-3 py-2 text-sm text-zinc-200 hover:bg-teal-800/60 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          </div>

          {/* Info Blocks */}
          <div className="space-y-4">
            <div className="rounded-lg border border-teal-800 bg-teal-950/50 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Username</div>
              <div className="text-sm text-white">{displayName}</div>
            </div>
            <div className="rounded-lg border border-teal-800 bg-teal-950/50 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Email</div>
              <div className="text-sm text-white break-all">{email}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
