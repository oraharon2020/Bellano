import { CategoryQuickNav } from '@/components/home/CategoryQuickNav';
import { GoogleReviews } from '@/components/home/GoogleReviews';
import { HeroSection } from '@/components/home/sections/HeroSection';
import { CategoriesShowcase } from '@/components/home/sections/CategoriesShowcase';
import { BestSellersSection, SaleSection } from '@/components/home/sections/ProductShowcase';
import { EditorialBand, SocialProof, FaqSection } from '@/components/home/sections/EditorialSections';
import { CustomFurnitureSection, InstagramSection, NewsletterSection } from '@/components/home/sections/BrandSections';

/**
 * Bellano homepage — editorial black-and-white luxury.
 * Each section lives in its own file under components/home/sections/.
 */
export default async function HomePage() {
  return (
    <div className="flex flex-col">
      <CategoryQuickNav />
      <HeroSection />
      <CategoriesShowcase />
      <BestSellersSection />
      <EditorialBand />
      <SaleSection />
      <CustomFurnitureSection />
      <SocialProof />
      <GoogleReviews />
      <FaqSection />
      <InstagramSection />
      <NewsletterSection />
    </div>
  );
}
