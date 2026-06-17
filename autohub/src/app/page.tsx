import Header from "../components/Header";
import Hero from "../components/Hero";
import CarCarousel from "../components/CarCarousel";
import AiSection from "../components/AiSection";
import ManufacturerSection from "../components/ManufacturerSection";
import { getListings } from "../lib/api";

export const revalidate = 60;

export default async function Home() {
  const listings = await getListings().catch(() => []);

  const recentlyAdded = listings.slice(0, 12);
  const offers = listings.filter((l) => l.isOffer).slice(0, 12);

  return (
    <main>
      <Header />
      <Hero />
      <CarCarousel title="Recently Added" cars={recentlyAdded} showDivider={true} />
      <CarCarousel title="Offers" cars={offers} showDivider={false} badge="Hot Deals" />
      <AiSection />
      <ManufacturerSection />
    </main>
  );
}
