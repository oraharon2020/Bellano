import Link from 'next/link';
import Image from 'next/image';
import { getPosts, getFeaturedImage, getExcerpt, formatDate } from '@/lib/wordpress';
import { BreadcrumbJsonLd } from '@/components/seo';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

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
  },
};

export default async function BlogPage() {
  let posts: any[] = [];
  
  try {
    posts = await getPosts({ per_page: 12 });
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
      </div>
    </>
  );
}
