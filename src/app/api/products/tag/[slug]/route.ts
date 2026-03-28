import { NextRequest, NextResponse } from 'next/server';
import { getProductsByTagSlugPaginated } from '@/lib/woocommerce';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const per_page = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') || '24', 10) || 24));

  try {
    const data = await getProductsByTagSlugPaginated(slug, { per_page, page });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching tag products:', error);
    return NextResponse.json({ products: [], total: 0, totalPages: 0 }, { status: 500 });
  }
}
