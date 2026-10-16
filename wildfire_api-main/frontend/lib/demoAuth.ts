// Demo sign-in for client presentations. Off unless NEXT_PUBLIC_DEMO_MODE=true.
// The email/password are checked server-side (app/api/demo-login) against DEMO_EMAIL and
// DEMO_PASSWORD, so they never ship in the browser bundle. The session itself is only a
// localStorage flag: this is a convenience gate for demos, not real security.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const STORAGE_KEY = 'pyropath-demo-user';
const CHANGE_EVENT = 'pyropath-demo-auth-change';

export interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: null;
}

export function getDemoUser(): DemoUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

export function onDemoUserChange(callback: (user: DemoUser | null) => void): () => void {
  const handler = () => callback(getDemoUser());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export async function demoSignIn(email: string, password: string): Promise<void> {
  const res = await fetch('/api/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Sign-in failed');

  const user: DemoUser = { uid: 'demo-user', email: data.email, displayName: 'Demo User', photoURL: null };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function demoSignOut(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
