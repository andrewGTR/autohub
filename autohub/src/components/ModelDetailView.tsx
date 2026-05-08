"use client";

import { useState } from "react";
import Link from "next/link";
import { CarModel, CarGeneration, CarModification, CarPrice } from "../types/car";
import { normalizeImagePath } from "../utils/carUtils";
import styles from "./ModelDetailView.module.css";

interface ModelDetailViewProps {
  brandName: string;
  modelName: string;
  model: CarModel;
}

export default function ModelDetailView({ brandName, modelName, model }: ModelDetailViewProps) {
  const [activeGenIndex, setActiveGenIndex] = useState(0);
  const gen = model.g[activeGenIndex];

  if (!gen) return <div className={styles.noData}>No generation data found.</div>;

  const photos = gen.photos || [];
  const heroImg = photos[0] || gen.i || "";
  const [activePhoto, setActivePhoto] = useState(heroImg);

  const hp = gen.hp ? gen.hp.replace('Power from ','').replace(' to ','–') : '—';
  const fuel = gen.fl ? gen.fl.replace('Fuel consumption from ','').replace(' to ','–') : '—';
  const price = gen.pr ? gen.pr.replace('Price ','').replace(' to ','–') : '—';

  return (
    <div className={styles.section}>
      {/* Generation Tabs */}
      <div className={styles.tabsContainer}>
        {model.g.map((g, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActiveGenIndex(idx);
              const firstPhoto = (g.photos && g.photos[0]) || g.i || "";
              setActivePhoto(firstPhoto);
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
          <div className={styles.mainImageContainer}>
            <img 
              src={activePhoto.startsWith('http') ? activePhoto : `/${activePhoto}`} 
              alt={gen.n} 
              className={styles.mainImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/800x500/f0f0f5/aaa?text=No+Image+Available";
              }}
            />
          </div>
          
          {photos.length > 1 && (
            <div className={styles.thumbnailsContainer}>
              {photos.map((p, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActivePhoto(p)}
                  className={`${styles.thumbnail} ${activePhoto === p ? styles.activeThumbnail : ""}`}
                >
                  <img
                    src={p}
                    alt={`Thumbnail ${idx}`}
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
              <div className={`${styles.specVal} ${styles.colorHpFromVal}`}>{hp.split('–')[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorHpFromLbl}`}>HP From</div>
            </div>
            <div className={`${styles.specBox} ${styles.specHpTo}`}>
              <div className={`${styles.specVal} ${styles.colorHpToVal}`}>{hp.split('–').pop()?.trim() || hp.split('–')[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorHpToLbl}`}>HP To</div>
            </div>
            <div className={`${styles.specBox} ${styles.specFuel}`}>
              <div className={`${styles.specVal} ${styles.colorFuelVal}`}>{fuel.split('–')[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorFuelLbl}`}>l/100km</div>
            </div>
            <div className={`${styles.specBox} ${styles.specPrice}`}>
              <div className={`${styles.specVal} ${styles.colorPriceVal}`}>{price.split('–')[0].trim()}</div>
              <div className={`${styles.specLbl} ${styles.colorPriceLbl}`}>From (EU)</div>
            </div>
          </div>
        </div>

        {/* Right Column: Tables & Reviews */}
        <div>
          {/* Engine Variants */}
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

          {/* Price History */}
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
