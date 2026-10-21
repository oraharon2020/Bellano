'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { dropStaffEvents, isStaffPage, watchStaffMode } from '@/lib/staff-mode';

const noSubscription = () => () => {};
const unknownOnServer = () => true;

/**
 * Vercel Web Analytics and Speed Insights, never on a sales rep's page
 * (src/lib/staff-mode.ts).
 *
 * Whose page it is was decided in <head> before hydration, but the server
 * cannot know it, so the server and the hydrating render draw nothing and the
 * render straight after draws both for a customer — never <Analytics /> first
 * and a check later, by which time its script would be loading. beforeSend
 * covers a customer's page a rep signs in on (until it reloads) and a tab
 * where a rep signs in elsewhere.
 */
export function AnalyticsWrapper() {
  const staffPage = useSyncExternalStore(noSubscription, isStaffPage, unknownOnServer);

  useEffect(() => {
    if (!staffPage) return watchStaffMode();
  }, [staffPage]);

  if (staffPage) return null;

  return (
    <>
      <Analytics beforeSend={dropStaffEvents} />
      <SpeedInsights beforeSend={dropStaffEvents} />
    </>
  );
}
