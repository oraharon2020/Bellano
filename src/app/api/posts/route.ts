import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/wordpress';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const per_page = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') || '12', 10) || 12));

  try {
    const posts = await getPosts({ per_page, page });

    return NextResponse.json(
      { posts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}
