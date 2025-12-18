import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';

export async function GET(request: NextRequest) {
  try {
    // First check if there's an admin token in the request
    const adminToken = request.headers.get('x-admin-token');
    
    if (adminToken) {
      // Verify token against WordPress
      const response = await fetch(`${WP_URL}/wp-json/bellano/v1/verify-admin-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: adminToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          return NextResponse.json({
            isAdmin: true,
            userId: data.userId,
            userName: data.userName,
            upgrades: data.upgrades || [],
          });
        }
      }
    }
    
    // Fallback: try cookies (works on same domain)
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/check-admin`, {
      headers: {
        Cookie: cookies,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ isAdmin: false });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}

// Login endpoint for admins
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      );
    }
    
    // Authenticate against WordPress
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, message: data.message || 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      token: data.token,
      userName: data.userName,
      upgrades: data.upgrades || [],
    });
    
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה בהתחברות' },
      { status: 500 }
    );
  }
}
