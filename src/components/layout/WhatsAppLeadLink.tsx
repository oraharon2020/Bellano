'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useWhatsAppLead } from '@/lib/whatsapp-lead';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  message?: string;
  children: ReactNode;
};

/**
 * A link to the shop's WhatsApp that carries a lead code (src/lib/whatsapp-lead.ts), for a server component that
 * cannot call the hook itself, such as the contact page.
 */
export function WhatsAppLeadLink({ message, children, ...rest }: Props) {
  const lead = useWhatsAppLead(message);

  return (
    <a {...rest} href={lead.href} onClick={lead.onClick}>
      {children}
    </a>
  );
}
