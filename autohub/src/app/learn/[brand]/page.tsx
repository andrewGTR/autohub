import { CAR_DATA } from "../../../data/cars";
import PageNavbar from "../../../components/PageNavbar";
import BrandExplorer from "../../../components/BrandExplorer";
import { notFound } from "next/navigation";
import Link from "next/link";
import SmoothImage from "../../../components/SmoothImage";
import { CarBrand } from "../../../types/car";
import { getTotalGenerations } from "../../../utils/carUtils";
import styles from "./page.module.css";

import { getBrandCoverUrl } from "../../../services/imageService";

interface PageProps {
  params: Promise<{
    brand: string;
  }>;
}

const BRAND_ICONS: Record<string, string> = {
  "Alfa Romeo": "/icons/alfa_romeo.png",
  "Audi": "/icons/audi.png",
  "BMW": "/icons/bmw.png",
  "Chery": "/icons/chery.png",
  "Chevrolet": "/icons/chevrolet.png",
  "Chrysler": "/icons/chrysler.png",
  "Citroen": "/icons/citroen.png",
  "Cupra": "/icons/cupra.png",
  "Dacia": "/icons/dacia.png",
  "Dodge": "/icons/dodge.png",
  "Fiat": "/icons/fiat.png",
  "Ford": "/icons/ford.png",
  "Honda": "/icons/honda.png",
  "Hyundai": "/icons/hyundai.png",
  "Infiniti": "/icons/infinit.png",
  "Jaguar": "/icons/jaguar.png",
  "Jeep": "/icons/jeep.png",
  "Kia": "/icons/kia.png",
  "Land Rover": "/icons/land-rover.png",
  "Lexus": "/icons/lexus.png",
  "Mercedes": "/icons/mercedes.png",
  "Mini": "/icons/mini.net.png",
  "Mitsubishi": "/icons/mitsobishi.png",
  "Nissan": "/icons/nissan.png",
  "Peugeot": "/icons/peugeot.png",
  "Porsche": "/icons/porsche.png",
  "Renault": "/icons/renualt.png",
  "Seat": "/icons/seat.png",
  "Skoda": "/icons/skoda.png",
  "Subaru": "/icons/subaru.png",
  "Suzuki": "/icons/suzuki.png",
  "Toyota": "/icons/toyota.png",
  "Volkswagen": "/icons/volkswagen.png",
  "Volvo": "/icons/volvo.png",
};

export default async function BrandLearnPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { brand } = resolvedParams;
  const decodedBrand = decodeURIComponent(brand);

  const brandData = (CAR_DATA as CarBrand[]).find(
    (b) => b.n.toLowerCase() === decodedBrand.toLowerCase()
  );

  if (!brandData) notFound();

  const totalModels = brandData.m.length;
  const totalGens   = getTotalGenerations(brandData);
  const iconPath = BRAND_ICONS[decodedBrand] || "";
  const coverImg = getBrandCoverUrl(decodedBrand) || "";

  return (
    <main>
      <PageNavbar />
      <div>
        {/* ── Brand Hero Header ── */}
        <div 
          className={styles.hero}
          style={{
            backgroundImage: coverImg
              ? `linear-gradient(to right, rgba(10,10,20,0.85) 0%, rgba(10,10,20,0.35) 100%), url(${coverImg})`
              : "linear-gradient(135deg, #1a1a2e 0%, #2e2e5e 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className={styles.heroContent}>
            {/* Breadcrumb */}
            <div className={styles.breadcrumb}>
              <Link href="/learn" className={styles.breadcrumbLink}>Learning Center</Link>
              <span>›</span>
              <span>{decodedBrand}</span>
            </div>

            {/* Brand identity row */}
            <div className={styles.brandRow}>
              {iconPath && (
                <div className={styles.brandLogo}>
                  <SmoothImage src={iconPath} alt={decodedBrand} />
                </div>
              )}
              <div>
                <h1 className={styles.title}>
                  {decodedBrand}
                </h1>
                <p className={styles.subtitle}>
                  EU Market · Specifications & Prices
                </p>
              </div>
            </div>

            {/* Stats pills */}
            <div className={styles.statsRow}>
              {[
                { val: totalModels, label: "Models" },
                { val: totalGens,   label: "Generations" },
              ].map((s) => (
                <div key={s.label} className={styles.statPill}>
                  <div className={styles.statVal}>{s.val}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Model Grid ── */}
        <BrandExplorer brandName={decodedBrand} models={brandData.m} />

      </div>
    </main>
  );
}

export async function generateStaticParams() {
  const popularBrands = ["BMW", "Mercedes", "Audi", "Volkswagen", "Toyota", "Nissan"];
  return popularBrands.map((brand) => ({ brand }));
}
