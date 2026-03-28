'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedImage, getExcerpt, formatDate } from '@/lib/wordpress';

interface BlogPostGridProps {
  initialPosts: any[];
  totalPosts: number;
  perPage: number;
}

function PostCard({ post }: { post: any }) {
  const featuredImage = getFeaturedImage(post);
  const excerpt = getExcerpt(post);
  const date = formatDate(post.date);

  return (
    <article className="group bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow">
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
      <div className="p-5">
        <time className="text-sm text-muted-foreground" dateTime={post.date}>{date}</time>
        <h2 className="text-lg font-semibold mt-2 mb-3 line-clamp-2">
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-primary transition-colors"
            dangerouslySetInnerHTML={{ __html: post.title.rendered }}
          />
        </h2>
        <p className="text-muted-foreground text-sm line-clamp-3">{excerpt}</p>
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
}

export function BlogPostGrid({ initialPosts, totalPosts, perPage }: BlogPostGridProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasMore = posts.length < totalPosts;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/posts?page=${nextPage}&per_page=${perPage}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.posts?.length) {
        setPosts(prev => [...prev, ...data.posts]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, perPage]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                טוען...
              </span>
            ) : (
              'הצג עוד פוסטים'
            )}
          </button>
        </div>
      )}
    </>
  );
}
