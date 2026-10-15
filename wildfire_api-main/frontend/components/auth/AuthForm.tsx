"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { auth, googleProvider } from '@/lib/firebaseClient'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please enter your full name')
          setLoading(false)
          return
        }
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        try {
          if (credential.user) {
            await updateProfile(credential.user, { displayName: fullName.trim() })
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Account created, but failed to set display name:', e)
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: 'radial-gradient(ellipse at center, var(--gradient-start) 0%, var(--gradient-25) 25%, var(--gradient-50) 50%, var(--gradient-75) 75%, var(--gradient-end) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="border border-teal-800 rounded-xl shadow-xl p-6 sm:p-8 bg-[#164235]/80 backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
              <Image
                src="/PyroPathLogo1.png"
                alt="PyroPath logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-400 mt-1">Sign {isSignUp ? 'up' : 'in'} to continue</p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-md p-3">
              {error}
            </div>
          )}
          {/* SSO first */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white text-zinc-900 hover:bg-zinc-100 transition-colors font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12 c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.328,6.053,28.884,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20 c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.328,6.053,28.884,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c4.798,0,9.19-1.842,12.518-4.834l-5.789-4.873C28.757,35.847,26.486,36.6,24,36.6 c-5.202,0-9.616-3.317-11.283-7.946l-6.54,5.038C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.79,2.231-2.231,4.166-4.072,5.623c0.001-0.001,0.002-0.001,0.003-0.002 l6.589,5.031C36.667,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="px-3 text-xs text-zinc-500">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm text-zinc-300 mb-1">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required={isSignUp}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm text-zinc-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-zinc-300 mb-1">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md bg-teal-600 hover:bg-teal-700 transition-colors text-white font-medium py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-zinc-400">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button className="text-teal-400 hover:underline" onClick={() => setIsSignUp(false)}>
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                New here?{' '}
                <button className="text-teal-400 hover:underline" onClick={() => setIsSignUp(true)}>
                  Create an account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
