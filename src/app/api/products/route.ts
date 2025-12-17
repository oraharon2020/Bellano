import { NextResponse } from 'next/server';
import { getProducts, transformProduct } from '@/lib/woocommerce';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '8');

  try {
    const wooProducts = await getProducts({ per_page: limit });
    const products = wooProducts.map((p) => transformProduct(p));
    
    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
