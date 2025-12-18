import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const perPage = searchParams.get('per_page') || '12';
  
  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';
    const consumerKey = process.env.WC_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }

    const url = new URL(`${wpUrl}/wp-json/wc/v3/products`);
    url.searchParams.append('search', query);
    url.searchParams.append('per_page', perPage);
    url.searchParams.append('status', 'publish');
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't cache search results
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Simplify the response - WooCommerce returns images array
    const products = data.map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.src || product.images?.[0]?.thumbnail || '',
      price: product.price,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products', products: [] },
      { status: 500 }
    );
  }
}
