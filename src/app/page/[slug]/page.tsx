import { getPageBySlug } from '@/lib/woocommerce/pages';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Revalidate every 5 minutes
export const revalidate = 300;

// Map Hebrew URLs to WordPress slugs
const slugMap: Record<string, string> = {
  'faq': 'faq',
  'about-us': 'about-us',
  'contact': 'contact',
  'accessibility': 'accessibility',
  'privacy-policy': 'privacy-policy',
  'terms': 'privacy-policy',
};

// Map internal slugs to their public-facing URLs
const publicUrlMap: Record<string, string> = {
  'about-us': '/about',
  'privacy-policy': '/privacy-policy',
  'terms': '/privacy-policy',
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const wpSlug = slugMap[slug] || slug;
  const page = await getPageBySlug(wpSlug);
  
  if (!page) {
    return { title: 'דף לא נמצא | בלאנו' };
  }
  
  // Decode HTML entities in title
  const title = page.title.rendered.replace(/&#8211;/g, '-').replace(/&amp;/g, '&');
  const description = page.content.rendered.replace(/<[^>]*>/g, '').trim().slice(0, 160) || `${title} - בלאנו רהיטי מעצבים`;
  const publicUrl = publicUrlMap[slug] || `/page/${slug}`;
  
  return {
    title: `${title} | בלאנו - רהיטי מעצבים`,
    description,
    alternates: {
      canonical: `${SITE_URL}${publicUrl}`,
    },
    openGraph: {
      title: `${title} | בלאנו`,
      description,
      url: `${SITE_URL}${publicUrl}`,
      type: 'website',
      images: [{ url: `${SITE_URL}${siteConfig.ogImage}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | בלאנו`,
      description,
      images: [`${SITE_URL}${siteConfig.ogImage}`],
    },
  };
}

export default async function ContentPage({ params }: PageProps) {
  const { slug } = await params;
  const wpSlug = slugMap[slug] || slug;
  const page = await getPageBySlug(wpSlug);
  
  if (!page) {
    notFound();
  }
  
  // Decode HTML entities in title
  const title = page.title.rendered.replace(/&#8211;/g, '-').replace(/&amp;/g, '&');
  
  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-black">דף הבית</Link>
            <span>/</span>
            <span className="text-gray-900">{title}</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">{title}</h1>
        
        <article 
          className="max-w-3xl mx-auto wp-content"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />
      </div>
    </div>
  );
}
