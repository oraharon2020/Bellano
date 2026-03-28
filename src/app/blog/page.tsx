import Link from 'next/link';
import Image from 'next/image';
import { getPostsPaginated, getFeaturedImage, getExcerpt, formatDate } from '@/lib/wordpress';
import { BreadcrumbJsonLd } from '@/components/seo';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;
const POSTS_PER_PAGE = 12;

export const revalidate = 300; // 5 minutes

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps) {
  const { page: pageParam } = await searchParams;
  const currentPage = parseInt(pageParam || '1', 10) || 1;
  const canonicalUrl = currentPage > 1 ? `${SITE_URL}/blog?page=${currentPage}` : `${SITE_URL}/blog`;
  
  return {
    title: currentPage > 1 ? `בלוג | עמוד ${currentPage} | בלאנו` : 'בלוג',
    description: 'טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: 'בלוג | בלאנו',
      description: 'טיפים, השראה ומדריכים לעיצוב הבית עם רהיטי מעצבים',
      url: canonicalUrl,
      type: 'website',
    },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  
  let posts: any[] = [];
  let totalPages = 1;
  
  try {
    const data = await getPostsPaginated({ per_page: POSTS_PER_PAGE, page: currentPage });
    posts = data.posts;
    totalPages = data.totalPages;
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

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
              const featuredImage = getFeaturedImage(post);
              const excerpt = getExcerpt(post);
              const date = formatDate(post.date);
              
              return (
                <article 
                  key={post.id}
                  className="group bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <Link href={`/blog/${post.slug}`} className="block aspect-[16/10] relative overflow-hidden">
                    {featuredImage ? (
                      <Image
                        src={featuredImage}
                        alt={post.title.rendered}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400">אין תמונה</span>
                      </div>
                    )}
                  </Link>
                  
                  {/* Content */}
                  <div className="p-5">
                    {/* Date */}
                    <time className="text-sm text-muted-foreground" dateTime={post.date}>
                      {date}
                    </time>
                    
                    {/* Title */}
                    <h2 className="text-lg font-semibold mt-2 mb-3 line-clamp-2">
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary transition-colors"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                      />
                    </h2>
                    
                    {/* Excerpt */}
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {excerpt}
                    </p>
                    
                    {/* Read More */}
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-sm font-medium text-primary mt-4 hover:underline"
                    >
                      קרא עוד
                      <svg className="w-4 h-4 mr-1 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">אין פוסטים להצגה כרגע</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex justify-center items-center gap-2 mt-10" aria-label="ניווט בין עמודים">
            {currentPage > 1 && (
              <Link
                href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
                className="px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
              >
                → הקודם
              </Link>
            )}
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Link
                    key={item}
                    href={item === 1 ? '/blog' : `/blog?page=${item}`}
                    className={`px-3 py-2 rounded-md border transition-colors ${
                      item === currentPage
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'border-border hover:bg-accent'
                    }`}
                    {...(item === currentPage ? { 'aria-current': 'page' as const } : {})}
                  >
                    {item}
                  </Link>
                )
              )}
            
            {currentPage < totalPages && (
              <Link
                href={`/blog?page=${currentPage + 1}`}
                className="px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
              >
                הבא ←
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
