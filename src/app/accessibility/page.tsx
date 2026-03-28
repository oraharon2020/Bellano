import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `הצהרת נגישות | ${siteConfig.name}`,
  description: `הצהרת נגישות של אתר ${siteConfig.fullName}`,
  alternates: {
    canonical: `${siteConfig.url}/accessibility`,
  },
};

export default function AccessibilityPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">הצהרת נגישות</h1>
        
        <div className="prose prose-lg max-w-none text-right" dir="rtl">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">כללי</h2>
            <p className="text-gray-600 leading-relaxed">
              אתר {siteConfig.fullName} מחויב לספק חוויית גלישה נגישה לכל המשתמשים, 
              כולל אנשים עם מוגבלויות. אנו משקיעים מאמצים רבים על מנת להבטיח 
              שהאתר יהיה נגיש ושימושי עבור כולם.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">תקנות נגישות</h2>
            <p className="text-gray-600 leading-relaxed">
              אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות 
              (התאמות נגישות לשירות), התשע&quot;ג-2013 ובהתאם לתקן הישראלי 
              ת&quot;י 5568 המבוסס על הנחיות WCAG 2.0 ברמת AA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">התאמות הנגישות באתר</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>התאמת האתר לקוראי מסך</li>
              <li>ניווט באמצעות מקלדת</li>
              <li>הגדלה והקטנה של טקסטים</li>
              <li>שינוי ניגודיות צבעים</li>
              <li>הדגשת קישורים</li>
              <li>תצוגה בגווני אפור</li>
              <li>תיאור טקסטואלי לתמונות</li>
              <li>מבנה כותרות היררכי</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">כיצד להשתמש בתפריט הנגישות</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              בפינה השמאלית התחתונה של האתר קיים כפתור נגישות (סמל נגישות). 
              לחיצה על הכפתור תפתח תפריט עם האפשרויות הבאות:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>גודל טקסט:</strong> הגדלה והקטנה של הטקסט באתר</li>
              <li><strong>ניגודיות גבוהה:</strong> הגברת הניגודיות לקריאות טובה יותר</li>
              <li><strong>גווני אפור:</strong> הצגת האתר בשחור-לבן</li>
              <li><strong>הדגשת קישורים:</strong> הבלטת כל הקישורים באתר</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">דפדפנים נתמכים</h2>
            <p className="text-gray-600 leading-relaxed">
              האתר תומך בדפדפנים המובילים בגרסאותיהם העדכניות: 
              Google Chrome, Mozilla Firefox, Safari, Microsoft Edge.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">יצירת קשר בנושא נגישות</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              אם נתקלתם בבעיית נגישות באתר או שיש לכם הצעות לשיפור, 
              נשמח לשמוע מכם:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>טלפון:</strong> 03-5566696</p>
              <p className="text-gray-700"><strong>וואטסאפ:</strong> 03-5566696</p>
              <p className="text-gray-700"><strong>אימייל:</strong> {siteConfig.email}</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">עדכון הצהרת הנגישות</h2>
            <p className="text-gray-600 leading-relaxed">
              הצהרה זו עודכנה לאחרונה בתאריך: דצמבר 2025
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              אנו ממשיכים לשפר את נגישות האתר באופן שוטף.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
