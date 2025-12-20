# מדריך העברת bellano.co.il ל-Vercel

## סיכום
העברת הדומיין הראשי ל-Vercel תוך שמירה על גישה ל-WordPress Admin.

---

## מה יקרה אחרי ההעברה:

| כתובת | לאן מגיע |
|-------|----------|
| `bellano.co.il` | Vercel (Next.js) - מהיר! |
| `bellano.co.il/wp-admin` | השרת המקורי (WordPress) |
| `bellano.co.il/wp-json` | השרת המקורי (API) |
| `bellano.co.il/wp-content` | השרת המקורי (תמונות) |

**לא צריך לשנות כלום באפליקציות!**

---

## שלב 1: Cloudflare - Origin Rules

### נכנסים ל-Cloudflare:
1. https://dash.cloudflare.com
2. בחר את הדומיין `bellano.co.il`
3. בתפריט הצד: **Rules** → **Origin Rules**
4. לוחץ **Create rule**

### יוצרים 5 חוקים:

#### חוק 1 - WordPress Admin
- **Rule name:** `WordPress Admin`
- **When incoming requests match:** 
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/wp-admin`
- **Then:**
  - **Host Header** → Override to: `bellano.co.il`
  - **Destination Address** → Override to: `84.108.103.17`
- לוחץ **Deploy**

#### חוק 2 - WordPress Login
- **Rule name:** `WordPress Login`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `equals`
  - Value: `/wp-login.php`
- **Then:**
  - **Host Header** → Override to: `bellano.co.il`
  - **Destination Address** → Override to: `84.108.103.17`
- לוחץ **Deploy**

#### חוק 3 - WordPress API
- **Rule name:** `WordPress API`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/wp-json`
- **Then:**
  - **Host Header** → Override to: `bellano.co.il`
  - **Destination Address** → Override to: `84.108.103.17`
- לוחץ **Deploy**

#### חוק 4 - WordPress Content
- **Rule name:** `WordPress Content`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/wp-content`
- **Then:**
  - **Host Header** → Override to: `bellano.co.il`
  - **Destination Address** → Override to: `84.108.103.17`
- לוחץ **Deploy**

#### חוק 5 - WordPress Includes
- **Rule name:** `WordPress Includes`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/wp-includes`
- **Then:**
  - **Host Header** → Override to: `bellano.co.il`
  - **Destination Address** → Override to: `84.108.103.17`
- לוחץ **Deploy**

---

## שלב 2: Vercel - הוספת דומיין

1. נכנס ל-https://vercel.com
2. בוחר את פרויקט **Bellano**
3. **Settings** → **Domains**
4. לוחץ **Add**
5. מקליד: `bellano.co.il` → **Add**
6. לוחץ **Add** שוב
7. מקליד: `www.bellano.co.il` → **Add**

Vercel יציג הנחיות - בדרך כלל ה-IP הוא `76.76.21.21`

---

## שלב 3: Cloudflare - עדכון DNS

חוזרים ל-Cloudflare:
1. תפריט צד: **DNS** → **Records**
2. מוצאים את רשומת A של `@` (או `bellano.co.il`)
3. לוחצים **Edit**
4. משנים:
   - **IPv4 address:** `76.76.21.21`
   - **Proxy status:** ✅ Proxied (ענן כתום)
5. לוחצים **Save**

6. מוצאים את רשומת A של `www`
7. לוחצים **Edit**
8. משנים:
   - **IPv4 address:** `76.76.21.21`
   - **Proxy status:** ✅ Proxied (ענן כתום)
9. לוחצים **Save**

---

## שלב 4: בדיקה

אחרי כמה דקות, לבדוק:

- [ ] `bellano.co.il` - נפתח האתר החדש (Next.js)
- [ ] `bellano.co.il/wp-admin` - נפתח WordPress Admin
- [ ] `bellano.co.il/wp-json/wc/v3/products` - מחזיר JSON של מוצרים

---

## פתרון בעיות

### האתר לא נטען
- לחכות 5-10 דקות לעדכון DNS
- לנקות cache בדפדפן (Ctrl+Shift+R)

### wp-admin לא עובד
- לוודא שה-Origin Rules פעילים
- לוודא שה-Proxy מופעל (ענן כתום) ב-DNS

### שגיאת SSL
- לוודא שב-Cloudflare: **SSL/TLS** → **Full (strict)**

---

## פרטים טכניים

- **IP שרת WordPress:** `84.108.103.17`
- **IP Vercel:** `76.76.21.21` (לאמת ב-Vercel)
- **Cloudflare Proxy:** חייב להיות מופעל כדי ש-Origin Rules יעבדו

---

## תאריך יצירה
20 בדצמבר 2025
