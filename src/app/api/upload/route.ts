import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';
const WP_USER = process.env.WP_UPLOAD_USER || 'api_upload';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const adminToken = formData.get('adminToken') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'לא נבחר קובץ' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'הקובץ גדול מדי (מקסימום 10MB)' },
        { status: 400 }
      );
    }

    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'סוג קובץ לא נתמך' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `admin_upload_${timestamp}_${safeName}`;

    // Upload to WordPress Media Library
    const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
    
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': file.type,
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress upload error:', errorText);
      
      // Fallback: try using admin token endpoint
      if (adminToken) {
        const fallbackResponse = await fetch(`${WP_URL}/wp-json/bellano/v1/upload-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: adminToken,
            filename: filename,
            fileType: file.type,
            fileData: buffer.toString('base64'),
          }),
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return NextResponse.json({
            success: true,
            url: data.url,
            filename: data.filename,
          });
        }
      }
      
      return NextResponse.json(
        { success: false, message: 'שגיאה בהעלאת הקובץ' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      url: data.source_url,
      mediaId: data.id,
      filename: data.title?.rendered || filename,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה לא צפויה' },
      { status: 500 }
    );
  }
}
