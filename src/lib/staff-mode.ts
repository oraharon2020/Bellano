/**
 * Staff browsing is invisible to every tracker on the site.
 *
 * A rep browses the storefront all day, opens the same products over and over
 * and places customers' orders from the phone. Counted, that is one visitor
 * with hundreds of page views and purchases who is nobody's customer: traffic
 * is inflated, the ad platforms learn from the rep's own clicks, and a
 * salesperson's journey lands on a customer's order.
 *
 * The decision is taken before anything loads, because nothing in React can
 * take it in time: the trackers start at afterInteractive, and during
 * hydration the admin store still answers with its initial state — "not a
 * rep" — so a check made in a component comes after the first page view has
 * gone. staffModeScript() runs in <head>, reads what the browser has stored and
 * records the answer in `window.__staffMode`:
 *
 *  - a rep's page loads no tracker at all — the loaders in layout.tsx test
 *    STAFF_PAGE_JS first — so nothing is sent and there is nothing to leak;
 *  - a customer's page loads exactly what it loaded before.
 *
 * A rep's page is one on a STAFF DEVICE: a browser a rep has been signed in on
 * (the admin store, filled only by a sign-in WordPress verified) within the
 * last STAFF_DEVICE_MS. Not only while signed in, because the sign-in lapses
 * by itself — the store's own expiry, a WordPress token that ran out — and the
 * rep goes on browsing until signing in again; that is a salesperson's
 * browsing too. Signing out does not clear it either: the store cannot tell a
 * rep's sign-out from an expiry, and a salesperson who signed out is still a
 * salesperson.
 *
 * A page that was a customer's when it loaded and then signs in (the first
 * sign-in on a device) has trackers running that cannot be unloaded, and some
 * watch every navigation by themselves. enterStaffMode() turns off what the
 * vendors let us turn off and reloads the page once, so the session goes on as
 * a rep's page. Another tab open at that moment hears of it through the
 * storage event and is silenced as far as silenceTrackers() reaches, but not
 * reloaded — that could throw away a form half filled in.
 */

/** Where the admin store persists itself. src/lib/store/admin.ts takes it from here. */
export const ADMIN_STORE_KEY = 'bellano-admin';

/** How long a sign-in lasts in the browser; null for "until signing out". src/lib/store/admin.ts takes it from here. */
export const ADMIN_SESSION_MS: number | null = null;

/** When a rep was last signed in on this browser (epoch ms, as a string). */
export const STAFF_DEVICE_KEY = `${ADMIN_STORE_KEY}-device`;

/** How long a browser stays a rep's after the last time a rep was signed in on it. */
export const STAFF_DEVICE_MS = 30 * 24 * 60 * 60 * 1000;

/** What staffModeScript() leaves on `window` for the rest of the page. */
export interface StaffModeState {
  /** This page is a rep's: nothing may be sent from it. */
  staff: boolean;
  /** The page's GA4 measurement ids, for `ga-disable-<id>`. */
  analyticsIds: string[];
}

declare global {
  interface Window {
    __staffMode?: StaffModeState;
  }
}

/**
 * The test each tracker loader in layout.tsx makes before loading anything.
 * A page whose head script did not run reads as a customer's: a customer must
 * never lose tracking over this.
 */
export const STAFF_PAGE_JS = '(window.__staffMode && window.__staffMode.staff === true)';

/**
 * Does this persisted admin-store value (the raw localStorage string) say a
 * rep is signed in? The same rule the store applies as it loads: where a
 * sign-in expires (ADMIN_SESSION_MS), an expired one is signed out there.
 */
export function isStaffSession(persisted: string | null | undefined, now: number = Date.now()): boolean {
  if (!persisted) return false;
  try {
    const state = JSON.parse(persisted)?.state;
    if (!state || state.isAdmin !== true) return false;
    if (ADMIN_SESSION_MS !== null && state.loginTimestamp && now - state.loginTimestamp > ADMIN_SESSION_MS) return false;
    return true;
  } catch {
    return false;
  }
}

/** Was a rep signed in on this browser recently enough (the STAFF_DEVICE_KEY value)? */
export function isStaffDevice(lastSignedIn: string | null | undefined, now: number = Date.now()): boolean {
  const at = Number(lastSignedIn);
  return lastSignedIn != null && lastSignedIn !== '' && Number.isFinite(at) && now - at < STAFF_DEVICE_MS;
}

/**
 * The <head> script that decides, before any tracker, whose page this is:
 * isStaffSession() || isStaffDevice(), in plain JavaScript —
 * tests/staff-mode.test.mjs holds the two to the same answers. A signed-in
 * page renews the device's mark.
 *
 * `preloadScripts` are tracker libraries the server used to announce with
 * <link rel="preload"> (next/script does for every afterInteractive src). A
 * preload is itself a request to the vendor, so the server can no longer
 * print it; this script adds it for a customer's page instead.
 */
export function staffModeScript(options: { analyticsIds: string[]; preloadScripts: string[] }): string {
  const analyticsIds = JSON.stringify(options.analyticsIds.filter(Boolean));
  const preloads = JSON.stringify(options.preloadScripts.filter(Boolean));
  return `(function(){
var m={staff:false,analyticsIds:${analyticsIds}};
try{
var now=Date.now(),ttl=${JSON.stringify(ADMIN_SESSION_MS)},dk=${JSON.stringify(STAFF_DEVICE_KEY)};
var s=null;try{s=JSON.parse(localStorage.getItem(${JSON.stringify(ADMIN_STORE_KEY)})).state;}catch(e){}
if(s&&s.isAdmin===true&&!(ttl!==null&&s.loginTimestamp&&now-s.loginTimestamp>ttl)){m.staff=true;localStorage.setItem(dk,String(now));}
else{var d=localStorage.getItem(dk),at=Number(d);m.staff=d!==null&&d!==''&&isFinite(at)&&now-at<${STAFF_DEVICE_MS};}
}catch(e){}
window.__staffMode=m;
if(!m.staff){${preloads}.forEach(function(h){var l=document.createElement('link');l.rel='preload';l.as='script';l.href=h;document.head.appendChild(l);});}
})();`;
}

/** Is this page a rep's? Decided in <head>, and turned on by silenceTrackers(). */
export function isStaffPage(): boolean {
  return typeof window !== 'undefined' && window.__staffMode?.staff === true;
}

/**
 * Turn off the trackers already running on this page, as far as each vendor
 * allows it: Vercel Web Analytics and Speed Insights drop every event in their
 * beforeSend (dropStaffEvents), the Meta Pixel stops once consent is revoked,
 * GA4 aborts its hits under `ga-disable-<id>`, and what the site sends itself
 * tests isStaffPage(). Google Ads' own hits and the tags inside a Google Tag
 * Manager container have no such switch (measured: remarketing and GTM's tags
 * go on), which is why enterStaffMode() also reloads, and why a tab silenced
 * from another one is only clean once it reloads.
 */
export function silenceTrackers(): void {
  if (typeof window === 'undefined') return;
  const state = (window.__staffMode ??= { staff: false, analyticsIds: [] });
  state.staff = true;

  const w = window as unknown as Record<string, unknown> & { fbq?: (...args: unknown[]) => void };
  for (const id of state.analyticsIds) w[`ga-disable-${id}`] = true;
  try {
    if (typeof w.fbq === 'function') w.fbq('consent', 'revoke');
  } catch {
    /* the page never breaks over analytics */
  }
}

/**
 * Call right after a rep signs in. The device is marked; a page that loaded as
 * a customer's is silenced and reloaded once, so that what it loaded — GTM
 * above all — is gone and the new page loads nothing. The reload waits for
 * the sign-in to be stored: where storage is blocked, the reload would sign
 * the rep straight out again, so that page is only silenced.
 */
export function enterStaffMode(): void {
  if (typeof window === 'undefined') return;
  let stored = false;
  try {
    stored = isStaffSession(localStorage.getItem(ADMIN_STORE_KEY));
    if (stored) localStorage.setItem(STAFF_DEVICE_KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
  if (isStaffPage()) return;
  silenceTrackers();
  if (stored) window.location.reload();
}

/**
 * Silence this page when a rep signs in from another tab. The admin store
 * does not follow other tabs, so the storage event is the only word of it.
 * Returns the unsubscribe.
 */
export function watchStaffMode(): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      (event.key === ADMIN_STORE_KEY && isStaffSession(event.newValue)) ||
      (event.key === STAFF_DEVICE_KEY && isStaffDevice(event.newValue))
    ) {
      silenceTrackers();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** beforeSend for Vercel Web Analytics and Speed Insights: nothing leaves a rep's page. */
export function dropStaffEvents<T>(event: T): T | null {
  return isStaffPage() ? null : event;
}
