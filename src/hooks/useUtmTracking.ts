'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import { siteConfig } from '@/config/site';
import { useAdminStore } from '@/lib/store/admin';
import {
  ARRIVAL_EVENT,
  type AttributionState,
  type Touch,
  arrivalEventData,
  buildTouch,
  classifyTouch,
  isArrival,
  recordTouch,
  sanitizeAttribution,
  stateFromLegacy,
} from '@/lib/attribution';

/** First and last touch, see AttributionState. The rules live in src/lib/attribution.ts. */
const STORAGE_KEY = 'bellano_attribution';

/**
 * The single record this replaced, which only ever held the last tagged
 * arrival and never expired. Read once so a visit already under way when this
 * shipped keeps its click, then removed.
 */
const LEGACY_STORAGE_KEY = 'bellano_utm_params';

/**
 * Set on the first page of a browser session. A later direct page load in the
 * same session is navigation (a reload, a return from the payment page), not
 * an arrival, and must not mint a first touch.
 */
const SESSION_KEY = 'bellano_attribution_session';

function ownHosts(): string[] {
  return [siteConfig.url, siteConfig.wordpressUrl, siteConfig.vercelUrl, window.location.hostname];
}

function parse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readState(): AttributionState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return sanitizeAttribution(parse(stored), ownHosts());

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return {};

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return stateFromLegacy(parse(legacy), ownHosts());
}

/**
 * Tell the shop's own analytics where this arrival came from.
 *
 * Vercel's Web Analytics drain delivers page views without their query
 * string, so without this an ad click reads there as organic search and no
 * campaign is known. One custom event per arrival, built by
 * arrivalEventData (the click KIND and the UTM, never a click id).
 *
 * This runs in UtmTracker's effect, before <Analytics /> has injected its
 * script — and track() called before Vercel's queue exists is dropped without
 * a word. So the queue is set up first, exactly as Vercel's own snippet does
 * for a page that tracks before the script loads; the script sends it once it
 * arrives. For a browser that never loads the script (an ad blocker, say)
 * the event simply goes nowhere. Staff never send one: useUtmTracking returns
 * before it for a browser in sales-rep mode.
 */
function reportArrival(touch: Touch) {
  try {
    if (!window.va) {
      window.va = (event, properties) => {
        (window.vaq = window.vaq || []).push([event, properties]);
      };
    }
    const data = arrivalEventData(touch);
    track(ARRIVAL_EVENT, { channel: data.channel, params: data.params });
  } catch {
    /* the page never breaks over analytics */
  }
}

/**
 * Record this page load as an arrival.
 *
 * Every arrival counts, not only tagged ones. The old hook stored a visit only
 * when the URL had utm/gclid/fbclid, so organic search, AI assistants (except
 * ChatGPT, which appends utm_source), referrals and returning customers all
 * collapsed into "ישיר".
 */
export function useUtmTracking() {
  useEffect(() => {
    try {
      // A sales rep's browser speaks for nobody: its history is the rep's, and
      // recording it is how a stale click ends up credited with a stranger's order.
      if (useAdminStore.getState().isAdmin) return;

      const sessionStart = !sessionStorage.getItem(SESSION_KEY);
      sessionStorage.setItem(SESSION_KEY, '1');

      // Back from Meshulam. Whatever the referrer says, this is not an arrival.
      if (window.location.pathname.startsWith('/checkout')) return;

      const touch = buildTouch({
        href: window.location.href,
        referrer: document.referrer,
        ownHosts: ownHosts(),
      });

      // Before the storage write, which can throw (quota, private mode): the shop's own analytics do not depend on it.
      if (isArrival(touch, { sessionStart })) reportArrival(touch);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordTouch(readState(), touch, { sessionStart })));
    } catch {
      // Storage blocked (private mode, quota). The order is simply unattributed.
    }
  }, []);
}

/** What is stored for this browser, already pruned to the 90-day window. */
export function getStoredAttribution(): AttributionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const state = readState();
    return state.first || state.last || state.clicks ? state : null;
  } catch {
    return null;
  }
}

/** The Hebrew label an order placed now would get. */
export function getTrafficSourceLabel(state: AttributionState | null): string {
  return classifyTouch(state?.last ?? state?.first).label;
}

/** Forget everything stored for this browser. */
export function clearUtmParams() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage blocked.
  }
}
