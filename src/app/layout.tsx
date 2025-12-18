import type { Metadata } from "next";
import { Rubik, Inter } from "next/font/google";
import "./globals.css";
import { Header, Footer, FloatingButtons } from "@/components/layout";
import { OrganizationJsonLd, WebsiteJsonLd, LocalBusinessJsonLd } from "@/components/seo";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_URL = 'https://bellano.co.il';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "בלאנו - רהיטי מעצבים | משלוח חינם עד הבית",
    template: "%s | בלאנו - רהיטי מעצבים",
  },
  description:
    "בלאנו - רהיטי מעצבים. מבחר רחב של רהיטים איכותיים: מזנונים, שולחנות סלון, קומודות, כורסאות, מיטות ועוד. משלוח חינם עד הבית!",
  keywords: [
    "רהיטים",
    "מזנונים",
    "שולחנות סלון",
    "קומודות",
    "כורסאות",
    "מיטות",
    "רהיטי מעצבים",
    "בלאנו",
    "ריהוט לבית",
    "ריהוט מעוצב",
    "רהיטים אונליין",
  ],
  authors: [{ name: "בלאנו" }],
  creator: "בלאנו",
  publisher: "בלאנו",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "בלאנו - רהיטי מעצבים",
    description: "מבחר רחב של רהיטים איכותיים. משלוח חינם עד הבית!",
    url: SITE_URL,
    siteName: "בלאנו",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "בלאנו - רהיטי מעצבים",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "בלאנו - רהיטי מעצבים",
    description: "מבחר רחב של רהיטים איכותיים. משלוח חינם עד הבית!",
    images: [`${SITE_URL}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://bellano.co.il" />
        <link rel="dns-prefetch" href="https://bellano.co.il" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* JSON-LD Structured Data */}
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <LocalBusinessJsonLd />
      </head>
      <body className={`${rubik.variable} ${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <FloatingButtons />
      </body>
    </html>
  );
}