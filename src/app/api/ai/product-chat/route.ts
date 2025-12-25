import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // Max requests per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// Daily budget protection (approximate)
let dailyTokenCount = 0;
let dailyResetTime = Date.now() + 24 * 60 * 60 * 1000;
const DAILY_TOKEN_LIMIT = 100000; // ~100k tokens = ~$0.05/day max

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

function checkDailyBudget(): boolean {
  const now = Date.now();
  if (now > dailyResetTime) {
    dailyTokenCount = 0;
    dailyResetTime = now + 24 * 60 * 60 * 1000;
  }
  return dailyTokenCount < DAILY_TOKEN_LIMIT;
}

interface ProductInfo {
  name: string;
  description: string;
  price: string;
  categories: string[];
  attributes: Array<{ name: string; options: string[] }>;
  dimensions?: {
    width?: string;
    depth?: string;
    height?: string;
  };
  assemblyIncluded?: boolean;
  availabilityType?: 'in_stock' | 'custom_order';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  product: ProductInfo;
  history: Message[];
}

const SYSTEM_PROMPT = `אתה יועץ וירטואלי של בלאנו - חנות רהיטים ישראלית המתמחה בריהוט מותאם אישית.

כללים חשובים:
1. ענה רק על שאלות שקשורות למוצר הספציפי או לריהוט בכלל
2. אל תמציא מידע - אם אתה לא יודע, אמור "לגבי זה כדאי לדבר ישירות עם הצוות שלנו בטלפון 03-5566696"
3. אל תבטיח מחירים, הנחות או זמני אספקה ספציפיים
4. היה ידידותי, מקצועי וקצר - תשובות של 2-3 משפטים מספיקות
5. עודד פניה לצוות בשאלות מורכבות - תן את המספר 03-5566696
6. ענה בעברית בלבד
7. אם שואלים על מוצרים אחרים - הצע לעיין בקטלוג או לדבר עם הצוות
8. תמיד סיים את התשובה במשפט שלם - אל תחתוך באמצע

מידע שאתה יכול לעזור בו:
- התאמת מידות לחדר
- המלצות על צבעים וחומרים
- הסבר על תכונות המוצר
- טיפים לעיצוב ושילוב רהיטים
- הסבר על תהליך ההתאמה האישית

פרטי התקשרות:
- טלפון/וואטסאפ: 03-5566696
- אתר: www.bellano.co.il
`;

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'הגעתם למגבלת השאלות. נסו שוב מאוחר יותר או פנו אלינו ישירות 03-5566696' },
        { status: 429 }
      );
    }
    
    // Check daily budget
    if (!checkDailyBudget()) {
      return NextResponse.json(
        { success: false, error: 'השירות לא זמין כרגע. פנו אלינו ישירות 03-5566696' },
        { status: 503 }
      );
    }

    const body: RequestBody = await request.json();
    const { message, product, history } = body;

    if (!message || !product) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Build product context
    const productContext = `
מוצר נוכחי: ${product.name}
תיאור: ${product.description || 'אין תיאור'}
מחיר: ${product.price}
קטגוריות: ${product.categories?.join(', ') || 'כללי'}
זמינות: ${product.availabilityType === 'custom_order' ? 'מוצר בהזמנה אישית - לא ניתן לביטול לאחר ההזמנה' : 'מוצר במלאי - ניתן לביטול'}
הרכבה: ${product.assemblyIncluded !== false ? 'המוצר מגיע מורכב ללקוח - לא נדרשת הרכבה' : 'המוצר דורש הרכבה - אפשר להרכיב עצמאית או להזמין הרכבה דרכינו בתשלום'}
משלוח: משלוח חינם עד הבית
אחריות: שנה אחריות
תשלום: עד 12 תשלומים ללא ריבית
${product.attributes?.length ? `מאפיינים זמינים: ${product.attributes.map(a => `${a.name}: ${a.options.join(', ')}`).join('; ')}` : ''}
${product.dimensions ? `מידות: רוחב ${product.dimensions.width || 'לא צוין'}, עומק ${product.dimensions.depth || 'לא צוין'}, גובה ${product.dimensions.height || 'לא צוין'}` : ''}
`;

    // Build conversation history (limit to last 6 messages)
    const recentHistory = history.slice(-6);
    const conversationMessages = recentHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current message
    conversationMessages.push({
      role: 'user' as const,
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap
      max_tokens: 500, // Enough for full responses
      system: SYSTEM_PROMPT + '\n\n' + productContext,
      messages: conversationMessages,
    });

    // Track token usage for daily budget
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    dailyTokenCount += tokensUsed;

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'סליחה, לא הצלחתי לענות. נסו לשאול שוב או פנו אלינו 03-5566696';

    // Log to Google Sheets
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbziWAkdFQKyNFAY35BpzaZHyb9_i1er-i-T6eLw5TZb1DoN9Ot0V6HKt8Kd-7iJmtwFbg/exec';
    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_chat',
          product: product.name,
          question: message,
          answer: assistantMessage,
        }),
      });
    } catch (e) {
      console.error('Failed to log to Google Sheets:', e);
    }

    return NextResponse.json({
      success: true,
      response: assistantMessage,
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
