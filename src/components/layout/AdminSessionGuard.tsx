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
  const { isAdmin, adminToken, logout, openLoginModal } = useAdminStore();
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
        // Ignore a stale result: if the user re-logged in meanwhile, the active
        // token will have changed — never log out the fresh session.
        const currentToken = useAdminStore.getState().adminToken;
        if (
          !cancelled &&
          currentToken === adminToken &&
          d &&
          d.isAdmin === false
        ) {
          logout();
          // Re-prompt login instead of a blocking error alert.
          openLoginModal();
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
  }, [isAdmin, adminToken, logout, openLoginModal]);

  return null;
}
