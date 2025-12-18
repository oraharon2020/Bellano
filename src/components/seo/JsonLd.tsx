// JSON-LD Structured Data Components for SEO

interface OrganizationJsonLdProps {
  name?: string;
  url?: string;
  logo?: string;
  phone?: string;
  email?: string;
}

export function OrganizationJsonLd({
  name = 'בלאנו - רהיטי מעצבים',
  url = 'https://bellano.co.il',
  logo = 'https://bellano.co.il/logo.png',
  phone = '03-5566696',
  email = 'info@bellano.co.il',
}: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: phone,
      email,
      contactType: 'customer service',
      availableLanguage: 'Hebrew',
    },
    sameAs: [
      'https://www.facebook.com/bellano.co.il',
      'https://www.instagram.com/bellano.co.il',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface WebsiteJsonLdProps {
  name?: string;
  url?: string;
}

export function WebsiteJsonLd({
  name = 'בלאנו - רהיטי מעצבים',
  url = 'https://bellano.co.il',
}: WebsiteJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/?s={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string;
  url: string;
  price: string;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
}

export function ProductJsonLd({
  name,
  description,
  image,
  url,
  price,
  currency = 'ILS',
  availability = 'InStock',
  sku,
  brand = 'בלאנו',
  rating,
  reviewCount,
}: ProductJsonLdProps) {
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description?.replace(/<[^>]*>/g, '').slice(0, 500),
    image,
    url,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    offers: {
      '@type': 'Offer',
      price: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
      seller: {
        '@type': 'Organization',
        name: 'בלאנו',
      },
    },
  };

  if (sku) {
    jsonLd.sku = sku;
  }

  if (rating && reviewCount) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface LocalBusinessJsonLdProps {
  name?: string;
  url?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export function LocalBusinessJsonLd({
  name = 'בלאנו - רהיטי מעצבים',
  url = 'https://bellano.co.il',
  phone = '03-5566696',
  address = {
    street: 'הברזל 30',
    city: 'תל אביב',
    postalCode: '6971046',
    country: 'IL',
  },
}: LocalBusinessJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name,
    url,
    telephone: phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 32.0853,
      longitude: 34.7818,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '10:00',
        closes: '17:00',
      },
    ],
    priceRange: '₪₪₪',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
