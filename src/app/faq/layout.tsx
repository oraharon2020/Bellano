import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `שאלות נפוצות | ${siteConfig.fullName}`,
  description: 'תשובות לשאלות נפוצות על משלוחים, אחריות, אפשרויות תשלום, התאמה אישית ועוד - בלאנו רהיטי מעצבים',
  alternates: {
    canonical: `${siteConfig.url}/faq`,
  },
  openGraph: {
    title: `שאלות נפוצות | ${siteConfig.fullName}`,
    description: 'תשובות לשאלות נפוצות על משלוחים, אחריות, אפשרויות תשלום, התאמה אישית ועוד',
    url: `${siteConfig.url}/faq`,
    type: 'website',
    images: [{ url: `${siteConfig.url}${siteConfig.ogImage}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `שאלות נפוצות | ${siteConfig.fullName}`,
    description: 'תשובות לשאלות נפוצות על משלוחים, אחריות, אפשרויות תשלום, התאמה אישית ועוד',
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
