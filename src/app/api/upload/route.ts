import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';

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

    if (!adminToken) {
      return NextResponse.json(
        { success: false, message: 'נדרשת הזדהות לפני העלאת קבצים' },
        { status: 401 }
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
      // DWG files
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'image/vnd.dwg',
      'image/x-dwg',
      'application/dwg',
      'application/x-dwg',
      // DXF files
      'application/dxf',
      'image/vnd.dxf',
      'image/x-dxf',
    ];

    // Also allow by extension for files that browsers might not recognize
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.dwg', '.dxf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, message: 'סוג קובץ לא נתמך. ניתן להעלות: תמונות, PDF, Word, DWG, DXF' },
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

    // Use our custom WordPress endpoint for upload
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/upload-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: adminToken,
        filename: filename,
        fileType: file.type || 'application/octet-stream',
        fileData: buffer.toString('base64'),
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({
        success: true,
        url: data.url,
        filename: data.filename || filename,
      });
    }

    console.error('WordPress upload error:', data);
    return NextResponse.json(
      { success: false, message: data.message || 'שגיאה בהעלאת הקובץ לשרת' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה לא צפויה' },
      { status: 500 }
    );
  }
}
