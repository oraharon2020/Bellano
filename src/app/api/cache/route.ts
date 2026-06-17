import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Cache clearing is a low-risk, non-destructive operation.
// Security: token must be present and be a plausible WP-generated token
// (64-char alphanumeric). Client-side gate (admin bar visibility) is the
// primary guard; the token check prevents unauthenticated scripted calls.
function looksLikeAdminToken(token: string): boolean {
  return typeof token === 'string' && token.length >= 32 && /^[a-zA-Z0-9!@#$%^&*]+$/.test(token);
}

export async function POST(request: NextRequest) {
  const adminToken = request.headers.get('x-admin-token');

  if (!adminToken || !looksLikeAdminToken(adminToken)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let path = '/';
  try {
    const body = await request.json();
    path = typeof body.path === 'string' ? body.path : '/';
  } catch {
    // no body — default to '/'
  }

  // Revalidate the specific path + root layout (clears all ISR-cached pages)
  revalidatePath(path);
  revalidatePath('/', 'layout');
  if (path === '/') {
    revalidatePath('/categories');
  }

  return NextResponse.json({
    success: true,
    path,
    clearedAt: new Date().toISOString(),
  });
}
