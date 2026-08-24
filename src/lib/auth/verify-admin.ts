import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

export interface AdminIdentity {
  userId: number;
  userName: string;
}

/**
 * Server-side admin-token verification, for route handlers that write to
 * WordPress or return data customers must never see.
 *
 * This deliberately fails CLOSED, which is the opposite of what
 * /api/auth/check-admin does. That endpoint answers "should the UI keep showing
 * an admin session?", so it treats an unreachable WordPress as "keep the
 * session" — otherwise one WAF hiccup logs the whole team out. Here the question
 * is "may this caller change the site?" and the only safe answer when
 * verification cannot be completed is no.
 */
export async function verifyAdminToken(
  token: string | null | undefined
): Promise<AdminIdentity | null> {
  if (!token) return null;

  try {
    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/verify-admin-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Browser-like UA so the WAF does not block this server-to-server call,
        // matching /api/auth/check-admin.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.valid) return null;

    return { userId: data.userId, userName: data.userName };
  } catch {
    return null;
  }
}
