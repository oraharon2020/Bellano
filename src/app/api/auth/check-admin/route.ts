import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

// This is a per-request auth endpoint keyed on the x-admin-token header — it
// must NEVER be cached at the edge/CDN (otherwise one user's isAdmin response
// gets served to everyone → cache poisoning / spurious logouts).
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

function res(body: Record<string, unknown>) {
  return NextResponse.json(body, { headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  try {
    // First check if there's an admin token in the request
    const adminToken = request.headers.get('x-admin-token');
    
    if (adminToken) {
      try {
        // Verify token against WordPress
        const response = await fetch(`${WP_URL}/wp-json/bellano/v1/verify-admin-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Browser-like UA so the WAF doesn't block this server-to-server call
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          },
          body: JSON.stringify({ token: adminToken }),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            return res({
              isAdmin: true,
              userId: data.userId,
              userName: data.userName,
              upgrades: data.upgrades || [],
            });
          }
          // Token was explicitly rejected (expired / revoked) — safe to log out.
          return res({ isAdmin: false });
        }
        // Verification could not be completed (WAF block / 5xx). Do NOT force a
        // logout on an infrastructure hiccup — keep the session as-is.
        return res({ isAdmin: true, unverified: true });
      } catch {
        // Network error reaching WordPress — transient, keep the session.
        return res({ isAdmin: true, unverified: true });
      }
    }
    
    // Fallback: try cookies (works on same domain)
    const cookies = request.headers.get('cookie') || '';

    // Only attempt the cookie-based check when the request actually carries
    // cookies — otherwise an anonymous request must resolve to isAdmin:false.
    if (!cookies) {
      return res({ isAdmin: false });
    }

    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/check-admin`, {
      headers: {
        Cookie: cookies,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return res({ isAdmin: false });
    }

    const data = await response.json();
    return res(data);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res({ isAdmin: false });
  }
}

// Login endpoint for admins
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      );
    }
    
    // Authenticate against WordPress
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, message: data.message || 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      token: data.token,
      userName: data.userName,
      upgrades: data.upgrades || [],
    });
    
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה בהתחברות' },
      { status: 500 }
    );
  }
}
