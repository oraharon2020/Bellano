import { NextResponse } from 'next/server';
import { getCategories, transformCategory } from '@/lib/woocommerce';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const wooCategories = await getCategories({ per_page: limit, hide_empty: true });
    const categories = wooCategories.map(transformCategory);
    
    return NextResponse.json(
      { categories },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
