"use client"

import React from 'react'
import { MaterialProvider } from '@/components/MaterialProvider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'

interface ClientProvidersProps {
  children: React.ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <MaterialProvider>
      <AuthProvider>
        <AuthenticatedLayout>
          {children}
        </AuthenticatedLayout>
      </AuthProvider>
    </MaterialProvider>
  )
}
