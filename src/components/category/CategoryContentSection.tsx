import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
import FaqAccordion from '@/components/faq/FaqAccordion';
import { FAQJsonLd } from '@/components/seo';
import { ExpandableArticle } from '@/components/category/ExpandableArticle';
import type { CategoryContent } from '@/lib/wordpress';

interface CategoryContentSectionProps {
  content: CategoryContent;
  categoryName: string;
}

/** Centered section heading with a short accent underline. */
function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-8 text-center">
      {eyebrow && (
        <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
      <span className="mt-4 mx-auto block h-1 w-12 rounded-full bg-primary/80" />
    </div>
  );
}

/**
 * Rich SEO content block rendered at the bottom of a category page.
 * Turns each category into a content-rich landing page: buying guide,
 * advantages cards, FAQ (with schema) and internal links.
 */
export function CategoryContentSection({ content, categoryName }: CategoryContentSectionProps) {
  const { article, advantages, faq, related } = content;

  const hasArticle = Boolean(article && article.trim());
  const hasAdvantages = advantages.length > 0;
  const hasFaq = faq.length > 0;
  const hasRelated = related.length > 0;

  // Nothing to render — keep the page clean.
  if (!hasArticle && !hasAdvantages && !hasFaq && !hasRelated) {
    return null;
  }

  return (
    <section className="mt-20" aria-label="מידע על הקטגוריה">
      {/* FAQ structured data for Google */}
      {hasFaq && <FAQJsonLd questions={faq} />}

      {/* Soft elegant backdrop that lifts the whole block off the page */}
      <div className="rounded-3xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-5 py-12 sm:px-10 md:px-14 md:py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Article / buying guide */}
          {hasArticle && (
            <ExpandableArticle
              html={article}
              className="prose prose-lg max-w-none
                prose-headings:font-bold prose-headings:text-gray-900
                prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-0 prose-h2:mb-6 prose-h2:leading-snug
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-gray-600 prose-p:leading-[1.9]
                prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900
                prose-li:text-gray-600 prose-li:leading-relaxed"
            />
          )}

          {/* Advantages / how to choose */}
          {hasAdvantages && (
            <div>
              <SectionHeading eyebrow="היתרונות שלנו" title={`למה לבחור ${categoryName}?`} />
              <div className="grid gap-5 sm:grid-cols-2">
                {advantages.map((item, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
                  >
                    {/* Decorative watermark number */}
                    <span className="pointer-events-none absolute left-5 top-4 select-none text-6xl font-bold leading-none text-gray-100 transition-colors duration-300 group-hover:text-gray-200">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="relative">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <Check className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                      {item.title && (
                        <h3 className="mb-2 text-lg font-bold text-gray-900">{item.title}</h3>
                      )}
                      {item.text && (
                        <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {hasFaq && (
            <div>
              <SectionHeading eyebrow="כל מה שרציתם לדעת" title="שאלות נפוצות" />
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
                <FaqAccordion faqs={faq} />
              </div>
            </div>
          )}

          {/* Related categories - internal links */}
          {hasRelated && (
            <div className="text-center">
              <SectionHeading title="קטגוריות נוספות שיעניינו אותך" />
              <div className="flex flex-wrap justify-center gap-3">
                {related.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {cat.name}
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
