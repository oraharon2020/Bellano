import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `צרו קשר | ${siteConfig.fullName}`,
  description: `צרו קשר עם ${siteConfig.fullName} - טלפון ${siteConfig.phone}, וואטסאפ או טופס יצירת קשר. נשמח לעמוד לשירותכם`,
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: `צרו קשר | ${siteConfig.fullName}`,
    description: `צרו קשר עם ${siteConfig.fullName} - טלפון, וואטסאפ או טופס יצירת קשר`,
    url: `${siteConfig.url}/contact`,
    type: 'website',
    images: [{ url: `${siteConfig.url}${siteConfig.ogImage}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `צרו קשר | ${siteConfig.fullName}`,
    description: `צרו קשר עם ${siteConfig.fullName} - טלפון, וואטסאפ או טופס יצירת קשר`,
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
