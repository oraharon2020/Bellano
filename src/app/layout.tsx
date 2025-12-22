import type { Metadata } from "next";
import { Rubik, Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header, Footer, FloatingButtons } from "@/components/layout";
import { OrganizationJsonLd, WebsiteJsonLd, LocalBusinessJsonLd } from "@/components/seo";
import { siteConfig } from "@/config/site";
import PromoPopup from "@/components/PromoPopup";
import { AdminLoginModal } from "@/components/layout/AdminLoginModal";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.fullName} | משלוח חינם עד הבית`,
    template: `%s | ${siteConfig.fullName}`,
  },
  description: `${siteConfig.fullName}. ${siteConfig.description}`,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: siteConfig.fullName,
    description: siteConfig.shortDescription,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [
      {
        url: `${siteConfig.url}${siteConfig.ogImage}`,
        width: 800,
        height: 800,
        alt: siteConfig.fullName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.fullName,
    description: siteConfig.shortDescription,
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
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
    google: siteConfig.analytics.googleVerification,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.language} dir={siteConfig.direction}>
      <head>
        {/* Favicon */}
        <link rel="icon" href={siteConfig.favicon.ico32} sizes="32x32" />
        <link rel="icon" href={siteConfig.favicon.ico192} sizes="192x192" />
        <link rel="apple-touch-icon" href={siteConfig.favicon.appleTouchIcon} />
        
        {/* Facebook Domain Verification */}
        <meta name="facebook-domain-verification" content={siteConfig.analytics.facebookDomainVerification} />
        
        {/* Preconnect to external resources */}
        <link rel="preconnect" href={siteConfig.wordpressUrl} />
        <link rel="dns-prefetch" href={siteConfig.wordpressUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* JSON-LD Structured Data */}
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <LocalBusinessJsonLd />
      </head>
      <body className={`${rubik.variable} ${inter.variable} font-sans antialiased`}>
        {/* Google Ads & GA4 - gtag.js - loads after page is fully loaded */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.analytics.googleAds}`}
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${siteConfig.analytics.googleAds}');
          `}
        </Script>
        
        {/* Meta Pixel (Facebook) - loads after page is fully loaded */}
        <Script id="meta-pixel" strategy="lazyOnload">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${siteConfig.analytics.facebookPixel}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${siteConfig.analytics.facebookPixel}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <FloatingButtons />
        <PromoPopup />
        <AdminLoginModal />
        <Analytics />
      </body>
    </html>
  );
}