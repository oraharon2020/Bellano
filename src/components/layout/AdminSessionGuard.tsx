'use client';

import { useEffect, useRef } from 'react';
import { useAdminStore } from '@/lib/store/admin';

/**
 * Global admin-session guard. When an admin token expires server-side the
 * client would otherwise keep thinking it is logged in and every admin action
 * fails silently. This verifies the token on mount and whenever the tab regains
 * focus, and logs the admin out (with a heads-up) the moment it is no longer
 * valid — so the UI always reflects reality across every admin feature.
 */
export function AdminSessionGuard() {
  const { isAdmin, adminToken, logout } = useAdminStore();
  const checking = useRef(false);

  useEffect(() => {
    if (!isAdmin || !adminToken) return;
    let cancelled = false;

    const verify = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const res = await fetch('/api/auth/check-admin', {
          headers: { 'x-admin-token': adminToken },
          cache: 'no-store',
        });
        const d = await res.json().catch(() => ({}));
        // Only log out on an explicit negative — never on a transient network error.
        if (!cancelled && d && d.isAdmin === false) {
          logout();
          alert('החיבור כמנהל פג — התחברו מחדש כדי להמשיך לנהל.');
        }
      } catch {
        /* transient error — keep the session */
      } finally {
        checking.current = false;
      }
    };

    verify();
    const onFocus = () => verify();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin, adminToken, logout]);

  return null;
}
