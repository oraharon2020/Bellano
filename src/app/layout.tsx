import type { Metadata } from "next";
import { Rubik, Inter } from "next/font/google";
import Script from "next/script";
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
    google: "MFPhXQELpvk-2gH-jHTP0R4LTOxhJxrH-DVa8l6Hqis",
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
        {/* Favicon from WordPress */}
        <link rel="icon" href="https://bellano.co.il/wp-content/uploads/2024/04/cropped-bellano-logo-square-32x32.webp" sizes="32x32" />
        <link rel="icon" href="https://bellano.co.il/wp-content/uploads/2024/04/cropped-bellano-logo-square-192x192.webp" sizes="192x192" />
        <link rel="apple-touch-icon" href="https://bellano.co.il/wp-content/uploads/2024/04/cropped-bellano-logo-square-180x180.webp" />
        
        {/* Facebook Domain Verification */}
        <meta name="facebook-domain-verification" content="v0s7x4i0ko65qjr2nczfx0yoshknu0" />
        
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://bellano.co.il" />
        <link rel="dns-prefetch" href="https://bellano.co.il" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* JSON-LD Structured Data */}
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <LocalBusinessJsonLd />
      </head>
      <body className={`${rubik.variable} ${inter.variable} font-sans antialiased`}>
        {/* Google Tag Manager - loaded after page is interactive */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GT-WBL97X64"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('set', 'linker', {'domains': ['bellano.co.il']});
            gtag('config', 'GT-WBL97X64');
            gtag('config', 'AW-16598610854');
          `}
        </Script>
        
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <FloatingButtons />
      </body>
    </html>
  );
}