import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Newsletter subscribers storage
// In production, you'd use a database or external service like Mailchimp, SendGrid, etc.
const SUBSCRIBERS_FILE = path.join(process.cwd(), 'data', 'newsletter-subscribers.json');

interface Subscriber {
  email: string;
  subscribedAt: string;
  source: string;
  confirmed: boolean;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubscribers(subscribers: Subscriber[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const { email, source = 'website' } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'נא להזין כתובת אימייל תקינה' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const subscribers = await getSubscribers();
    const existingSubscriber = subscribers.find(s => s.email === normalizedEmail);

    if (existingSubscriber) {
      return NextResponse.json(
        { success: true, message: 'כתובת האימייל כבר רשומה לרשימת התפוצה' },
        { status: 200 }
      );
    }

    // Add new subscriber
    const newSubscriber: Subscriber = {
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      source,
      confirmed: true, // Auto-confirm for now, can add double opt-in later
    };

    subscribers.push(newSubscriber);
    await saveSubscribers(subscribers);

    // TODO: Send welcome email when email service is configured
    // TODO: Sync with external service (Mailchimp, SendGrid, etc.)

    console.log(`New newsletter subscriber: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: 'תודה! נרשמת בהצלחה לרשימת התפוצה',
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה בהרשמה. נא לנסות שוב.' },
      { status: 500 }
    );
  }
}

// Get all subscribers (admin only - for future admin panel)
export async function GET(request: NextRequest) {
  try {
    // Check for admin auth header (simple token for now)
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscribers = await getSubscribers();
    
    return NextResponse.json({
      success: true,
      count: subscribers.length,
      subscribers,
    });

  } catch (error) {
    console.error('Get subscribers error:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching subscribers' },
      { status: 500 }
    );
  }
}
