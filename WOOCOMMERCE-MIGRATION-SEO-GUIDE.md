# מדריך SEO למעבר מ-WooCommerce ל-Next.js

## סקירה כללית

מעבר מ-WooCommerce ל-Next.js דורש טיפול קפדני ב-URLs ישנים כדי לשמור על דירוג ה-SEO. המדריך הזה מכיל את כל מה שצריך להכין **לפני** המעבר.

---

## 1. איסוף URLs לפני המעבר

### אפשרות א: Google Search Console
1. היכנס ל-Search Console
2. לך ל-"Coverage" או "Pages"
3. הורד CSV של כל ה-URLs (גם תקינים וגם בעייתיים)

### אפשרות ב: Sitemap קיים
```bash
curl https://your-site.com/sitemap.xml
```

### אפשרות ג: Screaming Frog
סרוק את האתר הישן ויצא רשימת URLs.

---

## 2. מיפוי תבניות URLs

| תבנית ישנה (WooCommerce) | תבנית חדשה (Next.js) | פעולה |
|--------------------------|---------------------|-------|
| `/product-category/X/` | `/category/X/` | Redirect 308 |
| `/product-category/parent/child/` | `/category/child/` | Redirect 308 |
| `/product/X/` | `/product/X/` | אותו דבר |
| `/product/X/?add-to-cart=Y` | `/product/X/` | נקה פרמטרים |
| `/shop/` | `/categories/` | Redirect 308 |
| `/color-product/X/` | `/categories/` | Redirect 308 |
| `/wp-login.php` | - | 410 Gone |
| `/wp-admin/` | - | 410 Gone |
| `/.../feed/` | - | 410 Gone |
| `?orderby=...` | להסיר | Redirect נקי |
| `?filter_color=...` | להסיר | Redirect נקי |
| `?category-view-mode=...` | להסיר | Redirect נקי |
| `?product_col_large=...` | להסיר | Redirect נקי |

---

## 3. קובץ Middleware מוכן

צור את הקובץ `src/middleware.ts`:

```typescript
// src/middleware.ts - תבנית בסיס למעבר WooCommerce → Next.js
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // ⚠️ שנה את הדומיין שלך כאן!
  const baseUrl = 'https://www.YOUR-DOMAIN.co.il';

  // 1. Block WordPress admin pages - 410 Gone
  if (pathname.startsWith('/wp-login') || pathname.startsWith('/wp-admin')) {
    return new NextResponse(null, { status: 410 });
  }

  // 2. Block RSS feeds - 410 Gone
  if (pathname.endsWith('/feed/') || pathname.endsWith('/feed')) {
    return new NextResponse(null, { status: 410 });
  }

  // 3. Redirect /shop/ to categories
  if (pathname === '/shop' || pathname === '/shop/') {
    return NextResponse.redirect(new URL('/categories', baseUrl), 308);
  }

  // 4. Redirect /color-product/ (WooCommerce color filter)
  if (pathname.startsWith('/color-product/')) {
    return NextResponse.redirect(new URL('/categories', baseUrl), 308);
  }

  // 5. Clean add-to-cart from product URLs
  if (pathname.startsWith('/product/') && searchParams.has('add-to-cart')) {
    return NextResponse.redirect(new URL(pathname, baseUrl), 308);
  }

  // 6. Redirect /product-category/ → /category/
  if (pathname.startsWith('/product-category/')) {
    const segments = pathname.replace('/product-category/', '').split('/').filter(Boolean);
    const lastSlug = segments[segments.length - 1] || segments[0];
    const cleanUrl = new URL(`/category/${lastSlug}`, baseUrl);
    
    if (searchParams.has('page')) {
      cleanUrl.searchParams.set('page', searchParams.get('page')!);
    }
    
    return NextResponse.redirect(cleanUrl, 308);
  }

  // 7. Handle /category/ URLs
  if (pathname.startsWith('/category/')) {
    const pathParts = pathname.split('/').filter(Boolean);
    
    // Handle nested categories: /category/parent/child → /category/child
    if (pathParts.length > 2) {
      const lastSlug = pathParts[pathParts.length - 1];
      const cleanUrl = new URL(`/category/${lastSlug}`, baseUrl);
      
      if (searchParams.has('page')) {
        cleanUrl.searchParams.set('page', searchParams.get('page')!);
      }
      
      return NextResponse.redirect(cleanUrl, 308);
    }
    
    // Clean sorting/filtering params
    const hasJunkParams = searchParams.has('orderby') || 
                          searchParams.has('order') ||
                          searchParams.has('filter_color') || 
                          searchParams.has('min_price') ||
                          searchParams.has('max_price') ||
                          searchParams.has('category-view-mode') ||
                          searchParams.has('product_col_large') ||
                          searchParams.has('add-to-cart');
    
    if (hasJunkParams) {
      const cleanUrl = new URL(pathname, baseUrl);
      
      if (searchParams.has('page')) {
        cleanUrl.searchParams.set('page', searchParams.get('page')!);
      }
      
      return NextResponse.redirect(cleanUrl, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/wp-login.php',
    '/wp-admin/:path*',
    '/shop/:path*',
    '/color-product/:path*',
    '/product/:path*',
    '/product-category/:path*',
    '/category/:path*',
    '/:path*/feed',
  ],
};
```

---

## 4. robots.txt

צור או עדכן את `public/robots.txt`:

```
User-agent: *
Allow: /

# Block WordPress legacy URLs
Disallow: /wp-admin/
Disallow: /wp-login.php
Disallow: /wp-content/
Disallow: /wp-includes/

# Block WooCommerce junk URLs
Disallow: /*?orderby=
Disallow: /*?add-to-cart=
Disallow: /*?filter_
Disallow: /*?category-view-mode=
Disallow: /*?product_col_large=
Disallow: /color-product/
Disallow: /shop/

# Block feeds
Disallow: /*/feed/
Disallow: /*/feed

# Sitemap
Sitemap: https://www.YOUR-DOMAIN.co.il/sitemap.xml
```

---

## 5. Sitemap דינמי

וודא שה-sitemap שלך ב-Next.js כולל **רק URLs נקיים**:

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.YOUR-DOMAIN.co.il';
  
  // Fetch categories from API
  const categories = await getCategories();
  
  // Fetch products from API
  const products = await getProducts();
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Categories - clean URLs only
    ...categories.map((cat) => ({
      url: `${baseUrl}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Products - clean URLs only
    ...products.map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
```

---

## 6. צ'קליסט לפני מעבר

- [ ] הורדת CSV של כל URLs מ-Search Console
- [ ] זיהוי כל תבניות ה-URLs הייחודיות
- [ ] הכנת middleware.ts עם כל ההפניות
- [ ] הכנת robots.txt
- [ ] הכנת sitemap דינמי
- [ ] בדיקה שכל הקטגוריות קיימות ב-Next.js
- [ ] בדיקה שכל המוצרים קיימים ב-Next.js
- [ ] הגדרת canonical URLs בכל הדפים
- [ ] הגדרת meta robots: index, follow

---

## 7. אחרי המעבר

### בדיקות מיידיות
```bash
# בדוק redirect של קטגוריה ישנה
curl -sI "https://www.YOUR-DOMAIN.co.il/product-category/test/"

# בדוק שה-410 עובד
curl -sI "https://www.YOUR-DOMAIN.co.il/wp-login.php"

# בדוק שה-sitemap נגיש
curl -s "https://www.YOUR-DOMAIN.co.il/sitemap.xml" | head -20
```

### ב-Search Console
1. הגש את ה-sitemap החדש
2. בקש אינדקס מחדש לדפים החשובים
3. עקוב אחרי "Coverage" בימים הקרובים

---

## 8. קודי תגובה - מתי להשתמש בכל אחד

| קוד | שימוש |
|-----|-------|
| **308** | Redirect קבוע (כמו 301, אבל שומר על method) |
| **410** | הדף נמחק לצמיתות - גוגל יסיר מהאינדקס |
| **404** | הדף לא קיים - גוגל ינסה שוב מאוחר יותר |

### מתי 410 ומתי redirect?
- **410**: דפים שלא אמורים להיות באינדקס בכלל (wp-login, feeds)
- **Redirect**: דפים שעברו למיקום חדש (product-category → category)

---

## דוגמאות לבעיות נפוצות

### בעיה: קטגוריות מקוננות
```
ישן: /product-category/living-room/sofas/
חדש: /category/sofas/
```

### בעיה: פרמטרי מיון
```
ישן: /category/sofas/?orderby=price&order=desc
חדש: /category/sofas/
```

### בעיה: דפי צבעים
```
ישן: /color-product/oak-white/?category-view-mode=grid
חדש: /categories/ (אין תחליף ישיר)
```

---

## משאבים נוספים

- [Google Search Console](https://search.google.com/search-console)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

---

*נוצר על ידי צוות הפיתוח - ינואר 2026*
