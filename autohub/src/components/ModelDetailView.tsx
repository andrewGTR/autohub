"use client";

import { useState, useEffect, useCallback } from "react";
import { CarModel, CarGeneration, CarModification, CarPrice } from "../types/car";
import { getLocalGenImage, getLocalGenPhotos } from "../utils/carUtils";
import styles from "./ModelDetailView.module.css";

interface ModelDetailViewProps {
  brandName: string;
  modelName: string;
  model: CarModel;
}

export default function ModelDetailView({ brandName, modelName, model }: ModelDetailViewProps) {
  const [activeGenIndex, setActiveGenIndex] = useState(0);
  const gen = model.g[activeGenIndex];

  const photos = gen ? getLocalGenPhotos(gen) : [];
  const heroImg = gen ? getLocalGenImage(gen) : "";
  const [activePhoto, setActivePhoto] = useState(heroImg);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Keyboard navigation for lightbox
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!lightboxOpen) return;
    if (e.key === "Escape") setLightboxOpen(false);
    if (e.key === "ArrowRight") setLightboxIndex(i => (i + 1) % photos.length);
    if (e.key === "ArrowLeft")  setLightboxIndex(i => (i - 1 + photos.length) % photos.length);
  }, [lightboxOpen, photos.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const openLightbox = (photo: string) => {
    const idx = photos.indexOf(photo);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  if (!gen) return <div className={styles.noData}>No generation data found.</div>;

  const hp    = gen.hp ? gen.hp.replace("Power from ", "").replace(" to ", "–") : "—";
  const fuel  = gen.fl ? gen.fl.replace("Fuel consumption from ", "").replace(" to ", "–") : "—";
  const price = gen.pr ? gen.pr.replace("Price ", "").replace(" to ", "–") : "—";

  return (
    <div className={styles.section}>

      {/* ── Fullscreen Lightbox ── */}
      {lightboxOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.94)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.12)", border: "none",
              color: "#fff", fontSize: "1.6rem", width: 44, height: 44,
              borderRadius: "50%", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(6px)",
            }}
          >✕</button>

          {/* Counter */}
          <div style={{
            position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 600,
          }}>
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Prev arrow */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + photos.length) % photos.length); }}
              style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                fontSize: "1.8rem", width: 50, height: 50, borderRadius: "50%",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", backdropFilter: "blur(6px)",
              }}
            >‹</button>
          )}

          {/* Main lightbox image */}
          <img
            src={photos[lightboxIndex] || ""}
            alt={`Photo ${lightboxIndex + 1}`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw", maxHeight: "80vh",
              objectFit: "contain", borderRadius: 8,
              boxShadow: "0 8px 60px rgba(0,0,0,0.7)",
              userSelect: "none",
            }}
            onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/800x500/222/555?text=No+Image"; }}
          />

          {/* Next arrow */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % photos.length); }}
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                fontSize: "1.8rem", width: 50, height: 50, borderRadius: "50%",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", backdropFilter: "blur(6px)",
              }}
            >›</button>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute", bottom: 20,
                display: "flex", gap: 8, overflowX: "auto",
                maxWidth: "90vw", padding: "0 8px",
              }}
            >
              {photos.map((p, i) => (
                <div
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    width: 64, height: 44, borderRadius: 6, overflow: "hidden",
                    cursor: "pointer", flexShrink: 0,
                    border: i === lightboxIndex ? "2px solid #3a3aff" : "2px solid transparent",
                    opacity: i === lightboxIndex ? 1 : 0.55,
                    transition: "opacity 0.2s, border-color 0.2s",
                  }}
                >
                  <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Generation Tabs ── */}
      <div className={styles.tabsContainer}>
        {model.g.map((g, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActiveGenIndex(idx);
              setActivePhoto(getLocalGenImage(g));
            }}
            className={`${styles.tabButton} ${activeGenIndex === idx ? styles.activeTab : ""}`}
          >
            {g.y || g.n}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {/* Left Column: Gallery & Description */}
        <div>
          <div
            className={styles.mainImageContainer}
            style={{ cursor: "zoom-in" }}
            onClick={() => openLightbox(activePhoto)}
            title="Click to view fullscreen"
          >
            <img
              src={activePhoto || "/images/placeholder.jpg"}
              alt={gen.n}
              className={styles.mainImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/800x500/f0f0f5/aaa?text=No+Image+Available";
              }}
            />
            {/* Zoom hint overlay */}
            <div style={{
              position: "absolute", bottom: 10, right: 10,
              background: "rgba(0,0,0,0.45)", color: "#fff",
              fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px",
              borderRadius: 20, pointerEvents: "none", letterSpacing: "0.4px",
              backdropFilter: "blur(4px)",
            }}>
              🔍 Click to expand
            </div>
          </div>

          {photos.length > 1 && (
            <div className={styles.thumbnailsContainer}>
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePhoto(p)}
                  onDoubleClick={() => openLightbox(p)}
                  className={`${styles.thumbnail} ${activePhoto === p ? styles.activeThumbnail : ""}`}
                  title="Click to preview · Double-click to expand"
                >
                  <img
                    src={p}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                </div>
              ))}
            </div>
          )}

          {gen.desc && (
            <div className={styles.descriptionBox}>
              <h4 className={styles.descHeader}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3a3aff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                About this generation
              </h4>
              <p className={styles.descText}>{gen.desc}</p>
            </div>
          )}

          {/* Quick Specs */}
          <div className={styles.quickSpecsGrid}>
            <div className={`${styles.specBox} ${styles.specHpFrom}`}>
              <div className={`${styles.specVal} ${styles.colorHpFromVal}`}>{hp.split("–")[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorHpFromLbl}`}>HP From</div>
            </div>
            <div className={`${styles.specBox} ${styles.specHpTo}`}>
              <div className={`${styles.specVal} ${styles.colorHpToVal}`}>{hp.split("–").pop()?.trim() || hp.split("–")[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorHpToLbl}`}>HP To</div>
            </div>
            <div className={`${styles.specBox} ${styles.specFuel}`}>
              <div className={`${styles.specVal} ${styles.colorFuelVal}`}>{fuel.split("–")[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorFuelLbl}`}>l/100km</div>
            </div>
            <div className={`${styles.specBox} ${styles.specPrice}`}>
              <div className={`${styles.specVal} ${styles.colorPriceVal}`}>{price.split("–")[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorPriceLbl}`}>From (EU)</div>
            </div>
          </div>
        </div>

        {/* Right Column: Tables */}
        <div>
          {gen.mods && gen.mods.length > 0 && (
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Engine Variants</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Engine</th>
                      <th>Power</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gen.mods.map((m: CarModification, i: number) => (
                      <tr key={i}>
                        <td className={`${styles.fw600} ${styles.textPrimary}`}>{m.name}</td>
                        <td className={styles.textSecondary}>{m.engine}</td>
                        <td className={`${styles.fw800} ${styles.textRed}`}>{m.power}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gen.prices && gen.prices.length > 0 && (
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Price History (EU)</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gen.prices.map((p: CarPrice, i: number) => (
                      <tr key={i}>
                        <td className={`${styles.fw700} ${styles.textPrimary}`}>{p.year}</td>
                        <td className={`${styles.fw800} ${styles.textGreen}`}>{p.average}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
