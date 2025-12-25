import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Save conversation to Google Sheets via Apps Script
async function saveConversationToSheets(
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  recommendedProducts: string[],
  detectedCategory: string | undefined
) {
  try {
    const webhookUrl = 'https://script.google.com/macros/s/AKfycbzx0HSxk7bLWeF80NSCIIeB_MuCDsoiOhXm0drgoUcCD8JiCtnmm1Bs1k6gFk1W79levw/exec';

    const now = new Date();
    const timestamp = now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const date = now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        timestamp,
        sessionId,
        category: detectedCategory || 'כללי',
        userMessage: userMessage.substring(0, 500),
        assistantResponse: assistantResponse.substring(0, 1000),
        products: recommendedProducts.join(', '),
      }),
    });
    
    console.log('✅ Conversation saved to Google Sheets');
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
  }
}

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  categories: { id: number; name: string; slug: string }[];
  short_description: string;
}

interface FormattedProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  slug: string;
  category: string;
  allCategories?: string[];
}

// Category mapping - using EXACT WooCommerce category names!
const CATEGORY_MAP: { [key: string]: string[] } = {
  'שולחן אוכל': ['פינות אוכל', 'כיסאות לפינת אוכל'],
  'פינת אוכל': ['פינות אוכל', 'כיסאות לפינת אוכל'],
  'שולחן סלון': ['שולחנות סלון'],
  'סלון': ['מזנונים לסלון', 'שולחנות סלון', 'ספריות', 'כורסאות לסלון'],
  'מזנון': ['מזנונים לסלון'],
  'חדר שינה': ['מיטות לחדר שינה', 'קומודות', 'שידות לצד המיטה'],
  'מיטה': ['מיטות לחדר שינה'],
  'כניסה': ['קונסולות', 'מראות', 'כניסה לבית'],
  'קונסולה': ['קונסולות', 'כניסה לבית'],
  'אחסון': ['מזנונים לסלון', 'ספריות', 'קומודות'],
  'כורסה': ['כורסאות לסלון'],
};

// Fetch products from WooCommerce
async function fetchProducts(categoryFilter?: string): Promise<FormattedProduct[]> {
  const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://admin.bellano.co.il';
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  const params = new URLSearchParams({
    per_page: '100',
    status: 'publish',
    orderby: 'popularity',
  });

  try {
    const response = await fetch(
      `${baseUrl}/wp-json/wc/v3/products?${params}`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('WooCommerce API error:', response.status);
      return [];
    }

    const products: WooCommerceProduct[] = await response.json();
    
    let formattedProducts = products.map(p => ({
      id: p.id.toString(),
      name: p.name,
      price: `₪${parseFloat(p.price).toLocaleString()}`,
      image: p.images?.[0]?.src || '',
      slug: p.slug,
      category: p.categories?.[0]?.name || '',
      allCategories: p.categories?.map(c => c.name) || [],
    }));

    // Filter by category if provided
    if (categoryFilter) {
      const relevantCategories = CATEGORY_MAP[categoryFilter] || [];
      if (relevantCategories.length > 0) {
        formattedProducts = formattedProducts.filter(p => 
          relevantCategories.some(cat => 
            p.category.includes(cat) || 
            p.allCategories.some((c: string) => c.includes(cat))
          )
        );
      }
    }

    return formattedProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Detect category from user message
function detectCategory(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('שולחן אוכל') || lowerMessage.includes('פינת אוכל') || lowerMessage.includes('סועדים')) {
    return 'שולחן אוכל';
  }
  if (lowerMessage.includes('שולחן סלון') || lowerMessage.includes('שולחן קפה')) {
    return 'שולחן סלון';
  }
  if (lowerMessage.includes('מזנון') || (lowerMessage.includes('סלון') && !lowerMessage.includes('שולחן'))) {
    return 'סלון';
  }
  if (lowerMessage.includes('מיטה') || lowerMessage.includes('חדר שינה') || lowerMessage.includes('קומודה') || lowerMessage.includes('שידת לילה')) {
    return 'חדר שינה';
  }
  if (lowerMessage.includes('קונסולה') || lowerMessage.includes('כניסה')) {
    return 'כניסה';
  }
  if (lowerMessage.includes('ספריה') || lowerMessage.includes('אחסון')) {
    return 'אחסון';
  }
  
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    // Detect category from user message
    const detectedCategory = detectCategory(message);
    console.log('🎯 Detected category:', detectedCategory, 'from message:', message);
    
    // Fetch products - filtered by category if detected
    const relevantProducts = await fetchProducts(detectedCategory);
    const allProducts = detectedCategory ? await fetchProducts() : relevantProducts;
    
    console.log('📦 Relevant products count:', relevantProducts.length);
    console.log('📦 Relevant product categories:', [...new Set(relevantProducts.map(p => p.category))]);
    
    // Create product catalog for AI context - show relevant products first
    const productCatalog = relevantProducts.map(p => 
      `- ${p.name} [קטגוריה: ${p.category}] - ${p.price}`
    ).join('\n');

    const categoryContext = detectedCategory 
      ? `\n🎯 הלקוח מחפש: ${detectedCategory}\nהמוצרים הרלוונטיים ביותר מסומנים למטה.`
      : '';

    const systemPrompt = `אתה יועץ עיצוב פנים מקצועי ואדיב של בלאנו - חנות רהיטים איכותיים.

התפקיד שלך:
1. להבין את צרכי הלקוח - גודל החדר, סגנון, תקציב, צבעים
2. להמליץ על רהיטים מתאימים **רק** מהקטלוג שלנו
3. לתת טיפים מעשיים לעיצוב וצבעים
4. להניע לפעולה בעדינות ובחום
${categoryContext}

🚨 קטלוג המוצרים (המלץ **רק** על מוצרים מהרשימה הזו!):
${productCatalog}

📋 כללים קריטיים - חובה לעקוב:
- המלץ **רק** על מוצרים מאותה קטגוריה שהלקוח מחפש!
- אם הלקוח מבקש שולחן אוכל - המלץ רק על שולחנות אוכל, לא שולחנות סלון!
- אם הלקוח מבקש מזנון - המלץ רק על מזנונים, לא שולחנות!
- **אסור להמציא מוצרים** - אם מוצר לא ברשימה, הוא לא קיים
- השתמש **בשמות המדויקים** מהרשימה

💡 טיפים לעיצוב וצבעים - תמיד תן טיפ אחד לפחות:
- הצע שילובי צבעים לקירות שיתאימו לרהיט
- תן טיפים על תאורה
- הצע אביזרים משלימים (שטיחים, כריות, עציצים)
- דבר על פרופורציות

🎨 שילובי צבעים מומלצים:
- עץ אלון טבעי/בהיר: קירות לבנים, אפור בהיר, תכלת עדין
- עץ אגוז כהה: קירות קרם, ירוק זית, אפור חם
- שחור מט: קירות לבנים עם אלמנט צבעוני (חרדל, כתום חמרה)
- לבן/שמנת: קירות בכל גוון - נותן גמישות מקסימלית

📞 הנעה לפעולה - חשוב מאוד!
אחרי כל המלצה או כשהשיחה מתקדמת, הזמן בעדינות וחום ליצור קשר:
- "אשמח לעזור לך עוד! אם תרצה לראות את הרהיטים או לשמוע עוד פרטים, הצוות שלנו זמין בטלפון 03-5566696 או בוואטסאפ 📱"
- "רוצה שאחד מהמעצבים שלנו יחזור אליך עם הצעה מותאמת? השאר פרטים או שלח הודעה בוואטסאפ"
- "מוזמן/ת לבקר באולם התצוגה שלנו ברחוב הברזל 38 ת"א לראות את הרהיטים מקרוב ✨"
- תשלב את ההזמנה בצורה טבעית, לא דוחפנית

דבר בעברית חמה וידידותית. שאל שאלות כדי להבין טוב יותר.
הצע 2-4 מוצרים מתאימים מהקטגוריה הנכונה בלבד.

כשאתה ממליץ על מוצרים, סיים עם:
[PRODUCTS: שם מוצר מדויק 1, שם מוצר מדויק 2]

⚠️ השמות חייבים להיות זהים לחלוטין לשמות שברשימה!`;

    // Build conversation history
    const conversationHistory = history
      .filter((msg: { role: string }) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Add current message
    conversationHistory.push({ role: 'user', content: message });

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1200,
      system: systemPrompt,
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Extract recommended product names
    const productMatch = assistantMessage.match(/\[PRODUCTS?:\s*([^\]]+)\]/i);
    let recommendedProducts: FormattedProduct[] = [];

    if (productMatch) {
      const productNames = productMatch[1].split(',').map(s => s.trim().toLowerCase());
      
      // First try to find in relevant products (correct category)
      recommendedProducts = relevantProducts.filter(product => {
        const productNameLower = product.name.toLowerCase();
        return productNames.some(searchName => 
          productNameLower.includes(searchName) || 
          searchName.includes(productNameLower.split(' ')[0])
        );
      }).slice(0, 6);

      // If no matches in relevant products, try all products but only as fallback
      if (recommendedProducts.length === 0) {
        recommendedProducts = allProducts.filter(product => {
          const productNameLower = product.name.toLowerCase();
          return productNames.some(searchName => 
            productNameLower.includes(searchName) || 
            searchName.includes(productNameLower.split(' ')[0])
          );
        }).slice(0, 4);
      }

      // Fuzzy search as last resort
      if (recommendedProducts.length === 0) {
        const keywords = productNames.flatMap(n => n.split(' '));
        recommendedProducts = relevantProducts.filter(product => {
          const productNameLower = product.name.toLowerCase();
          return keywords.some(keyword => 
            keyword.length > 2 && productNameLower.includes(keyword)
          );
        }).slice(0, 4);
      }
    }

    // Clean the response (remove the PRODUCTS tag)
    const cleanResponse = assistantMessage.replace(/\[PRODUCTS?:\s*[^\]]+\]/gi, '').trim();

    // Generate session ID from conversation length (simple approach)
    const sessionId = `session_${Date.now()}_${history.length}`;
    
    // Save to Google Sheets (async, don't wait)
    saveConversationToSheets(
      sessionId,
      message,
      cleanResponse,
      recommendedProducts.map(p => p.name),
      detectedCategory
    ).catch(err => console.error('Sheets save error:', err));

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      products: recommendedProducts,
    });

  } catch (error) {
    console.error('Design assistant error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
