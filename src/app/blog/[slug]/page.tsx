import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPosts, getPostBySlug, getFeaturedImage, formatDate, getAuthorName } from '@/lib/wordpress';
import { BreadcrumbJsonLd } from '@/components/seo';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static pages for posts at build time
export async function generateStaticParams() {
  try {
    const posts = await getPosts({ per_page: 50 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    console.error('Failed to generate blog post params:', error);
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: 'פוסט לא נמצא' };
    
    const title = post.title.rendered.replace(/<[^>]*>/g, '');
    const description = post.excerpt.rendered.replace(/<[^>]*>/g, '').slice(0, 160);
    const featuredImage = getFeaturedImage(post);
    
    return {
      title,
      description,
      alternates: {
        canonical: `${SITE_URL}/blog/${slug}`,
      },
      openGraph: {
        title: `${title} | בלאנו`,
        description,
        url: `${SITE_URL}/blog/${slug}`,
        type: 'article',
        publishedTime: post.date,
        modifiedTime: post.modified,
        images: featuredImage ? [{ url: featuredImage }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | בלאנו`,
        description,
        images: featuredImage ? [featuredImage] : [],
      },
    };
  } catch {
    return { title: 'פוסט לא נמצא' };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  let post = null;
  
  try {
    post = await getPostBySlug(slug);
  } catch (error) {
    console.error('Error fetching blog post:', error);
  }
  
  if (!post) {
    notFound();
  }
  
  const featuredImage = getFeaturedImage(post);
  const date = formatDate(post.date);
  const author = getAuthorName(post);
  const title = post.title.rendered;

  return (
    <>
      {/* JSON-LD */}
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: 'בלוג', url: `${SITE_URL}/blog` },
          { name: title.replace(/<[^>]*>/g, ''), url: `${SITE_URL}/blog/${slug}` },
        ]} 
      />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title.replace(/<[^>]*>/g, ''),
            image: featuredImage || undefined,
            datePublished: post.date,
            dateModified: post.modified,
            author: {
              '@type': 'Organization',
              name: 'בלאנו',
              url: SITE_URL,
            },
            publisher: {
              '@type': 'Organization',
              name: 'בלאנו',
              url: SITE_URL,
            },
          }),
        }}
      />
      
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">דף הבית</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-primary">בלוג</Link>
          <span className="mx-2">/</span>
          <span dangerouslySetInnerHTML={{ __html: title }} />
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 
            className="text-3xl md:text-4xl font-bold mb-4"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <time dateTime={post.date}>{date}</time>
            <span>•</span>
            <span>{author}</span>
          </div>
        </header>

        {/* Featured Image */}
        {featuredImage && (
          <div className="relative aspect-[16/9] mb-8 rounded-lg overflow-hidden">
            <Image
              src={featuredImage}
              alt={title.replace(/<[^>]*>/g, '')}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Back to Blog */}
        <div className="mt-12 pt-8 border-t">
          <Link 
            href="/blog"
            className="inline-flex items-center text-primary hover:underline font-medium"
          >
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            חזרה לבלוג
          </Link>
        </div>
      </article>
    </>
  );
}
