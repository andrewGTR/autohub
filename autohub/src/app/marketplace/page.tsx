
import PageNavbar from "../../components/PageNavbar";
import PageHeader from "../../components/PageHeader";
import SidebarFilter from "../../components/SidebarFilter";
import CarCard from "../../components/CarCard";
import FiltersToggle from "../../components/FiltersToggle";
import { getListings } from "../../lib/api";

export const revalidate = 60; // SSR with 60s revalidation

interface MarketplacePageProps {
  searchParams: {
    category?: string;
    brand?: string;
    body?: string;
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

      <div className="main-wrapper" id="mainWrapper">
        <SidebarFilter />
        <div className="content-area">
          <FiltersToggle />
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
