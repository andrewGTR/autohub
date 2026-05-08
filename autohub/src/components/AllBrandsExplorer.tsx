"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CarBrand } from "../types/car";
import { 
  getTotalGenerations, 
  getHeroImageForBrand, 
  getSampleModels 
} from "../utils/carUtils";
import styles from "./AllBrandsExplorer.module.css";

// Map brand name → local icon path
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

interface AllBrandsExplorerProps {
  brands: CarBrand[];
}

export default function AllBrandsExplorer({ brands }: AllBrandsExplorerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter(
      (b) =>
        b.n.toLowerCase().includes(q) ||
        b.m.some((m) => m.n.toLowerCase().includes(q))
    );
  }, [brands, search]);

  return (
    <div className={styles.container}>
      {/* ── Section heading ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>Explorer</h2>
        <p className={styles.subtitle}>
          Click any brand to explore all models, specs, and owner reviews.
        </p>
      </div>

      {/* ── Search ── */}
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search brands or models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        {search && (
          <button className={styles.clearButton} onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      {/* ── Brand grid ── */}
      <div className={styles.grid}>
        {filtered.map((brand) => {
          const totalModels = brand.m.length;
          const totalGens = getTotalGenerations(brand);
          const heroImg = getHeroImageForBrand(brand);
          const iconPath = BRAND_ICONS[brand.n] || "";
          const sampleModels = getSampleModels(brand, 3);

          return (
            <Link key={brand.n} href={`/learn/${encodeURIComponent(brand.n)}`} className={styles.card}>
              
              {/* Hero / banner */}
              <div 
                className={styles.cardHero}
                style={{
                  background: heroImg
                    ? `linear-gradient(to bottom, rgba(26,26,46,0.15), rgba(26,26,46,0.6)), url(${heroImg.startsWith("http") ? heroImg : `/${heroImg}`}) center/cover no-repeat`
                    : "linear-gradient(135deg, #1a1a2e 0%, #2e2e5e 100%)"
                }}
              >
                {/* Brand logo */}
                {iconPath && (
                  <div className={styles.brandLogo}>
                    <img src={iconPath} alt={brand.n} />
                  </div>
                )}

                {/* Model count badge */}
                <div className={styles.modelBadge}>
                  {totalModels} models
                </div>
              </div>

              {/* Card body */}
              <div className={styles.cardBody}>
                {/* Brand name */}
                <div className={styles.brandName}>
                  {brand.n}
                </div>

                {/* Sample model names */}
                {sampleModels.length > 0 && (
                  <div className={styles.sampleModels}>
                    {sampleModels.map((name, i) => (
                      <span key={i} className={styles.sampleChip}>
                        {name}
                      </span>
                    ))}
                    {totalModels > 3 && (
                      <span className={styles.sampleChipMore}>
                        +{totalModels - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className={styles.statsRow}>
                  <div className={styles.statCol}>
                    <div className={styles.statVal}>{totalGens}</div>
                    <div className={styles.statLabel}>Generations</div>
                  </div>

                  <div className={styles.exploreCol}>
                    Explore →
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className={styles.noResults}>
          <h3>No brands found</h3>
          <p>Try a different search term.</p>
        </div>
      )}
    </div>
  );
}
