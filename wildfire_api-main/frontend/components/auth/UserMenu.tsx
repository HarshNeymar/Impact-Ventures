"use client"

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebaseClient'
import { useAuth } from './AuthProvider'
import { DEMO_MODE, demoSignOut } from '@/lib/demoAuth'
import { User as UserIcon, LogOut } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function UserMenu() {
  const { user } = useAuth()
  const router = useRouter()
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false)

  const initials = React.useMemo(() => {
    const source = (user?.email || user?.displayName || '').trim()
    if (!source) return ''

    const base = source.includes('@') ? source.split('@')[0] : source
    const parts = base.split(/[._\-\s]+/).filter(Boolean)

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }

    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase()
    }

    return parts[0]?.[0]?.toUpperCase() || ''
  }, [user?.displayName, user?.email])

  React.useEffect(() => {
    setAvatarLoadFailed(false)
  }, [user?.photoURL])

  if (!user) return null

  const handleLogout = async () => {
    try {
      if (DEMO_MODE) {
        demoSignOut()
        return
      }
      await signOut(auth)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to logout', e)
    }
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          title={user.displayName || 'Account'}
          aria-label="Account menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-600 p-0 shadow-md transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          {user.photoURL && !avatarLoadFailed ? (
            <Image
              src={user.photoURL}
              alt={user.displayName || 'Profile'}
              width={36}
              height={36}
              className="h-full w-full object-cover"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : initials ? (
            <span className="flex h-full w-full items-center justify-center text-[15px] font-semibold tracking-wide text-white">
              {initials}
            </span>
          ) : (
            <UserIcon className="h-5 w-5 text-white" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="z-[200] min-w-[180px] rounded-xl border border-zinc-200/30 bg-white/95 backdrop-blur-md text-zinc-900 shadow-lg dark:bg-zinc-900/95 dark:text-white dark:border-zinc-800 p-1"
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault()
              handleProfile()
            }}
            className="group flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
          >
            <UserIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault()
              handleLogout()
            }}
            className="group flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
          >
            <LogOut className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
