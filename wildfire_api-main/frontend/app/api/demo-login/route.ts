import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Checks demo credentials server-side so they never reach the browser bundle.
// Only active when NEXT_PUBLIC_DEMO_MODE=true and DEMO_EMAIL / DEMO_PASSWORD are set.
export async function POST(request: NextRequest) {
  const expectedEmail = process.env.DEMO_EMAIL;
  const expectedPassword = process.env.DEMO_PASSWORD;

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || !expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: 'Demo sign-in is not enabled' }, { status: 404 });
  }

  const { email, password } = await request.json().catch(() => ({}));
  const emailMatches = typeof email === 'string' && email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  if (!emailMatches || password !== expectedPassword) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  return NextResponse.json({ email: expectedEmail });
}
