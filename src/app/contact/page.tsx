import Link from 'next/link';
import { Phone, Mail, MessageCircle, Clock } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { BreadcrumbJsonLd } from '@/components/seo';
import ContactForm from '@/components/contact/ContactForm';

const SITE_URL = siteConfig.url;

export default function ContactPage() {
  return (
    <div className="bg-white min-h-screen">
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: 'צרו קשר', url: `${SITE_URL}/contact` },
        ]} 
      />

      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-black">דף הבית</Link>
            <span>/</span>
            <span className="text-gray-900">צרו קשר</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">צרו קשר</h1>
          <p className="text-gray-500 text-center mb-10">נשמח לעמוד לשירותכם ולענות על כל שאלה</p>
          
          {/* Contact Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <a 
              href={`tel:${siteConfig.phoneClean}`}
              className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:border-black transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 mb-1">טלפון</span>
              <span className="font-medium">{siteConfig.phone}</span>
            </a>

            <a 
              href={`https://wa.me/${siteConfig.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:border-green-500 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 mb-1">וואטסאפ</span>
              <span className="font-medium">{siteConfig.phone}</span>
            </a>

            <a 
              href={`mailto:${siteConfig.email}`}
              className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:border-black transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 mb-1">אימייל</span>
              <span className="font-medium">{siteConfig.email}</span>
            </a>
          </div>

          {/* Hours */}
          <div className="bg-gray-50 rounded-lg p-6 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="font-medium">שעות פעילות</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                <span className="text-gray-600">ימים א׳ - ה׳</span>
                <span className="font-medium">10:00 - 17:00</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                <span className="text-gray-600">יום ו׳ וערבי חג</span>
                <span className="font-medium">10:00 - 13:00</span>
              </div>
            </div>
          </div>

          {/* Contact Form (client component) */}
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
