import { Truck, ShieldCheck, Award, Heart } from 'lucide-react';

export const metadata = {
  title: 'אודותינו | בלאנו - רהיטי מעצבים',
  description: 'הכירו את בלאנו - רהיטי מעצבים. אנחנו מייצרים רהיטים איכותיים בישראל עם תשומת לב לכל פרט',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">דף הבית</a>
        <span className="mx-2">/</span> 
        <span>אודותינו</span>
      </nav>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">אודות בלאנו</h1>

        {/* Hero Text */}
        <div className="text-center mb-12">
          <p className="text-xl text-muted-foreground leading-relaxed">
            בלאנו היא חברת רהיטים ישראלית המתמחה בעיצוב וייצור רהיטים איכותיים לבית.
            אנחנו מאמינים שכל בית ראוי לרהיטים יפים, איכותיים ופונקציונליים.
          </p>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-8 mb-16">
          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <Award className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">איכות ללא פשרות</h3>
            <p className="text-muted-foreground">
              אנחנו משתמשים רק בחומרי גלם איכותיים ומקפידים על תהליך ייצור קפדני
            </p>
          </div>

          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">תשומת לב לפרטים</h3>
            <p className="text-muted-foreground">
              כל מוצר עובר בקרת איכות קפדנית לפני שהוא יוצא מהמפעל שלנו
            </p>
          </div>

          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <Truck className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">משלוח חינם</h3>
            <p className="text-muted-foreground">
              אנחנו מספקים משלוח חינם עד הבית לכל רחבי הארץ
            </p>
          </div>

          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">אחריות מלאה</h3>
            <p className="text-muted-foreground">
              כל המוצרים שלנו מגיעים עם אחריות מלאה לשנה
            </p>
          </div>
        </div>

        {/* Story */}
        <div className="prose prose-lg max-w-none">
          <h2>הסיפור שלנו</h2>
          <p>
            בלאנו נוסדה מתוך אהבה לעיצוב ורצון להנגיש רהיטי מעצבים איכותיים לכל בית בישראל.
            אנחנו מאמינים שהבית הוא המקום החשוב ביותר, ולכן משקיעים מחשבה רבה בכל פרט בעיצוב המוצרים שלנו.
          </p>
          <p>
            הקולקציות שלנו משלבות עיצוב מודרני עם פונקציונליות, ומיוצרות בישראל עם תשומת לב לכל פרט.
            אנחנו גאים להציע מגוון רחב של רהיטים - ממזנונים ושולחנות סלון, דרך קומודות ושידות, ועד כורסאות ומיטות.
          </p>
          <p>
            השירות שלנו לא נגמר ברכישה - צוות שירות הלקוחות שלנו זמין עבורכם בכל שאלה, 
            ואנחנו מקפידים על חווית קנייה מושלמת מהרגע הראשון ועד הגעת המוצר לביתכם.
          </p>
        </div>
      </div>
    </div>
  );
}
