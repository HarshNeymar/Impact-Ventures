// Firebase client initialization for the browser side
// Uses modular Firebase v10+ API (package firebase ^12.x)

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

// Ensure required env vars exist at runtime (client-safe because they're NEXT_PUBLIC_)
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  // Soft warn instead of throwing to avoid breaking build previews; UI can render a friendly message
  // eslint-disable-next-line no-console
  console.warn('[firebase] Missing NEXT_PUBLIC_ firebase env vars. Auth may not work.')
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export default app
