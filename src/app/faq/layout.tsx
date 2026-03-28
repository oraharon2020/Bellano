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
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
