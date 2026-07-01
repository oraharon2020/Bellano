import { NextResponse } from 'next/server';
import { getApiEndpoint } from '@/config/site';

export interface ColorSwatch {
  id: number;
  name: string;
  slug: string;
  attribute: string;
  attribute_slug: string;
  image?: string;
  color?: string;
}

// No module-level in-memory cache: it can't be cleared by the admin "clear
// cache" button. We rely on Next's tagged fetch cache ('swatches') instead,
// which /api/cache busts on demand.

export async function GET() {
  try {
    const response = await fetch(getApiEndpoint('color-swatches'), {
      next: { revalidate: 3600, tags: ['swatches'] }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch swatches');
    }

    const data = await response.json();

    if (data.success && data.swatches) {
      return NextResponse.json({ 
        success: true, 
        swatches: data.swatches 
      });
    }

    return NextResponse.json({ 
      success: false, 
      swatches: {} 
    });
  } catch (error) {
    console.error('Error fetching color swatches:', error);

    return NextResponse.json({ 
      success: false, 
      swatches: {},
      error: 'Failed to fetch swatches' 
    });
  }
}
