"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CarModel, CarGeneration } from "../types/car";
import { normalizeImagePath } from "../utils/carUtils";
import styles from "./BrandExplorer.module.css";

interface BrandExplorerProps {
  brandName: string;
  models: CarModel[];
}

export default function BrandExplorer({ brandName, models }: BrandExplorerProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");

  const filteredModels = useMemo(() => {
    let list = [...models];
    if (search) list = list.filter((m) => m.n.toLowerCase().includes(search.toLowerCase()));

    if (sort === "gens") list.sort((a, b) => b.g.length - a.g.length);
    else if (sort === "newest") list.sort((a, b) => {
      const ya = parseInt((a.g[0]?.y || "").match(/\d{4}/)?.[0] || "0");
      const yb = parseInt((b.g[0]?.y || "").match(/\d{4}/)?.[0] || "0");
      return yb - ya;
    });
    else list.sort((a, b) => a.n.localeCompare(b.n));

    return list;
  }, [models, search, sort]);

  return (
    <div className={styles.section}>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={styles.sortSelect}
        >
          <option value="name">A – Z</option>
          <option value="gens">Most Generations</option>
          <option value="newest">Newest First</option>
        </select>
        <span className={styles.modelCount}>
          {filteredModels.length} models
        </span>
      </div>

      {/* ── Card Grid ── */}
      <div className={styles.grid}>
        {filteredModels.map((model, index) => {
          const g0 = model.g[0] || {} as CarGeneration;
          const rawImg = (g0.photos && g0.photos[0]) || g0.i || "";
          const img = normalizeImagePath(rawImg);

          const descTotal = model.g.filter(g => g.desc).length;

          // Year span
          const allYears = model.g
            .map(g => (g.y || "").match(/\d{4}/g))
            .flat().filter(Boolean).map(Number);
          const minY = allYears.length ? Math.min(...allYears) : null;
          const maxY = allYears.length ? Math.max(...allYears) : null;
          const yearSpan = minY
            ? (minY === maxY ? String(minY) : `${minY} – ${maxY}`)
            : "";

          // Clean name (strip brand prefix)
          const shortName = model.n
            .replace(new RegExp("^" + brandName + "\\s*", "i"), "")
            .trim() || model.n;

          const hp    = g0.hp ? g0.hp.replace("Power from ", "").replace(" to ", "–") : "";
          const fuel  = g0.fl ? g0.fl.replace("Fuel consumption from ", "").replace(" to ", "–") : "";
          const price = g0.pr ? g0.pr.replace("Price ", "").replace(" to ", "–") : "EU Market";

          const hpFrom  = hp   ? hp.split("–")[0].replace(/\D/g, "").trim() : "—";
          const fuelFrom = fuel ? fuel.split("–")[0].trim() : "—";

          return (
            <Link
              key={index}
              href={`/learn/${encodeURIComponent(brandName)}/${encodeURIComponent(model.n)}`}
              className={styles.card}
            >
              {/* Image */}
              <div className={styles.cardImageWrapper}>
                {img ? (
                  <img
                    src={img.startsWith("http") ? img : `/${img}`}
                    alt={model.n}
                    className={styles.cardImage}
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x200/f3f3f3/aaa?text=No+Image"; }}
                  />
                ) : (
                  <div className={styles.noImage}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                      <rect x="2" y="7" width="20" height="11" rx="2"/><path d="M4 7l2-3h12l2 3"/>
                      <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
                    </svg>
                  </div>
                )}

                {/* Hover overlay */}
                <div className={styles.hoverOverlay}>
                  <span className={styles.hoverText}>
                    View Details →
                  </span>
                </div>

                {/* Badges */}
                <div className={styles.badges}>
                  {descTotal > 0 && (
                    <span className={styles.badgeDesc}>ⓘ {descTotal} descriptions</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className={styles.cardBody}>
                {/* Model name */}
                <div className={styles.modelName}>
                  {shortName}
                </div>

                {/* Brand · Year */}
                <div className={styles.brandYear}>
                  {yearSpan ? `${yearSpan} · ` : ""}{brandName.toUpperCase()}
                </div>

                {/* Spec pills */}
                <div className={styles.specPills}>
                  <div className={styles.specHp}>
                    <div className={styles.specHpVal}>{hpFrom}</div>
                    <div className={styles.specHpLbl}>HP From</div>
                  </div>
                  <div className={styles.specFuel}>
                    <div className={styles.specFuelVal}>{fuelFrom}</div>
                    <div className={styles.specFuelLbl}>l/100km</div>
                  </div>
                  <div className={styles.specPrice}>
                    <div className={styles.specPriceVal}>{price}</div>
                    <div className={styles.specPriceLbl}>EU Price Range</div>
                  </div>
                </div>

                {/* Generation count */}
                <div className={styles.genCount}>
                  {model.g.length} generation{model.g.length !== 1 ? "s" : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className={styles.noResults}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" style={{ marginBottom: "16px", display: "inline-block" }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <h3>No models found</h3>
          <p>Try adjusting your search keywords.</p>
        </div>
      )}
    </div>
  );
}
