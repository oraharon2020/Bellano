import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const perPage = searchParams.get('per_page') || '12';
  
  console.log('Search API called with query:', query);
  
  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';
    const consumerKey = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;
    
    console.log('WooCommerce config:', { 
      wpUrl, 
      hasKey: !!consumerKey, 
      hasSecret: !!consumerSecret 
    });
    
    if (!consumerKey || !consumerSecret) {
      console.error('Missing WooCommerce credentials');
      return NextResponse.json(
        { error: 'WooCommerce credentials not configured', products: [] },
        { status: 500 }
      );
    }

    const url = new URL(`${wpUrl}/wp-json/wc/v3/products`);
    url.searchParams.append('search', query);
    url.searchParams.append('per_page', perPage);
    url.searchParams.append('status', 'publish');
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);

    console.log('Fetching from WooCommerce...');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('WooCommerce response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WooCommerce API error:', response.status, errorText);
      return NextResponse.json(
        { error: `WooCommerce API error: ${response.status}`, products: [] },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Got', data.length, 'products from WooCommerce');
    
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
      { error: error instanceof Error ? error.message : 'Failed to search products', products: [] },
      { status: 500 }
    );
  }
}
