
import PageNavbar from "../../components/PageNavbar";
import PageHeader from "../../components/PageHeader";
import OffcanvasFilter from "../../components/OffcanvasFilter";
import CarCard from "../../components/CarCard";
import FiltersToggle from "../../components/FiltersToggle";
import { getListings } from "../../lib/api";

export const revalidate = 60; // SSR with 60s revalidation

interface MarketplacePageProps {
  searchParams: {
    category?: string;
    brand?: string;
    body?: string;
    priceMin?: string;
    priceMax?: string;
    yearMin?: string;
    yearMax?: string;
    kmMin?: string;
    kmMax?: string;
    transmission?: string;
    fuel?: string;
    isOffer?: string;
  };
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  // Await searchParams in Next.js 15+ (if applicable, otherwise it is synchronous but awaiting works fine)
  const resolvedParams = await searchParams;
  
  const allListings = await getListings().catch(() => []);
  
  // Filter on the server based on searchParams
  let filteredCars = allListings;
  
  if (resolvedParams.category) {
    filteredCars = filteredCars.filter((c) => c.category?.toLowerCase() === resolvedParams.category?.toLowerCase());
  }
  
  if (resolvedParams.brand) {
    filteredCars = filteredCars.filter((c) => c.manufacturer?.toLowerCase() === resolvedParams.brand?.toLowerCase());
  }
  
  if (resolvedParams.body && resolvedParams.body !== "all") {
    filteredCars = filteredCars.filter((c) => c.body?.toLowerCase() === resolvedParams.body?.toLowerCase());
  }

  if (resolvedParams.transmission && resolvedParams.transmission !== "all") {
    filteredCars = filteredCars.filter((c) => c.transmission?.toLowerCase() === resolvedParams.transmission?.toLowerCase());
  }

  if (resolvedParams.fuel && resolvedParams.fuel !== "all") {
    filteredCars = filteredCars.filter((c) => c.fuel?.toLowerCase() === resolvedParams.fuel?.toLowerCase());
  }

  if (resolvedParams.isOffer === "true") {
    filteredCars = filteredCars.filter((c) => c.isOffer);
  }

  // Helper to parse price reliably
  const parseNumber = (val?: string | number) => {
    if (!val) return 0;
    if (typeof val === "number") return val;
    return parseInt(val.toString().replace(/[^0-9]/g, ""), 10) || 0;
  };

  if (resolvedParams.priceMin) {
    const min = parseNumber(resolvedParams.priceMin);
    filteredCars = filteredCars.filter((c) => {
      const price = c.isOffer && c.offerPrice ? parseNumber(c.offerPrice) : parseNumber(c.price);
      return price >= min;
    });
  }

  if (resolvedParams.priceMax) {
    const max = parseNumber(resolvedParams.priceMax);
    filteredCars = filteredCars.filter((c) => {
      const price = c.isOffer && c.offerPrice ? parseNumber(c.offerPrice) : parseNumber(c.price);
      return price <= max;
    });
  }

  if (resolvedParams.yearMin) {
    const min = parseInt(resolvedParams.yearMin, 10);
    filteredCars = filteredCars.filter((c) => Number(c.year || 0) >= min);
  }

  if (resolvedParams.yearMax) {
    const max = parseInt(resolvedParams.yearMax, 10);
    filteredCars = filteredCars.filter((c) => Number(c.year || 0) <= max);
  }

  if (resolvedParams.kmMin) {
    const min = parseNumber(resolvedParams.kmMin);
    filteredCars = filteredCars.filter((c) => parseNumber(c.mileage) >= min);
  }

  if (resolvedParams.kmMax) {
    const max = parseNumber(resolvedParams.kmMax);
    filteredCars = filteredCars.filter((c) => parseNumber(c.mileage) <= max);
  }

  // Determine Title based on params
  let title = "Marketplace";
  let description = "Find your perfect vehicle";
  if (resolvedParams.category) {
    title = `${resolvedParams.category} Cars`;
  } else if (resolvedParams.brand) {
    title = `${resolvedParams.brand} Cars`;
  }

  return (
    <>
      <PageNavbar />
      <PageHeader title={title} description={description} />
      
      {resolvedParams.brand?.toLowerCase() === "nissan" && (
        <div className="brand-hero">
          <div className="brand-top">
            <div className="brand-img-box">
              <img src="/0122908588v1.jpeg" alt="Nissan HQ" />
            </div>
          </div>
          <div className="brand-desc">
            <h2>Nissan</h2>
            <p>
              Nissan Motor Corporation is a Japanese multinational automobile manufacturer headquartered in Yokohama, Japan.
              Founded in 1933, the company has grown to become one of the world's leading carmakers, known for producing
              reliable, innovative, and affordable vehicles. Nissan operates in more than 160 countries and is a key member of
              the Renault–Nissan–Mitsubishi Alliance. The brand is famous for models such as the Nissan Altima, Patrol,
              X-Trail, GT-R, and the electric Nissan Leaf, which is one of the best-selling EVs globally.
            </p>
          </div>
        </div>
      )}

      {resolvedParams.brand && <hr className="section-divider" />}

      <div className="main-wrapper" id="mainWrapper" style={{ display: 'block' }}>
        <OffcanvasFilter />
        <div className="content-area" style={{ width: '100%', padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <FiltersToggle />
          </div>
          {filteredCars.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🚗</div>
              <p style={{ fontSize: "1rem" }}>No listings found.</p>
              <p style={{ fontSize: "0.85rem", marginTop: "6px" }}>Try adjusting your filters or check back soon!</p>
            </div>
          ) : (
            <div className="car-grid">
              {filteredCars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
