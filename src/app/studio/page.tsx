import { notFound } from 'next/navigation';
import { StudioConfigurator } from '@/components/studio/StudioConfigurator';
import { siteConfig } from '@/config/site';

export const metadata = {
  title: 'Bellano Studio | עצבו את הרהיט שלכם',
  description: 'עצבו מזנון בהתאמה אישית: צבע, מידות, בסיס, פתיחה ותוספות — עם מחיר חי.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

async function getStudio() {
  const wp = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
  try {
    const res = await fetch(`${wp}/wp-json/bellano/v1/studio`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 BellanoStudio/1.0' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StudioPage() {
  const config = await getStudio();
  if (!config?.enabled || !config?.product?.variations?.length) notFound();
  return <StudioConfigurator initial={config} />;
}
