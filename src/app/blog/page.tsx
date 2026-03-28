import Link from 'next/link';
import { getPostsPaginated } from '@/lib/wordpress';
import { BreadcrumbJsonLd } from '@/components/seo';
import { BlogPostGrid } from '@/components/blog/BlogPostGrid';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;
const POSTS_PER_PAGE = 12;

export const revalidate = 300; // 5 minutes

export const metadata = {
  title: 'בלוג',
  description: 'טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: 'בלוג | בלאנו',
    description: 'טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים',
    url: `${SITE_URL}/blog`,
    type: 'website',
    images: [{ url: `${SITE_URL}${siteConfig.ogImage}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'בלוג | בלאנו',
    description: 'טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים',
    images: [`${SITE_URL}${siteConfig.ogImage}`],
  },
};

export default async function BlogPage() {
  let posts: any[] = [];
  let total = 0;
  
  try {
    const data = await getPostsPaginated({ per_page: POSTS_PER_PAGE, page: 1 });
    posts = data.posts;
    total = data.total;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
  }

  return (
    <>
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: 'בלוג', url: `${SITE_URL}/blog` },
        ]} 
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">דף הבית</Link>
          <span className="mx-2">/</span>
          <span>בלוג</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">הבלוג שלנו</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים
          </p>
        </div>

        {/* Posts Grid with Load More */}
        {posts.length > 0 ? (
          <BlogPostGrid
            initialPosts={posts}
            totalPosts={total}
            perPage={POSTS_PER_PAGE}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">אין פוסטים להצגה כרגע</p>
          </div>
        )}
      </div>
    </>
  );
}
