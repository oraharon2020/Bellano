'use client';

import type { MouseEvent } from 'react';
import { siteConfig } from '@/config/site';
import { getStoredAttribution } from '@/hooks/useUtmTracking';
import { useAdminStore } from '@/lib/store/admin';

/**
 * Ties a WhatsApp conversation back to the ad click that started it.
 *
 * The problem this solves: about half of Bellano's orders are entered by a
 * salesperson (52% in October 2026), usually after a WhatsApp message. Google
 * never learns that those sales happened, because the moment the customer
 * leaves the site for WhatsApp the trail ends. The reps' sales go to Google
 * each night (the theme's dashboard-app/app-gads-conversions.php), but only
 * those whose customer's own click can be found, and until this file Bellano
 * had one way to find it: an earlier order of the customer's on the site.
 *
 * Nalla's file, copied on 26/10/2026 (Nalla has run it since 29/09/2026). The
 * theme side is whatsapp-lead/whatsapp-lead.php, the same in both themes.
 *
 * WhatsApp itself hands over the one thing that would close the loop: the
 * customer's phone number arrives with their message. What is missing is the
 * link between that number and the click, and this supplies it — a short code
 * carried inside the message the customer sends. The click is recorded against
 * the code here; the code arrives in the inbox with the number; the two meet.
 *
 * The code is minted in the click handler, not during render and not on mount:
 * a random value in the markup would differ between server and client and break
 * hydration, and minting one per page view would fill the table with codes for
 * buttons nobody pressed. The handler rewrites the link's own href before the
 * browser follows it, which keeps the button an ordinary link — building the
 * URL and opening a window from script is what Safari blocks.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0 or I/1 to read back
const CODE_LENGTH = 6;

function newLeadCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);

  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];

  return code;
}

/** How the code rides along in the customer's own message. */
export function appendLeadCode(message: string | undefined, code: string | null): string | undefined {
  if (!code) return message;

  const suffix = `[${code}]`;

  return message ? `${message}\n\n${suffix}` : suffix;
}

export function buildWhatsAppHref(message: string | undefined, code: string | null, phone?: string): string {
  const text = appendLeadCode(message, code);
  const base = `https://wa.me/${phone || siteConfig.whatsapp}`;

  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Record which visit this code belongs to.
 *
 * The whole first/last touch goes, not only a click: a conversation that turns
 * into an order a rep opens is the one place the customer's own source can be
 * recovered from. The route re-classifies it; nothing computed here is trusted.
 *
 * `sendBeacon` rather than `fetch`, because the browser is about to leave for
 * WhatsApp and an ordinary request would be cancelled on the way out.
 */
export function registerLeadCode(code: string) {
  if (typeof window === 'undefined' || !code) return;

  const payload = JSON.stringify({
    code,
    page: window.location.pathname,
    attribution: getStoredAttribution(),
  });

  try {
    const sent = navigator.sendBeacon?.(
      '/api/track/whatsapp-lead',
      new Blob([payload], { type: 'application/json' }),
    );
    if (sent) return;
  } catch {
    /* fall through to fetch */
  }

  // Older browsers, or a refused beacon. keepalive gives the request a chance
  // to outlive the page.
  fetch('/api/track/whatsapp-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/**
 * The href and click handler for a WhatsApp button.
 *
 * `href` is the plain link, correct on its own if script never runs. `onClick`
 * mints the code, records the click, and points the same link at the message
 * carrying it — synchronously, so the navigation that follows uses it.
 */
export function useWhatsAppLead(message?: string, phone?: string) {
  return {
    href: buildWhatsAppHref(message, null, phone),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      // A rep's browser is not a lead; the plain link is left as it is.
      if (useAdminStore.getState().isAdmin) return;

      const code = newLeadCode();

      registerLeadCode(code);
      event.currentTarget.href = buildWhatsAppHref(message, code, phone);
    },
  };
}
