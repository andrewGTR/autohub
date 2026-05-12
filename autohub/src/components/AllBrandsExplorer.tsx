"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CarBrand } from "../types/car";
import { getTotalGenerations, getSampleModels } from "../utils/carUtils";
import styles from "./AllBrandsExplorer.module.css";

// Map brand name → country of origin
const BRAND_COUNTRY: Record<string, string> = {
  "Alfa Romeo":  "Italy",
  "Audi":        "Germany",
  "BMW":         "Germany",
  "Chery":       "China",
  "Chevrolet":   "USA",
  "Chrysler":    "USA",
  "Citroen":     "France",
  "Cupra":       "Spain",
  "Dacia":       "Romania",
  "Dodge":       "USA",
  "Fiat":        "Italy",
  "Ford":        "USA",
  "Honda":       "Japan",
  "Hyundai":     "South Korea",
  "Infiniti":    "Japan",
  "Isuzu":       "Japan",
  "Jaguar":      "UK",
  "Jeep":        "USA",
  "Kia":         "South Korea",
  "Lada (VAZ)":  "Russia",
  "Land Rover":  "UK",
  "Lexus":       "Japan",
  "Mazda":       "Japan",
  "Mercedes":    "Germany",
  "Mini":        "UK",
  "Mitsubishi":  "Japan",
  "Nissan":      "Japan",
  "Opel":        "Germany",
  "Peugeot":     "France",
  "Porsche":     "Germany",
  "Renault":     "France",
  "Rover":       "UK",
  "SAAB":        "Sweden",
  "Seat":        "Spain",
  "Skoda":       "Czech Republic",
  "Smart":       "Germany",
  "Subaru":      "Japan",
  "Suzuki":      "Japan",
  "Tesla":       "USA",
  "Toyota":      "Japan",
  "Volkswagen":  "Germany",
  "Volvo":       "Sweden",
};



// Map brand name → cover image in /covers/
const BRAND_COVERS: Record<string, string> = {
  "Alfa Romeo":  "/covers/alfa%20romeo-cover.png",
  "Audi":        "/covers/Audi_A4.jpg",
  "BMW":         "/covers/bmw-cover.jpg",
  "Chery":       "",
  "Chevrolet":   "/covers/chevorlet-cover.jpg",
  "Chrysler":    "/covers/Chrysler-cover.jpg",
  "Citroen":     "/covers/citroin-cover.jpeg",
  "Cupra":       "/covers/cupra-cover.jpg",
  "Dacia":       "/covers/dacia-cover.jpg",
  "Dodge":       "/covers/dodge-cover.jpg",
  "Fiat":        "/covers/Fiat-cover.jpg",
  "Ford":        "/covers/ford-cover.jpg",
  "Honda":       "/covers/Honda-cover.jpg",
  "Hyundai":     "/covers/Hyundai-cover.jpg",
  "Infiniti":    "/covers/infiniti-cover.jpg",
  "Isuzu":       "/covers/isuzu-cover.jpg",
  "Jaguar":      "/covers/jaguar-cover.jpg",
  "Jeep":        "/covers/jeep-cover.jpg",
  "Kia":         "/covers/kia-cover.jpg",
  "Lada":        "/covers/lada-cover.jpg",
  "Land Rover":  "/covers/land%20rover-cover.jpg",
  "Lexus":       "/covers/lexus-cover.jpg",
  "Mazda":       "/covers/mazda-cover.jpg",
  "Mercedes":    "/covers/mercedes-cover.jpg",
  "Mini":        "/covers/mini-cover.jpg",
  "Mitsubishi":  "/covers/mitsobishi-cover.jpg",
  "Nissan":      "/covers/nissan-cover.jpg",
  "Opel":        "/covers/opel-cover.jpg",
  "Peugeot":     "/covers/PEUGEOT-cover.jpg",
  "Porsche":     "/covers/porsche-cover.jpg",
  "Renault":     "/covers/renault-cover.jpg",
  "Rover":       "/covers/rover-cover.jpg",
  "Saab":        "/covers/saab-cover.jpg",
  "Seat":        "/covers/seat-cover.webp",
  "Skoda":       "/covers/skoda-cover.jpg",
  "Smart":       "/covers/smart-cover.jpg",
  "Subaru":      "/covers/Subaru-cover.jpg",
  "Suzuki":      "/covers/suzuki-cover.jpg",
  "Tesla":       "/covers/tesla-cover.jpeg",
  "Toyota":      "/covers/Toyota-cover.png",
  "Volkswagen":  "/covers/volkswagen-cover.jpg",
  "Volvo":       "/covers/volvo-cover.jpg",
  "SAAB":        "/covers/saab-cover.jpg",
  "Lada (VAZ)":  "/covers/Lada%20%28VAZ%29-cover.jpg",
};

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
  const [selectedCountry, setSelectedCountry] = useState("");

  // Derive unique countries from the brands in data
  const countries = useMemo(() => {
    const set = new Set<string>();
    brands.forEach(b => {
      const c = BRAND_COUNTRY[b.n];
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [brands]);

  const filtered = useMemo(() => {
    let list = brands;
    if (selectedCountry) list = list.filter(b => BRAND_COUNTRY[b.n] === selectedCountry);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (b) =>
        b.n.toLowerCase().includes(q) ||
        b.m.some((m) => m.n.toLowerCase().includes(q))
    );
  }, [brands, search, selectedCountry]);

  return (
    <div className={styles.container}>
      {/* ── Section heading ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>Explorer</h2>
        <p className={styles.subtitle}>
          Click any brand to explore all models, specs, and owner reviews.
        </p>
      </div>

      {/* ── Country Filter ── */}
      <div style={{
        display: "flex", gap: "8px", flexWrap: "wrap",
        marginBottom: "20px",
      }}>
        <button
          onClick={() => setSelectedCountry("")}
          style={{
            padding: "7px 16px", borderRadius: "30px", border: "none",
            fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            transition: "all 0.18s",
            background: selectedCountry === "" ? "#1a1a2e" : "#f0f0f6",
            color: selectedCountry === "" ? "#fff" : "#555",
          }}
        >
          All
        </button>
        {countries.map(country => (
          <button
            key={country}
            onClick={() => setSelectedCountry(c => c === country ? "" : country)}
            style={{
              padding: "7px 16px", borderRadius: "30px", border: "none",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
              transition: "all 0.18s",
              background: selectedCountry === country ? "#3a3aff" : "#f0f0f6",
              color: selectedCountry === country ? "#fff" : "#555",
              boxShadow: selectedCountry === country ? "0 4px 12px rgba(58,58,255,0.25)" : "none",
            }}
          >
            {country}
          </button>
        ))}
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
          const coverImg = BRAND_COVERS[brand.n] || "";
          const iconPath = BRAND_ICONS[brand.n] || "";
          const sampleModels = getSampleModels(brand, 3);

          return (
            <Link key={brand.n} href={`/learn/${encodeURIComponent(brand.n)}`} className={styles.card}>
              
              {/* Hero / banner */}
              <div 
                className={styles.cardHero}
                style={{
                  background: coverImg
                    ? `linear-gradient(to bottom, rgba(10,10,20,0.15), rgba(10,10,20,0.65)), url(${coverImg}) center/cover no-repeat`
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
          <p>Try a different search term{selectedCountry ? ` or clear the "${selectedCountry}" filter` : ""}.</p>
        </div>
      )}
    </div>
  );
}
