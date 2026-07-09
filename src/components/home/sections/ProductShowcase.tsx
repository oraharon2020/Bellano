import Link from 'next/link';
import Image from 'next/image';
import { getProductsWithSwatches } from '@/lib/woocommerce';

type Product = Awaited<ReturnType<typeof getProductsWithSwatches>>[number];

function SectionHead({ kicker, title, href, linkLabel }: { kicker: string; title: React.ReactNode; href: string; linkLabel: string }) {
  return (
    <div className="flex items-end justify-between mb-8 md:mb-12">
      <div>
        <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">{kicker}</p>
        <h2 className="text-3xl md:text-5xl font-light tracking-tight">{title}</h2>
      </div>
      <Link href={href} className="group hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors">
        <span className="uppercase tracking-[0.15em] text-xs border-b border-gray-300 group-hover:border-black pb-1">{linkLabel}</span>
        <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
      </Link>
    </div>
  );
}

function discountPercent(regular?: string, sale?: string) {
  const r = parseFloat((regular || '').replace(/[^\d.]/g, ''));
  const s = parseFloat((sale || '').replace(/[^\d.]/g, ''));
  if (!r || !s || s >= r) return 0;
  return Math.round(((r - s) / r) * 100);
}

function ProductCard({ product, sale = false }: { product: Product; sale?: boolean }) {
  const discount = sale ? discountPercent(product.regularPrice, product.salePrice || product.price) : 0;
  return (
    <Link href={`/product/${product.slug}`} className="group flex-shrink-0 w-[68vw] md:w-auto">
      <div className="relative aspect-square overflow-hidden bg-[#f4f3f1] mb-4">
        {product.image && (
          <Image
            src={product.image.sourceUrl}
            alt={product.name}
            fill
            className={
              product.galleryImages?.[0]
                ? 'object-cover transition-opacity duration-500 group-hover:opacity-0'
                : 'object-cover transition-transform duration-700 group-hover:scale-105'
            }
            sizes="(max-width: 768px) 68vw, 300px"
            quality={78}
          />
        )}
        {product.galleryImages?.[0] && (
          <Image
            src={product.galleryImages[0].sourceUrl}
            alt={product.galleryImages[0].altText || product.name}
            fill
            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            sizes="(max-width: 768px) 68vw, 300px"
            quality={78}
          />
        )}
        {sale ? (
          <span className="absolute top-0 right-0 bg-black text-white text-[11px] font-english tracking-[0.15em] px-3 py-1.5">
            {discount > 0 ? `${discount}%-` : 'SALE'}
          </span>
        ) : (
          product.onSale && (
            <span className="absolute top-0 right-0 bg-black text-white text-[11px] font-english tracking-[0.15em] px-3 py-1.5">
              SALE
            </span>
          )
        )}
        {/* Hairline reveal-on-hover CTA */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/90 text-white text-center text-xs tracking-[0.2em] uppercase py-3">
          צפייה במוצר
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-base group-hover:text-gray-500 transition-colors line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-3">
          {product.regularPrice && (product.onSale || sale) && (
            <span className="text-gray-400 line-through text-sm">{product.regularPrice}</span>
          )}
          <span className="font-bold text-lg">{sale ? product.salePrice || product.price : product.price}</span>
        </div>
      </div>
    </Link>
  );
}

export async function BestSellersSection() {
  const products = await getProductsWithSwatches({ per_page: 8, orderby: 'popularity' });
  if (!products.length) return null;
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-8">
        <SectionHead
          kicker="Bestsellers"
          title={<>הנמכרים <span className="font-bold">ביותר</span></>}
          href="/categories"
          linkLabel="All products"
        />
        <div className="flex md:grid md:grid-cols-4 gap-5 md:gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

export async function SaleSection() {
  let products: Product[] = [];
  try {
    products = await getProductsWithSwatches({ per_page: 8, on_sale: true, orderby: 'popularity' });
  } catch {
    /* skipped when unavailable */
  }
  if (!products.length) return null;
  return (
    <section className="py-16 md:py-24 bg-[#f7f6f4]">
      <div className="container mx-auto px-5 md:px-8">
        <SectionHead
          kicker="Sale"
          title={<>מבצעים <span className="font-bold">חמים</span></>}
          href="/category/sale"
          linkLabel="All offers"
        />
        <div className="flex md:grid md:grid-cols-4 gap-5 md:gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} sale />
          ))}
        </div>
      </div>
    </section>
  );
}
