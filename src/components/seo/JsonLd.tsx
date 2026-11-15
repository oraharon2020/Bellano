// JSON-LD Structured Data Components for SEO
import { siteConfig } from '@/config/site';
import { delivery } from '@/config/delivery';
import { metaDescription } from '@/lib/meta-description';

interface OrganizationJsonLdProps {
  name?: string;
  url?: string;
  logo?: string;
  phone?: string;
  email?: string;
}

export function OrganizationJsonLd({
  name = siteConfig.fullName,
  url = siteConfig.url,
  logo = `${siteConfig.url}/_next/image?url=${encodeURIComponent(siteConfig.logo.wordpressUrl)}&w=256&q=75`,
  phone = siteConfig.phone,
  email = siteConfig.email,
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
      siteConfig.social.facebook,
      siteConfig.social.instagram,
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
  name = siteConfig.fullName,
  url = siteConfig.url,
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
        urlTemplate: `${url}/categories?search={search_term_string}`,
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
  /** Sold from stock, so it can be returned. Made-to-order pieces cannot, and the schema then states no return policy at all. */
  returnable?: boolean;
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
  brand = siteConfig.name,
  rating,
  reviewCount,
  returnable = false,
}: ProductJsonLdProps) {
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: metaDescription(description, 500),
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
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: siteConfig.name,
      },
      // Free delivery anywhere in Israel, in the range the product page's FAQ promises (terms 6.1).
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'ILS',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IL',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            // The promise is order-to-doorstep; the days on the road come off the top.
            minValue: delivery.days.min,
            maxValue: delivery.days.max - 3,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
      // Terms 5.1–5.2: a piece from stock can be returned under the Consumer Protection Law, unused and
      // in its packaging, the return haulage at the customer's cost; a made-to-order piece is outside it.
      ...(returnable && {
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'IL',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 14,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
        },
      }),
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
  name = siteConfig.fullName,
  url = siteConfig.url,
  phone = siteConfig.phone,
  address = {
    street: siteConfig.business.address.street,
    city: siteConfig.business.address.city,
    postalCode: siteConfig.business.address.postalCode,
    country: siteConfig.business.address.country,
  },
}: LocalBusinessJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${url}/#store`,
    name,
    url,
    telephone: phone,
    address: {
      '@type': 'PostalAddress',
      addressCountry: address.country,
      addressLocality: address.city,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '10:00',
        closes: '17:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Friday'],
        opens: '10:00',
        closes: '13:00',
      },
    ],
    priceRange: siteConfig.business.priceRange,
    potentialAction: {
      '@type': 'BuyAction',
      target: url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// FAQ Schema - Shows as expandable Q&A in Google search results
interface FAQJsonLdProps {
  questions: { question: string; answer: string }[];
}

export function FAQJsonLd({ questions }: FAQJsonLdProps) {
  if (!questions || questions.length === 0) return null;
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// CollectionPage + ItemList Schema - Tells Google a category page is a
// product collection, making products eligible for rich results / carousels.
interface CollectionPageJsonLdProps {
  name: string;
  url: string;
  description?: string;
  image?: string;
  products: {
    name: string;
    slug: string;
    image?: string;
    price?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  }[];
}

export function CollectionPageJsonLd({
  name,
  url,
  description,
  image,
  products,
}: CollectionPageJsonLdProps) {
  const itemListElements = products.map((product, index) => {
    const productUrl = `${siteConfig.url}/product/${product.slug}`;
    const item: any = {
      '@type': 'Product',
      name: product.name,
      url: productUrl,
      brand: {
        '@type': 'Brand',
        name: siteConfig.name,
      },
    };

    if (product.image) {
      item.image = product.image;
    }

    const priceValue = parseFloat((product.price || '').replace(/[^\d.]/g, ''));
    if (priceValue > 0) {
      item.offers = {
        '@type': 'Offer',
        price: priceValue,
        priceCurrency: 'ILS',
        availability: `https://schema.org/${product.availability || 'InStock'}`,
        url: productUrl,
        seller: {
          '@type': 'Organization',
          name: siteConfig.name,
        },
      };
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      item,
    };
  });

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}/#collection`,
    name,
    url,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: itemListElements,
    },
  };

  if (description) {
    jsonLd.description = description.replace(/<[^>]*>/g, '').slice(0, 500);
  }

  if (image) {
    jsonLd.image = image;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

