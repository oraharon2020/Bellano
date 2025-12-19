'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { FAQJsonLd } from '@/components/seo';

const faqs = [
  {
    question: 'מהו זמן האספקה של הרהיטים?',
    answer: 'זמן האספקה הוא בין 14 ל-21 ימי עסקים מרגע אישור ההזמנה. במידה ונדרש זמן ייצור נוסף, נעדכן אתכם מראש.',
  },
  {
    question: 'האם אתם מספקים משלוח חינם?',
    answer: 'כן! אנו מספקים משלוח חינם לכל רחבי הארץ. המשלוח כולל הובלה עד הבית והרכבה מלאה של הרהיט.',
  },
  {
    question: 'האם יש אפשרות לתיאום זמן אספקה ספציפי?',
    answer: 'בהחלט. לאחר שהרהיט מוכן, נציג שירות יצור איתכם קשר לתיאום מועד אספקה שנוח לכם.',
  },
  {
    question: 'האם אתם מספקים אחריות על הרהיטים?',
    answer: 'כן, כל הרהיטים שלנו מגיעים עם אחריות של שנה מלאה הכוללת תיקון או החלפה במקרה של תקלה.',
  },
  {
    question: 'כיצד ניתן לבצע הזמנה באתר?',
    answer: 'פשוט מאוד! בחרו את המוצר הרצוי, הוסיפו לסל, ועברו לתשלום. תוכלו לשלם בכרטיס אשראי עד 12 תשלומים ללא ריבית.',
  },
  {
    question: 'אילו אפשרויות תשלום זמינות?',
    answer: 'אנו מקבלים כרטיסי אשראי (ויזה, מאסטרקארד, אמריקן אקספרס), תשלום ב-bit ואפשרות לתשלומים ללא ריבית.',
  },
  {
    question: 'האם ניתן לבטל הזמנה לאחר ביצוע?',
    answer: 'ניתן לבטל הזמנה תוך 14 ימים מיום ההזמנה בהתאם לחוק הגנת הצרכן, בתנאי שהייצור טרם החל.',
  },
  {
    question: 'האם יש אפשרות לראות את הרהיטים לפני רכישה?',
    answer: 'אנחנו חנות אונליין בלבד ואין לנו תצוגה פיזית. עם זאת, התמונות באתר מציגות את הרהיטים בצורה מדויקת ותוכלו לראות אותם מכל הזוויות.',
  },
  {
    question: 'האם יש אפשרות להתאים אישית את הרהיטים?',
    answer: 'כן! אנו מציעים מגוון אפשרויות להתאמה אישית כולל בחירת גוונים, חומרים ומידות. בדף המוצר תוכלו לראות את כל האופציות.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-white min-h-screen">
      {/* FAQ Schema for Google */}
      <FAQJsonLd questions={faqs} />
      
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-black">דף הבית</Link>
            <span>/</span>
            <span className="text-gray-900">שאלות נפוצות</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">שאלות נפוצות</h1>
          <p className="text-gray-500 text-center mb-8">מצאו תשובות לשאלות הנפוצות ביותר</p>
          
          {/* FAQ Accordion */}
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {openIndex === index && (
                  <div className="px-4 pb-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">לא מצאתם תשובה?</h3>
            <p className="text-gray-500 text-sm mb-4">צוות שירות הלקוחות שלנו ישמח לעזור</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="tel:03-5566696"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Phone className="w-4 h-4" />
                03-5566696
              </a>
              <a 
                href="https://wa.me/97235566696"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                וואטסאפ
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
